import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Package, Plus, Minus, ArrowLeftRight } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

export default function ProductsRecords() {
  const { user } = useAuth();
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // Fetch inventory items
  const { data: items } = useQuery({
    queryKey: ["products-records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*, inventory_categories(name)")
        .eq("is_archived", false)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch inventory logs with profit
  const { data: logs } = useQuery({
    queryKey: ["inventory-logs-records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_logs")
        .select("*, inventory_items(name, unit_type, profit_per_unit)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "اليوم";
    if (d.toDateString() === yesterday.toDateString()) return "أمس";
    return d.toLocaleDateString("ar-EG");
  };

  // Calculate sold quantity for each product
  const getSoldQuantity = (itemId: string) => {
    return (
      logs
        ?.filter((l) => l.item_id === itemId && l.action === "sell")
        .reduce((sum, l) => sum + Math.abs(l.quantity_change), 0) || 0
    );
  };

  const getAddedQuantity = (itemId: string) => {
    return (
      logs
        ?.filter((l) => l.item_id === itemId && l.action === "add")
        .reduce((sum, l) => sum + l.quantity_change, 0) || 0
    );
  };

  // Calculate total profit for each product
  const getTotalProfit = (itemId: string) => {
    return (
      logs
        ?.filter((l) => l.item_id === itemId && l.action === "sell")
        .reduce((sum, l) => sum + Number(l.profit || 0), 0) || 0
    );
  };

  const selectedProductLogs = selectedProduct
    ? logs?.filter((l) => l.item_id === selectedProduct)
    : null;

  const selectedProductData = selectedProduct
    ? items?.find((i) => i.id === selectedProduct)
    : null;

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="flex items-center gap-3 animate-slide-up">
          <Link
            to="/records"
            className="p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">سجل البضاعة</h1>
            <p className="text-muted-foreground">جميع المنتجات وحركاتها</p>
          </div>
        </div>

        {/* Product Detail View */}
        {selectedProduct && selectedProductData && (
          <div className="animate-fade-in">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold">{selectedProductData.name}</h2>
                <p className="text-sm text-muted-foreground">
                  الكمية الحالية: {selectedProductData.quantity}
                </p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="text-sm text-primary hover:underline"
              >
                رجوع للقائمة
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="notebook-paper p-3 text-center">
                <p className="text-2xl font-bold text-income">
                  +{getAddedQuantity(selectedProduct)}
                </p>
                <p className="text-sm text-muted-foreground">تم إضافتها</p>
              </div>
              <div className="notebook-paper p-3 text-center">
                <p className="text-2xl font-bold text-expense">
                  -{getSoldQuantity(selectedProduct)}
                </p>
                <p className="text-sm text-muted-foreground">تم بيعها</p>
              </div>
              <div className="notebook-paper p-3 text-center">
                <p className="text-2xl font-bold text-income">
                  +{getTotalProfit(selectedProduct).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">إجمالي الربح</p>
              </div>
            </div>

            <h3 className="font-bold mb-3 flex items-center gap-2">
              <ArrowLeftRight className="h-4 w-4" />
              سجل الحركات
            </h3>
            <div className="space-y-2">
              {selectedProductLogs?.map((log) => {
                const unitType = log.inventory_items?.unit_type || "قطعة";
                const profit = Number(log.profit || 0);
                
                return (
                  <div
                    key={log.id}
                    className="notebook-paper p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            log.action === "add" ? "bg-income/10" : "bg-expense/10"
                          }`}
                        >
                          {log.action === "add" ? (
                            <Plus className="h-4 w-4 text-income" />
                          ) : (
                            <Minus className="h-4 w-4 text-expense" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {log.action === "add" ? "إضافة" : "بيع"} {Math.abs(log.quantity_change)} {unitType}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(log.created_at!)}
                          </p>
                        </div>
                      </div>
                      <div className="text-left">
                        <span
                          className={`font-bold ${
                            log.action === "add" ? "text-income" : "text-expense"
                          }`}
                        >
                          {log.action === "add" ? "+" : "-"}
                          {Math.abs(log.quantity_change)}
                        </span>
                        {log.action === "sell" && profit > 0 && (
                          <p className="text-xs text-income font-medium">
                            ربح: +{profit.toLocaleString()}
                          </p>
                        )}
                      </div>
                    </div>
                    {log.action === "sell" && profit > 0 && (
                      <div className="mt-2 pt-2 border-t border-border/50 text-sm">
                        <div className="flex justify-between text-muted-foreground">
                          <span>الكمية: {Math.abs(log.quantity_change)} {unitType}</span>
                          <span className="text-income font-medium">إجمالي الربح: +{profit.toLocaleString()} جنيه</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {selectedProductLogs?.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  لا توجد حركات
                </p>
              )}
            </div>
          </div>
        )}

        {/* Products List */}
        {!selectedProduct && (
          <div className="space-y-3 animate-slide-up" style={{ animationDelay: "50ms" }}>
            {items?.length === 0 ? (
              <p className="text-center text-muted-foreground py-12 notebook-paper">
                لا توجد منتجات
              </p>
            ) : (
              items?.map((item) => {
                const sold = getSoldQuantity(item.id);
                const added = getAddedQuantity(item.id);
                const profit = getTotalProfit(item.id);

                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedProduct(item.id)}
                    className="w-full notebook-paper p-4 text-right hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-accent/10">
                          <Package className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-bold">{item.name}</p>
                          {item.inventory_categories?.name && (
                            <p className="text-xs text-muted-foreground">
                              {item.inventory_categories.name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="font-bold text-lg">{item.quantity}</p>
                        <p className="text-xs text-muted-foreground">متبقي</p>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-3 text-sm">
                      <span className="text-income">+{added} إضافة</span>
                      <span className="text-expense">-{sold} بيع</span>
                      {profit > 0 && (
                        <span className="text-income font-medium">ربح: +{profit.toLocaleString()}</span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
