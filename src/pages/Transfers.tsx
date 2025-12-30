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
  Plus,
  Phone,
  ChevronDown,
  ChevronUp,
  Loader2,
  ArrowLeftRight,
  TrendingUp,
  Hash
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import FixedNumberCard from "@/components/FixedNumberCard";
import { NetworkStatus } from "@/components/OperationFeedback";
import { useNetworkStatus, usePreventDoubleSubmit } from "@/hooks/useOperationState";

export default function Transfers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();
  const { isSubmitting, wrapSubmit } = usePreventDoubleSubmit();
  
  // Form state for regular transfers
  const [amount, setAmount] = useState("");
  const [profit, setProfit] = useState("");
  const [notes, setNotes] = useState("");
  
  // Phone numbers state
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newFixedName, setNewFixedName] = useState("");
  const [newFixedLimit, setNewFixedLimit] = useState("");
  const [fixedNumberDialogOpen, setFixedNumberDialogOpen] = useState(false);
  const [showAllNumbers, setShowAllNumbers] = useState(false);
  const [expandedNumberId, setExpandedNumberId] = useState<string | null>(null);

  // Fetch fixed numbers
  const { data: fixedNumbers, isLoading } = useQuery({
    queryKey: ["fixed-numbers", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_numbers")
        .select("*")
        .eq("user_id", user!.id);

      if (error) throw error;
      return data;
    },
  });

  // Monthly usage — SINGLE SOURCE OF TRUTH from transfers table
  const { data: monthlyUsage } = useQuery({
    queryKey: ["fixed-number-monthly-usage", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("transfers")
        .select("fixed_number_id, amount")
        .eq("user_id", user!.id)
        .not("fixed_number_id", "is", null)
        .eq("is_archived", false)
        .gte("created_at", startOfMonth.toISOString());

      if (error) throw error;

      const usage: Record<string, number> = {};
      data?.forEach(t => {
        if (t.fixed_number_id) {
          usage[t.fixed_number_id] =
            (usage[t.fixed_number_id] || 0) + Number(t.amount);
        }
      });

      return usage;
    },
  });

  // Fetch transfer summary (count, total amount, total profit)
  const { data: transferSummary } = useQuery({
    queryKey: ["transfers-summary", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: transfers, error } = await supabase
        .from("transfers")
        .select("amount, profit, type")
        .eq("user_id", user!.id)
        .eq("is_archived", false);
      
      if (error) throw error;

      const totalCount = transfers?.length || 0;
      const totalIncome = transfers?.reduce((sum, t) => {
        return sum + (t.type === "income" ? Number(t.amount) : 0);
      }, 0) || 0;
      
      const totalProfit = transfers?.reduce((sum, t) => sum + (Number(t.profit) || 0), 0) || 0;

      return {
        count: totalCount,
        totalIncome,
        totalProfit,
      };
    },
  });

  // Add regular transfer mutation
  const addTransfer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transfers").insert({
        user_id: user!.id,
        amount: parseFloat(amount),
        profit: parseFloat(profit) || 0,
        type: "income",
        notes: notes || null,
        fixed_number_id: null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["transfers-summary"] });
      queryClient.invalidateQueries({ queryKey: ["today-stats"] });
      toast({ title: "تم تسجيل التحويل بنجاح" });
      setAmount("");
      setProfit("");
      setNotes("");
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  // Add fixed number transfer mutation - inserts into transfers table with fixed_number_id
  const addFixedNumberTransfer = useMutation({
    mutationFn: async ({
      fixedNumberId,
      transferAmount,
      transferProfit,
      transferNotes,
    }: {
      fixedNumberId: string;
      transferAmount: number;
      transferProfit?: number;
      transferNotes?: string;
    }) => {
      const { error } = await supabase
        .from("transfers")
        .insert({
          user_id: user!.id,
          fixed_number_id: fixedNumberId,
          amount: transferAmount,
          profit: transferProfit ?? 0,
          type: "income",
          notes: transferNotes ?? null,
          is_archived: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["transfers-summary"] });
      queryClient.invalidateQueries({ queryKey: ["today-stats"] });
      queryClient.invalidateQueries({ queryKey: ["fixed-number-monthly-usage", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["phone-numbers-usage"] });
      queryClient.invalidateQueries({ queryKey: ["records-phone-numbers-summary"] });

      toast({ title: "تم تسجيل التحويل على الرقم بنجاح" });
      setExpandedNumberId(null);
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  // Add fixed number mutation
  const addFixedNumber = useMutation({
    mutationFn: async () => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const payload = {
        user_id: user.id,
        phone_number: newPhoneNumber,
        name: newFixedName?.trim() || newPhoneNumber,
        monthly_limit: Number(newFixedLimit) || 0,
      };

      const { error } = await supabase
        .from("fixed_numbers")
        .insert(payload);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-numbers", user?.id] });
      setNewPhoneNumber("");
      setNewFixedName("");
      setNewFixedLimit("");
      setFixedNumberDialogOpen(false);
      toast({ title: "تم إضافة الرقم بنجاح" });
    },
    onError: (error: Error) => {
      toast({
        title: "فشل إضافة الرقم",
        description: error.message ?? "خطأ غير معروف",
        variant: "destructive",
      });
    },
  });

  // Update fixed number mutation
  const updateFixedNumber = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { phone_number?: string; name?: string; monthly_limit?: number } }) => {
      const { error } = await supabase
        .from("fixed_numbers")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-numbers"] });
      toast({ title: "تم تحديث الرقم بنجاح" });
    },
    onError: () => {
      toast({ title: "حدث خطأ في التحديث", variant: "destructive" });
    },
  });

  // Disable fixed number mutation
  const disableFixedNumber = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("fixed_numbers")
        .update({ is_disabled: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-numbers"] });
      toast({ title: "تم تعطيل الرقم" });
      setExpandedNumberId(null);
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  const handleSubmitRegularTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isOnline) {
      toast({ 
        title: "لا يوجد اتصال بالإنترنت", 
        description: "لن يتم حفظ التحويل حتى يعود الاتصال",
        variant: "destructive" 
      });
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "أدخل مبلغاً صحيحاً", variant: "destructive" });
      return;
    }
    
    await wrapSubmit(() => addTransfer.mutateAsync());
  };

  const handleSubmitFixedNumberTransfer = async (
    fixedNumberId: string, 
    data: { amount: number; profit?: number; notes?: string }
  ) => {
    if (!isOnline) {
      toast({ 
        title: "لا يوجد اتصال بالإنترنت", 
        variant: "destructive" 
      });
      return;
    }

    const selectedNumber = fixedNumbers?.find(fn => fn.id === fixedNumberId);
    const currentUsage = monthlyUsage?.[fixedNumberId] || 0;
    const limit = Number(selectedNumber?.monthly_limit) || 0;
    
    if (limit > 0 && (currentUsage + data.amount) > limit) {
      const remaining = Math.max(0, limit - currentUsage);
      toast({ 
        title: "تجاوز الحد الشهري",
        description: `الحد: ${limit.toLocaleString()} | المستخدم: ${currentUsage.toLocaleString()} | المتبقي: ${remaining.toLocaleString()}`,
        variant: "destructive" 
      });
      return;
    }
    
    await wrapSubmit(() => addFixedNumberTransfer.mutateAsync({
      fixedNumberId,
      transferAmount: data.amount,
      transferProfit: data.profit,
      transferNotes: data.notes,
    }));
  };

  const validatePhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    setNewPhoneNumber(cleaned);
  };

  const displayedNumbers = showAllNumbers
    ? fixedNumbers
    : fixedNumbers?.slice(-3);

  return (
    <Layout>
      <NetworkStatus isOnline={isOnline} />
      
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">سجل تحويلك</h1>
          <p className="text-muted-foreground">سجّل تحويلاتك وتابع حساباتك</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: "25ms" }}>
          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <Hash className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {transferSummary?.count || 0}
              </p>
              <p className="text-xs text-muted-foreground">إجمالي التحويلات</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <ArrowLeftRight className="h-4 w-4 text-income" />
              </div>
              <p className="text-2xl font-bold text-income">
                {(transferSummary?.totalIncome || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">إجمالي المبلغ</p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center mb-1">
                <TrendingUp className="h-4 w-4 text-income" />
              </div>
              <p className="text-2xl font-bold text-income">
                {(transferSummary?.totalProfit || 0).toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">إجمالي الربح</p>
            </CardContent>
          </Card>
        </div>

        {/* Fixed Numbers Section */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: "50ms" }}>
          <div className="flex items-center justify-between">
            <h2 className="section-title flex items-center gap-2">
              <Phone className="h-4 w-4" />
              أرقام الهواتف الثابتة
            </h2>
            <Dialog open={fixedNumberDialogOpen} onOpenChange={setFixedNumberDialogOpen}>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="gap-1">
                  <Plus className="h-4 w-4" />
                  إضافة رقم
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة رقم هاتف ثابت</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>رقم الهاتف (11 رقم)</Label>
                    <Input
                      type="tel"
                      placeholder="01xxxxxxxxx"
                      value={newPhoneNumber}
                      onChange={(e) => validatePhoneNumber(e.target.value)}
                      className="text-center font-mono text-lg"
                      dir="ltr"
                      maxLength={11}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      {newPhoneNumber.length}/11 رقم
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>اسم مميز (اختياري)</Label>
                    <Input
                      placeholder="مثال: محمد أحمد"
                      value={newFixedName}
                      onChange={(e) => setNewFixedName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>الحد الشهري للتحويلات</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newFixedLimit}
                      onChange={(e) => setNewFixedLimit(e.target.value)}
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">
                      يتجدد تلقائياً في بداية كل شهر
                    </p>
                  </div>
                  <Button
                    onClick={() => addFixedNumber.mutate()}
                    disabled={addFixedNumber.isPending}
                    className="w-full"
                  >
                    {addFixedNumber.isPending ? "جاري الإضافة..." : "إضافة الرقم"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Fixed Numbers List */}
          {fixedNumbers && fixedNumbers.length > 0 ? (
            <div className="space-y-3">
              {displayedNumbers?.map((fn) => {
                const used = monthlyUsage?.[fn.id] || 0;
                const limit = Number(fn.monthly_limit);
                const isDisabled = fn.is_disabled ?? false;
                
                return (
                  <FixedNumberCard
                    key={fn.id}
                    id={fn.id}
                    phoneNumber={fn.phone_number || ""}
                    name={fn.name}
                    used={used}
                    limit={limit}
                    isDisabled={isDisabled}
                    isExpanded={expandedNumberId === fn.id}
                    isSubmitting={addFixedNumberTransfer.isPending}
                    onToggleExpand={(id) => setExpandedNumberId(id)}
                    onSubmitTransfer={handleSubmitFixedNumberTransfer}
                    onUpdate={(id, data) => updateFixedNumber.mutate({ id, data })}
                    onDisable={(id) => disableFixedNumber.mutate(id)}
                  />
                );
              })}
              
              {fixedNumbers.length > 3 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setShowAllNumbers(!showAllNumbers)}
                >
                  {showAllNumbers ? (
                    <>
                      <ChevronUp className="h-4 w-4 ml-1" />
                      عرض أقل
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 ml-1" />
                      عرض الكل ({fixedNumbers.length})
                    </>
                  )}
                </Button>
              )}
            </div>
          ) : (
            <div className="notebook-paper p-6 text-center text-muted-foreground">
              <Phone className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>لا توجد أرقام ثابتة</p>
              <p className="text-sm">أضف رقماً لبدء تتبع التحويلات</p>
            </div>
          )}
        </div>

        {/* Regular Transfer Form */}
        <div className="space-y-4 animate-slide-up" style={{ animationDelay: "75ms" }}>
          <h2 className="section-title">تحويل عام</h2>
          
          <form onSubmit={handleSubmitRegularTransfer} className="notebook-paper p-4 space-y-4">
            <div className="space-y-2">
              <Label>المبلغ *</Label>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                dir="ltr"
                className="text-center text-lg"
              />
            </div>

            <div className="space-y-2">
              <Label>الربح (اختياري)</Label>
              <Input
                type="number"
                placeholder="0"
                value={profit}
                onChange={(e) => setProfit(e.target.value)}
                dir="ltr"
              />
            </div>

            <div className="space-y-2">
              <Label>ملاحظات (اختياري)</Label>
              <Textarea
                placeholder="أضف ملاحظة..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || addTransfer.isPending || !amount}
              className="w-full"
            >
              {isSubmitting || addTransfer.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                "تسجيل التحويل"
              )}
            </Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}