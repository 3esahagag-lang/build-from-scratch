import { useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNetworkStatus, usePreventDoubleSubmit } from "@/hooks/useOperationState";
import { OperationFeedback, NetworkStatus } from "@/components/OperationFeedback";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Check, 
  Wallet, 
  X,
  Loader2,
  AlertTriangle
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface PayDebtsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface DebtRecord {
  id: string;
  amount: number;
  type: string;
  description: string;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  is_archived: boolean;
}

// Atomic partial payment with audit trail
async function processPartialPayment(
  userId: string,
  debtId: string,
  originalAmount: number,
  paymentAmount: number
): Promise<{ newDebtId?: string; remainingAmount: number }> {
  const remainingAmount = originalAmount - paymentAmount;
  
  if (remainingAmount < 0) {
    throw new Error("مبلغ الدفع أكبر من المبلغ المستحق");
  }
  
  if (remainingAmount === 0) {
    // Full payment - just mark as paid
    const { error } = await supabase
      .from("debts")
      .update({ 
        is_paid: true, 
        paid_at: new Date().toISOString() 
      })
      .eq("id", debtId)
      .eq("user_id", userId);
    
    if (error) throw new Error("فشل تسجيل السداد الكامل");
    
    // Log the payment in audit trail
    await supabase.rpc("log_record_change", {
      _user_id: userId,
      _record_type: "debt_payment",
      _record_id: debtId,
      _action: "update",
      _changes: { is_paid: true, paid_at: new Date().toISOString(), amount_paid: paymentAmount },
      _previous_values: { is_paid: false, amount: originalAmount },
      _reason: "سداد كامل",
    });
    
    return { remainingAmount: 0 };
  } else {
    // Partial payment - update amount and create audit trail
    const { error: updateError } = await supabase
      .from("debts")
      .update({ amount: remainingAmount })
      .eq("id", debtId)
      .eq("user_id", userId);
    
    if (updateError) throw new Error("فشل تحديث المبلغ المتبقي");
    
    // Log the partial payment
    await supabase.rpc("log_record_change", {
      _user_id: userId,
      _record_type: "debt_payment",
      _record_id: debtId,
      _action: "update",
      _changes: { 
        amount: remainingAmount, 
        partial_payment: paymentAmount,
        previous_amount: originalAmount 
      },
      _previous_values: { amount: originalAmount },
      _reason: `سداد جزئي: ${paymentAmount} جنيه`,
    });
    
    return { remainingAmount };
  }
}

