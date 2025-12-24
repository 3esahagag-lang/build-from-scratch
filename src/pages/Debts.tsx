import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus,
  Check,
  HandCoins
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function Debts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [type, setType] = useState<"owed_to_me" | "owed_by_me">("owed_to_me");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  // Fetch debts
  const { data: debts } = useQuery({
    queryKey: ["debts", user?.id],
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

  // Add debt mutation
  const addDebt = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("debts").insert({
        user_id: user!.id,
        amount: parseFloat(amount),
        type,
        description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      toast({ title: "تم تسجيل السلفة" });
      setAmount("");
      setDescription("");
      setDialogOpen(false);
    },
  });

  // Mark as paid mutation
  const markAsPaid = useMutation({
    mutationFn: async (debtId: string) => {
      const { error } = await supabase
        .from("debts")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("id", debtId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      toast({ title: "تم تسجيل السداد" });
    },
  });

  const owedToMe = debts?.filter(d => d.type === "owed_to_me") || [];
  const owedByMe = debts?.filter(d => d.type === "owed_by_me") || [];
  const openOwedToMe = owedToMe.filter(d => !d.is_paid);
  const openOwedByMe = owedByMe.filter(d => !d.is_paid);

  const totalOwedToMe = openOwedToMe.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalOwedByMe = openOwedByMe.reduce((sum, d) => sum + Number(d.amount), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0 || !description) {
      toast({ title: "أكمل جميع البيانات", variant: "destructive" });
      return;
    }
    addDebt.mutate();
  };

  const DebtCard = ({ debt }: { debt: typeof debts[0] }) => (
    <div className={`record-item ${debt.is_paid ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {debt.type === "owed_to_me" ? (
              <ArrowDownLeft className="h-4 w-4 text-owed-to-me" />
            ) : (
              <ArrowUpRight className="h-4 w-4 text-owed-by-me" />
            )}
            <span className="font-medium">{debt.description}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {new Date(debt.created_at).toLocaleDateString("ar-EG")}
            {debt.is_paid && debt.paid_at && (
              <span className="text-success mr-2">
                (سُدد {new Date(debt.paid_at).toLocaleDateString("ar-EG")})
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-lg font-bold ${
            debt.type === "owed_to_me" ? "text-owed-to-me" : "text-owed-by-me"
          }`}>
            {Number(debt.amount).toLocaleString()}
          </span>
          {!debt.is_paid && (
            <Button
              variant="ghost"
              size="icon"
              className="text-success hover:bg-success/10"
              onClick={() => markAsPaid.mutate(debt.id)}
            >
              <Check className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="flex items-center justify-between animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground">السلف</h1>
            <p className="text-muted-foreground">تتبع الديون</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-1">
                <Plus className="h-4 w-4" />
                سلفة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>تسجيل سلفة</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={type === "owed_to_me" ? "default" : "outline"}
                    className={`flex-1 gap-2 ${type === "owed_to_me" ? "bg-owed-to-me hover:bg-owed-to-me/90" : ""}`}
                    onClick={() => setType("owed_to_me")}
                  >
                    <ArrowDownLeft className="h-4 w-4" />
                    ليك فلوس
                  </Button>
                  <Button
                    type="button"
                    variant={type === "owed_by_me" ? "default" : "outline"}
                    className={`flex-1 gap-2 ${type === "owed_by_me" ? "bg-owed-by-me hover:bg-owed-by-me/90" : ""}`}
                    onClick={() => setType("owed_by_me")}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                    عليك فلوس
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <Label>المبلغ</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-xl h-12 text-center"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label>الوصف (اسم الشخص أو السبب)</Label>
                  <Textarea
                    placeholder="مثال: أحمد - قرض شخصي"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={addDebt.isPending}
                  className="w-full"
                >
                  {addDebt.isPending ? "جاري الحفظ..." : "تسجيل"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <div className="stat-card text-center">
            <ArrowDownLeft className="h-5 w-5 mx-auto text-owed-to-me mb-1" />
            <div className="text-lg font-bold text-owed-to-me">
              {totalOwedToMe.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">ليك ({openOwedToMe.length})</div>
          </div>
          <div className="stat-card text-center">
            <ArrowUpRight className="h-5 w-5 mx-auto text-owed-by-me mb-1" />
            <div className="text-lg font-bold text-owed-by-me">
              {totalOwedByMe.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground">عليك ({openOwedByMe.length})</div>
          </div>
        </div>

        {/* Owed to me section */}
        <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h3 className="section-title">
            <ArrowDownLeft className="h-5 w-5 text-owed-to-me" />
            ليك فلوس
          </h3>
          {owedToMe.length > 0 ? (
            <div className="notebook-paper divide-y divide-border">
              {owedToMe.map((debt) => (
                <DebtCard key={debt.id} debt={debt} />
              ))}
            </div>
          ) : (
            <div className="notebook-paper p-6 text-center text-muted-foreground">
              لا توجد سلف
            </div>
          )}
        </div>

        {/* Owed by me section */}
        <div className="animate-slide-up" style={{ animationDelay: "150ms" }}>
          <h3 className="section-title">
            <ArrowUpRight className="h-5 w-5 text-owed-by-me" />
            عليك فلوس
          </h3>
          {owedByMe.length > 0 ? (
            <div className="notebook-paper divide-y divide-border">
              {owedByMe.map((debt) => (
                <DebtCard key={debt.id} debt={debt} />
              ))}
            </div>
          ) : (
            <div className="notebook-paper p-6 text-center text-muted-foreground">
              لا توجد سلف
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
