import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Package, Minus, Plus, Check, X, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SellProductsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category_id: string | null;
}

// Separated business logic for selling products
async function sellProduct(
  userId: string,
  itemId: string,
  currentQuantity: number,
  sellQuantity: number
): Promise<void> {
  const newQuantity = currentQuantity - sellQuantity;

  console.log("[sellProduct] Attempting sale:", {
    userId,
    itemId,
    currentQuantity,
    sellQuantity,
    newQuantity,
  });

  // Step 1: Update item quantity
  const { error: updateError } = await supabase
    .from("inventory_items")
    .update({ quantity: newQuantity })
    .eq("id", itemId);

  if (updateError) {
    console.error("[sellProduct] Update error:", updateError);
    throw new Error(`فشل تحديث الكمية: ${updateError.message}`);
  }

  // Step 2: Create sale log record (action must be 'sell' per DB constraint)
  const { error: logError } = await supabase.from("inventory_logs").insert({
    item_id: itemId,
    user_id: userId,
    action: "sell",
    quantity_change: -sellQuantity,
  });

  if (logError) {
    console.error("[sellProduct] Log error:", logError);
    // Rollback the quantity update if logging fails
    await supabase
      .from("inventory_items")
      .update({ quantity: currentQuantity })
      .eq("id", itemId);
    throw new Error(`فشل تسجيل البيع: ${logError.message}`);
  }

  console.log("[sellProduct] Sale completed successfully");
}

export default function SellProductsDrawer({
  open,
  onOpenChange,
}: SellProductsDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [sellQuantities, setSellQuantities] = useState<Record<string, number>>(
    {}
  );

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory-items-available", user?.id],
    queryFn: async () => {
      console.log("[SellProductsDrawer] Fetching available items...");
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, name, quantity, category_id")
        .eq("is_archived", false)
        .gt("quantity", 0)
        .order("name");

      if (error) {
        console.error("[SellProductsDrawer] Fetch error:", error);
        throw error;
      }

      console.log("[SellProductsDrawer] Fetched items:", data?.length);
      return (data || []).map((item) => ({
        ...item,
        quantity: item.quantity ?? 0,
      })) as InventoryItem[];
    },
    enabled: !!user && open,
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
      // Invalidate all related queries to update UI
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items-available"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      
      // Reset quantity for this item
      setSellQuantities((prev) => ({ ...prev, [itemId]: 0 }));
      toast.success("تم تسجيل البيع بنجاح");
    },
    onError: (error: Error) => {
      console.error("[SellProductsDrawer] Mutation error:", error);
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

  const setQuantity = (itemId: string, value: number, maxQuantity: number) => {
    setSellQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(0, Math.min(value, maxQuantity)),
    }));
  };

  const handleSell = (itemId: string) => {
    const quantity = sellQuantities[itemId] || 0;
    if (quantity > 0) {
      sellItemMutation.mutate({ itemId, quantity });
    }
  };

  // Reset quantities when drawer closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSellQuantities({});
    }
    onOpenChange(isOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border pb-4">
          <DrawerTitle className="flex items-center gap-2 text-xl">
            <Package className="h-6 w-6 text-primary" />
            بيع بضاعتك
          </DrawerTitle>
          <DrawerDescription className="text-muted-foreground">
            اختر الكمية ثم اضغط "تم البيع" لتسجيل عملية البيع
          </DrawerDescription>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 py-4" style={{ maxHeight: "60vh" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : items && items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => {
                const sellQty = sellQuantities[item.id] || 0;
                const isProcessing =
                  sellItemMutation.isPending &&
                  sellItemMutation.variables?.itemId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-card border border-border rounded-xl p-4 space-y-3 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">
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

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, -1, item.quantity)}
                          disabled={sellQty === 0 || isProcessing}
                          className="h-9 w-9 p-0"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>

                        <div className="flex-1 text-center font-bold text-lg min-w-[40px]">
                          {sellQty}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, 1, item.quantity)}
                          disabled={sellQty >= item.quantity || isProcessing}
                          className="h-9 w-9 p-0"
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
                          className="h-9 px-2 text-xs"
                        >
                          +5
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateQuantity(item.id, 10, item.quantity)}
                          disabled={sellQty >= item.quantity || isProcessing}
                          className="h-9 px-2 text-xs"
                        >
                          +10
                        </Button>
                      </div>

                      <Button
                        onClick={() => handleSell(item.id)}
                        disabled={sellQty === 0 || isProcessing}
                        className="h-9 gap-1"
                        size="sm"
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
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-50" />
              <p>لا توجد بضاعة متاحة للبيع</p>
            </div>
          )}
        </ScrollArea>

        <DrawerFooter className="border-t border-border pt-4">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full gap-2">
              <X className="h-4 w-4" />
              إغلاق
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