export default function PayDebtsDrawer({ open, onOpenChange }: PayDebtsDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOnline = useNetworkStatus();
  const { isSubmitting, wrapSubmit } = usePreventDoubleSubmit();
  
  // Partial payment dialog state
  const [partialPaymentOpen, setPartialPaymentOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");

  // Fetch unpaid debts
  const { data: debts, isLoading } = useQuery({
    queryKey: ["debts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("debts")
        .select("*")
        .eq("is_archived", false)
        .eq("is_paid", false)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as DebtRecord[];
    },
    enabled: !!user && open,
  });

  // Payment mutation
  const payMutation = useMutation({
    mutationFn: async ({ debtId, amount, paymentAmt }: { 
      debtId: string; 
      amount: number; 
      paymentAmt: number;
    }) => {
      if (!user) throw new Error("يجب تسجيل الدخول");
      if (!isOnline) throw new Error("لا يوجد اتصال بالإنترنت");
      
      return processPartialPayment(user.id, debtId, amount, paymentAmt);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["financial-snapshot"] });
      
      if (result.remainingAmount === 0) {
        toast.success("تم السداد الكامل بنجاح");
      } else {
        toast.success(`تم السداد الجزئي - المتبقي: ${result.remainingAmount.toLocaleString()} جنيه`);
      }
      
      setPartialPaymentOpen(false);
      setSelectedDebt(null);
      setPaymentAmount("");
      setPaymentType("full");
    },
    onError: (error: Error) => {
      toast.error(error.message || "حدث خطأ أثناء السداد");
    },
  });

  const handlePayClick = (debt: DebtRecord) => {
    setSelectedDebt(debt);
    setPaymentAmount(String(debt.amount));
    setPaymentType("full");
    setPartialPaymentOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedDebt) return;
    
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("أدخل مبلغاً صحيحاً");
      return;
    }
    if (amount > selectedDebt.amount) {
      toast.error("مبلغ الدفع أكبر من المبلغ المستحق");
      return;
    }
    
    await wrapSubmit(() => 
      payMutation.mutateAsync({
        debtId: selectedDebt.id,
        amount: selectedDebt.amount,
        paymentAmt: amount,
      })
    );
  };

  const owedToMe = debts?.filter(d => d.type === "owed_to_me") || [];
  const owedByMe = debts?.filter(d => d.type === "owed_by_me") || [];

  const totalOwedToMe = owedToMe.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalOwedByMe = owedByMe.reduce((sum, d) => sum + Number(d.amount), 0);

  const DebtItem = ({ debt }: { debt: DebtRecord }) => (
    <div className="flex items-center justify-between p-4 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          {debt.type === "owed_to_me" ? (
            <ArrowDownLeft className="h-4 w-4 text-owed-to-me" />
          ) : (
            <ArrowUpRight className="h-4 w-4 text-owed-by-me" />
          )}
          <span className="font-medium text-foreground">{debt.description}</span>
        </div>
        <div className="text-sm text-muted-foreground">
          {new Date(debt.created_at).toLocaleDateString("ar-EG")}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-lg font-bold ${
          debt.type === "owed_to_me" ? "text-owed-to-me" : "text-owed-by-me"
        }`}>
          {Number(debt.amount).toLocaleString()}
        </span>
        <Button
          size="sm"
          className="gap-1 bg-success hover:bg-success/90"
          onClick={() => handlePayClick(debt)}
          disabled={!isOnline}
        >
          <Check className="h-4 w-4" />
          سداد
        </Button>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <Wallet className="h-12 w-12 mb-3 opacity-50" />
      <p>لا توجد سلف مستحقة</p>
    </div>
  );

  return (
    <>
      <NetworkStatus isOnline={isOnline} />
      
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="h-[92dvh] max-h-[92dvh]">
          <DrawerHeader className="text-center border-b border-border pb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-xl flex items-center gap-2">
                <Wallet className="h-6 w-6 text-warning" />
                سدّد سلفتك
              </DrawerTitle>
              <DrawerClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <X className="h-5 w-5" />
                </Button>
              </DrawerClose>
            </div>
            <DrawerDescription>
              اختر السلفة وحدد المبلغ - يمكنك السداد كلياً أو جزئياً
            </DrawerDescription>
          </DrawerHeader>

          <div className="flex-1 overflow-y-auto p-4">
            {!isOnline && (
              <OperationFeedback 
                status="warning" 
                message="لا يوجد اتصال بالإنترنت"
                details="لن يتم حفظ أي تغييرات حتى يعود الاتصال"
                className="mb-4"
              />
            )}
            
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Tabs defaultValue="owed_by_me" className="w-full" dir="rtl">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="owed_by_me" className="gap-2">
                    <ArrowUpRight className="h-4 w-4" />
                    عليك ({owedByMe.length})
                  </TabsTrigger>
                  <TabsTrigger value="owed_to_me" className="gap-2">
                    <ArrowDownLeft className="h-4 w-4" />
                    ليك ({owedToMe.length})
                  </TabsTrigger>
                </TabsList>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-owed-by-me">
                      {totalOwedByMe.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">عليك</div>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-center">
                    <div className="text-lg font-bold text-owed-to-me">
                      {totalOwedToMe.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">ليك</div>
                  </div>
                </div>

                <TabsContent value="owed_by_me" className="mt-0">
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    {owedByMe.length > 0 ? (
                      owedByMe.map((debt) => (
                        <DebtItem key={debt.id} debt={debt} />
                      ))
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="owed_to_me" className="mt-0">
                  <div className="bg-card rounded-xl border border-border overflow-hidden">
                    {owedToMe.length > 0 ? (
                      owedToMe.map((debt) => (
                        <DebtItem key={debt.id} debt={debt} />
                      ))
                    ) : (
                      <EmptyState />
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Partial Payment Dialog */}
      <Dialog open={partialPaymentOpen} onOpenChange={setPartialPaymentOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>سداد: {selectedDebt?.description}</DialogTitle>
            <DialogDescription>
              المبلغ المستحق: {selectedDebt?.amount.toLocaleString()} جنيه
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Payment type toggle */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={paymentType === "full" ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setPaymentType("full");
                  setPaymentAmount(String(selectedDebt?.amount || 0));
                }}
              >
                سداد كامل
              </Button>
              <Button
                type="button"
                variant={paymentType === "partial" ? "default" : "outline"}
                className="flex-1"
                onClick={() => {
                  setPaymentType("partial");
                  setPaymentAmount("");
                }}
              >
                سداد جزئي
              </Button>
            </div>

            {/* Amount input */}
            <div className="space-y-2">
              <Label>مبلغ السداد</Label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="أدخل المبلغ"
                className="text-center text-xl"
                dir="ltr"
                disabled={paymentType === "full"}
                max={selectedDebt?.amount}
              />
            </div>

            {/* Remaining preview */}
            {paymentType === "partial" && paymentAmount && selectedDebt && (
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المبلغ الأصلي</span>
                  <span>{selectedDebt.amount.toLocaleString()} جنيه</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">مبلغ السداد</span>
                  <span className="text-success">-{parseFloat(paymentAmount || "0").toLocaleString()} جنيه</span>
                </div>
                <div className="border-t border-border pt-2 flex justify-between font-bold">
                  <span>المتبقي</span>
                  <span className={parseFloat(paymentAmount) > selectedDebt.amount ? "text-destructive" : ""}>
                    {Math.max(0, selectedDebt.amount - parseFloat(paymentAmount || "0")).toLocaleString()} جنيه
                  </span>
                </div>
                
                {parseFloat(paymentAmount) > selectedDebt.amount && (
                  <div className="flex items-center gap-2 text-destructive text-sm mt-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>مبلغ السداد أكبر من المستحق</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setPartialPaymentOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={
                payMutation.isPending || 
                isSubmitting ||
                !paymentAmount || 
                parseFloat(paymentAmount) <= 0 ||
                parseFloat(paymentAmount) > (selectedDebt?.amount || 0)
              }
              className="bg-success hover:bg-success/90"
            >
              {payMutation.isPending || isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري السداد...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 ml-2" />
                  تأكيد السداد
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
