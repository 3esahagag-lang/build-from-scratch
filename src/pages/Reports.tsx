import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, HandCoins, Wallet } from "lucide-react";

interface CircularProgressProps {
  percentage: number;
  color: string;
  bgColor: string;
  size?: number;
  strokeWidth?: number;
}

function CircularProgress({ 
  percentage, 
  color, 
  bgColor,
  size = 140, 
  strokeWidth = 12 
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Percentage text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>
          {Math.round(percentage)}%
        </span>
      </div>
    </div>
  );
}

interface ReportCardProps {
  icon: React.ReactNode;
  title: string;
  percentage: number;
  color: string;
  bgColor: string;
  delay: string;
}

function ReportCard({ icon, title, percentage, color, bgColor, delay }: ReportCardProps) {
  return (
    <div 
      className="notebook-paper p-6 flex flex-col items-center text-center animate-slide-up"
      style={{ animationDelay: delay }}
    >
      <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: bgColor }}>
        {icon}
      </div>
      <h2 className="text-lg font-bold mb-4">{title}</h2>
      <CircularProgress 
        percentage={percentage} 
        color={color} 
        bgColor={bgColor}
      />
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();

  // Fetch inventory stats
  const { data: inventoryStats } = useQuery({
    queryKey: ["reports-inventory", user?.id],
    queryFn: async () => {
      const [itemsRes, logsRes] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("id, quantity")
          .eq("is_archived", false),
        supabase
          .from("inventory_logs")
          .select("action, quantity_change"),
      ]);

      const items = itemsRes.data || [];
      const logs = logsRes.data || [];

      // Total added (registered)
      const totalAdded = logs
        .filter(l => l.action === "add")
        .reduce((sum, l) => sum + l.quantity_change, 0);
      
      // Total sold
      const totalSold = logs
        .filter(l => l.action === "sell")
        .reduce((sum, l) => sum + Math.abs(l.quantity_change), 0);

      // Percentage sold vs total registered
      const percentage = totalAdded > 0 ? (totalSold / totalAdded) * 100 : 0;

      return { totalAdded, totalSold, percentage: Math.min(percentage, 100) };
    },
    enabled: !!user,
  });

  // Fetch debts stats
  const { data: debtsStats } = useQuery({
    queryKey: ["reports-debts", user?.id],
    queryFn: async () => {
      const { data: debts } = await supabase
        .from("debts")
        .select("type, is_paid, amount")
        .eq("is_archived", false);

      const allDebts = debts || [];

      // Owed to me (others owe me)
      const owedToMe = allDebts.filter(d => d.type === "owed_to_me");
      const totalOwedToMe = owedToMe.reduce((sum, d) => sum + Number(d.amount), 0);
      const collectedFromMe = owedToMe.filter(d => d.is_paid).reduce((sum, d) => sum + Number(d.amount), 0);
      const collectedPercentage = totalOwedToMe > 0 ? (collectedFromMe / totalOwedToMe) * 100 : 0;

      // Owed by me (I owe others)
      const owedByMe = allDebts.filter(d => d.type === "owed_by_me");
      const totalOwedByMe = owedByMe.reduce((sum, d) => sum + Number(d.amount), 0);
      const paidByMe = owedByMe.filter(d => d.is_paid).reduce((sum, d) => sum + Number(d.amount), 0);
      const remainingByMe = totalOwedByMe - paidByMe;
      const remainingPercentage = totalOwedByMe > 0 ? (remainingByMe / totalOwedByMe) * 100 : 0;

      return {
        owedToMe: { total: totalOwedToMe, collected: collectedFromMe, percentage: collectedPercentage },
        owedByMe: { total: totalOwedByMe, remaining: remainingByMe, percentage: remainingPercentage },
      };
    },
    enabled: !!user,
  });

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">التقارير</h1>
          <p className="text-muted-foreground">نظرة سريعة على الحالة</p>
        </div>

        {/* Report Cards */}
        <div className="space-y-4">
          {/* Inventory Sales */}
          <ReportCard
            icon={<Package className="h-6 w-6 text-accent" />}
            title="نسبة المبيعات"
            percentage={inventoryStats?.percentage || 0}
            color="hsl(var(--accent))"
            bgColor="hsl(var(--accent) / 0.1)"
            delay="50ms"
          />

          {/* Debts For You (Collected) */}
          <ReportCard
            icon={<HandCoins className="h-6 w-6 text-income" />}
            title="سلف لك (المحصّل)"
            percentage={debtsStats?.owedToMe.percentage || 0}
            color="hsl(var(--income))"
            bgColor="hsl(var(--income) / 0.1)"
            delay="100ms"
          />

          {/* Debts On You (Remaining) */}
          <ReportCard
            icon={<Wallet className="h-6 w-6 text-expense" />}
            title="سلف عليك (المتبقي)"
            percentage={debtsStats?.owedByMe.percentage || 0}
            color="hsl(var(--expense))"
            bgColor="hsl(var(--expense) / 0.1)"
            delay="150ms"
          />
        </div>
      </div>
    </Layout>
  );
}
