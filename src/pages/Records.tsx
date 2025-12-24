import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ArrowDownLeft, 
  ArrowUpRight,
  Activity
} from "lucide-react";

export default function Records() {
  const { user } = useAuth();

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

  // Combine all records for "latest" section
  const allRecords = [
    ...(transfers?.map(t => ({
      id: t.id,
      type: "transfer" as const,
      subType: t.type,
      amount: Number(t.amount),
      description: t.notes || (t.type === "income" ? "دخل" : "مصروف"),
      fixedNumber: t.fixed_numbers?.name,
      date: new Date(t.created_at),
    })) || []),
    ...(inventoryLogs?.map(l => ({
      id: l.id,
      type: "inventory" as const,
      subType: l.action,
      amount: Math.abs(l.quantity_change),
      description: `${l.action === "add" ? "إضافة" : "بيع"} ${l.inventory_items?.name}`,
      date: new Date(l.created_at),
    })) || []),
    ...(debts?.map(d => ({
      id: d.id,
      type: "debt" as const,
      subType: d.type,
      amount: Number(d.amount),
      description: d.description,
      isPaid: d.is_paid,
      date: new Date(d.created_at),
    })) || []),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return "اليوم";
    if (date.toDateString() === yesterday.toDateString()) return "أمس";
    return date.toLocaleDateString("ar-EG");
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">السجل</h1>
          <p className="text-muted-foreground">كل ما تم تسجيله</p>
        </div>

        {/* Latest Activity */}
        <section className="animate-slide-up" style={{ animationDelay: "50ms" }}>
          <h2 className="section-title">
            <Activity className="h-5 w-5 text-accent" />
            آخر الحركات
          </h2>
          {allRecords.length > 0 ? (
            <div className="notebook-paper divide-y divide-border">
              {allRecords.map((record) => (
                <div key={`${record.type}-${record.id}`} className="record-item">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {record.type === "transfer" && record.subType === "income" && (
                        <div className="p-2 rounded-lg bg-income/10">
                          <TrendingUp className="h-5 w-5 text-income" />
                        </div>
                      )}
                      {record.type === "transfer" && record.subType === "expense" && (
                        <div className="p-2 rounded-lg bg-expense/10">
                          <TrendingDown className="h-5 w-5 text-expense" />
                        </div>
                      )}
                      {record.type === "inventory" && (
                        <div className="p-2 rounded-lg bg-accent/10">
                          <Package className="h-5 w-5 text-accent" />
                        </div>
                      )}
                      {record.type === "debt" && record.subType === "owed_to_me" && (
                        <div className="p-2 rounded-lg bg-owed-to-me/10">
                          <ArrowDownLeft className="h-5 w-5 text-owed-to-me" />
                        </div>
                      )}
                      {record.type === "debt" && record.subType === "owed_by_me" && (
                        <div className="p-2 rounded-lg bg-owed-by-me/10">
                          <ArrowUpRight className="h-5 w-5 text-owed-by-me" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{record.description}</div>
                        {record.type === "transfer" && record.fixedNumber && (
                          <div className="text-sm text-muted-foreground">
                            #{record.fixedNumber}
                          </div>
                        )}
                        <div className="text-sm text-muted-foreground">
                          {formatDate(record.date)}
                        </div>
                      </div>
                    </div>
                    <div className={`text-lg font-bold ${
                      record.type === "transfer" && record.subType === "income" ? "text-income" :
                      record.type === "transfer" && record.subType === "expense" ? "text-expense" :
                      record.type === "debt" && record.subType === "owed_to_me" ? "text-owed-to-me" :
                      record.type === "debt" && record.subType === "owed_by_me" ? "text-owed-by-me" :
                      "text-foreground"
                    }`}>
                      {record.type === "inventory" ? (
                        <span>{record.subType === "add" ? "+" : "-"}{record.amount}</span>
                      ) : (
                        record.amount.toLocaleString()
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="notebook-paper p-8 text-center text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد سجلات بعد</p>
            </div>
          )}
        </section>

        {/* Transfers Section */}
        <section className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="section-title">
            <TrendingUp className="h-5 w-5 text-income" />
            سجل التحويلات
          </h2>
          {transfers && transfers.length > 0 ? (
            <div className="notebook-paper divide-y divide-border">
              {transfers.map((t) => (
                <div key={t.id} className="record-item">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {t.type === "income" ? (
                        <TrendingUp className="h-4 w-4 text-income" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-expense" />
                      )}
                      <div>
                        <div className="font-medium">
                          {t.notes || (t.type === "income" ? "دخل" : "مصروف")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(new Date(t.created_at))}
                          {t.fixed_numbers?.name && ` • #${t.fixed_numbers.name}`}
                        </div>
                      </div>
                    </div>
                    <span className={`font-bold ${
                      t.type === "income" ? "text-income" : "text-expense"
                    }`}>
                      {Number(t.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="notebook-paper p-6 text-center text-muted-foreground">
              لا توجد تحويلات
            </div>
          )}
        </section>

        {/* Inventory Section */}
        <section className="animate-slide-up" style={{ animationDelay: "150ms" }}>
          <h2 className="section-title">
            <Package className="h-5 w-5 text-accent" />
            سجل البضاعة
          </h2>
          {inventoryLogs && inventoryLogs.length > 0 ? (
            <div className="notebook-paper divide-y divide-border">
              {inventoryLogs.map((log) => (
                <div key={log.id} className="record-item">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {log.action === "add" ? "إضافة" : "بيع"} {log.inventory_items?.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(new Date(log.created_at))}
                      </div>
                    </div>
                    <span className={`font-bold ${
                      log.action === "add" ? "text-success" : "text-accent"
                    }`}>
                      {log.action === "add" ? "+" : "-"}{Math.abs(log.quantity_change)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="notebook-paper p-6 text-center text-muted-foreground">
              لا توجد حركات
            </div>
          )}
        </section>

        {/* Debts Section */}
        <section className="animate-slide-up" style={{ animationDelay: "200ms" }}>
          <h2 className="section-title">
            <ArrowDownLeft className="h-5 w-5 text-owed-to-me" />
            سجل السلف
          </h2>
          {debts && debts.length > 0 ? (
            <div className="notebook-paper divide-y divide-border">
              {debts.map((d) => (
                <div key={d.id} className={`record-item ${d.is_paid ? "opacity-60" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {d.type === "owed_to_me" ? (
                        <ArrowDownLeft className="h-4 w-4 text-owed-to-me" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-owed-by-me" />
                      )}
                      <div>
                        <div className="font-medium">{d.description}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatDate(new Date(d.created_at))}
                          {d.is_paid && " • مسدد"}
                        </div>
                      </div>
                    </div>
                    <span className={`font-bold ${
                      d.type === "owed_to_me" ? "text-owed-to-me" : "text-owed-by-me"
                    }`}>
                      {Number(d.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="notebook-paper p-6 text-center text-muted-foreground">
              لا توجد سلف
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
}
