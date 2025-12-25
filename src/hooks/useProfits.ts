// React hooks for profit management
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {
  createProfit,
  recordInventoryProfit,
  recordTransferProfit,
  getProfitSummary,
  getTotalProfit,
  getDailyProfit,
  getProfitBySource,
  getProfitByDateRange,
  getProfits,
  getProfitByTransaction,
  ProfitError,
} from "@/lib/profits";
import type {
  CreateProfitInput,
  CreateInventoryProfitInput,
  CreateTransferProfitInput,
  ProfitSourceType,
} from "@/lib/profits";
import { useToast } from "./use-toast";

// Query keys for caching
export const PROFIT_QUERY_KEYS = {
  all: ["profits"] as const,
  summary: ["profit_summary"] as const,
  total: ["total_profit"] as const,
  daily: (date?: string) => ["daily_profit", date] as const,
  bySource: (source: ProfitSourceType) => ["profit_by_source", source] as const,
  byDateRange: (start: string, end: string) =>
    ["profit_by_date_range", start, end] as const,
  list: (filters?: Record<string, unknown>) =>
    ["profits", "list", filters] as const,
  byTransaction: (transactionId: string) =>
    ["profit_by_transaction", transactionId] as const,
};

/**
 * Hook to get profit summary
 */
export function useProfitSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: PROFIT_QUERY_KEYS.summary,
    queryFn: () => getProfitSummary(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  });
}

/**
 * Hook to get total profit
 */
export function useTotalProfit() {
  const { user } = useAuth();

  return useQuery({
    queryKey: PROFIT_QUERY_KEYS.total,
    queryFn: () => getTotalProfit(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  });
}

/**
 * Hook to get daily profit
 */
export function useDailyProfit(date?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: PROFIT_QUERY_KEYS.daily(date),
    queryFn: () => getDailyProfit(user!.id, date),
    enabled: !!user,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to get profit by source type
 */
export function useProfitBySource(sourceType: ProfitSourceType) {
  const { user } = useAuth();

  return useQuery({
    queryKey: PROFIT_QUERY_KEYS.bySource(sourceType),
    queryFn: () => getProfitBySource(user!.id, sourceType),
    enabled: !!user,
    staleTime: 1000 * 60,
  });
}

/**
 * Hook to get profit breakdown by date range
 */
export function useProfitByDateRange(startDate: string, endDate: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: PROFIT_QUERY_KEYS.byDateRange(startDate, endDate),
    queryFn: () => getProfitByDateRange(user!.id, startDate, endDate),
    enabled: !!user && !!startDate && !!endDate,
    staleTime: 1000 * 60,
  });
}

/**
 * Hook to list profits with filtering
 */
export function useProfits(options?: {
  sourceType?: ProfitSourceType;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: PROFIT_QUERY_KEYS.list(options),
    queryFn: () => getProfits(user!.id, options),
    enabled: !!user,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to get profit by transaction
 */
export function useProfitByTransaction(transactionId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: PROFIT_QUERY_KEYS.byTransaction(transactionId),
    queryFn: () => getProfitByTransaction(user!.id, transactionId),
    enabled: !!user && !!transactionId,
    staleTime: 1000 * 60,
  });
}

// Helper to invalidate all profit queries
function useInvalidateProfitQueries() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: PROFIT_QUERY_KEYS.all });
    queryClient.invalidateQueries({ queryKey: PROFIT_QUERY_KEYS.summary });
    queryClient.invalidateQueries({ queryKey: PROFIT_QUERY_KEYS.total });
    queryClient.invalidateQueries({ queryKey: PROFIT_QUERY_KEYS.daily() });
  };
}

/**
 * Hook to create a generic profit record
 */
export function useCreateProfit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const invalidate = useInvalidateProfitQueries();

  return useMutation({
    mutationFn: (input: CreateProfitInput) => createProfit(user!.id, input),
    onSuccess: () => {
      invalidate();
    },
    onError: (error: ProfitError) => {
      toast({
        title: "خطأ في تسجيل الربح",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to record inventory sale profit
 */
export function useRecordInventoryProfit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const invalidate = useInvalidateProfitQueries();

  return useMutation({
    mutationFn: (input: CreateInventoryProfitInput) =>
      recordInventoryProfit(user!.id, input),
    onSuccess: () => {
      invalidate();
      toast({
        title: "تم تسجيل ربح البيع",
      });
    },
    onError: (error: ProfitError) => {
      toast({
        title: "خطأ في تسجيل الربح",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to record transfer profit (commission/margin)
 */
export function useRecordTransferProfit() {
  const { user } = useAuth();
  const { toast } = useToast();
  const invalidate = useInvalidateProfitQueries();

  return useMutation({
    mutationFn: (input: CreateTransferProfitInput) =>
      recordTransferProfit(user!.id, input),
    onSuccess: () => {
      invalidate();
      toast({
        title: "تم تسجيل العمولة",
      });
    },
    onError: (error: ProfitError) => {
      toast({
        title: "خطأ في تسجيل العمولة",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
