// Profit Service - First-class profit entity management
import { supabase } from "@/integrations/supabase/client";
import type {
  Profit,
  CreateProfitInput,
  CreateInventoryProfitInput,
  CreateTransferProfitInput,
  ProfitSummary,
  DailyProfitBreakdown,
  ProfitSourceType,
} from "./types";

export class ProfitError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ProfitError";
  }
}

/**
 * Create a profit record
 */
export async function createProfit(
  userId: string,
  input: CreateProfitInput
): Promise<Profit> {
  if (input.amount < 0) {
    throw new ProfitError("Profit amount must be positive", "INVALID_AMOUNT");
  }

  const { data, error } = await supabase
    .from("profits")
    .insert({
      user_id: userId,
      source_type: input.source_type,
      source_id: input.source_id ?? null,
      transaction_id: input.transaction_id ?? null,
      amount: input.amount,
      quantity: input.quantity ?? null,
      unit_type: input.unit_type ?? null,
      profit_per_unit: input.profit_per_unit ?? null,
      notes: input.notes ?? null,
    })
    .select()
    .single();

  if (error) {
    throw new ProfitError("Failed to create profit record", "DB_ERROR", error);
  }

  return data as Profit;
}

/**
 * Record profit from inventory sale
 * Automatically calculates total from quantity × profit_per_unit
 */
export async function recordInventoryProfit(
  userId: string,
  input: CreateInventoryProfitInput
): Promise<Profit> {
  const totalProfit = input.quantity * input.profit_per_unit;

  return createProfit(userId, {
    source_type: "inventory_sale",
    source_id: input.source_id,
    transaction_id: input.transaction_id,
    amount: totalProfit,
    quantity: input.quantity,
    unit_type: input.unit_type,
    profit_per_unit: input.profit_per_unit,
    notes: input.notes,
  });
}

/**
 * Record profit from cash transfer (commission/margin)
 */
export async function recordTransferProfit(
  userId: string,
  input: CreateTransferProfitInput
): Promise<Profit> {
  return createProfit(userId, {
    source_type: "cash_transfer",
    source_id: input.source_id,
    transaction_id: input.transaction_id,
    amount: input.amount,
    notes: input.notes,
  });
}

/**
 * Get profit summary for user
 */
export async function getProfitSummary(userId: string): Promise<ProfitSummary> {
  const { data, error } = await supabase.rpc("get_profit_summary", {
    _user_id: userId,
  });

  if (error) {
    throw new ProfitError("Failed to get profit summary", "DB_ERROR", error);
  }

  if (!data || data.length === 0) {
    return {
      total_profit: 0,
      inventory_profit: 0,
      transfer_profit: 0,
      today_profit: 0,
    };
  }

  return data[0] as ProfitSummary;
}

/**
 * Get total profit for user
 */
export async function getTotalProfit(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_user_total_profit", {
    _user_id: userId,
  });

  if (error) {
    throw new ProfitError("Failed to get total profit", "DB_ERROR", error);
  }

  return data ?? 0;
}

/**
 * Get daily profit for a specific date
 */
export async function getDailyProfit(
  userId: string,
  date?: string
): Promise<number> {
  const { data, error } = await supabase.rpc("get_daily_profit", {
    _user_id: userId,
    _date: date ?? new Date().toISOString().split("T")[0],
  });

  if (error) {
    throw new ProfitError("Failed to get daily profit", "DB_ERROR", error);
  }

  return data ?? 0;
}

/**
 * Get profit by source type
 */
export async function getProfitBySource(
  userId: string,
  sourceType: ProfitSourceType
): Promise<number> {
  const { data, error } = await supabase.rpc("get_profit_by_source", {
    _user_id: userId,
    _source_type: sourceType,
  });

  if (error) {
    throw new ProfitError("Failed to get profit by source", "DB_ERROR", error);
  }

  return data ?? 0;
}

/**
 * Get profit breakdown by date range
 */
export async function getProfitByDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<DailyProfitBreakdown[]> {
  const { data, error } = await supabase.rpc("get_profit_by_date_range", {
    _user_id: userId,
    _start_date: startDate,
    _end_date: endDate,
  });

  if (error) {
    throw new ProfitError(
      "Failed to get profit by date range",
      "DB_ERROR",
      error
    );
  }

  return (data ?? []) as DailyProfitBreakdown[];
}

/**
 * Get all profit records with filtering
 */
export async function getProfits(
  userId: string,
  options?: {
    sourceType?: ProfitSourceType;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }
): Promise<Profit[]> {
  let query = supabase
    .from("profits")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (options?.sourceType) {
    query = query.eq("source_type", options.sourceType);
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
    throw new ProfitError("Failed to get profits", "DB_ERROR", error);
  }

  return (data ?? []) as Profit[];
}

/**
 * Get profit for a specific transaction
 */
export async function getProfitByTransaction(
  userId: string,
  transactionId: string
): Promise<Profit | null> {
  const { data, error } = await supabase
    .from("profits")
    .select("*")
    .eq("user_id", userId)
    .eq("transaction_id", transactionId)
    .maybeSingle();

  if (error) {
    throw new ProfitError(
      "Failed to get profit by transaction",
      "DB_ERROR",
      error
    );
  }

  return data as Profit | null;
}
