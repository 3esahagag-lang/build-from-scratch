import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, TrendingUp, ArrowUpCircle, Hash, Percent } from "lucide-react";
import { Link } from "react-router-dom";

export default function TransfersRecords() {
  const { user } = useAuth();

  // Fetch general transfers only (no fixed_number_id)
  const { data: transfers } = useQuery({
  queryKey: ["transfers-records", user?.id],
  queryFn: async () => {
    if (!user?.id) return [];

    const { data, error } = await supabase
      .from("transfers")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data;
  },
  enabled: !!user?.id,
});

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "اليوم";
    if (d.toDateString() === yesterday.toDateString()) return "أمس";
    return d.toLocaleDateString("ar-EG");
  };

  // Calculate summary stats
  const totalIncome = transfers?.filter(t => t.type === "income").reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  const totalProfit = transfers?.reduce((sum, t) => sum + Number(t.profit || 0), 0) || 0;
  const totalCount = transfers?.length || 0;

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="flex items-center gap-3 animate-slide-up">
          <Link
            to="/records"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">سجل التحويلات</h1>
            <p className="text-muted-foreground">ملخص التحويلات العامة</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <div className="notebook-paper p-3 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-lg bg-muted">
                <Hash className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <p className="text-lg font-bold">{totalCount}</p>
            <p className="text-xs text-muted-foreground">إجمالي التحويلات</p>
          </div>
          
          <div className="notebook-paper p-3 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-lg bg-income/10">
                <ArrowUpCircle className="h-4 w-4 text-income" />
              </div>
            </div>
            <p className="text-lg font-bold text-income">{totalIncome.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">إجمالي الدخل</p>
          </div>
          
          <div className="notebook-paper p-3 text-center">
            <div className="flex justify-center mb-2">
              <div className="p-2 rounded-lg bg-income/10">
                <Percent className="h-4 w-4 text-income" />
              </div>
            </div>
            <p className="text-lg font-bold text-income">{totalProfit.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">إجمالي الربح</p>
          </div>
        </div>

        {/* Recent Transfers */}
        <section className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="text-lg font-bold mb-3">التحويلات الأخيرة</h2>
          <div className="space-y-2">
            {transfers?.length === 0 ? (
              <p className="text-center text-muted-foreground py-6 notebook-paper">
                لا توجد تحويلات
              </p>
            ) : (
              transfers?.slice(0, 30).map((t) => (
                <div
                  key={t.id}
                  className="notebook-paper p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-income/10">
                        <TrendingUp className="h-4 w-4 text-income" />
                      </div>
                      <div>
                        {t.notes && (
                          <p className="font-medium text-sm">{t.notes}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.created_at!)}
                        </p>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="font-bold text-lg text-income">
                        +{Number(t.amount).toLocaleString()}
                      </span>
                      {Number(t.profit) > 0 && (
                        <p className="text-xs text-income font-medium">
                          ربح: +{Number(t.profit).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
