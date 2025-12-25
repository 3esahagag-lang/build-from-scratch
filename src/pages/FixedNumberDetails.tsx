import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Phone, Gauge, Calendar, FileText } from "lucide-react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

export default function FixedNumberDetails() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();

  // Fetch fixed number details
  const { data: fixedNumber, isLoading: numberLoading } = useQuery({
    queryKey: ["fixed-number", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_numbers")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch transfers for this fixed number
  const { data: transfers, isLoading: transfersLoading } = useQuery({
    queryKey: ["fixed-number-transfers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_number_transfers")
        .select("*")
        .eq("fixed_number_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Calculate monthly usage
  const monthlyUsage = (() => {
    if (!transfers) return 0;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    return transfers
      .filter((t) => new Date(t.created_at) >= startOfMonth)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  })();

  const limit = Number(fixedNumber?.monthly_limit) || 0;
  const percentage = limit > 0 ? Math.min((monthlyUsage / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - monthlyUsage, 0);

  const getProgressColor = () => {
    if (fixedNumber?.is_disabled) return "bg-muted";
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 80) return "bg-amber-500";
    if (percentage >= 50) return "bg-primary";
    return "bg-income";
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "اليوم";
    if (d.toDateString() === yesterday.toDateString()) return "أمس";
    return d.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!id) {
    return <Navigate to="/transfers" replace />;
  }

  const isLoading = numberLoading || transfersLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!fixedNumber) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link
              to="/transfers"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">الرقم غير موجود</h1>
          </div>
          <p className="text-muted-foreground text-center py-12">
            لم يتم العثور على هذا الرقم
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="flex items-center gap-3 animate-slide-up">
          <Link
            to="/transfers"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">بيانات الرقم</h1>
            <p className="text-muted-foreground">تفاصيل التحويلات والاستهلاك</p>
          </div>
        </div>

        {/* Number Info Card */}
        <div 
          className={`notebook-paper p-5 space-y-4 animate-slide-up ${
            fixedNumber.is_disabled ? "opacity-60" : ""
          }`}
          style={{ animationDelay: "50ms" }}
        >
          {/* Phone Number */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-mono text-xl font-bold" dir="ltr">
                  {fixedNumber.phone_number}
                </p>
                {fixedNumber.name && fixedNumber.name !== fixedNumber.phone_number && (
                  <p className="text-muted-foreground">{fixedNumber.name}</p>
                )}
              </div>
            </div>
            {fixedNumber.is_disabled && (
              <span className="px-3 py-1 rounded-full bg-destructive/20 text-destructive text-sm font-medium">
                معطّل
              </span>
            )}
          </div>

          {/* Usage Stats */}
          {limit > 0 && (
            <div className="space-y-3 pt-3 border-t border-border">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gauge className="h-4 w-4" />
                <span className="text-sm">الاستهلاك الشهري</span>
              </div>
              
              <div className="relative h-4 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all duration-500 ${getProgressColor()}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="notebook-paper p-3">
                  <p className="text-xs text-muted-foreground">المستخدم</p>
                  <p className="font-bold text-lg">{monthlyUsage.toLocaleString("ar-EG")}</p>
                </div>
                <div className="notebook-paper p-3">
                  <p className="text-xs text-muted-foreground">الحد</p>
                  <p className="font-bold text-lg">{limit.toLocaleString("ar-EG")}</p>
                </div>
                <div className="notebook-paper p-3">
                  <p className="text-xs text-muted-foreground">المتبقي</p>
                  <p className={`font-bold text-lg ${percentage >= 100 ? "text-destructive" : "text-income"}`}>
                    {remaining.toLocaleString("ar-EG")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {limit === 0 && (
            <div className="pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground">
                المحول هذا الشهر: <span className="font-bold text-foreground">{monthlyUsage.toLocaleString("ar-EG")} ج.م</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">لا يوجد حد شهري محدد</p>
            </div>
          )}
        </div>

        {/* Transfers List */}
        <section className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            سجل التحويلات
            {transfers && transfers.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                ({transfers.length})
              </span>
            )}
          </h2>
          
          <div className="space-y-2">
            {!transfers || transfers.length === 0 ? (
              <div className="notebook-paper p-8 text-center">
                <p className="text-muted-foreground">لا توجد تحويلات على هذا الرقم</p>
              </div>
            ) : (
              transfers.map((t) => (
                <div
                  key={t.id}
                  className="notebook-paper p-4 flex items-center justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {t.notes || "تحويل"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.created_at)} - {formatTime(t.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-primary text-lg">
                    {Number(t.amount).toLocaleString("ar-EG")}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}
