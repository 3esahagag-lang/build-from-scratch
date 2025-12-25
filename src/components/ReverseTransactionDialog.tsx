import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  RotateCcw, 
  AlertTriangle, 
  Loader2,
  ArrowLeftRight,
  HandCoins,
  Package
} from "lucide-react";

export type ReversibleRecordType = "transfer" | "debt" | "inventory_sale";

interface ReverseTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recordType: ReversibleRecordType;
  recordId: string;
  recordDetails: {
    amount: number;
    description?: string;
    date: string;
  };
  onSuccess?: () => void;
}

// Execute atomic reversal with audit trail
async function executeReversal(
  userId: string,
  recordType: ReversibleRecordType,
  recordId: string,
  reason: string
): Promise<boolean> {
  // Use the appropriate RPC function based on record type
  switch (recordType) {
    case "transfer": {
      const { data, error } = await supabase.rpc("reverse_transfer", {
        _user_id: userId,
        _transfer_id: recordId,
        _reason: reason || "تراجع عن العملية",
      });
      
      if (error) throw new Error(`فشل التراجع: ${error.message}`);
      if (!data) throw new Error("لم يتم العثور على التحويل");
      return true;
    }
    
    case "debt": {
      const { data, error } = await supabase.rpc("reverse_debt", {
        _user_id: userId,
        _debt_id: recordId,
        _reason: reason || "تراجع عن السلفة",
      });
      
      if (error) throw new Error(`فشل التراجع: ${error.message}`);
      if (!data) throw new Error("لم يتم العثور على السلفة");
      return true;
    }
    
    case "inventory_sale": {
      // For inventory, we need to reverse the sale log and restore quantity
      // First get the log details
      const { data: logData, error: logError } = await supabase
        .from("inventory_logs")
        .select("*, inventory_items(id, quantity)")
        .eq("id", recordId)
        .single();
      
      if (logError || !logData) throw new Error("لم يتم العثور على سجل البيع");
      
      // Restore quantity (add back what was sold)
      const newQuantity = (logData.inventory_items?.quantity || 0) + Math.abs(logData.quantity_change);
      
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ quantity: newQuantity })
        .eq("id", logData.item_id);
      
      if (updateError) throw new Error("فشل استعادة الكمية");
      
      // Mark log as reversed by updating the action
      const { error: logUpdateError } = await supabase
        .from("inventory_logs")
        .update({ action: "sell_reversed" })
        .eq("id", recordId);
      
      if (logUpdateError) {
        // Rollback quantity change
        await supabase
          .from("inventory_items")
          .update({ quantity: logData.inventory_items?.quantity || 0 })
          .eq("id", logData.item_id);
        throw new Error("فشل تحديث السجل");
      }
      
      // Log the reversal in audit trail
      await supabase.rpc("log_record_change", {
        _user_id: userId,
        _record_type: "inventory_sale",
        _record_id: recordId,
        _action: "reverse",
        _changes: { action: "sell_reversed", quantity_restored: Math.abs(logData.quantity_change) },
        _previous_values: { action: "sell", quantity_change: logData.quantity_change },
        _reason: reason || "تراجع عن البيع",
      });
      
      return true;
    }
    
    default:
      throw new Error("نوع السجل غير معروف");
  }
}

const recordTypeConfig: Record<ReversibleRecordType, {
  icon: typeof ArrowLeftRight;
  label: string;
  warningText: string;
}> = {
  transfer: {
    icon: ArrowLeftRight,
    label: "تحويل",
    warningText: "سيتم إلغاء هذا التحويل وإزالته من الحسابات. لا يمكن التراجع عن هذا الإجراء.",
  },
  debt: {
    icon: HandCoins,
    label: "سلفة",
    warningText: "سيتم إلغاء هذه السلفة وإزالتها من السجلات. لا يمكن التراجع عن هذا الإجراء.",
  },
  inventory_sale: {
    icon: Package,
    label: "بيع",
    warningText: "سيتم إلغاء عملية البيع واستعادة الكمية للمخزون. لا يمكن التراجع عن هذا الإجراء.",
  },
};

export default function ReverseTransactionDialog({
  open,
  onOpenChange,
  recordType,
  recordId,
  recordDetails,
  onSuccess,
}: ReverseTransactionDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  
  const config = recordTypeConfig[recordType];
  const Icon = config.icon;

  const reverseMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("يجب تسجيل الدخول");
      return executeReversal(user.id, recordType, recordId, reason);
    },
    onSuccess: () => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ["transfers"] });
      queryClient.invalidateQueries({ queryKey: ["debts"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      queryClient.invalidateQueries({ queryKey: ["financial-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["ledger-entries"] });
      
      toast.success("تم التراجع عن العملية بنجاح");
      onOpenChange(false);
      setReason("");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل التراجع عن العملية");
    },
  });

  const handleConfirm = () => {
    reverseMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <RotateCcw className="h-5 w-5" />
            تراجع عن {config.label}
          </DialogTitle>
          <DialogDescription>
            هل أنت متأكد من التراجع عن هذه العملية؟
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Record Summary */}
          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Icon className="h-4 w-4" />
              <span>{config.label}</span>
            </div>
            <div className="text-lg font-bold">
              {recordDetails.amount.toLocaleString()} جنيه
            </div>
            {recordDetails.description && (
              <p className="text-sm text-muted-foreground">
                {recordDetails.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {new Date(recordDetails.date).toLocaleDateString("ar-EG")}
            </p>
          </div>

          {/* Warning */}
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                {config.warningText}
              </p>
            </div>
          </div>

          {/* Reason input */}
          <div className="space-y-2">
            <Label>سبب التراجع (اختياري)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="أدخل سبب التراجع للسجلات..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              سيتم حفظ هذا السبب في سجل التدقيق
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reverseMutation.isPending}
          >
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={reverseMutation.isPending}
          >
            {reverseMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
                جاري التراجع...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 ml-2" />
                تأكيد التراجع
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Hook for easy usage in any component
export function useReverseTransaction() {
  const [dialogState, setDialogState] = useState<{
    open: boolean;
    recordType: ReversibleRecordType;
    recordId: string;
    recordDetails: {
      amount: number;
      description?: string;
      date: string;
    };
  } | null>(null);

  const openDialog = (
    recordType: ReversibleRecordType,
    recordId: string,
    recordDetails: {
      amount: number;
      description?: string;
      date: string;
    }
  ) => {
    setDialogState({
      open: true,
      recordType,
      recordId,
      recordDetails,
    });
  };

  const closeDialog = () => {
    setDialogState(null);
  };

  return {
    dialogState,
    openDialog,
    closeDialog,
  };
}
