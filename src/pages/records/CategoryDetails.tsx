import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, FolderOpen, Package, Minus, Plus, AlertTriangle } from "lucide-react";
import { Link, useParams, Navigate } from "react-router-dom";

export default function CategoryDetails() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const isUncategorized = id === "uncategorized";

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

        {/* Notice: Selling from Dashboard */}
        <div className="bg-muted/50 border border-border rounded-xl p-4 animate-slide-up">
          <p className="text-sm text-muted-foreground text-center">
            💡 لبيع المنتجات، استخدم زر "بيع بضاعتك" من الصفحة الرئيسية
          </p>
        </div>

        {/* Items List - Display Only */}
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
                          <p className="text-xs text-success">
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
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Minus className="h-3 w-3 text-destructive" />
                      مباع: {stats.totalSold}
                    </span>
                    {stats.totalProfit > 0 && (
                      <span className="flex items-center gap-1 text-success font-medium">
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
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
