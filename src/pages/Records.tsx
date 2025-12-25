import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Package, HandCoins, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface RecordCardProps {
  icon: React.ReactNode;
  title: string;
  stats: { label: string; value: string | number; colorClass?: string }[];
  to: string;
}

function RecordCard({ icon, title, stats, to }: RecordCardProps) {
  return (
    <Link
      to={to}
      className="block notebook-paper p-4 hover:bg-muted/30 transition-all duration-200 active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-muted">{icon}</div>
          <div>
            <h3 className="font-bold text-lg text-foreground">{title}</h3>
            <div className="flex flex-wrap gap-2 mt-1">
              {stats.map((stat, i) => (
                <span
                  key={i}
                  className={`text-sm ${stat.colorClass || "text-muted-foreground"}`}
                >
                  {stat.label}: <span className="font-semibold">{stat.value}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <ChevronLeft className="h-6 w-6 text-muted-foreground" />
      </div>
    </Link>
  );
}

export default function Records() {
  const { user } = useAuth();

  // Fetch transfers count and total
  const { data: transfersData } = useQuery({
    queryKey: ["records-transfers-summary", user?.id],
    queryFn: async () => {
      const [transfers, fixedNumberTransfers] = await Promise.all([
        supabase
          .from("transfers")
          .select("amount, type")
          .eq("is_archived", false),
        supabase
          .from("fixed_number_transfers")
          .select("amount"),
      ]);

      const transfersTotal =
        (transfers.data?.reduce((sum, t) => {
          return t.type === "income" ? sum + Number(t.amount) : sum - Number(t.amount);
        }, 0) || 0) +
        (fixedNumberTransfers.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0);

      return {
        count: (transfers.data?.length || 0) + (fixedNumberTransfers.data?.length || 0),
        total: transfersTotal,
      };
    },
    enabled: !!user,
  });

  // Fetch inventory summary
  const { data: inventoryData } = useQuery({
    queryKey: ["records-inventory-summary", user?.id],
    queryFn: async () => {
      const [items, logs] = await Promise.all([
        supabase
          .from("inventory_items")
          .select("quantity")
          .eq("is_archived", false),
        supabase.from("inventory_logs").select("id"),
      ]);

      const totalQuantity = items.data?.reduce((sum, i) => sum + (i.quantity || 0), 0) || 0;

      return {
        itemsCount: items.data?.length || 0,
        totalQuantity,
        movementsCount: logs.data?.length || 0,
      };
    },
    enabled: !!user,
  });

  // Fetch debts summary
  const { data: debtsData } = useQuery({
    queryKey: ["records-debts-summary", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("debts")
        .select("amount, type, is_paid")
        .eq("is_archived", false);

      const owedToMe = data
        ?.filter((d) => d.type === "owed_to_me" && !d.is_paid)
        .reduce((sum, d) => sum + Number(d.amount), 0) || 0;

      const owedByMe = data
        ?.filter((d) => d.type === "owed_by_me" && !d.is_paid)
        .reduce((sum, d) => sum + Number(d.amount), 0) || 0;

      return { owedToMe, owedByMe, count: data?.filter((d) => !d.is_paid).length || 0 };
    },
    enabled: !!user,
  });

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">السجل</h1>
          <p className="text-muted-foreground">ملخص كل السجلات</p>
        </div>

        {/* Record Cards */}
        <div className="space-y-4">
          {/* Transfers Card */}
          <div className="animate-slide-up" style={{ animationDelay: "50ms" }}>
            <RecordCard
              icon={<TrendingUp className="h-6 w-6 text-primary" />}
              title="سجل التحويلات"
              stats={[
                {
                  label: "الإجمالي",
                  value: (transfersData?.total || 0).toLocaleString(),
                  colorClass: (transfersData?.total || 0) >= 0 ? "text-income" : "text-expense",
                },
                { label: "عدد التحويلات", value: transfersData?.count || 0 },
              ]}
              to="/records/transfers"
            />
          </div>

          {/* Products Card */}
          <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <RecordCard
              icon={<Package className="h-6 w-6 text-accent" />}
              title="سجل البضاعة"
              stats={[
                { label: "عدد الأصناف", value: inventoryData?.itemsCount || 0 },
                { label: "إجمالي الكمية", value: inventoryData?.totalQuantity || 0 },
                { label: "الحركات", value: inventoryData?.movementsCount || 0 },
              ]}
              to="/records/products"
            />
          </div>

          {/* Debts Card */}
          <div className="animate-slide-up" style={{ animationDelay: "150ms" }}>
            <RecordCard
              icon={<HandCoins className="h-6 w-6 text-owed-to-me" />}
              title="سجل السلف"
              stats={[
                {
                  label: "ليك فلوس",
                  value: (debtsData?.owedToMe || 0).toLocaleString(),
                  colorClass: "text-income",
                },
                {
                  label: "عليك فلوس",
                  value: (debtsData?.owedByMe || 0).toLocaleString(),
                  colorClass: "text-expense",
                },
              ]}
              to="/records/debts"
            />
          </div>
        </div>

        {/* Developer Credit */}
        <div className="pt-12 pb-4">
          <p className="text-center text-xs text-muted-foreground/60">
            تم تطويره محلي بواسطة <span className="font-medium text-muted-foreground">عيسى</span>
          </p>
        </div>
      </div>
    </Layout>
  );
}
