import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, FolderOpen, Package, RefreshCw, AlertTriangle, ChevronLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export default function ProductsRecords() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ["inventory-categories", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch items for counting
  const { data: items } = useQuery({
    queryKey: ["inventory-items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, category_id, quantity")
        .eq("is_archived", false);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch logs for movement count
  const { data: logs } = useQuery({
    queryKey: ["inventory-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_logs")
        .select("id, item_id");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Get stats for each category
  const getCategoryStats = (categoryId: string) => {
    const categoryItems = items?.filter(i => i.category_id === categoryId) || [];
    const itemIds = categoryItems.map(i => i.id);
    const movementsCount = logs?.filter(l => itemIds.includes(l.item_id)).length || 0;
    const lowStockCount = categoryItems.filter(i => (i.quantity || 0) <= 5).length;
    
    return {
      itemsCount: categoryItems.length,
      movementsCount,
      lowStockCount,
    };
  };

  // Get uncategorized items stats
  const getUncategorizedStats = () => {
    const uncategorizedItems = items?.filter(i => !i.category_id) || [];
    const itemIds = uncategorizedItems.map(i => i.id);
    const movementsCount = logs?.filter(l => itemIds.includes(l.item_id)).length || 0;
    const lowStockCount = uncategorizedItems.filter(i => (i.quantity || 0) <= 5).length;
    
    return {
      itemsCount: uncategorizedItems.length,
      movementsCount,
      lowStockCount,
    };
  };

  const uncategorizedStats = getUncategorizedStats();

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
            <p className="text-muted-foreground">التصنيفات والمنتجات</p>
          </div>
        </div>

        {/* Categories List */}
        <div className="space-y-3">
          {categories?.length === 0 && uncategorizedStats.itemsCount === 0 ? (
            <div className="notebook-paper p-8 text-center animate-slide-up">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground">لا توجد تصنيفات أو منتجات</p>
            </div>
          ) : (
            <>
              {categories?.map((category, index) => {
                const stats = getCategoryStats(category.id);
                
                return (
                  <button
                    key={category.id}
                    onClick={() => navigate(`/inventory/category/${category.id}`)}
                    className="w-full notebook-paper p-4 text-right hover:bg-accent/30 hover:shadow-md transition-all duration-200 active:scale-[0.98] animate-slide-up group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl bg-accent/10">
                          <FolderOpen className="h-6 w-6 text-accent" />
                        </div>
                        <div>
                          <p className="font-bold text-lg">{category.name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {/* Items Count */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Package className="h-3.5 w-3.5" />
                              <span>{stats.itemsCount}</span>
                            </div>
                            {/* Movements Count */}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <RefreshCw className="h-3.5 w-3.5" />
                              <span>{stats.movementsCount}</span>
                            </div>
                            {/* Low Stock Indicator */}
                            {stats.lowStockCount > 0 && (
                              <div className="flex items-center gap-1 text-xs text-amber-500">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                <span>{stats.lowStockCount}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-[-2px] transition-all" />
                    </div>
                  </button>
                );
              })}

              {/* Uncategorized Items */}
              {uncategorizedStats.itemsCount > 0 && (
                <button
                  onClick={() => navigate(`/inventory/category/uncategorized`)}
                  className="w-full notebook-paper p-4 text-right hover:bg-accent/30 hover:shadow-md transition-all duration-200 active:scale-[0.98] animate-slide-up group"
                  style={{ animationDelay: `${(categories?.length || 0) * 50}ms` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-muted">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-bold text-lg">بدون تصنيف</p>
                        <div className="flex items-center gap-3 mt-1">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Package className="h-3.5 w-3.5" />
                            <span>{uncategorizedStats.itemsCount}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>{uncategorizedStats.movementsCount}</span>
                          </div>
                          {uncategorizedStats.lowStockCount > 0 && (
                            <div className="flex items-center gap-1 text-xs text-amber-500">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>{uncategorizedStats.lowStockCount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <ChevronLeft className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-[-2px] transition-all" />
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
