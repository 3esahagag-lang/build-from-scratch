import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer,
  Legend,
  Tooltip
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  HandCoins,
  BarChart3
} from "lucide-react";

const COLORS = {
  income: "hsl(142, 60%, 45%)",
  expense: "hsl(0, 70%, 55%)",
  inventory: "hsl(200, 70%, 50%)",
  debt: "hsl(38, 90%, 55%)",
};

export default function Reports() {
  const { user } = useAuth();

  // Fetch all stats
  const { data: stats } = useQuery({
    queryKey: ["reports-stats", user?.id],
    queryFn: async () => {
      const [transfersRes, inventoryRes, debtsRes] = await Promise.all([
        supabase
          .from("transfers")
          .select("type, amount")
          .eq("is_archived", false),
        supabase
          .from("inventory_logs")
          .select("action, quantity_change"),
        supabase
          .from("debts")
          .select("type, is_paid, amount")
          .eq("is_archived", false),
      ]);

      const transfers = transfersRes.data || [];
      const inventoryLogs = inventoryRes.data || [];
      const debts = debtsRes.data || [];

      const incomeCount = transfers.filter(t => t.type === "income").length;
      const expenseCount = transfers.filter(t => t.type === "expense").length;
      const incomeTotal = transfers.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0);
      const expenseTotal = transfers.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0);

      const addCount = inventoryLogs.filter(l => l.action === "add").length;
      const sellCount = inventoryLogs.filter(l => l.action === "sell").length;

      const owedToMeCount = debts.filter(d => d.type === "owed_to_me").length;
      const owedByMeCount = debts.filter(d => d.type === "owed_by_me").length;
      const paidCount = debts.filter(d => d.is_paid).length;
      const openCount = debts.filter(d => !d.is_paid).length;

      const totalActions = incomeCount + expenseCount + addCount + sellCount + owedToMeCount + owedByMeCount;

      return {
        transfers: { incomeCount, expenseCount, incomeTotal, expenseTotal },
        inventory: { addCount, sellCount },
        debts: { owedToMeCount, owedByMeCount, paidCount, openCount },
        totalActions,
      };
    },
    enabled: !!user,
  });

  // Prepare chart data
  const actionDistribution = [
    { name: "دخل", value: stats?.transfers.incomeCount || 0, color: COLORS.income },
    { name: "مصروف", value: stats?.transfers.expenseCount || 0, color: COLORS.expense },
    { name: "بضاعة", value: (stats?.inventory.addCount || 0) + (stats?.inventory.sellCount || 0), color: COLORS.inventory },
    { name: "سلف", value: (stats?.debts.owedToMeCount || 0) + (stats?.debts.owedByMeCount || 0), color: COLORS.debt },
  ].filter(d => d.value > 0);

  const calculatePercentage = (value: number) => {
    if (!stats?.totalActions) return 0;
    return Math.round((value / stats.totalActions) * 100);
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">التقارير</h1>
          <p className="text-muted-foreground">نظرة عامة على النشاط</p>
        </div>

        {/* Action Distribution Chart */}
        <section className="notebook-paper p-4 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <h2 className="section-title">
            <BarChart3 className="h-5 w-5 text-accent" />
            توزيع الحركات
          </h2>
          {actionDistribution.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={actionDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {actionDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [value, "عدد"]}
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "var(--radius)",
                      direction: "rtl"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              لا توجد بيانات كافية
            </div>
          )}
        </section>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Transfers Stats */}
          <div className="stat-card animate-slide-up" style={{ animationDelay: "100ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-5 w-5 text-income" />
              <span className="font-medium">الدخل</span>
            </div>
            <div className="text-2xl font-bold text-income">
              {calculatePercentage(stats?.transfers.incomeCount || 0)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {stats?.transfers.incomeCount || 0} حركة
            </div>
            <div className="text-sm font-medium text-income mt-1">
              {stats?.transfers.incomeTotal?.toLocaleString() || 0}
            </div>
          </div>

          <div className="stat-card animate-slide-up" style={{ animationDelay: "150ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="h-5 w-5 text-expense" />
              <span className="font-medium">المصروف</span>
            </div>
            <div className="text-2xl font-bold text-expense">
              {calculatePercentage(stats?.transfers.expenseCount || 0)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {stats?.transfers.expenseCount || 0} حركة
            </div>
            <div className="text-sm font-medium text-expense mt-1">
              {stats?.transfers.expenseTotal?.toLocaleString() || 0}
            </div>
          </div>

          {/* Inventory Stats */}
          <div className="stat-card animate-slide-up" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-accent" />
              <span className="font-medium">البضاعة</span>
            </div>
            <div className="text-2xl font-bold text-accent">
              {calculatePercentage((stats?.inventory.addCount || 0) + (stats?.inventory.sellCount || 0))}%
            </div>
            <div className="text-sm text-muted-foreground">
              {stats?.inventory.addCount || 0} إضافة • {stats?.inventory.sellCount || 0} بيع
            </div>
          </div>

          {/* Debts Stats */}
          <div className="stat-card animate-slide-up" style={{ animationDelay: "250ms" }}>
            <div className="flex items-center gap-2 mb-3">
              <HandCoins className="h-5 w-5 text-warning" />
              <span className="font-medium">السلف</span>
            </div>
            <div className="text-2xl font-bold text-warning">
              {calculatePercentage((stats?.debts.owedToMeCount || 0) + (stats?.debts.owedByMeCount || 0))}%
            </div>
            <div className="text-sm text-muted-foreground">
              {stats?.debts.openCount || 0} مفتوحة • {stats?.debts.paidCount || 0} مسددة
            </div>
          </div>
        </div>

        {/* Balance Summary */}
        <div className="notebook-paper p-4 animate-slide-up" style={{ animationDelay: "300ms" }}>
          <h2 className="section-title">الملخص المالي</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">إجمالي الدخل</span>
              <span className="font-bold text-income">
                {stats?.transfers.incomeTotal?.toLocaleString() || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">إجمالي المصروف</span>
              <span className="font-bold text-expense">
                {stats?.transfers.expenseTotal?.toLocaleString() || 0}
              </span>
            </div>
            <div className="border-t border-border pt-3">
              <div className="flex justify-between items-center">
                <span className="font-medium">الصافي</span>
                <span className={`text-xl font-bold ${
                  (stats?.transfers.incomeTotal || 0) - (stats?.transfers.expenseTotal || 0) >= 0 
                    ? "text-income" 
                    : "text-expense"
                }`}>
                  {((stats?.transfers.incomeTotal || 0) - (stats?.transfers.expenseTotal || 0)).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
