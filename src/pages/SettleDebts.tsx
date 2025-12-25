import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet, 
  ArrowRight, 
  Loader2, 
  Check,
  TrendingUp,
  TrendingDown,
  Calendar
} from "lucide-react";

interface Debt {
  id: string;
  type: string;
  amount: number;
  description: string;
  is_paid: boolean | null;
  created_at: string | null;
}

// Business logic for paying a debt
async function payDebt(debtId: string): Promise<void> {
  const { error } = await supabase
    .from("debts")
    .update({ 
      is_paid: true, 
      paid_at: new Date().toISOString() 
    })
    .eq("id", debtId);

  if (error) {
    throw new Error(`فشل تسجيل السداد: ${error.message}`);
  }
}

export default function SettleDebts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: debts, isLoading } = useQuery({
    queryKey: ["debts-unpaid", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("debts")
        .select("*")
        .eq("is_archived", false)
        .eq("is_paid", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Debt[];
    },
    enabled: !!user,
  });

  const payDebtMutation = useMutation({
    mutationFn: payDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["debts-unpaid"] });
      toast.success("تم تسجيل السداد بنجاح");
    },
    onError: (error: Error) => {
      toast.error(error.message || "حدث خطأ أثناء تسجيل السداد");
    },
  });

  const owedToMe = debts?.filter((d) => d.type === "owed_to_me") || [];
  const owedByMe = debts?.filter((d) => d.type === "owed_by_me") || [];

  const totalOwedToMe = owedToMe.reduce((sum, d) => sum + d.amount, 0);
  const totalOwedByMe = owedByMe.reduce((sum, d) => sum + d.amount, 0);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
    });
  };

  const DebtCard = ({ debt }: { debt: Debt }) => {
    const isProcessing = payDebtMutation.isPending && payDebtMutation.variables === debt.id;
    const isOwedToMe = debt.type === "owed_to_me";

    return (
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-foreground">{debt.description}</h3>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatDate(debt.created_at)}
            </div>
          </div>
          <div className={`text-lg font-bold ${isOwedToMe ? "text-success" : "text-warning"}`}>
            {debt.amount.toLocaleString("ar-EG")} ج.م
          </div>
        </div>
        
        <Button
          onClick={() => payDebtMutation.mutate(debt.id)}
          disabled={isProcessing}
          className="w-full gap-2"
          variant={isOwedToMe ? "default" : "secondary"}
        >
          {isProcessing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          تم السداد
        </Button>
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Wallet className="h-12 w-12 mb-3 opacity-50" />
      <p>{message}</p>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 animate-slide-up">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Wallet className="h-7 w-7 text-warning" />
              سدّد سلفتك
            </h1>
            <p className="text-muted-foreground">
              اختر السلفة ثم اضغط "تم السداد" لتسجيلها
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <div className="bg-success/10 border border-success/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-success mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm">ليك فلوس</span>
            </div>
            <p className="text-xl font-bold text-success">
              {totalOwedToMe.toLocaleString("ar-EG")} ج.م
            </p>
          </div>
          
          <div className="bg-warning/10 border border-warning/20 rounded-xl p-4">
            <div className="flex items-center gap-2 text-warning mb-1">
              <TrendingDown className="h-4 w-4" />
              <span className="text-sm">عليك فلوس</span>
            </div>
            <p className="text-xl font-bold text-warning">
              {totalOwedByMe.toLocaleString("ar-EG")} ج.م
            </p>
          </div>
        </div>

        {/* Tabs */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="owed_to_me" className="animate-slide-up" style={{ animationDelay: "100ms" }}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="owed_to_me" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                ليك فلوس ({owedToMe.length})
              </TabsTrigger>
              <TabsTrigger value="owed_by_me" className="gap-2">
                <TrendingDown className="h-4 w-4" />
                عليك فلوس ({owedByMe.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="owed_to_me" className="space-y-3">
              {owedToMe.length > 0 ? (
                owedToMe.map((debt) => <DebtCard key={debt.id} debt={debt} />)
              ) : (
                <EmptyState message="لا توجد سلف مستحقة لك" />
              )}
            </TabsContent>

            <TabsContent value="owed_by_me" className="space-y-3">
              {owedByMe.length > 0 ? (
                owedByMe.map((debt) => <DebtCard key={debt.id} debt={debt} />)
              ) : (
                <EmptyState message="لا توجد سلف عليك" />
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </Layout>
  );
}
