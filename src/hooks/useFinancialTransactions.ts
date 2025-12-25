// React hooks for financial transactions
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {
  createTransaction,
  recordCashTransfer,
  recordInventorySale,
  recordDebt,
  recordDebtPayment,
  reverseTransaction,
  getFinancialSummary,
  getCapitalBalance,
  getTotalProfit,
  getTransactions,
  TransactionError,
} from "@/lib/transactions";
import type {
  CreateTransactionInput,
  TransactionType,
  RelatedEntityType,
  TransactionStatus,
} from "@/lib/transactions";
import { useToast } from "./use-toast";

// Query keys for caching
export const TRANSACTION_QUERY_KEYS = {
  all: ["financial_transactions"] as const,
  summary: ["financial_summary"] as const,
  capital: ["capital_balance"] as const,
  profit: ["total_profit"] as const,
  list: (filters?: Record<string, unknown>) =>
    ["financial_transactions", "list", filters] as const,
};

/**
 * Hook to get financial summary (capital vs profit separation)
 */
export function useFinancialSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: TRANSACTION_QUERY_KEYS.summary,
    queryFn: () => getFinancialSummary(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to get capital balance only
 */
export function useCapitalBalance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: TRANSACTION_QUERY_KEYS.capital,
    queryFn: () => getCapitalBalance(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  });
}

/**
 * Hook to get total profit only
 */
export function useTotalProfit() {
  const { user } = useAuth();

  return useQuery({
    queryKey: TRANSACTION_QUERY_KEYS.profit,
    queryFn: () => getTotalProfit(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  });
}

/**
 * Hook to list transactions with filtering
 */
export function useTransactions(options?: {
  type?: TransactionType;
  entity?: RelatedEntityType;
  status?: TransactionStatus;
  limit?: number;
  offset?: number;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: TRANSACTION_QUERY_KEYS.list(options),
    queryFn: () => getTransactions(user!.id, options),
    enabled: !!user,
    staleTime: 1000 * 30, // 30 seconds
  });
}

/**
 * Hook to create a generic transaction
 */
export function useCreateTransaction() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateTransactionInput) =>
      createTransaction(user!.id, input),
    onSuccess: () => {
      // Invalidate all transaction-related queries
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.summary });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.capital });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.profit });
    },
    onError: (error: TransactionError) => {
      toast({
        title: "خطأ في العملية",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to record cash transfers (income/expense)
 */
export function useRecordCashTransfer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      type,
      amount,
      notes,
      fixedNumberId,
    }: {
      type: "income" | "expense";
      amount: number;
      notes?: string;
      fixedNumberId?: string;
    }) => recordCashTransfer(user!.id, type, amount, notes, fixedNumberId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.summary });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.capital });
      toast({
        title: variables.type === "income" ? "تم تسجيل الدخل" : "تم تسجيل المصروف",
      });
    },
    onError: (error: TransactionError) => {
      toast({
        title: "خطأ في العملية",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to record inventory sales with profit separation
 */
export function useRecordInventorySale() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      saleAmount,
      profitAmount,
      itemId,
      notes,
    }: {
      saleAmount: number;
      profitAmount: number;
      itemId: string;
      notes?: string;
    }) => recordInventorySale(user!.id, saleAmount, profitAmount, itemId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.summary });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.capital });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.profit });
      toast({
        title: "تم تسجيل البيع",
      });
    },
    onError: (error: TransactionError) => {
      toast({
        title: "خطأ في تسجيل البيع",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to record debts
 */
export function useRecordDebt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      amount,
      debtId,
      notes,
    }: {
      amount: number;
      debtId: string;
      notes?: string;
    }) => recordDebt(user!.id, amount, debtId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.summary });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.capital });
      toast({
        title: "تم تسجيل الدين",
      });
    },
    onError: (error: TransactionError) => {
      toast({
        title: "خطأ في تسجيل الدين",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to record debt payments
 */
export function useRecordDebtPayment() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      amount,
      debtId,
      notes,
    }: {
      amount: number;
      debtId: string;
      notes?: string;
    }) => recordDebtPayment(user!.id, amount, debtId, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.summary });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.capital });
      // Also invalidate debts queries
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      toast({
        title: "تم تسجيل السداد",
      });
    },
    onError: (error: TransactionError) => {
      toast({
        title: "خطأ في تسجيل السداد",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to reverse a transaction
 */
export function useReverseTransaction() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (transactionId: string) =>
      reverseTransaction(user!.id, transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.all });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.summary });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.capital });
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.profit });
      toast({
        title: "تم إلغاء العملية",
      });
    },
    onError: (error: TransactionError) => {
      toast({
        title: "خطأ في إلغاء العملية",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
