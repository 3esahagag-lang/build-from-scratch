import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { recordInventoryProfit } from "@/lib/profits/service";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Package, 
  Minus, 
  Plus, 
  Check, 
  X, 
  Loader2, 
  FolderOpen,
  ArrowRight,
  AlertTriangle,
  ShoppingCart
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SellProductsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Category {
  id: string;
  name: string;
}

interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  category_id: string | null;
  profit_per_unit: number;
  unit_type: string;
}

type Step = "category" | "item" | "confirm";

// Atomic sell operation with rollback
async function executeAtomicSale(
  userId: string,
  item: InventoryItem,
  sellQuantity: number,
  profitPerUnit: number
): Promise<{ logId: string; profitId: string }> {
  const newQuantity = item.quantity - sellQuantity;
  const totalProfit = sellQuantity * profitPerUnit;

  // Step 1: Update inventory quantity
  const { error: updateError } = await supabase
    .from("inventory_items")
    .update({ quantity: newQuantity })
    .eq("id", item.id)
    .eq("quantity", item.quantity); // Optimistic lock

  if (updateError) {
    throw new Error("فشل تحديث الكمية - قد تكون البيانات تغيرت");
  }

  // Step 2: Create sale log
  const { data: logData, error: logError } = await supabase
    .from("inventory_logs")
    .insert({
      item_id: item.id,
      user_id: userId,
      action: "sell",
      quantity_change: -sellQuantity,
      profit: totalProfit,
    })
    .select("id")
    .single();

  if (logError) {
    // Rollback: restore original quantity
    await supabase
      .from("inventory_items")
      .update({ quantity: item.quantity })
      .eq("id", item.id);
    throw new Error("فشل تسجيل البيع - تم التراجع");
  }

  // Step 3: Record profit as linked entity
  let profitId = "";
  try {
    const profitRecord = await recordInventoryProfit(userId, {
      source_id: item.id,
      quantity: sellQuantity,
      profit_per_unit: profitPerUnit,
      unit_type: item.unit_type,
      notes: `بيع ${sellQuantity} ${item.unit_type} من ${item.name}`,
    });
    profitId = profitRecord.id;
  } catch (profitError) {
    // Rollback: delete log and restore quantity
    await supabase.from("inventory_logs").delete().eq("id", logData.id);
    await supabase
      .from("inventory_items")
      .update({ quantity: item.quantity })
      .eq("id", item.id);
    throw new Error("فشل تسجيل الربح - تم التراجع");
  }

  return { logId: logData.id, profitId };
}

