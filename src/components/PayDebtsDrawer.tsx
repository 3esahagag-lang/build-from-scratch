import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight, Check, Wallet, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PayDebtsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Business logic: Mark debt as paid
async function payDebt(debtId: string): Promise<void> {
  console.log("[payDebt] Marking debt as paid:", debtId);

  const { error } = await supabase
    .from("debts")
    .update({ 
      is_paid: true, 
      paid_at: new Date().toISOString() 
    })
    .eq("id", debtId);

  if (error) {
    console.error("[payDebt] Failed:", error);
    throw new Error(`فشل تسجيل السداد: ${error.message}`);
  }

  console.log("[payDebt] Success");
}

export default function PayDebtsDrawer({ open, onOpenChange }: PayDebtsDrawerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
      return data;
    },
    enabled: !!user && open,
  });

  // Pay debt mutation
  const payMutation = useMutation({
    mutationFn: payDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      toast({ title: "تم تسجيل السداد بنجاح ✓" });
    },
    onError: (error: Error) => {
      console.error("[PayDebtsDrawer] Payment error:", error);
      toast({
        title: "حدث خطأ أثناء السداد",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const owedToMe = debts?.filter(d => d.type === "owed_to_me") || [];
  const owedByMe = debts?.filter(d => d.type === "owed_by_me") || [];

  const totalOwedToMe = owedToMe.reduce((sum, d) => sum + Number(d.amount), 0);
  const totalOwedByMe = owedByMe.reduce((sum, d) => sum + Number(d.amount), 0);

  const DebtItem = ({ debt }: { debt: typeof debts[0] }) => (
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
          onClick={() => payMutation.mutate(debt.id)}
          disabled={payMutation.isPending}
        >
          <Check className="h-4 w-4" />
          تم السداد
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
            اختر السلفة التي تريد تسديدها
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Tabs defaultValue="owed_by_me" className="w-full" dir="rtl">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="owed_by_me" className="gap-2">
                  <ArrowUpRight className="h-4 w-4" />
                  عليك فلوس ({owedByMe.length})
                </TabsTrigger>
                <TabsTrigger value="owed_to_me" className="gap-2">
                  <ArrowDownLeft className="h-4 w-4" />
                  ليك فلوس ({owedToMe.length})
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
  );
}
