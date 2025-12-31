import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  ArrowLeftRight,
  TrendingUp,
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
import { useNetworkStatus } from "@/hooks/useOperationState";
// ✅ استيراد الهوك الذري الصحيح
import { useAtomicTransfer } from "@/hooks/useAtomicTransactions"; 
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FIXED_NUMBERS_QUERY_KEYS } from "@/lib/queryKeys";
import { toast } from "sonner";

export default function Transfers() {
  const { user } = useAuth();
  const isOnline = useNetworkStatus();
  
  // States
  const [activeTab, setActiveTab] = useState<"general" | "fixed">("general");
  const [transferType, setTransferType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [profit, setProfit] = useState("");
  const [notes, setNotes] = useState("");
  const [fixedNumberDialogOpen, setFixedNumberDialogOpen] = useState(false);
  
  // New Fixed Number Form
  const [newNumberName, setNewNumberName] = useState("");
  const [newNumberPhone, setNewNumberPhone] = useState("");
  const [newNumberLimit, setNewNumberLimit] = useState("");

  // 🔥 الخطوة الحاسمة: استخدام الهوك الذي يكتب في جدول transfers
  const atomicTransfer = useAtomicTransfer();

  // Fetch Fixed Numbers
  const { data: fixedNumbers } = useQuery({
    queryKey: FIXED_NUMBERS_QUERY_KEYS.all(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_numbers")
        .select("*")
        .eq("user_id", user!.id)
        .eq("is_disabled", false);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // ✅ معالجة التحويل العام
  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;

    atomicTransfer.mutate({
      amount: parseFloat(amount),
      type: transferType,
      notes: notes,
      profit: parseFloat(profit) || 0,
      fixedNumberId: undefined, // تحويل عام بدون رقم
    }, {
      onSuccess: () => {
        setAmount("");
        setProfit("");
        setNotes("");
        toast.success("تم تسجيل العملية بنجاح");
      }
    });
  };

  // ✅ معالجة تحويل الرقم الثابت (هنا كان الخطأ سابقاً)
  const handleFixedNumberTransfer = (id: string, data: { amount: number; profit?: number; notes?: string }) => {
    // نمرر الـ ID ليتم ربطه في جدول transfers
    atomicTransfer.mutate({
      amount: data.amount,
      type: "expense", // دائماً مصروف بالنسبة للأرقام
      notes: data.notes || "تحويل رصيد",
      profit: data.profit || 0,
      fixedNumberId: id, // ✅ الربط الصحيح
    });
  };

  return (
    <Layout>
      <NetworkStatus isOnline={isOnline} />
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">التحويلات</h1>
            <p className="text-muted-foreground">تسجيل العمليات المالية</p>
          </div>
          
          {/* Tabs Toggle */}
          <div className="flex bg-muted p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("general")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "general" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              عام
            </button>
            <button
              onClick={() => setActiveTab("fixed")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "fixed" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              أرقام ثابتة
            </button>
          </div>
        </div>

        {activeTab === "general" ? (
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleTransferSubmit} className="space-y-4">
                  <div className="flex gap-2 mb-4">
                    <Button
                      type="button"
                      variant={transferType === "expense" ? "default" : "outline"}
                      className={`flex-1 ${transferType === "expense" ? "bg-expense hover:bg-expense/90" : ""}`}
                      onClick={() => setTransferType("expense")}
                    >
                      <ArrowLeftRight className="ml-2 h-4 w-4" />
                      مصروف / تحويل
                    </Button>
                    <Button
                      type="button"
                      variant={transferType === "income" ? "default" : "outline"}
                      className={`flex-1 ${transferType === "income" ? "bg-income hover:bg-income/90" : ""}`}
                      onClick={() => setTransferType("income")}
                    >
                      <TrendingUp className="ml-2 h-4 w-4" />
                      دخل / إيداع
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>المبلغ</Label>
                    <Input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="text-2xl text-center font-bold"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>الربح (اختياري)</Label>
                    <Input
                      type="number"
                      value={profit}
                      onChange={(e) => setProfit(e.target.value)}
                      placeholder="0.00"
                      dir="ltr"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>ملاحظات</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="أضف تفاصيل العملية..."
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg"
                    disabled={atomicTransfer.isPending || !amount}
                  >
                    {atomicTransfer.isPending ? "جاري الحفظ..." : "تسجيل العملية"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end">
               <Dialog open={fixedNumberDialogOpen} onOpenChange={setFixedNumberDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-4 w-4" />
                    رقم جديد
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>إضافة رقم ثابت</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>الاسم</Label>
                      <Input value={newNumberName} onChange={e => setNewNumberName(e.target.value)} placeholder="مثال: فودافون كاش" />
                    </div>
                    <div className="space-y-2">
                      <Label>الرقم (اختياري)</Label>
                      <Input value={newNumberPhone} onChange={e => setNewNumberPhone(e.target.value)} dir="ltr" placeholder="01xxxxxxxxx" />
                    </div>
                    <div className="space-y-2">
                      <Label>الحد الشهري (اختياري)</Label>
                      <Input type="number" value={newNumberLimit} onChange={e => setNewNumberLimit(e.target.value)} dir="ltr" placeholder="0" />
                    </div>
                    <Button 
                      className="w-full"
                      onClick={async () => {
                        await supabase.from("fixed_numbers").insert({
                          user_id: user!.id,
                          name: newNumberName,
                          phone_number: newNumberPhone,
                          monthly_limit: parseFloat(newNumberLimit) || 0
                        });
                        setFixedNumberDialogOpen(false);
                        setNewNumberName("");
                        setNewNumberPhone("");
                        window.location.reload(); 
                      }}
                    >
                      حفظ
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {fixedNumbers?.map((num) => (
                <FixedNumberCard
                  key={num.id}
                  id={num.id}
                  name={num.name}
                  phoneNumber={num.phone_number || ""}
                  limit={num.monthly_limit || 0}
                  used={0} // سيتم التحديث تلقائياً
                  isSubmitting={atomicTransfer.isPending}
                  onSubmitTransfer={handleFixedNumberTransfer}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
