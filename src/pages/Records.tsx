import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Package, HandCoins, ChevronLeft, Hash, Banknote, ArrowUp, ArrowDown, Layers, RefreshCw, CheckCircle2, XCircle, Phone, Gauge } from "lucide-react";
import { Link } from "react-router-dom";

interface BadgeProps {
  icon: React.ReactNode;
  value: string | number;
  colorClass?: string;
}

function Badge({ icon, value, colorClass = "bg-muted text-muted-foreground" }: BadgeProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
      {icon}
      <span>{value}</span>
    </div>
  );
}

interface RecordCardProps {
  icon: React.ReactNode;
  title: string;
  badges: BadgeProps[];
  to: string;
}

function RecordCard({ icon, title, badges, to }: RecordCardProps) {
  return (
    <Link
      to={to}
      className="block notebook-paper p-4 hover:bg-muted/30 transition-all duration-200 active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-muted">{icon}</div>
          <div>
            <h3 className="font-bold text-lg text-foreground mb-2">{title}</h3>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge, i) => (
                <Badge key={i} {...badge} />
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

  // Fetch transfers count and total - EXCLUDE fixed number transfers (they are separate entities)
const { data: transfers = [] } = useQuery({
  queryKey: ["transfers", user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("transfers")
      .select("*")
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },
  enabled: !!user,
});

const transfersCount = transfers.length;

const transfersTotal = transfers.reduce((sum, t) => {
  const amount = Number(t.amount) || 0;
  return t.type === "income" ? sum + amount : sum - amount;
}, 0);

const transfersProfit = transfers.reduce(
  (sum, t) => sum + (Number(t.profit) || 0),
  0
);

  // Fetch phone numbers summary (independent entities)
  const { data: phoneNumbersData } = useQuery({
    queryKey: ["records-phone-numbers-summary", user?.id],
    queryFn: async () => {
      const [numbers, transfers] = await Promise.all([
        supabase
          .from("fixed_numbers")
          .select("id, is_disabled, monthly_limit"),
        supabase
          .from("fixed_number_transfers")
          .select("amount"),
      ]);

      const activeCount = numbers.data?.filter(n => !n.is_disabled).length || 0;
      const totalTransferred = transfers.data?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      return {
        count: numbers.data?.length || 0,
        activeCount,
        totalTransferred,
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
          {/* General Transfers Card - Transfers without phone numbers */}
          <div className="animate-slide-up" style={{ animationDelay: "50ms" }}>
            <RecordCard
              icon={<TrendingUp className="h-6 w-6 text-primary" />}
              title="سجل التحويلات العامة"
              badges={[
                {
                  icon: <Hash className="h-3.5 w-3.5" />,
                  value: transfersData?.count || 0,
                },
                {
                  icon: <Banknote className="h-3.5 w-3.5" />,
                  value: (transfersData?.total || 0).toLocaleString(),
                  colorClass: (transfersData?.total || 0) >= 0 ? "bg-income/20 text-income" : "bg-expense/20 text-expense",
                },
                {
                  icon: (transfersData?.total || 0) >= 0 ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />,
                  value: "",
                  colorClass: (transfersData?.total || 0) >= 0 ? "bg-income/20 text-income" : "bg-expense/20 text-expense",
                },
              ]}
              to="/records/transfers"
            />
          </div>

          {/* Phone Numbers Records Card - Per-number history index */}
          <div className="animate-slide-up" style={{ animationDelay: "75ms" }}>
            <RecordCard
              icon={<Phone className="h-6 w-6 text-primary" />}
              title="سجل أرقامي"
              badges={[
                {
                  icon: <Hash className="h-3.5 w-3.5" />,
                  value: phoneNumbersData?.count || 0,
                },
                {
                  icon: <Gauge className="h-3.5 w-3.5" />,
                  value: `${phoneNumbersData?.activeCount || 0} نشط`,
                  colorClass: "bg-income/20 text-income",
                },
                {
                  icon: <Banknote className="h-3.5 w-3.5" />,
                  value: (phoneNumbersData?.totalTransferred || 0).toLocaleString(),
                },
              ]}
              to="/records/phone-numbers"
            />
          </div>

          {/* Products Card */}
          <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <RecordCard
              icon={<Package className="h-6 w-6 text-accent" />}
              title="سجل البضاعة"
              badges={[
                {
                  icon: <Package className="h-3.5 w-3.5" />,
                  value: inventoryData?.itemsCount || 0,
                },
                {
                  icon: <Layers className="h-3.5 w-3.5" />,
                  value: inventoryData?.totalQuantity || 0,
                },
                {
                  icon: <RefreshCw className="h-3.5 w-3.5" />,
                  value: inventoryData?.movementsCount || 0,
                },
              ]}
              to="/records/products"
            />
          </div>

          {/* Debts Card */}
          <div className="animate-slide-up" style={{ animationDelay: "150ms" }}>
            <RecordCard
              icon={<HandCoins className="h-6 w-6 text-owed-to-me" />}
              title="سجل السلف"
              badges={[
                {
                  icon: <CheckCircle2 className="h-3.5 w-3.5" />,
                  value: (debtsData?.owedToMe || 0).toLocaleString(),
                  colorClass: "bg-income/20 text-income",
                },
                {
                  icon: <XCircle className="h-3.5 w-3.5" />,
                  value: (debtsData?.owedByMe || 0).toLocaleString(),
                  colorClass: "bg-expense/20 text-expense",
                },
              ]}
              to="/records/debts"
            />
          </div>
        </div>

        {/* Developer Credit */}
        <div className="pt-12 pb-4 space-y-3">
          <p className="text-center text-xs text-muted-foreground/60">
            تم تطوير محلي بواسطة
          </p>
          <div className="flex justify-center">
            <div className="px-5 py-2 rounded-full bg-primary/10 border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.15)]">
              <span className="text-lg font-bold text-primary">عيسي</span>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