export default function SellProductsDrawer({
  open,
  onOpenChange,
}: SellProductsDrawerProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Multi-step state
  const [step, setStep] = useState<Step>("category");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [sellQuantity, setSellQuantity] = useState(1);
  const [customProfit, setCustomProfit] = useState<string>("");
  const [useCustomProfit, setUseCustomProfit] = useState(false);
  
  // Prevent double submission
  const isSubmittingRef = useRef(false);

  // Reset state when drawer closes
  useEffect(() => {
    if (!open) {
      setStep("category");
      setSelectedCategory(null);
      setSelectedItem(null);
      setSellQuantity(1);
      setCustomProfit("");
      setUseCustomProfit(false);
      isSubmittingRef.current = false;
    }
  }, [open]);

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["inventory-categories-with-items", user?.id],
    queryFn: async () => {
      // Get categories with item counts
      const { data: cats, error: catsError } = await supabase
        .from("inventory_categories")
        .select("id, name")
        .order("name");
      
      if (catsError) throw catsError;

      // Get items count per category with stock > 0
      const { data: items, error: itemsError } = await supabase
        .from("inventory_items")
        .select("category_id")
        .eq("is_archived", false)
        .gt("quantity", 0);
      
      if (itemsError) throw itemsError;

      // Count items per category
      const categoryCounts: Record<string, number> = {};
      let uncategorizedCount = 0;
      
      (items || []).forEach((item) => {
        if (item.category_id) {
          categoryCounts[item.category_id] = (categoryCounts[item.category_id] || 0) + 1;
        } else {
          uncategorizedCount++;
        }
      });

      // Filter categories that have items
      const categoriesWithItems = (cats || [])
        .filter((cat) => categoryCounts[cat.id] > 0)
        .map((cat) => ({
          ...cat,
          itemCount: categoryCounts[cat.id],
        }));

      // Add uncategorized if has items
      if (uncategorizedCount > 0) {
        categoriesWithItems.push({
          id: "uncategorized",
          name: "بدون تصنيف",
          itemCount: uncategorizedCount,
        });
      }

      return categoriesWithItems;
    },
    enabled: !!user && open,
  });

  // Fetch items for selected category
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["category-items-for-sale", selectedCategory?.id, user?.id],
    queryFn: async () => {
      let query = supabase
        .from("inventory_items")
        .select("id, name, quantity, category_id, profit_per_unit, unit_type")
        .eq("is_archived", false)
        .gt("quantity", 0)
        .order("name");
      
      if (selectedCategory?.id === "uncategorized") {
        query = query.is("category_id", null);
      } else {
        query = query.eq("category_id", selectedCategory!.id);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return (data || []).map((item) => ({
        ...item,
        quantity: item.quantity ?? 0,
        profit_per_unit: Number(item.profit_per_unit) || 0,
        unit_type: item.unit_type || "قطعة",
      })) as InventoryItem[];
    },
    enabled: !!user && !!selectedCategory && step === "item",
  });

  // Sell mutation with atomic transaction
  const sellMutation = useMutation({
    mutationFn: async () => {
      if (!user || !selectedItem) throw new Error("بيانات غير كاملة");
      if (isSubmittingRef.current) throw new Error("جاري المعالجة...");
      
      isSubmittingRef.current = true;
      
      if (sellQuantity <= 0) throw new Error("الكمية يجب أن تكون أكبر من صفر");
      if (sellQuantity > selectedItem.quantity) {
        throw new Error("الكمية المطلوبة أكبر من المتاح");
      }

      const profitPerUnit = useCustomProfit 
        ? parseFloat(customProfit) || 0 
        : selectedItem.profit_per_unit;

      return executeAtomicSale(user.id, selectedItem, sellQuantity, profitPerUnit);
    },
    onSuccess: () => {
      // Invalidate all related queries
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items-available"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      queryClient.invalidateQueries({ queryKey: ["category-items"] });
      queryClient.invalidateQueries({ queryKey: ["financial-snapshot"] });
      queryClient.invalidateQueries({ queryKey: ["profits"] });
      
      toast.success("تم تسجيل البيع بنجاح");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "حدث خطأ أثناء تسجيل البيع");
      isSubmittingRef.current = false;
    },
  });

  const updateQuantity = (delta: number) => {
    if (!selectedItem) return;
    setSellQuantity((prev) => 
      Math.max(1, Math.min(prev + delta, selectedItem.quantity))
    );
  };

  const handleSelectCategory = (category: Category) => {
    setSelectedCategory(category);
    setStep("item");
  };

  const handleSelectItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setSellQuantity(1);
    setCustomProfit(String(item.profit_per_unit));
    setUseCustomProfit(false);
    setStep("confirm");
  };

  const handleBack = () => {
    if (step === "item") {
      setSelectedCategory(null);
      setStep("category");
    } else if (step === "confirm") {
      setSelectedItem(null);
      setStep("item");
    }
  };

  const handleConfirmSale = () => {
    if (!isSubmittingRef.current) {
      sellMutation.mutate();
    }
  };

  // Calculate profit for display
  const currentProfitPerUnit = useCustomProfit 
    ? parseFloat(customProfit) || 0 
    : selectedItem?.profit_per_unit || 0;
  const expectedProfit = sellQuantity * currentProfitPerUnit;

  const getStepTitle = () => {
    switch (step) {
      case "category": return "اختر التصنيف";
      case "item": return selectedCategory?.name || "اختر المنتج";
      case "confirm": return "تأكيد البيع";
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="h-[92dvh] max-h-[92dvh]">
        <DrawerHeader className="border-b border-border pb-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {step !== "category" && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleBack}
                >
                  <ArrowRight className="h-5 w-5" />
                </Button>
              )}
              <DrawerTitle className="flex items-center gap-2 text-xl">
                <ShoppingCart className="h-6 w-6 text-primary" />
                {getStepTitle()}
              </DrawerTitle>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <X className="h-5 w-5" />
              </Button>
            </DrawerClose>
          </div>
          <DrawerDescription className="text-muted-foreground">
            {step === "category" && "اختر التصنيف الذي يحتوي على المنتج"}
            {step === "item" && "اختر المنتج المراد بيعه"}
            {step === "confirm" && "راجع التفاصيل ثم أكد البيع"}
          </DrawerDescription>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Step 1: Category Selection */}
          {step === "category" && (
            <>
              {categoriesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : categories && categories.length > 0 ? (
                <div className="space-y-3">
                  {categories.map((category, index) => (
                    <button
                      key={category.id}
                      onClick={() => handleSelectCategory(category)}
                      className="w-full bg-card border border-border rounded-xl p-4 flex items-center justify-between hover:bg-muted/50 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <FolderOpen className="h-5 w-5 text-accent" />
                        </div>
                        <span className="font-medium">{category.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">
                          {(category as any).itemCount} منتج
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground rotate-180" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mb-3 opacity-50" />
                  <p>لا توجد بضاعة متاحة للبيع</p>
                </div>
              )}
            </>
          )}

          {/* Step 2: Item Selection */}
          {step === "item" && (
            <>
              {itemsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : items && items.length > 0 ? (
                <div className="space-y-3">
                  {items.map((item, index) => {
                    const isLowStock = item.quantity <= 5;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="w-full bg-card border border-border rounded-xl p-4 text-right hover:bg-muted/50 transition-colors animate-fade-in"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isLowStock ? "bg-amber-500/10" : "bg-primary/10"}`}>
                              <Package className={`h-5 w-5 ${isLowStock ? "text-amber-500" : "text-primary"}`} />
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{item.name}</p>
                              {item.profit_per_unit > 0 && (
                                <p className="text-xs text-success">
                                  ربح ال{item.unit_type}: {item.profit_per_unit} جنيه
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-left">
                            <p className={`text-lg font-bold ${isLowStock ? "text-amber-500" : "text-primary"}`}>
                              {item.quantity}
                            </p>
                            <p className="text-xs text-muted-foreground">{item.unit_type}</p>
                          </div>
                        </div>
                        {isLowStock && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-amber-500">
                            <AlertTriangle className="h-3 w-3" />
                            مخزون منخفض
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Package className="h-12 w-12 mb-3 opacity-50" />
                  <p>لا توجد منتجات في هذا التصنيف</p>
                </div>
              )}
            </>
          )}

          {/* Step 3: Confirm Sale */}
          {step === "confirm" && selectedItem && (
            <div className="space-y-6 animate-fade-in">
              {/* Item Info Card */}
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">{selectedItem.name}</p>
                    <p className="text-sm text-muted-foreground">
                      المتبقي: {selectedItem.quantity} {selectedItem.unit_type}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="space-y-3">
                <Label className="text-base font-medium">الكمية</Label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateQuantity(-1)}
                    disabled={sellQuantity <= 1}
                    className="h-12 w-12"
                  >
                    <Minus className="h-5 w-5" />
                  </Button>
                  
                  <div className="flex-1 text-center">
                    <Input
                      type="number"
                      value={sellQuantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setSellQuantity(Math.max(1, Math.min(val, selectedItem.quantity)));
                      }}
                      className="text-center text-2xl font-bold h-12"
                      min={1}
                      max={selectedItem.quantity}
                      dir="ltr"
                    />
                  </div>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateQuantity(1)}
                    disabled={sellQuantity >= selectedItem.quantity}
                    className="h-12 w-12"
                  >
                    <Plus className="h-5 w-5" />
                  </Button>
                </div>

                {/* Quick quantity buttons */}
                <div className="flex gap-2">
                  {[5, 10, 20].map((val) => (
                    <Button
                      key={val}
                      variant="secondary"
                      size="sm"
                      onClick={() => setSellQuantity(Math.min(val, selectedItem.quantity))}
                      disabled={val > selectedItem.quantity}
                      className="flex-1"
                    >
                      {val}
                    </Button>
                  ))}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSellQuantity(selectedItem.quantity)}
                    className="flex-1"
                  >
                    الكل
                  </Button>
                </div>
              </div>

              {/* Profit Entry */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">ربح ال{selectedItem.unit_type}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUseCustomProfit(!useCustomProfit)}
                    className="text-xs"
                  >
                    {useCustomProfit ? "استخدم الافتراضي" : "تعديل الربح"}
                  </Button>
                </div>
                
                {useCustomProfit ? (
                  <Input
                    type="number"
                    value={customProfit}
                    onChange={(e) => setCustomProfit(e.target.value)}
                    placeholder="أدخل الربح لكل وحدة"
                    className="text-lg"
                    dir="ltr"
                  />
                ) : (
                  <div className="bg-muted rounded-lg p-3 text-center">
                    <span className="text-lg font-medium">
                      {selectedItem.profit_per_unit} جنيه/{selectedItem.unit_type}
                    </span>
                  </div>
                )}
              </div>

              {/* Profit Preview */}
              <div className="bg-success/10 border border-success/20 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">الكمية المباعة</span>
                  <span className="font-medium">
                    {sellQuantity} {selectedItem.unit_type}
                  </span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-muted-foreground">ربح الوحدة</span>
                  <span className="font-medium">{currentProfitPerUnit} جنيه</span>
                </div>
                <div className="border-t border-success/20 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-success">إجمالي الربح</span>
                    <span className="text-2xl font-bold text-success">
                      +{expectedProfit.toLocaleString()} جنيه
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Confirm Button */}
        {step === "confirm" && (
          <DrawerFooter className="border-t border-border pt-4">
            <Button
              onClick={handleConfirmSale}
              disabled={sellMutation.isPending || sellQuantity <= 0}
              className="w-full h-14 text-lg font-bold gap-2"
            >
              {sellMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  جاري التسجيل...
                </>
              ) : (
                <>
                  <Check className="h-5 w-5" />
                  تأكيد البيع
                </>
              )}
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
