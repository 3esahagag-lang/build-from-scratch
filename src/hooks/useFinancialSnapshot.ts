import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfDay,
  format
} from "date-fns";

export type SnapshotPeriod = "today" | "week" | "month";

interface FinancialSnapshot {
  netBalance: number;
  totalProfit: number;
  debtsOwedToYou: number;
  debtsYouOwe: number;
  lowStockItems: number;
}

function getPeriodRange(period: SnapshotPeriod) {
  const now = new Date();
  const end = endOfDay(now);

  switch (period) {
    case "today":
      return { start: startOfDay(now), end };
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 6 }), end };
    case "month":
      return { start: startOfMonth(now), end };
  }
}

export function useFinancialSnapshot(period: SnapshotPeriod = "today") {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["financial-snapshot", user?.id, period],
    enabled: !!user?.id,

    queryFn: async (): Promise<FinancialSnapshot> => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { start, end } = getPeriodRange(period);
      const startStr = format(start, "yyyy-MM-dd'T'HH:mm:ss");
      const endStr = format(end, "yyyy-MM-dd'T'HH:mm:ss");

      /* ======================
         التحويلات
      ====================== */
      const { data: transfers, error: transfersError } = await supabase
        .from("transfers")
        .select("type, amount")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .gte("created_at", startStr)
        .lte("created_at", endStr);

      if (transfersError) throw transfersError;

      let netBalance = 0;

      (transfers || []).forEach((t) => {
        if (t.type === "income") {
          netBalance += Number(t.amount);
        } else if (t.type === "expense") {
          netBalance -= Number(t.amount);
        }
      });

      /* ======================
         الأرباح
         (حالياً غير محسوبة تلقائياً)
      ====================== */
      const totalProfit = 0;

      /* ======================
         السلف
      ====================== */
      const { data: debts, error: debtsError } = await supabase
        .from("debts")
        .select("type")
        .eq("user_id", user.id)
        .eq("is_paid", false)
        .eq("is_archived", false);

      if (debtsError) throw debtsError;

      let debtsOwedToYou = 0;
      let debtsYouOwe = 0;

      (debts || []).forEach((d) => {
        if (d.type === "owed_to_me") debtsOwedToYou++;
        if (d.type === "owed_by_me") debtsYouOwe++;
      });

      /* ======================
         مخزون منخفض
      ====================== */
      const { data: lowStock, error: stockError } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .lte("quantity", 5);

      if (stockError) throw stockError;

      return {
        netBalance,
        totalProfit,
        debtsOwedToYou,
        debtsYouOwe,
        lowStockItems: lowStock?.length || 0,
      };
    },

    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
