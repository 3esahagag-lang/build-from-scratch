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
  Phone,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import FixedNumberCard from "@/components/FixedNumberCard";

export default function Transfers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [type, setType] = useState<"income" | "expense">("income");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [fixedNumberId, setFixedNumberId] = useState<string>("");
  const [newPhoneNumber, setNewPhoneNumber] = useState("");
  const [newFixedName, setNewFixedName] = useState("");
  const [newFixedLimit, setNewFixedLimit] = useState("");
  const [fixedNumberDialogOpen, setFixedNumberDialogOpen] = useState(false);
  const [showAllNumbers, setShowAllNumbers] = useState(false);

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

  // Fetch monthly usage for fixed numbers from fixed_number_transfers table
  const { data: monthlyUsage } = useQuery({
    queryKey: ["fixed-number-monthly-usage", user?.id],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("fixed_number_transfers")
        .select("fixed_number_id, amount")
        .gte("created_at", startOfMonth.toISOString());

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

  // Add transfer mutation (for regular transfers)
  const addTransfer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("transfers").insert({
        user_id: user!.id,
        amount: parseFloat(amount),
        type,
        notes: notes || null,
        fixed_number_id: null, // Regular transfers don't use fixed numbers anymore
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["today-stats"] });
      toast({ title: "تم تسجيل التحويل بنجاح" });
      setAmount("");
      setNotes("");
    },
    onError: () => {
      toast({ title: "حدث خطأ", variant: "destructive" });
    },
  });

  // Add fixed number transfer mutation (separate table with limit enforcement)
  const addFixedNumberTransfer = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fixed_number_transfers").insert({
        user_id: user!.id,
        fixed_number_id: fixedNumberId,
        amount: parseFloat(amount),
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-number-monthly-usage"] });
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["today-stats"] });
      toast({ title: "تم تسجيل التحويل على الرقم الثابت بنجاح" });
      setAmount("");
      setNotes("");
      setFixedNumberId("");
    },
    onError: (error: Error) => {
      // Parse the error message for limit exceeded
      const errorMessage = error.message || "";
      if (errorMessage.includes("LIMIT_EXCEEDED")) {
        const arabicMessage = errorMessage.split("LIMIT_EXCEEDED:")[1] || "تم تجاوز الحد الشهري للتحويلات";
        toast({ 
          title: "تجاوز الحد الشهري",
          description: arabicMessage,
          variant: "destructive" 
        });
      } else {
        toast({ title: "حدث خطأ", variant: "destructive" });
      }
    },
  });

  // Add fixed number mutation
  const addFixedNumber = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("fixed_numbers").insert({
        user_id: user!.id,
        name: newFixedName || newPhoneNumber,
        phone_number: newPhoneNumber,
        monthly_limit: parseFloat(newFixedLimit) || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-numbers"] });
      toast({ title: "تم إضافة الرقم بنجاح" });
      setNewPhoneNumber("");
      setNewFixedName("");
      setNewFixedLimit("");
      setFixedNumberDialogOpen(false);
    },
    onError: () => {
      toast({ title: "حدث خطأ - تأكد من صحة الرقم", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "أدخل مبلغاً صحيحاً", variant: "destructive" });
      return;
    }
    
    // Check if a fixed number is selected - use separate table
    if (fixedNumberId) {
      // Client-side limit check for better UX
      const selectedNumber = fixedNumbers?.find(fn => fn.id === fixedNumberId);
      const currentUsage = monthlyUsage?.[fixedNumberId] || 0;
      const limit = Number(selectedNumber?.monthly_limit) || 0;
      const newAmount = parseFloat(amount);
      
      if (limit > 0 && (currentUsage + newAmount) > limit) {
        const remaining = Math.max(0, limit - currentUsage);
        toast({ 
          title: "تجاوز الحد الشهري",
          description: `الحد: ${limit} | المستخدم: ${currentUsage} | المتبقي: ${remaining}`,
          variant: "destructive" 
        });
        return;
      }
      
      addFixedNumberTransfer.mutate();
    } else {
      addTransfer.mutate();
    }
  };

  const validatePhoneNumber = (value: string) => {
    // Only allow digits and max 11 characters
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    setNewPhoneNumber(cleaned);
  };

  const isValidPhone = newPhoneNumber.length === 11;
  const displayedNumbers = showAllNumbers ? fixedNumbers : fixedNumbers?.slice(0, 3);

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

            {/* Fixed Numbers Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  أرقام الهواتف الثابتة
                </Label>
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
                        disabled={!isValidPhone || addFixedNumber.isPending}
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
                <div className="space-y-2">
                  {displayedNumbers?.map((fn) => {
                    const used = monthlyUsage?.[fn.id] || 0;
                    const limit = Number(fn.monthly_limit);
                    
                    return (
                      <FixedNumberCard
                        key={fn.id}
                        phoneNumber={fn.phone_number || fn.name}
                        name={fn.phone_number ? fn.name : ""}
                        used={used}
                        limit={limit}
                        isSelected={fixedNumberId === fn.id}
                        onSelect={() => setFixedNumberId(fixedNumberId === fn.id ? "" : fn.id)}
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
                <div className="text-center py-4 text-muted-foreground text-sm">
                  لا توجد أرقام مسجلة، أضف رقماً جديداً
                </div>
              )}
            </div>
          </div>

          <Button
            type="submit"
            disabled={addTransfer.isPending || addFixedNumberTransfer.isPending}
            className={`w-full h-14 text-lg action-button ${
              type === "income" ? "bg-income hover:bg-income/90" : "bg-expense hover:bg-expense/90"
            }`}
          >
            {(addTransfer.isPending || addFixedNumberTransfer.isPending) ? "جاري الحفظ..." : "تسجيل"}
          </Button>
        </form>
      </div>
    </Layout>
  );
}
