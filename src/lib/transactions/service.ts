// Financial Transaction Service - Core business logic layer
import { supabase } from "@/integrations/supabase/client";
import type {
  FinancialTransaction,
  CreateTransactionInput,
  FinancialSummary,
  TransactionType,
  RelatedEntityType,
  TransactionStatus,
} from "./types";
import { validateTransactionEntity } from "./types";

export class TransactionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "TransactionError";
  }
}

/**
 * Create a new financial transaction
 * Enforces separation of capital from profit
 */
export async function createTransaction(
  userId: string,
  input: CreateTransactionInput
): Promise<FinancialTransaction> {
  // Validate transaction type matches entity
  if (!validateTransactionEntity(input.transaction_type, input.related_entity)) {
    throw new TransactionError(
      `Invalid transaction: ${input.transaction_type} cannot be used with ${input.related_entity}`,
      "INVALID_ENTITY_TYPE"
    );
  }

  // Ensure amount is positive
  if (input.amount < 0) {
    throw new TransactionError(
      "Transaction amount must be positive",
      "INVALID_AMOUNT"
    );
  }

  // Ensure profit is positive if provided
  if (input.profit_amount !== undefined && input.profit_amount < 0) {
    throw new TransactionError(
      "Profit amount must be positive",
      "INVALID_PROFIT"
    );
  }

  const { data, error } = await supabase
    .from("financial_transactions")
    .insert({
      user_id: userId,
      transaction_type: input.transaction_type,
      amount: input.amount,
      profit_amount: input.profit_amount ?? 0,
      related_entity: input.related_entity,
      related_entity_id: input.related_entity_id ?? null,
      notes: input.notes ?? null,
      status: input.status ?? "confirmed",
    })
    .select()
    .single();

  if (error) {
    throw new TransactionError(
      "Failed to create transaction",
      "DB_ERROR",
      error
    );
  }

  return data as FinancialTransaction;
}

/**
 * Record a cash transfer (income or expense)
 * Capital-only transaction, no profit mixing
 * Uses the transfers table directly
 */
export async function recordCashTransfer(
  userId: string,
  type: "income" | "expense",
  amount: number,
  notes?: string,
  fixedNumberId?: string
): Promise<{ id: string }> {
  // Insert directly into transfers table
  const { data, error } = await supabase
    .from("transfers")
    .insert({
      user_id: userId,
      amount,
      type,
      notes: notes ?? null,
      fixed_number_id: fixedNumberId ?? null,
      is_archived: false,
    })
    .select("id")
    .single();

  if (error) {
    throw new TransactionError(
      "Failed to create transfer",
      "DB_ERROR",
      error
    );
  }

  return { id: data.id };
}

/**
 * Record an inventory sale with separate profit tracking
 * Creates income transaction + profit amount
 */
export async function recordInventorySale(
  userId: string,
  saleAmount: number,
  profitAmount: number,
  itemId: string,
  notes?: string
): Promise<FinancialTransaction> {
  return createTransaction(userId, {
    transaction_type: "income",
    amount: saleAmount,
    profit_amount: profitAmount,
    related_entity: "inventory_sale",
    related_entity_id: itemId,
    notes,
  });
}

/**
 * Record a debt (money lent out or borrowed)
 * Capital transaction that tracks obligation
 */
export async function recordDebt(
  userId: string,
  amount: number,
  debtId: string,
  notes?: string
): Promise<FinancialTransaction> {
  return createTransaction(userId, {
    transaction_type: "debt",
    amount,
    related_entity: "debt",
    related_entity_id: debtId,
    notes,
  });
}

/**
 * Record a debt payment (receiving payment or paying back)
 * Capital transaction that resolves obligation
 */
export async function recordDebtPayment(
  userId: string,
  amount: number,
  debtId: string,
  notes?: string
): Promise<FinancialTransaction> {
  return createTransaction(userId, {
    transaction_type: "debt_payment",
    amount,
    related_entity: "debt",
    related_entity_id: debtId,
    notes,
  });
}

/**
 * Reverse a transaction (mark as reversed)
 * Does not delete, maintains audit trail
 */
export async function reverseTransaction(
  userId: string,
  transactionId: string
): Promise<FinancialTransaction> {
  const { data, error } = await supabase
    .from("financial_transactions")
    .update({ status: "reversed" as TransactionStatus })
    .eq("id", transactionId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw new TransactionError(
      "Failed to reverse transaction",
      "DB_ERROR",
      error
    );
  }

  return data as FinancialTransaction;
}

/**
 * Get user's financial summary
 * Separates capital from profit clearly
 */
export async function getFinancialSummary(
  userId: string
): Promise<FinancialSummary> {
  const { data, error } = await supabase.rpc("get_financial_summary", {
    _user_id: userId,
  });

  if (error) {
    throw new TransactionError(
      "Failed to get financial summary",
      "DB_ERROR",
      error
    );
  }

  // Handle empty result
  if (!data || data.length === 0) {
    return {
      total_income: 0,
      total_expense: 0,
      total_profit: 0,
      total_debt_given: 0,
      total_debt_received: 0,
      capital_balance: 0,
    };
  }

  return data[0] as FinancialSummary;
}

/**
 * Get capital balance only (excluding profit)
 */
export async function getCapitalBalance(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_capital_balance", {
    _user_id: userId,
  });

  if (error) {
    throw new TransactionError(
      "Failed to get capital balance",
      "DB_ERROR",
      error
    );
  }

  return data ?? 0;
}

/**
 * Get total profit only
 */
export async function getTotalProfit(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_total_profit", {
    _user_id: userId,
  });

  if (error) {
    throw new TransactionError("Failed to get total profit", "DB_ERROR", error);
  }

  return data ?? 0;
}

/**
 * Get transactions with filtering
 */
export async function getTransactions(
  userId: string,
  options?: {
    type?: TransactionType;
    entity?: RelatedEntityType;
    status?: TransactionStatus;
    limit?: number;
    offset?: number;
  }
): Promise<FinancialTransaction[]> {
  let query = supabase
    .from("financial_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (options?.type) {
    query = query.eq("transaction_type", options.type);
  }

  if (options?.entity) {
    query = query.eq("related_entity", options.entity);
  }

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 50) - 1);
  }

  const { data, error } = await query;

  if (error) {
    throw new TransactionError(
      "Failed to get transactions",
      "DB_ERROR",
      error
    );
  }

  return (data ?? []) as FinancialTransaction[];
}