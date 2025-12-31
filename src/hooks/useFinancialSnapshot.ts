import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { startOfDay, startOfWeek, startOfMonth, endOfDay } from "date-fns";


export type SnapshotPeriod = "today" | "week" | "month";

interface FinancialSnapshot {
  netBalance: number;
  totalProfit: number;
  debtsOwedToYou: number;
  debtsYouOwe: number;
  lowStockItems: number;
}

function getPeriodRange(period: SnapshotPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = endOfDay(now);
  
  switch (period) {
    case "today":
      return { start: startOfDay(now), end };
    case "week":
      return { start: startOfWeek(now, { weekStartsOn: 6 }), end }; // Saturday start for Arabic week
    case "month":
      return { start: startOfMonth(now), end };
  }
}

export function useFinancialSnapshot(period: SnapshotPeriod = "today") {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["financial-snapshot", user?.id, period],
    queryFn: async (): Promise<FinancialSnapshot> => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { start, end } = getPeriodRange(period);
      const startStr = start.toISOString();
      const endStr = end.toISOString();

      
      // Fetch transfers for the period (confirmed only - not archived) from transfers table
      const { data: transfers, error: transfersError } = await supabase
        .from("transfers")
        .select("type, amount, profit")
        .eq("user_id", user.id)
        .eq("is_archived", false)
        .gte("created_at", startStr)
        .lte("created_at", endStr);
      
      if (transfersError) throw transfersError;
      
      // Calculate net balance and profit from transfers
      let netBalance = 0;
      let totalProfit = 0;
      
      (transfers || []).forEach((t) => {
        if (t.type === "income") {
          netBalance += Number(t.amount);
        } else if (t.type === "expense") {
          netBalance -= Number(t.amount);
        }
        totalProfit += Number(t.profit || 0);
      });
      
      // Add inventory profits for the period
      const { data: inventoryLogs, error: logsError } = await supabase
        .from("inventory_logs")
        .select("profit, action")
        .eq("user_id", user.id)
        .eq("action", "sell")
        .gte("created_at", startStr)
        .lte("created_at", endStr);
      
      if (logsError) throw logsError;
      
      (inventoryLogs || []).forEach((log) => {
        totalProfit += Number(log.profit || 0);
      });
      
      // Fetch open debts (not paid, not archived)
      const { data: debts, error: debtsError } = await supabase
        .from("debts")
        .select("type, amount")
        .eq("user_id", user.id)
        .eq("is_paid", false)
        .eq("is_archived", false);
      
      if (debtsError) throw debtsError;
      
      let debtsOwedToYou = 0;
      let debtsYouOwe = 0;
      
      (debts || []).forEach((d) => {
        if (d.type === "owed_to_me") {
          debtsOwedToYou += Number(d.amount);
        } else if (d.type === "owed_by_me") {
          debtsYouOwe += Number(d.amount);
        }
      });
      
      // Fetch low stock items (quantity <= 5 and not archived)
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
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refresh every minute
  });
}