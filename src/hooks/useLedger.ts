// React hooks for ledger management
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import {
  getLedgerEntries,
  getLedgerEntry,
  getRecordHistory,
  reverseTransfer,
  reverseDebt,
  updateTransfer,
  updateDebt,
  getLedgerSummary,
  LedgerError,
} from "@/lib/ledger";
import type { RecordType, RecordStatus } from "@/lib/ledger";
import { useToast } from "./use-toast";
import { FIXED_NUMBERS_QUERY_KEYS, TRANSFERS_QUERY_KEYS } from "@/lib/queryKeys";


// Query keys
export const LEDGER_QUERY_KEYS = {
  all: ["ledger"] as const,
  entries: (filters?: Record<string, unknown>) =>
    ["ledger", "entries", filters] as const,
  entry: (id: string) => ["ledger", "entry", id] as const,
  history: (recordId: string) => ["ledger", "history", recordId] as const,
  summary: ["ledger", "summary"] as const,
};

/**
 * Hook to get ledger entries with filtering
 */
export function useLedgerEntries(options?: {
  recordType?: RecordType;
  status?: RecordStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const { user } = useAuth();

  return useQuery({
    queryKey: LEDGER_QUERY_KEYS.entries(options),
    queryFn: () => getLedgerEntries(user!.id, options),
    enabled: !!user,
    staleTime: 1000 * 30,
  });
}

/**
 * Hook to get a single ledger entry
 */
export function useLedgerEntry(entryId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: LEDGER_QUERY_KEYS.entry(entryId),
    queryFn: () => getLedgerEntry(user!.id, entryId),
    enabled: !!user && !!entryId,
    staleTime: 1000 * 60,
  });
}

/**
 * Hook to get record history (audit trail)
 */
export function useRecordHistory(recordId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: LEDGER_QUERY_KEYS.history(recordId),
    queryFn: () => getRecordHistory(user!.id, recordId),
    enabled: !!user && !!recordId,
    staleTime: 1000 * 60,
  });
}

/**
 * Hook to get ledger summary
 */
export function useLedgerSummary() {
  const { user } = useAuth();

  return useQuery({
    queryKey: LEDGER_QUERY_KEYS.summary,
    queryFn: () => getLedgerSummary(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60,
  });
}

// Helper to invalidate ledger queries
function useInvalidateLedgerQueries() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return () => {
    queryClient.invalidateQueries({ queryKey: LEDGER_QUERY_KEYS.all });

    // Also invalidate related queries (single source of truth: transfers table)
    queryClient.invalidateQueries({ queryKey: TRANSFERS_QUERY_KEYS.all(user?.id) });
    queryClient.invalidateQueries({ queryKey: FIXED_NUMBERS_QUERY_KEYS.all(user?.id) });
    queryClient.invalidateQueries({ queryKey: ["debts"] });
    queryClient.invalidateQueries({ queryKey: ["profits"] });
  };
}


/**
 * Hook to reverse a transfer
 */
export function useReverseTransfer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const invalidate = useInvalidateLedgerQueries();

  return useMutation({
    mutationFn: ({
      transferId,
      reason,
    }: {
      transferId: string;
      reason?: string;
    }) => reverseTransfer(user!.id, transferId, reason),
    onSuccess: () => {
      invalidate();
      toast({
        title: "تم إلغاء التحويل",
        description: "تم تسجيل الإلغاء في السجل",
      });
    },
    onError: (error: LedgerError) => {
      toast({
        title: "خطأ في إلغاء التحويل",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to reverse a debt
 */
export function useReverseDebt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const invalidate = useInvalidateLedgerQueries();

  return useMutation({
    mutationFn: ({ debtId, reason }: { debtId: string; reason?: string }) =>
      reverseDebt(user!.id, debtId, reason),
    onSuccess: () => {
      invalidate();
      toast({
        title: "تم إلغاء الدين",
        description: "تم تسجيل الإلغاء في السجل",
      });
    },
    onError: (error: LedgerError) => {
      toast({
        title: "خطأ في إلغاء الدين",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to update a transfer with audit trail
 */
export function useUpdateTransfer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const invalidate = useInvalidateLedgerQueries();

  return useMutation({
    mutationFn: ({
      transferId,
      updates,
      reason,
    }: {
      transferId: string;
      updates: { amount?: number; notes?: string; profit?: number };
      reason?: string;
    }) => updateTransfer(user!.id, transferId, updates, reason),
    onSuccess: () => {
      invalidate();
      toast({
        title: "تم تحديث التحويل",
        description: "تم حفظ التغييرات في السجل",
      });
    },
    onError: (error: LedgerError) => {
      toast({
        title: "خطأ في تحديث التحويل",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook to update a debt with audit trail
 */
export function useUpdateDebt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const invalidate = useInvalidateLedgerQueries();

  return useMutation({
    mutationFn: ({
      debtId,
      updates,
      reason,
    }: {
      debtId: string;
      updates: { amount?: number; description?: string };
      reason?: string;
    }) => updateDebt(user!.id, debtId, updates, reason),
    onSuccess: () => {
      invalidate();
      toast({
        title: "تم تحديث الدين",
        description: "تم حفظ التغييرات في السجل",
      });
    },
    onError: (error: LedgerError) => {
      toast({
        title: "خطأ في تحديث الدين",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}