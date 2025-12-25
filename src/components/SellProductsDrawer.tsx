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
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Package, Minus, Plus, Check, X } from "lucide-react";
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

export default function SellProductsDrawer({ open, onOpenChange }: SellProductsDrawerProps) {
  const { user } = useAuth();
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
      return data as InventoryItem[];
    },
    enabled: !!user && open,
  });

  const sellItem = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const item = items?.find(i => i.id === itemId);
      if (!item) throw new Error("Item not found");

      const newQuantity = item.quantity - quantity;
      
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ quantity: newQuantity })
        .eq("id", itemId);

      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from("inventory_logs")
        .insert({
          item_id: itemId,
          user_id: user!.id,
          action: "sale",
          quantity_change: -quantity,
        });

      if (logError) throw logError;
    },
    onSuccess: (_, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items-available"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      setSellQuantities(prev => ({ ...prev, [itemId]: 0 }));
      toast.success("تم تسجيل البيع بنجاح");
    },
    onError: () => {
      toast.error("حدث خطأ أثناء تسجيل البيع");
    },
  });

  const updateQuantity = (itemId: string, delta: number, maxQuantity: number) => {
    setSellQuantities(prev => {
      const current = prev[itemId] || 0;
      const newValue = Math.max(0, Math.min(current + delta, maxQuantity));
      return { ...prev, [itemId]: newValue };
    });
  };

  const handleSell = (itemId: string) => {
    const quantity = sellQuantities[itemId] || 0;
    if (quantity > 0) {
      sellItem.mutate({ itemId, quantity });
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="border-b border-border pb-4">
          <DrawerTitle className="flex items-center gap-2 text-xl">
            <Package className="h-6 w-6 text-primary" />
            بيع بضاعتك
          </DrawerTitle>
        </DrawerHeader>

        <ScrollArea className="flex-1 px-4 py-4" style={{ maxHeight: "60vh" }}>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : items && items.length > 0 ? (
            <div className="space-y-3">
              {items.map((item) => {
                const sellQty = sellQuantities[item.id] || 0;
                return (
                  <div
                    key={item.id}
                    className="bg-card border border-border rounded-xl p-4 space-y-3 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          المتبقي: <span className="text-primary font-medium">{item.quantity}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 flex-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateQuantity(item.id, -1, item.quantity)}
                          disabled={sellQty === 0}
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
                          disabled={sellQty >= item.quantity}
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
                          disabled={sellQty >= item.quantity}
                          className="h-9 px-2 text-xs"
                        >
                          +5
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => updateQuantity(item.id, 10, item.quantity)}
                          disabled={sellQty >= item.quantity}
                          className="h-9 px-2 text-xs"
                        >
                          +10
                        </Button>
                      </div>

                      <Button
                        onClick={() => handleSell(item.id)}
                        disabled={sellQty === 0 || sellItem.isPending}
                        className="h-9 gap-1"
                        size="sm"
                      >
                        <Check className="h-4 w-4" />
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
