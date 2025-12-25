import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, HandCoins, Check, TrendingUp, TrendingDown } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DebtsRecords() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("owed_to_me");

  // Fetch debts
  const { data: debts } = useQuery({
    queryKey: ["debts-records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("debts")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Pay debt mutation
  const payDebtMutation = useMutation({
    mutationFn: async (debtId: string) => {
      const { error } = await supabase
        .from("debts")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("id", debtId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts-records"] });
      queryClient.invalidateQueries({ queryKey: ["records-debts-summary"] });
      toast.success("تم تسديد الدين بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تسديد الدين");
    },
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

  const owedToMe = debts?.filter((d) => d.type === "owed_to_me" && !d.is_paid) || [];
  const owedByMe = debts?.filter((d) => d.type === "owed_by_me" && !d.is_paid) || [];
  const paidDebts = debts?.filter((d) => d.is_paid) || [];

  const owedToMeTotal = owedToMe.reduce((sum, d) => sum + Number(d.amount), 0);
  const owedByMeTotal = owedByMe.reduce((sum, d) => sum + Number(d.amount), 0);

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
            <h1 className="text-2xl font-bold text-foreground">سجل السلف</h1>
            <p className="text-muted-foreground">إدارة الديون والسلف</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <div className="notebook-paper p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-income" />
              <span className="text-sm text-muted-foreground">ليك فلوس</span>
            </div>
            <p className="text-2xl font-bold text-income">
              {owedToMeTotal.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{owedToMe.length} دين</p>
          </div>
          <div className="notebook-paper p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-expense" />
              <span className="text-sm text-muted-foreground">عليك فلوس</span>
            </div>
            <p className="text-2xl font-bold text-expense">
              {owedByMeTotal.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">{owedByMe.length} دين</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="animate-slide-up"
          style={{ animationDelay: "100ms" }}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="owed_to_me">ليك فلوس</TabsTrigger>
            <TabsTrigger value="owed_by_me">عليك فلوس</TabsTrigger>
            <TabsTrigger value="paid">تم السداد</TabsTrigger>
          </TabsList>

          <TabsContent value="owed_to_me" className="space-y-3 mt-4">
            {owedToMe.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 notebook-paper">
                لا يوجد ديون عليك
              </p>
            ) : (
              owedToMe.map((debt) => (
                <div key={debt.id} className="notebook-paper p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-income/10">
                        <HandCoins className="h-5 w-5 text-income" />
                      </div>
                      <div>
                        <p className="font-bold">{debt.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(debt.created_at!)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-income">
                      {Number(debt.amount).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 gap-2"
                    onClick={() => payDebtMutation.mutate(debt.id)}
                    disabled={payDebtMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                    تم السداد
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="owed_by_me" className="space-y-3 mt-4">
            {owedByMe.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 notebook-paper">
                لا يوجد ديون عليك
              </p>
            ) : (
              owedByMe.map((debt) => (
                <div key={debt.id} className="notebook-paper p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-expense/10">
                        <HandCoins className="h-5 w-5 text-expense" />
                      </div>
                      <div>
                        <p className="font-bold">{debt.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(debt.created_at!)}
                        </p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-expense">
                      {Number(debt.amount).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-3 gap-2"
                    onClick={() => payDebtMutation.mutate(debt.id)}
                    disabled={payDebtMutation.isPending}
                  >
                    <Check className="h-4 w-4" />
                    تم السداد
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="paid" className="space-y-3 mt-4">
            {paidDebts.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 notebook-paper">
                لا يوجد ديون مسددة
              </p>
            ) : (
              paidDebts.map((debt) => (
                <div key={debt.id} className="notebook-paper p-4 opacity-60">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-muted">
                        <Check className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-bold line-through">{debt.description}</p>
                        <p className="text-xs text-muted-foreground">
                          تم السداد: {debt.paid_at ? formatDate(debt.paid_at) : "غير محدد"}
                        </p>
                      </div>
                    </div>
                    <p className="text-xl font-bold text-muted-foreground line-through">
                      {Number(debt.amount).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
