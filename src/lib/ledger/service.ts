// Ledger Service - Unified record management with audit trail
import { supabase } from "@/integrations/supabase/client";
import type {
  LedgerEntry,
  RecordHistoryEntry,
  RecordType,
  RecordStatus,
} from "./types";

export class LedgerError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "LedgerError";
  }
}

/**
 * Get all ledger entries for a user
 */
export async function getLedgerEntries(
  userId: string,
  options?: {
    recordType?: RecordType;
    status?: RecordStatus;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<LedgerEntry[]> {
  // Query the ledger_entries view

  let query = supabase
  .from("ledger_entries")
  .select("*")
  .eq("user_id", userId) // ← أضف السطر ده
  .order("created_at", { ascending: false });

  if (options?.recordType) {
    query = query.eq("record_type", options.recordType);
  }

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.startDate) {
    query = query.gte("created_at", options.startDate);
  }

  if (options?.endDate) {
    query = query.lte("created_at", options.endDate);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit ?? 50) - 1
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new LedgerError("Failed to get ledger entries", "DB_ERROR", error);
  }

  return (data ?? []) as LedgerEntry[];
}

/**
 * Get a single ledger entry by ID
 */
export async function getLedgerEntry(
  userId: string,
  entryId: string
): Promise<LedgerEntry | null> {
  const { data, error } = await supabase
  .from("ledger_entries")
  .select("*")
  .eq("id", entryId)
  .eq("user_id", userId) // ← أضف السطر ده
  .maybeSingle();
  if (error) {
    throw new LedgerError("Failed to get ledger entry", "DB_ERROR", error);
  }

  return data as LedgerEntry | null;
}

/**
 * Get record history (audit trail) for a specific record
 */
export async function getRecordHistory(
  userId: string,
  recordId: string
): Promise<RecordHistoryEntry[]> {
  const { data, error } = await supabase.rpc("get_record_history", {
    _user_id: userId,
    _record_id: recordId,
  });

  if (error) {
    throw new LedgerError("Failed to get record history", "DB_ERROR", error);
  }

  return (data ?? []) as RecordHistoryEntry[];
}

/**
 * Reverse a transfer (soft delete with audit trail)
 */
export async function reverseTransfer(
  userId: string,
  transferId: string,
  reason?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("reverse_transfer", {
    _user_id: userId,
    _transfer_id: transferId,
    _reason: reason ?? null,
  });

  if (error) {
    throw new LedgerError("Failed to reverse transfer", "DB_ERROR", error);
  }

  return data as boolean;
}

/**
 * Reverse a debt (soft delete with audit trail)
 */
export async function reverseDebt(
  userId: string,
  debtId: string,
  reason?: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc("reverse_debt", {
    _user_id: userId,
    _debt_id: debtId,
    _reason: reason ?? null,
  });

  if (error) {
    throw new LedgerError("Failed to reverse debt", "DB_ERROR", error);
  }

  return data as boolean;
}

/**
 * Log a record change manually (for client-side operations)
 */
export async function logRecordChange(
  userId: string,
  recordType: RecordType,
  recordId: string,
  action: "create" | "update" | "reverse" | "delete",
  changes: Record<string, unknown>,
  previousValues?: Record<string, unknown>,
  reason?: string
): Promise<string> {
  const { data, error } = await supabase.rpc("log_record_change", {
    _user_id: userId,
    _record_type: recordType,
    _record_id: recordId,
    _action: action,
    _changes: JSON.parse(JSON.stringify(changes)),
    _previous_values: previousValues ? JSON.parse(JSON.stringify(previousValues)) : null,
    _reason: reason ?? null,
  });

  if (error) {
    throw new LedgerError("Failed to log record change", "DB_ERROR", error);
  }

  return data as string;
}

/**
 * Update a transfer with audit trail
 */
export async function updateTransfer(
  userId: string,
  transferId: string,
  updates: {
    amount?: number;
    notes?: string;
    profit?: number;
  },
  reason?: string
): Promise<boolean> {
  // Get current values first
  const { data: current, error: fetchError } = await supabase
    .from("transfers")
    .select("*")
    .eq("id", transferId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !current) {
    throw new LedgerError("Transfer not found", "NOT_FOUND");
  }

  // Update the record
  const { error: updateError } = await supabase
    .from("transfers")
    .update(updates)
    .eq("id", transferId)
    .eq("user_id", userId);

  if (updateError) {
    throw new LedgerError("Failed to update transfer", "DB_ERROR", updateError);
  }

  // Log the change
  await logRecordChange(
    userId,
    "transfer",
    transferId,
    "update",
    updates,
    current,
    reason
  );

  return true;
}

/**
 * Update a debt with audit trail
 */
export async function updateDebt(
  userId: string,
  debtId: string,
  updates: {
    amount?: number;
    description?: string;
  },
  reason?: string
): Promise<boolean> {
  // Get current values first
  const { data: current, error: fetchError } = await supabase
    .from("debts")
    .select("*")
    .eq("id", debtId)
    .eq("user_id", userId)
    .single();

  if (fetchError || !current) {
    throw new LedgerError("Debt not found", "NOT_FOUND");
  }

  // Update the record
  const { error: updateError } = await supabase
    .from("debts")
    .update(updates)
    .eq("id", debtId)
    .eq("user_id", userId);

  if (updateError) {
    throw new LedgerError("Failed to update debt", "DB_ERROR", updateError);
  }

  // Log the change
  await logRecordChange(
    userId,
    "debt",
    debtId,
    "update",
    updates,
    current,
    reason
  );

  return true;
}

/**
 * Get ledger summary stats
 */
export async function getLedgerSummary(userId: string): Promise<{
  totalEntries: number;
  activeEntries: number;
  reversedEntries: number;
  todayEntries: number;
}> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
  .from("ledger_entries")
  .select("status, created_at")
  .eq("user_id", userId);
  
  if (error) {
    throw new LedgerError("Failed to get ledger summary", "DB_ERROR", error);
  }

  const entries = data ?? [];
  
  return {
    totalEntries: entries.length,
    activeEntries: entries.filter((e) => e.status === "active").length,
    reversedEntries: entries.filter((e) => e.status === "reversed" || e.status === "deleted").length,
    todayEntries: entries.filter((e) => e.created_at.startsWith(today)).length,
  };
}
