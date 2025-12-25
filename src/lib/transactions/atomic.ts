// Atomic Transaction Manager - Ensures financial operations complete or rollback entirely
import { supabase } from "@/integrations/supabase/client";
import type { TransactionStatus } from "./types";

export class AtomicTransactionError extends Error {
  constructor(
    message: string,
    public code: string,
    public stage: "init" | "execute" | "confirm" | "rollback",
    public originalError?: unknown
  ) {
    super(message);
    this.name = "AtomicTransactionError";
  }
}

export interface PendingOperation {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  data: Record<string, unknown>;
  rollbackData?: Record<string, unknown>;
}

export interface AtomicResult<T> {
  success: boolean;
  data?: T;
  error?: AtomicTransactionError;
}

/**
 * Execute an atomic operation with automatic rollback on failure
 * Implements the Saga pattern for distributed transactions
 */
export async function executeAtomic<T>(
  operations: () => Promise<T>,
  rollback?: () => Promise<void>
): Promise<AtomicResult<T>> {
  try {
    const result = await operations();
    return { success: true, data: result };
  } catch (error) {
    // Attempt rollback if provided
    if (rollback) {
      try {
        await rollback();
      } catch (rollbackError) {
        return {
          success: false,
          error: new AtomicTransactionError(
            "Operation failed and rollback also failed - data may be inconsistent",
            "ROLLBACK_FAILED",
            "rollback",
            { originalError: error, rollbackError }
          ),
        };
      }
    }

    return {
      success: false,
      error: new AtomicTransactionError(
        error instanceof Error ? error.message : "Operation failed",
        "OPERATION_FAILED",
        "execute",
        error
      ),
    };
  }
}

/**
 * Create a transfer with pending state, then confirm
 * Two-phase commit pattern
 */
export async function createPendingTransfer(
  userId: string,
  data: {
    amount: number;
    type: string;
    notes?: string;
    profit?: number;
    fixedNumberId?: string;
  }
): Promise<{ transferId: string; confirm: () => Promise<boolean>; cancel: () => Promise<boolean> }> {
  // Step 1: Insert with pending state (we'll use is_archived as a soft state indicator)
  const { data: transfer, error } = await supabase
    .from("transfers")
    .insert({
      user_id: userId,
      amount: data.amount,
      type: data.type,
      notes: data.notes ?? null,
      profit: data.profit ?? 0,
      fixed_number_id: data.fixedNumberId ?? null,
      is_archived: true, // Start as "pending" (archived = not active yet)
    })
    .select()
    .single();

  if (error || !transfer) {
    throw new AtomicTransactionError(
      "فشل في إنشاء التحويل",
      "CREATE_FAILED",
      "init",
      error
    );
  }

  return {
    transferId: transfer.id,
    // Confirm: make it active
    confirm: async () => {
      const { error: confirmError } = await supabase
        .from("transfers")
        .update({ is_archived: false })
        .eq("id", transfer.id)
        .eq("user_id", userId);

      if (confirmError) {
        throw new AtomicTransactionError(
          "فشل في تأكيد التحويل",
          "CONFIRM_FAILED",
          "confirm",
          confirmError
        );
      }
      return true;
    },
    // Cancel: delete the pending record
    cancel: async () => {
      const { error: cancelError } = await supabase
        .from("transfers")
        .delete()
        .eq("id", transfer.id)
        .eq("user_id", userId)
        .eq("is_archived", true); // Only delete if still pending

      if (cancelError) {
        throw new AtomicTransactionError(
          "فشل في إلغاء التحويل",
          "CANCEL_FAILED",
          "rollback",
          cancelError
        );
      }
      return true;
    },
  };
}

/**
 * Create a debt with two-phase commit
 */
export async function createPendingDebt(
  userId: string,
  data: {
    amount: number;
    type: string;
    description: string;
  }
): Promise<{ debtId: string; confirm: () => Promise<boolean>; cancel: () => Promise<boolean> }> {
  const { data: debt, error } = await supabase
    .from("debts")
    .insert({
      user_id: userId,
      amount: data.amount,
      type: data.type,
      description: data.description,
      is_archived: true, // Start as pending
    })
    .select()
    .single();

  if (error || !debt) {
    throw new AtomicTransactionError(
      "فشل في إنشاء الدين",
      "CREATE_FAILED",
      "init",
      error
    );
  }

  return {
    debtId: debt.id,
    confirm: async () => {
      const { error: confirmError } = await supabase
        .from("debts")
        .update({ is_archived: false })
        .eq("id", debt.id)
        .eq("user_id", userId);

      if (confirmError) {
        throw new AtomicTransactionError(
          "فشل في تأكيد الدين",
          "CONFIRM_FAILED",
          "confirm",
          confirmError
        );
      }
      return true;
    },
    cancel: async () => {
      const { error: cancelError } = await supabase
        .from("debts")
        .delete()
        .eq("id", debt.id)
        .eq("user_id", userId)
        .eq("is_archived", true);

      if (cancelError) {
        throw new AtomicTransactionError(
          "فشل في إلغاء الدين",
          "CANCEL_FAILED",
          "rollback",
          cancelError
        );
      }
      return true;
    },
  };
}

/**
 * Execute a multi-step financial operation atomically
 * If any step fails, all previous steps are rolled back
 */
export async function executeMultiStepOperation<T>(
  steps: Array<{
    name: string;
    execute: () => Promise<unknown>;
    rollback: () => Promise<void>;
  }>
): Promise<AtomicResult<T>> {
  const completedSteps: typeof steps = [];

  for (const step of steps) {
    try {
      await step.execute();
      completedSteps.push(step);
    } catch (error) {
      // Rollback in reverse order
      for (const completed of completedSteps.reverse()) {
        try {
          await completed.rollback();
        } catch (rollbackError) {
          console.error(`Rollback failed for step: ${completed.name}`, rollbackError);
        }
      }

      return {
        success: false,
        error: new AtomicTransactionError(
          `فشل في الخطوة: ${step.name}`,
          "STEP_FAILED",
          "execute",
          error
        ),
      };
    }
  }

  return { success: true };
}

/**
 * Transaction state machine
 */
export const TRANSACTION_STATES: Record<TransactionStatus, {
  label: string;
  canTransitionTo: TransactionStatus[];
  color: string;
}> = {
  pending: {
    label: "قيد الانتظار",
    canTransitionTo: ["confirmed", "failed"],
    color: "warning",
  },
  confirmed: {
    label: "مؤكد",
    canTransitionTo: ["reversed"],
    color: "success",
  },
  failed: {
    label: "فشل",
    canTransitionTo: [],
    color: "destructive",
  },
  reversed: {
    label: "ملغي",
    canTransitionTo: [],
    color: "muted",
  },
};

/**
 * Check if a state transition is valid
 */
export function canTransition(
  from: TransactionStatus,
  to: TransactionStatus
): boolean {
  return TRANSACTION_STATES[from].canTransitionTo.includes(to);
}

/**
 * Get status display info
 */
export function getStatusInfo(status: TransactionStatus): {
  label: string;
  color: string;
} {
  return {
    label: TRANSACTION_STATES[status].label,
    color: TRANSACTION_STATES[status].color,
  };
}
