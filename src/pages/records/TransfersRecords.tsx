import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, TrendingUp, TrendingDown, Phone, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Progress } from "@/components/ui/progress";
import { useState } from "react";

export default function TransfersRecords() {
  const { user } = useAuth();
  const [selectedFixedNumber, setSelectedFixedNumber] = useState<string | null>(null);

  // Fetch transfers
  const { data: transfers } = useQuery({
    queryKey: ["transfers-records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfers")
        .select("*, fixed_numbers(name)")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch fixed numbers with their limits
  const { data: fixedNumbers } = useQuery({
    queryKey: ["fixed-numbers-records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_numbers")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch fixed number transfers
  const { data: fixedNumberTransfers } = useQuery({
    queryKey: ["fixed-number-transfers-records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_number_transfers")
        .select("*, fixed_numbers(name, phone_number)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const generalTransfers = transfers?.filter((t) => !t.fixed_number_id) || [];
  const linkedTransfers = transfers?.filter((t) => t.fixed_number_id) || [];

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "اليوم";
    if (d.toDateString() === yesterday.toDateString()) return "أمس";
    return d.toLocaleDateString("ar-EG");
  };

  // Calculate monthly usage for each fixed number
  const getMonthlyUsage = (fixedNumberId: string) => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return fixedNumberTransfers
      ?.filter(
        (t) =>
          t.fixed_number_id === fixedNumberId &&
          new Date(t.created_at) >= startOfMonth
      )
      .reduce((sum, t) => sum + Number(t.amount), 0) || 0;
  };

  const selectedNumberTransfers = selectedFixedNumber
    ? fixedNumberTransfers?.filter((t) => t.fixed_number_id === selectedFixedNumber)
    : null;

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
            <p className="text-muted-foreground">جميع التحويلات والأرقام الثابتة</p>
          </div>
        </div>

        {/* Fixed Number Detail View */}
        {selectedFixedNumber && selectedNumberTransfers && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">
                تحويلات {fixedNumbers?.find((f) => f.id === selectedFixedNumber)?.name}
              </h2>
              <button
                onClick={() => setSelectedFixedNumber(null)}
                className="text-sm text-primary hover:underline"
              >
                رجوع للقائمة
              </button>
            </div>
            <div className="space-y-2">
              {selectedNumberTransfers.map((t) => (
                <div
                  key={t.id}
                  className="notebook-paper p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm text-muted-foreground">{t.notes || "بدون ملاحظات"}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                  </div>
                  <span className="font-bold text-primary">
                    {Number(t.amount).toLocaleString()}
                  </span>
                </div>
              ))}
              {selectedNumberTransfers.length === 0 && (
                <p className="text-center text-muted-foreground py-8">لا توجد تحويلات</p>
              )}
            </div>
          </div>
        )}

        {/* Main Lists */}
        {!selectedFixedNumber && (
          <>
            {/* General Transfers Section */}
            <section className="animate-slide-up" style={{ animationDelay: "50ms" }}>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                تحويلات عامة
              </h2>
              <div className="space-y-2">
                {generalTransfers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 notebook-paper">
                    لا توجد تحويلات عامة
                  </p>
                ) : (
                  generalTransfers.slice(0, 20).map((t) => (
                    <div
                      key={t.id}
                      className="notebook-paper p-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              t.type === "income" ? "bg-income/10" : "bg-expense/10"
                            }`}
                          >
                            {t.type === "income" ? (
                              <TrendingUp className="h-4 w-4 text-income" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-expense" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {t.notes || (t.type === "income" ? "دخل" : "مصروف")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(t.created_at!)}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <span
                            className={`font-bold ${
                              t.type === "income" ? "text-income" : "text-expense"
                            }`}
                          >
                            {t.type === "income" ? "+" : "-"}
                            {Number(t.amount).toLocaleString()}
                          </span>
                          {Number(t.profit) > 0 && (
                            <p className="text-xs text-income font-medium">
                              الربح: +{Number(t.profit).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      {Number(t.profit) > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/50 text-sm text-muted-foreground">
                          <div className="flex justify-between">
                            <span>المبلغ: {Number(t.amount).toLocaleString()}</span>
                            <span className="text-income">الربح: +{Number(t.profit).toLocaleString()}</span>
                          </div>
                          <div className="text-left font-medium text-foreground">
                            الإجمالي: {(Number(t.amount) + Number(t.profit)).toLocaleString()} جنيه
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Fixed Numbers Section */}
            <section className="animate-slide-up" style={{ animationDelay: "100ms" }}>
              <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                <Phone className="h-5 w-5 text-accent" />
                الأرقام الثابتة
              </h2>
              <div className="space-y-3">
                {fixedNumbers?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6 notebook-paper">
                    لا توجد أرقام ثابتة
                  </p>
                ) : (
                  fixedNumbers?.map((fn) => {
                    const usage = getMonthlyUsage(fn.id);
                    const limit = fn.monthly_limit || 0;
                    const percentage = limit > 0 ? Math.min((usage / limit) * 100, 100) : 0;

                    return (
                      <button
                        key={fn.id}
                        onClick={() => setSelectedFixedNumber(fn.id)}
                        className="w-full notebook-paper p-4 text-right hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold">{fn.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {fn.phone_number}
                          </span>
                        </div>
                        {limit > 0 && (
                          <>
                            <Progress value={percentage} className="h-2 mb-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>المستخدم: {usage.toLocaleString()}</span>
                              <span>الحد: {limit.toLocaleString()}</span>
                            </div>
                          </>
                        )}
                        {limit === 0 && (
                          <p className="text-sm text-muted-foreground">
                            المحول هذا الشهر: {usage.toLocaleString()}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </section>

            {/* Linked Transfers Section */}
            {linkedTransfers.length > 0 && (
              <section className="animate-slide-up" style={{ animationDelay: "150ms" }}>
                <h2 className="text-lg font-bold mb-3">تحويلات مرتبطة</h2>
                <div className="space-y-2">
                  {linkedTransfers.slice(0, 10).map((t) => (
                    <div
                      key={t.id}
                      className="notebook-paper p-3 flex items-center justify-between"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {t.fixed_numbers?.name || "رقم ثابت"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.created_at!)}
                        </p>
                      </div>
                      <span
                        className={`font-bold ${
                          t.type === "income" ? "text-income" : "text-expense"
                        }`}
                      >
                        {Number(t.amount).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
