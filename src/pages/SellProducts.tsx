import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Package, Minus, Plus, Check, ArrowRight, Loader2 } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category_id: string | null;
}

// Business logic for selling products
async function sellProduct(
  userId: string,
  itemId: string,
  currentQuantity: number,
  sellQuantity: number
): Promise<void> {
  const newQuantity = currentQuantity - sellQuantity;

  // Step 1: Update item quantity
  const { error: updateError } = await supabase
    .from("inventory_items")
    .update({ quantity: newQuantity })
    .eq("id", itemId);

  if (updateError) {
    throw new Error(`فشل تحديث الكمية: ${updateError.message}`);
  }

  // Step 2: Create sale log record
  const { error: logError } = await supabase.from("inventory_logs").insert({
    item_id: itemId,
    user_id: userId,
    action: "sell",
    quantity_change: -sellQuantity,
  });

  if (logError) {
    // Rollback the quantity update if logging fails
    await supabase
      .from("inventory_items")
      .update({ quantity: currentQuantity })
      .eq("id", itemId);
    throw new Error(`فشل تسجيل البيع: ${logError.message}`);
  }
}

export default function SellProducts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>({});

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory-items-available", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, quantity, category_id")
        .eq("is_archived", false)
        .gt("quantity", 0)
        .order("name");

      if (error) throw error;

      return (data || []).map((item) => ({
        ...item,
        quantity: item.quantity ?? 0,
      })) as InventoryItem[];
    },
    enabled: !!user,
  });

  const sellItemMutation = useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: string;
      quantity: number;
    }) => {
      if (!user) throw new Error("يجب تسجيل الدخول");

      const item = items?.find((i) => i.id === itemId);
      if (!item) throw new Error("الصنف غير موجود");
      if (quantity <= 0) throw new Error("الكمية يجب أن تكون أكبر من صفر");
      if (quantity > item.quantity) throw new Error("الكمية المطلوبة أكبر من المتاح");

      await sellProduct(user.id, itemId, item.quantity, quantity);
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items-available"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      
      setSellQuantities((prev) => ({ ...prev, [itemId]: 0 }));
      toast.success("تم تسجيل البيع بنجاح");
    },
    onError: (error: Error) => {
      toast.error(error.message || "حدث خطأ أثناء تسجيل البيع");
    },
  });

  const updateQuantity = (itemId: string, delta: number, maxQuantity: number) => {
    setSellQuantities((prev) => {
      const current = prev[itemId] || 0;
      const newValue = Math.max(0, Math.min(current + delta, maxQuantity));
      return { ...prev, [itemId]: newValue };
    });
  };

  const handleSell = (itemId: string) => {
    const quantity = sellQuantities[itemId] || 0;
    if (quantity > 0) {
      sellItemMutation.mutate({ itemId, quantity });
    }
  };

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
              <Package className="h-7 w-7 text-primary" />
              بيع بضاعتك
            </h1>
            <p className="text-muted-foreground">
              اختر الكمية ثم اضغط "تم البيع" لتسجيل عملية البيع
            </p>
          </div>
        </div>

        {/* Products List */}
        <div className="space-y-3 animate-slide-up" style={{ animationDelay: "50ms" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
          ) : items && items.length > 0 ? (
            items.map((item) => {
              const sellQty = sellQuantities[item.id] || 0;
              const isProcessing =
                sellItemMutation.isPending &&
                sellItemMutation.variables?.itemId === item.id;

              return (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">
                        {item.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        المتبقي:{" "}
                        <span className="text-primary font-medium">
                          {item.quantity}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 flex-1 min-w-[140px]">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, -1, item.quantity)}
                        disabled={sellQty === 0 || isProcessing}
                        className="h-10 w-10 p-0"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>

                      <div className="flex-1 text-center font-bold text-xl min-w-[50px]">
                        {sellQty}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateQuantity(item.id, 1, item.quantity)}
                        disabled={sellQty >= item.quantity || isProcessing}
                        className="h-10 w-10 p-0"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateQuantity(item.id, 5, item.quantity)}
                        disabled={sellQty >= item.quantity || isProcessing}
                        className="h-10 px-3"
                      >
                        +5
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => updateQuantity(item.id, 10, item.quantity)}
                        disabled={sellQty >= item.quantity || isProcessing}
                        className="h-10 px-3"
                      >
                        +10
                      </Button>
                    </div>

                    <Button
                      onClick={() => handleSell(item.id)}
                      disabled={sellQty === 0 || isProcessing}
                      className="h-10 gap-2 min-w-[100px]"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      تم البيع
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="h-16 w-16 mb-4 opacity-50" />
              <p className="text-lg">لا توجد بضاعة متاحة للبيع</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate("/inventory")}
              >
                إضافة بضاعة جديدة
              </Button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
