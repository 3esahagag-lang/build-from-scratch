import { useState, useEffect, useCallback } from "react";

/**
 * Hook to track online/offline status
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook to prevent double submissions
 */
export function usePreventDoubleSubmit() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wrapSubmit = useCallback(
    async <T,>(submitFn: () => Promise<T>): Promise<T | null> => {
      if (isSubmitting) {
        console.warn("[usePreventDoubleSubmit] Blocked duplicate submission");
        return null;
      }

      setIsSubmitting(true);
      try {
        return await submitFn();
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting]
  );

  return { isSubmitting, wrapSubmit };
}

/**
 * Hook for operation with retry capability
 */
export function useOperationWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: Error, attempt: number) => void;
    onMaxRetriesReached?: () => void;
  } = {}
) {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onSuccess,
    onError,
    onMaxRetriesReached,
  } = options;

  const [state, setState] = useState<{
    status: "idle" | "pending" | "success" | "error";
    data: T | null;
    error: Error | null;
    attempt: number;
  }>({
    status: "idle",
    data: null,
    error: null,
    attempt: 0,
  });

  const execute = useCallback(async () => {
    setState((prev) => ({ ...prev, status: "pending", error: null }));

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const data = await operation();
        setState({ status: "success", data, error: null, attempt });
        onSuccess?.(data);
        return data;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        onError?.(err, attempt);

        if (attempt === maxRetries) {
          setState({ status: "error", data: null, error: err, attempt });
          onMaxRetriesReached?.();
          throw err;
        }

        // Wait before retry
        await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
      }
    }

    return null;
  }, [operation, maxRetries, retryDelay, onSuccess, onError, onMaxRetriesReached]);

  const reset = useCallback(() => {
    setState({ status: "idle", data: null, error: null, attempt: 0 });
  }, []);

  return {
    ...state,
    execute,
    reset,
    isLoading: state.status === "pending",
    isSuccess: state.status === "success",
    isError: state.status === "error",
  };
}

/**
 * Hook for optimistic updates with rollback
 */
export function useOptimisticUpdate<T>() {
  const [optimisticData, setOptimisticData] = useState<T | null>(null);
  const [rollbackData, setRollbackData] = useState<T | null>(null);

  const applyOptimistic = useCallback((currentData: T, newData: T) => {
    setRollbackData(currentData);
    setOptimisticData(newData);
  }, []);

  const commit = useCallback(() => {
    setRollbackData(null);
    // Keep optimistic data as confirmed
  }, []);

  const rollback = useCallback(() => {
    if (rollbackData !== null) {
      setOptimisticData(rollbackData);
      setRollbackData(null);
    }
  }, [rollbackData]);

  return {
    data: optimisticData,
    applyOptimistic,
    commit,
    rollback,
    hasUnsavedChanges: rollbackData !== null,
  };
}

/**
 * Hook to confirm leaving page with unsaved changes
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "لديك تغييرات غير محفوظة. هل تريد المغادرة؟";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);
}
