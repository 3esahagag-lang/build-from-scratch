// React hooks for atomic transaction operations
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { FIXED_NUMBERS_QUERY_KEYS, TRANSFERS_QUERY_KEYS } from "@/lib/queryKeys";
import {
  createPendingTransfer,
  createPendingDebt,
  executeMultiStepOperation,
  AtomicTransactionError,
} from "@/lib/transactions/atomic";


/**
 * Hook for creating transfers with two-phase commit
 * Uses transfers table directly
 */
export function useAtomicTransfer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      amount: number;
      type: string;
      notes?: string;
      profit?: number;
      fixedNumberId?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const pending = await createPendingTransfer(user.id, data);

      try {
        await pending.confirm();
        return { success: true, transferId: pending.transferId };
      } catch (error) {
        // Auto-rollback on confirm failure
        await pending.cancel();
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSFERS_QUERY_KEYS.all(user?.id) });
      queryClient.invalidateQueries({ queryKey: FIXED_NUMBERS_QUERY_KEYS.all(user?.id) });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      toast({
        title: "تم تسجيل التحويل",
        description: "تم حفظ التحويل بنجاح",
      });
    },
    onError: (error: AtomicTransactionError) => {
      toast({
        title: "فشل في التحويل",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook for creating debts with two-phase commit
 */
export function useAtomicDebt() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      amount: number;
      type: string;
      description: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const pending = await createPendingDebt(user.id, data);

      try {
        await pending.confirm();
        return { success: true, debtId: pending.debtId };
      } catch (error) {
        await pending.cancel();
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      toast({
        title: "تم تسجيل الدين",
        description: "تم حفظ الدين بنجاح",
      });
    },
    onError: (error: AtomicTransactionError) => {
      toast({
        title: "فشل في تسجيل الدين",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook for executing multi-step operations atomically
 */
export function useAtomicMultiStep<T>() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (steps: Array<{
      name: string;
      execute: () => Promise<unknown>;
      rollback: () => Promise<void>;
    }>) => {
      const result = await executeMultiStepOperation<T>(steps);
      if (!result.success) {
        throw result.error;
      }
      return result;
    },
    onSuccess: () => {
      // Invalidate all financial queries
      queryClient.invalidateQueries({ queryKey: TRANSFERS_QUERY_KEYS.all(user?.id) });
      queryClient.invalidateQueries({ queryKey: FIXED_NUMBERS_QUERY_KEYS.all(user?.id) });
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["ledger"] });
      queryClient.invalidateQueries({ queryKey: ["profits"] });
    },
    onError: (error: AtomicTransactionError) => {
      toast({
        title: `فشل في العملية: ${error.stage}`,
        description: error.message,
        variant: "destructive",
      });
    },
  });
}