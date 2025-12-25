// Financial transaction types - core logic layer

export type TransactionType = 'income' | 'expense' | 'profit' | 'debt' | 'debt_payment';
export type RelatedEntityType = 'cash_transfer' | 'inventory_sale' | 'debt' | 'phone_number';
export type TransactionStatus = 'pending' | 'confirmed' | 'failed' | 'reversed';

export interface FinancialTransaction {
  id: string;
  user_id: string;
  transaction_type: TransactionType;
  amount: number;
  profit_amount: number;
  related_entity: RelatedEntityType;
  related_entity_id: string | null;
  status: TransactionStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateTransactionInput {
  transaction_type: TransactionType;
  amount: number;
  profit_amount?: number;
  related_entity: RelatedEntityType;
  related_entity_id?: string;
  notes?: string;
  status?: TransactionStatus;
}

export interface FinancialSummary {
  total_income: number;
  total_expense: number;
  total_profit: number;
  total_debt_given: number;
  total_debt_received: number;
  capital_balance: number;
}

// Transaction validation rules
export const TRANSACTION_RULES = {
  // Capital transactions (affect cash flow)
  CAPITAL_TYPES: ['income', 'expense', 'debt', 'debt_payment'] as TransactionType[],
  
  // Profit transactions (tracked separately)
  PROFIT_TYPES: ['profit'] as TransactionType[],
  
  // Valid entity mappings
  ENTITY_MAPPINGS: {
    cash_transfer: ['income', 'expense'],
    inventory_sale: ['income', 'profit'],
    debt: ['debt', 'debt_payment'],
    phone_number: ['income', 'expense'],
  } as Record<RelatedEntityType, TransactionType[]>,
} as const;

// Validate transaction type matches entity
export function validateTransactionEntity(
  type: TransactionType,
  entity: RelatedEntityType
): boolean {
  const allowedTypes = TRANSACTION_RULES.ENTITY_MAPPINGS[entity];
  return allowedTypes.includes(type);
}

// Check if transaction affects capital
export function isCapitalTransaction(type: TransactionType): boolean {
  return TRANSACTION_RULES.CAPITAL_TYPES.includes(type);
}

// Check if transaction is profit-related
export function isProfitTransaction(type: TransactionType): boolean {
  return TRANSACTION_RULES.PROFIT_TYPES.includes(type);
}
