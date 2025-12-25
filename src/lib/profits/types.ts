// Profit types - first-class entity

export type ProfitSourceType = 'inventory_sale' | 'cash_transfer';

export interface Profit {
  id: string;
  user_id: string;
  source_type: ProfitSourceType;
  source_id: string | null;
  transaction_id: string | null;
  amount: number;
  quantity: number | null;
  unit_type: string | null;
  profit_per_unit: number | null;
  notes: string | null;
  created_at: string;
}

export interface CreateProfitInput {
  source_type: ProfitSourceType;
  source_id?: string;
  transaction_id?: string;
  amount: number;
  quantity?: number;
  unit_type?: string;
  profit_per_unit?: number;
  notes?: string;
}

export interface CreateInventoryProfitInput {
  source_id: string;
  transaction_id?: string;
  quantity: number;
  unit_type: string;
  profit_per_unit: number;
  notes?: string;
}

export interface CreateTransferProfitInput {
  source_id?: string;
  transaction_id?: string;
  amount: number;
  notes?: string;
}

export interface ProfitSummary {
  total_profit: number;
  inventory_profit: number;
  transfer_profit: number;
  today_profit: number;
}

export interface DailyProfitBreakdown {
  profit_date: string;
  total_amount: number;
  inventory_amount: number;
  transfer_amount: number;
}
