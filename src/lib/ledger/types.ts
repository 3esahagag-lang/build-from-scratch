// Ledger types - unified record system

export type RecordType = 'transfer' | 'inventory_sale' | 'inventory_add' | 'debt' | 'debt_payment' | 'fixed_number_transfer';
export type RecordAction = 'create' | 'update' | 'reverse' | 'delete';
export type RecordStatus = 'active' | 'reversed' | 'deleted';

export interface LedgerEntry {
  id: string;
  user_id: string;
  record_type: RecordType;
  sub_type: string;
  amount: number;
  profit: number;
  description: string | null;
  related_entity_id: string | null;
  related_entity_type: string;
  related_entity_name: string | null;
  status: RecordStatus;
  created_at: string;
}

export interface RecordHistoryEntry {
  id: string;
  action: RecordAction;
  changes: Record<string, unknown>;
  previous_values: Record<string, unknown> | null;
  reason: string | null;
  created_at: string;
}

// Labels for record types (Arabic)
export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  transfer: 'تحويل',
  inventory_sale: 'بيع',
  inventory_add: 'إضافة مخزون',
  debt: 'دين',
  debt_payment: 'سداد دين',
  fixed_number_transfer: 'تحويل رقم ثابت',
};

// Labels for record actions (Arabic)
export const RECORD_ACTION_LABELS: Record<RecordAction, string> = {
  create: 'إنشاء',
  update: 'تعديل',
  reverse: 'إلغاء',
  delete: 'حذف',
};

// Labels for record status (Arabic)
export const RECORD_STATUS_LABELS: Record<RecordStatus, string> = {
  active: 'نشط',
  reversed: 'ملغي',
  deleted: 'محذوف',
};

// Financial impact calculation
export interface FinancialImpact {
  capitalChange: number;  // Effect on capital
  profitChange: number;   // Effect on profit
  direction: 'positive' | 'negative' | 'neutral';
}

export function calculateFinancialImpact(entry: LedgerEntry): FinancialImpact {
  let capitalChange = 0;
  let profitChange = Number(entry.profit) || 0;

  switch (entry.record_type) {
    case 'transfer':
    case 'fixed_number_transfer':
      capitalChange = entry.sub_type === 'income' 
        ? Number(entry.amount) 
        : -Number(entry.amount);
      break;
    
    case 'inventory_sale':
      capitalChange = Number(entry.amount) * (Number(entry.profit) || 0); // Revenue from sale
      profitChange = Number(entry.profit) || 0;
      break;
    
    case 'inventory_add':
      capitalChange = 0; // Adding inventory doesn't change capital directly
      break;
    
    case 'debt':
      capitalChange = entry.sub_type === 'owed_to_me' 
        ? -Number(entry.amount)  // Money lent out
        : Number(entry.amount);  // Money borrowed
      break;
    
    case 'debt_payment':
      capitalChange = entry.sub_type === 'owed_to_me'
        ? Number(entry.amount)   // Money received back
        : -Number(entry.amount); // Money paid back
      break;
  }

  const direction = capitalChange > 0 ? 'positive' 
    : capitalChange < 0 ? 'negative' 
    : 'neutral';

  return { capitalChange, profitChange, direction };
}

// What happened? - description generator
export function getWhatHappened(entry: LedgerEntry): string {
  switch (entry.record_type) {
    case 'transfer':
      return entry.sub_type === 'income' ? 'استلام مبلغ' : 'صرف مبلغ';
    case 'fixed_number_transfer':
      return `تحويل إلى ${entry.related_entity_name || 'رقم ثابت'}`;
    case 'inventory_sale':
      return `بيع ${entry.description || 'منتج'}`;
    case 'inventory_add':
      return `إضافة ${entry.description || 'منتج'}`;
    case 'debt':
      return entry.sub_type === 'owed_to_me' ? 'إقراض مبلغ' : 'اقتراض مبلغ';
    case 'debt_payment':
      return entry.sub_type === 'owed_to_me' ? 'استرداد دين' : 'سداد دين';
    default:
      return 'عملية مالية';
  }
}

// Why did it happen? - reason generator
export function getWhyItHappened(entry: LedgerEntry): string {
  if (entry.description) return entry.description;
  
  switch (entry.record_type) {
    case 'transfer':
      return entry.sub_type === 'income' ? 'دخل نقدي' : 'مصروف نقدي';
    case 'fixed_number_transfer':
      return `تحويل لـ ${entry.related_entity_name || 'رقم ثابت'}`;
    case 'inventory_sale':
      return `بيع من المخزون`;
    case 'inventory_add':
      return 'تعبئة المخزون';
    case 'debt':
    case 'debt_payment':
      return entry.related_entity_name || 'معاملة دين';
    default:
      return 'غير محدد';
  }
}
