import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, FolderOpen, Package, Minus, Plus, AlertTriangle } from "lucide-react";
import { Link, useParams, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CategoryDetails() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isUncategorized = id === "uncategorized";

  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [sellQuantity, setSellQuantity] = useState("1");

  // Fetch category details
  const { data: category, isLoading: categoryLoading } = useQuery({
    queryKey: ["category", id],
    queryFn: async () => {
      if (isUncategorized) return { id: "uncategorized", name: "بدون تصنيف" };
      const { data, error } = await supabase
        .from("inventory_categories")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch items in this category
  const { data: items, isLoading: itemsLoading } = useQuery({
    queryKey: ["category-items", id],
    queryFn: async () => {
      let query = supabase
        .from("inventory_items")
        .select("*")
        .eq("is_archived", false)
        .order("name");
      
      if (isUncategorized) {
        query = query.is("category_id", null);
      } else {
        query = query.eq("category_id", id!);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch logs for items in this category
  const { data: logs } = useQuery({
    queryKey: ["category-logs", id],
    queryFn: async () => {
      const itemIds = items?.map(i => i.id) || [];
      if (itemIds.length === 0) return [];
      
      const { data, error } = await supabase
        .from("inventory_logs")
        .select("*")
        .in("item_id", itemIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!items && items.length > 0,
  });

  // Sell item mutation
  const sellMutation = useMutation({
    mutationFn: async ({ itemId, quantity, profit }: { itemId: string; quantity: number; profit: number }) => {
      // First, get current quantity
      const { data: currentItem, error: fetchError } = await supabase
        .from("inventory_items")
        .select("quantity")
        .eq("id", itemId)
        .single();
      
      if (fetchError) throw fetchError;
      
      const newQuantity = (currentItem.quantity || 0) - quantity;
      if (newQuantity < 0) throw new Error("الكمية المطلوبة أكبر من المتاحة");

      // Update item quantity
      const { error: updateError } = await supabase
        .from("inventory_items")
        .update({ quantity: newQuantity })
        .eq("id", itemId);
      
      if (updateError) throw updateError;

      // Log the sale with profit
      const { error: logError } = await supabase
        .from("inventory_logs")
        .insert({
          user_id: user!.id,
          item_id: itemId,
          quantity_change: -quantity,
          action: "sell",
          profit: profit,
        });
      
      if (logError) throw logError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["category-items", id] });
      queryClient.invalidateQueries({ queryKey: ["category-logs", id] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      toast.success("تم تسجيل البيع بنجاح");
      setSellDialogOpen(false);
      setSelectedItem(null);
      setSellQuantity("1");
    },
    onError: (error: Error) => {
      toast.error(error.message || "فشل تسجيل البيع");
    },
  });

  const openSellDialog = (item: any) => {
    setSelectedItem(item);
    setSellQuantity("1");
    setSellDialogOpen(true);
  };

  const handleSell = () => {
    if (!selectedItem) return;
    const quantity = parseInt(sellQuantity) || 0;
    if (quantity <= 0) {
      toast.error("أدخل كمية صحيحة");
      return;
    }
    if (quantity > (selectedItem.quantity || 0)) {
      toast.error("الكمية المطلوبة أكبر من المتاحة");
      return;
    }
    
    const profit = quantity * (Number(selectedItem.profit_per_unit) || 0);
    sellMutation.mutate({ itemId: selectedItem.id, quantity, profit });
  };

  // Get item stats
  const getItemStats = (itemId: string) => {
    const itemLogs = logs?.filter(l => l.item_id === itemId) || [];
    const totalSold = itemLogs
      .filter(l => l.action === "sell")
      .reduce((sum, l) => sum + Math.abs(l.quantity_change), 0);
    const totalProfit = itemLogs
      .filter(l => l.action === "sell")
      .reduce((sum, l) => sum + Number(l.profit || 0), 0);
    
    return { totalSold, totalProfit, movementsCount: itemLogs.length };
  };

  if (!id) {
    return <Navigate to="/records/products" replace />;
  }

  const isLoading = categoryLoading || itemsLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!category && !isUncategorized) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link
              to="/records/products"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">التصنيف غير موجود</h1>
          </div>
          <p className="text-muted-foreground text-center py-12">
            لم يتم العثور على هذا التصنيف
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="flex items-center gap-3 animate-slide-up">
          <Link
            to="/records/products"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl ${isUncategorized ? "bg-muted" : "bg-accent/10"}`}>
              <FolderOpen className={`h-6 w-6 ${isUncategorized ? "text-muted-foreground" : "text-accent"}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{category?.name}</h1>
              <p className="text-muted-foreground">{items?.length || 0} منتج</p>
            </div>
          </div>
        </div>

        {/* Items List */}
        <div className="space-y-3">
          {items?.length === 0 ? (
            <div className="notebook-paper p-8 text-center animate-slide-up">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">لا توجد منتجات في هذا التصنيف</p>
            </div>
          ) : (
            items?.map((item, index) => {
              const stats = getItemStats(item.id);
              const isLowStock = (item.quantity || 0) <= 5;
              const unitType = item.unit_type || "قطعة";
              const profitPerUnit = Number(item.profit_per_unit) || 0;
              
              return (
                <div
                  key={item.id}
                  className="notebook-paper p-4 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isLowStock ? "bg-amber-500/10" : "bg-primary/10"}`}>
                        <Package className={`h-5 w-5 ${isLowStock ? "text-amber-500" : "text-primary"}`} />
                      </div>
                      <div>
                        <p className="font-bold">{item.name}</p>
                        {profitPerUnit > 0 && (
                          <p className="text-xs text-income">
                            ربح ال{unitType}: {profitPerUnit.toLocaleString()} جنيه
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-left">
                      <div className={`text-2xl font-bold ${isLowStock ? "text-amber-500" : "text-primary"}`}>
                        {item.quantity || 0}
                      </div>
                      <p className="text-xs text-muted-foreground">{unitType} متبقي</p>
                    </div>
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 mb-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Minus className="h-3 w-3 text-expense" />
                      مباع: {stats.totalSold}
                    </span>
                    {stats.totalProfit > 0 && (
                      <span className="flex items-center gap-1 text-income font-medium">
                        <Plus className="h-3 w-3" />
                        ربح: {stats.totalProfit.toLocaleString()}
                      </span>
                    )}
                    {isLowStock && (
                      <span className="flex items-center gap-1 text-amber-500">
                        <AlertTriangle className="h-3 w-3" />
                        مخزون منخفض
                      </span>
                    )}
                  </div>

                  {/* Sell Action */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-expense/30 text-expense hover:bg-expense/10 hover:text-expense"
                    onClick={() => openSellDialog(item)}
                    disabled={(item.quantity || 0) === 0}
                  >
                    <Minus className="h-4 w-4 ml-2" />
                    بيع
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Sell Dialog */}
      <Dialog open={sellDialogOpen} onOpenChange={setSellDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>بيع {selectedItem?.name}</DialogTitle>
            <DialogDescription>
              أدخل الكمية المراد بيعها
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="notebook-paper p-3 text-center">
              <p className="text-sm text-muted-foreground">المتاح</p>
              <p className="text-2xl font-bold text-primary">
                {selectedItem?.quantity || 0} {selectedItem?.unit_type || "قطعة"}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>الكمية</Label>
              <Input
                type="number"
                min="1"
                max={selectedItem?.quantity || 0}
                value={sellQuantity}
                onChange={(e) => setSellQuantity(e.target.value)}
                dir="ltr"
                className="text-center text-lg"
              />
            </div>

            {Number(selectedItem?.profit_per_unit) > 0 && (
              <div className="notebook-paper p-3 bg-income/5 border-income/20">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">الربح المتوقع</span>
                  <span className="text-lg font-bold text-income">
                    +{((parseInt(sellQuantity) || 0) * Number(selectedItem?.profit_per_unit || 0)).toLocaleString()} جنيه
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellDialogOpen(false)}>
              إلغاء
            </Button>
            <Button 
              onClick={handleSell} 
              disabled={sellMutation.isPending}
              className="bg-expense hover:bg-expense/90"
            >
              {sellMutation.isPending ? "جاري البيع..." : "تأكيد البيع"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
