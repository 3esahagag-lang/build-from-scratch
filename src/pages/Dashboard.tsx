import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeftRight, 
  Package, 
  HandCoins,
  TrendingUp,
  TrendingDown,
  Activity
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Dashboard() {
  const { user } = useAuth();

  // Fetch today's stats
  const { data: todayStats } = useQuery({
    queryKey: ["today-stats", user?.id],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: transfers } = await supabase
        .from("transfers")
        .select("amount, type")
        .gte("created_at", today.toISOString())
        .eq("is_archived", false);

      const income = transfers?.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const expense = transfers?.filter(t => t.type === "expense").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
      const count = transfers?.length || 0;

      return { income, expense, count };
    },
    enabled: !!user,
  });

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Welcome */}
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">مرحباً بك</h1>
          <p className="text-muted-foreground">ماذا تريد أن تسجّل اليوم؟</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <div className="stat-card text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-income mb-1" />
            <div className="text-lg font-bold text-income">
              {todayStats?.income.toLocaleString() || 0}
            </div>
            <div className="text-xs text-muted-foreground">دخل اليوم</div>
          </div>
          <div className="stat-card text-center">
            <TrendingDown className="h-5 w-5 mx-auto text-expense mb-1" />
            <div className="text-lg font-bold text-expense">
              {todayStats?.expense.toLocaleString() || 0}
            </div>
            <div className="text-xs text-muted-foreground">مصروف اليوم</div>
          </div>
          <div className="stat-card text-center">
            <Activity className="h-5 w-5 mx-auto text-accent mb-1" />
            <div className="text-lg font-bold text-foreground">
              {todayStats?.count || 0}
            </div>
            <div className="text-xs text-muted-foreground">عدد الحركات</div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h2 className="section-title">إدخال سريع</h2>
          
          <div className="grid gap-3 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <Link to="/transfers">
              <Button
                className="w-full h-20 text-lg action-button bg-primary hover:bg-primary/90"
              >
                <ArrowLeftRight className="h-6 w-6 ml-3" />
                تسجيل تحويل
              </Button>
            </Link>
            
            <Link to="/inventory">
              <Button
                className="w-full h-20 text-lg action-button bg-accent hover:bg-accent/90"
              >
                <Package className="h-6 w-6 ml-3" />
                تسجيل بضاعة
              </Button>
            </Link>
            
            <Link to="/debts">
              <Button
                className="w-full h-20 text-lg action-button bg-warning hover:bg-warning/90 text-warning-foreground"
              >
                <HandCoins className="h-6 w-6 ml-3" />
                تسجيل سلفة
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
