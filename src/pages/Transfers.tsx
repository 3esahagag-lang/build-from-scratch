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
  TrendingUp, 
  TrendingDown, 
  Plus,
  Hash,
  X
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Transfers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [fixedNumberId, setFixedNumberId] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newFixedNumber, setNewFixedNumber] = useState("");
  const [newFixedLimit, setNewFixedLimit] = useState("");
  const [fixedNumberDialogOpen, setFixedNumberDialogOpen] = useState(false);

  // Fetch fixed numbers
  const { data: fixedNumbers } = useQuery({
    queryKey: ["fixed-numbers", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_numbers")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch monthly usage for fixed numbers
  const { data: monthlyUsage } = useQuery({
    queryKey: ["monthly-usage", user?.id],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("transfers")
        .select("fixed_number_id, amount")
        .gte("created_at", startOfMonth.toISOString())
        .not("fixed_number_id", "is", null);

      if (error) throw error;
      
      const usage: Record<string, number> = {};
      data?.forEach(t => {
        if (t.fixed_number_id) {
          usage[t.fixed_number_id] = (usage[t.fixed_number_id] || 0) + Number(t.amount);
        }
      });
      return usage;
    },
    enabled: !!user,
  });

  // Add transfer mutation
  const addTransfer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transfers").insert({
        user_id: user!.id,
        amount: parseFloat(amount),
        type,
        notes: notes || null,
        fixed_number_id: fixedNumberId || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-usage"] });
      queryClient.invalidateQueries({ queryKey: ["today-stats"] });
      toast({ title: "تم تسجيل التحويل بنجاح" });
      setAmount("");
      setNotes("");
      setFixedNumberId("");
      setDialogOpen(false);
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  // Add fixed number mutation
  const addFixedNumber = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fixed_numbers").insert({
        user_id: user!.id,
        name: newFixedNumber,
        monthly_limit: parseFloat(newFixedLimit) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-numbers"] });
      toast({ title: "تم إضافة الرقم الثابت" });
      setNewFixedNumber("");
      setNewFixedLimit("");
      setFixedNumberDialogOpen(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "أدخل مبلغاً صحيحاً", variant: "destructive" });
      return;
    }
    addTransfer.mutate();
  };

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">التحويلات</h1>
          <p className="text-muted-foreground">سجّل حركة الفلوس</p>
        </div>

        {/* Type Toggle */}
        <div className="flex gap-2 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <Button
            variant={type === "income" ? "default" : "outline"}
            className={`flex-1 gap-2 ${type === "income" ? "bg-income hover:bg-income/90" : ""}`}
            onClick={() => setType("income")}
          >
            <TrendingUp className="h-5 w-5" />
            فلوس دخلت
          </Button>
          <Button
            variant={type === "expense" ? "default" : "outline"}
            className={`flex-1 gap-2 ${type === "expense" ? "bg-expense hover:bg-expense/90" : ""}`}
            onClick={() => setType("expense")}
          >
            <TrendingDown className="h-5 w-5" />
            فلوس خرجت
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up" style={{ animationDelay: "100ms" }}>
          <div className="notebook-paper p-4 space-y-4">
            <div className="space-y-2">
              <Label>المبلغ</Label>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-2xl h-14 text-center"
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="وصف الحركة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>رقم ثابت (اختياري)</Label>
                <Dialog open={fixedNumberDialogOpen} onOpenChange={setFixedNumberDialogOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="gap-1">
                      <Plus className="h-4 w-4" />
                      إضافة
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>إضافة رقم ثابت</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>الاسم</Label>
                        <Input
                          placeholder="مثال: إيجار، كهرباء..."
                          value={newFixedNumber}
                          onChange={(e) => setNewFixedNumber(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>الحد الشهري</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={newFixedLimit}
                          onChange={(e) => setNewFixedLimit(e.target.value)}
                          dir="ltr"
                        />
                      </div>
                      <Button
                        onClick={() => addFixedNumber.mutate()}
                        disabled={!newFixedNumber}
                        className="w-full"
                      >
                        إضافة
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Select value={fixedNumberId} onValueChange={setFixedNumberId}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر رقماً ثابتاً" />
                </SelectTrigger>
                <SelectContent>
                  {fixedNumbers?.map((fn) => {
                    const used = monthlyUsage?.[fn.id] || 0;
                    const limit = Number(fn.monthly_limit);
                    const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
                    
                    return (
                      <SelectItem key={fn.id} value={fn.id}>
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4" />
                          <span>{fn.name}</span>
                          {limit > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({percentage.toFixed(0)}%)
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Progress bar for selected fixed number */}
            {fixedNumberId && (() => {
              const fn = fixedNumbers?.find(f => f.id === fixedNumberId);
              const used = monthlyUsage?.[fixedNumberId] || 0;
              const limit = Number(fn?.monthly_limit) || 0;
              const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
              
              if (limit > 0) {
                return (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">الاستخدام الشهري</span>
                      <span>{used.toLocaleString()} / {limit.toLocaleString()}</span>
                    </div>
                    <div className="progress-bar">
                      <div 
                        className="progress-fill" 
                        style={{ 
                          width: `${percentage}%`,
                          background: percentage >= 100 ? 'hsl(var(--destructive))' : undefined
                        }} 
                      />
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>

          <Button
            type="submit"
            disabled={addTransfer.isPending}
            className={`w-full h-14 text-lg action-button ${
              type === "income" ? "bg-income hover:bg-income/90" : "bg-expense hover:bg-expense/90"
            }`}
          >
            {addTransfer.isPending ? "جاري الحفظ..." : "تسجيل"}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
