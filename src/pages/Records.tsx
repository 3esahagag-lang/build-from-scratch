import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Package, ArrowDownLeft } from "lucide-react";
import RecordsSummaryCard from "@/components/records/RecordsSummaryCard";
import TransfersRecordSection from "@/components/records/TransfersRecordSection";
import InventoryRecordSection from "@/components/records/InventoryRecordSection";
import DebtsRecordSection from "@/components/records/DebtsRecordSection";

export default function Records() {
  const { user } = useAuth();
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Fetch transfers
  const { data: transfers } = useQuery({
    queryKey: ["all-transfers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfers")
        .select("*, fixed_numbers(name)")
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch fixed number transfers (with limits)
  const { data: fixedNumberTransfers } = useQuery({
    queryKey: ["all-fixed-number-transfers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_number_transfers")
        .select("*, fixed_numbers(name, phone_number)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch inventory logs
  const { data: inventoryLogs } = useQuery({
    queryKey: ["all-inventory-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_logs")
        .select("*, inventory_items(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch debts
  const { data: debts } = useQuery({
    queryKey: ["all-debts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("debts")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "اليوم";
    if (date.toDateString() === yesterday.toDateString()) return "أمس";
    return date.toLocaleDateString("ar-EG");
  };

  // Calculate totals
  const transfersTotal =
    (transfers?.reduce((sum, t) => {
      return t.type === "income" ? sum + Number(t.amount) : sum - Number(t.amount);
    }, 0) || 0) +
    (fixedNumberTransfers?.reduce((sum, t) => sum + Number(t.amount), 0) || 0);

  const inventoryTotal = inventoryLogs?.reduce(
    (sum, l) => sum + l.quantity_change,
    0
  ) || 0;

  const debtsOwedToMe =
    debts
      ?.filter((d) => d.type === "owed_to_me" && !d.is_paid)
      .reduce((sum, d) => sum + Number(d.amount), 0) || 0;

  const debtsOwedByMe =
    debts
      ?.filter((d) => d.type === "owed_by_me" && !d.is_paid)
      .reduce((sum, d) => sum + Number(d.amount), 0) || 0;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <Layout>
      <div className="space-y-4 pb-20 md:pb-0">
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">السجل</h1>
          <p className="text-muted-foreground">ملخص كل السجلات</p>
        </div>

        {/* Transfers Section */}
        <div className="animate-slide-up" style={{ animationDelay: "50ms" }}>
          <RecordsSummaryCard
            icon={<TrendingUp className="h-5 w-5 text-primary" />}
            title="التحويلات"
            total={transfersTotal.toLocaleString()}
            subtitle={`${(transfers?.length || 0) + (fixedNumberTransfers?.length || 0)} تحويل`}
            isExpanded={expandedSection === "transfers"}
            onToggle={() => toggleSection("transfers")}
            colorClass={transfersTotal >= 0 ? "text-income" : "text-expense"}
          >
            <TransfersRecordSection
              transfers={transfers?.map((t) => ({
                ...t,
                amount: Number(t.amount),
              })) || []}
              fixedNumberTransfers={fixedNumberTransfers?.map((t) => ({
                ...t,
                amount: Number(t.amount),
              })) || []}
              formatDate={formatDate}
            />
          </RecordsSummaryCard>
        </div>

        {/* Inventory Section */}
        <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <RecordsSummaryCard
            icon={<Package className="h-5 w-5 text-accent" />}
            title="البضاعة"
            total={inventoryTotal > 0 ? `+${inventoryTotal}` : inventoryTotal}
            subtitle={`${inventoryLogs?.length || 0} حركة`}
            isExpanded={expandedSection === "inventory"}
            onToggle={() => toggleSection("inventory")}
            colorClass="text-accent"
          >
            <InventoryRecordSection
              inventoryLogs={inventoryLogs || []}
              formatDate={formatDate}
            />
          </RecordsSummaryCard>
        </div>

        {/* Debts Section */}
        <div className="animate-slide-up" style={{ animationDelay: "150ms" }}>
          <RecordsSummaryCard
            icon={<ArrowDownLeft className="h-5 w-5 text-owed-to-me" />}
            title="السلف"
            total={`${debtsOwedToMe.toLocaleString()} / ${debtsOwedByMe.toLocaleString()}`}
            subtitle={`لي: ${debtsOwedToMe.toLocaleString()} • عليّ: ${debtsOwedByMe.toLocaleString()}`}
            isExpanded={expandedSection === "debts"}
            onToggle={() => toggleSection("debts")}
            colorClass="text-foreground"
          >
            <DebtsRecordSection
              debts={debts?.map((d) => ({
                ...d,
                amount: Number(d.amount),
              })) || []}
              formatDate={formatDate}
            />
          </RecordsSummaryCard>
        </div>
      </div>
    </Layout>
  );
}
