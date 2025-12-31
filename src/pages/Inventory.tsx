import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Package, FolderOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Inventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemProfitPerUnit, setNewItemProfitPerUnit] = useState("");
  const [newItemUnitType, setNewItemUnitType] = useState("قطعة");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

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

  // Fetch items
  const { data: items } = useQuery({
    queryKey: ["inventory-items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*, inventory_categories(name)")
        .eq("user_id", user!.id) 
        .eq("is_archived", false)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Add category mutation
  const addCategory = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("inventory_categories").insert({
        user_id: user!.id,
        name: newCategoryName,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-categories"] });
      toast({ title: "تم إضافة التصنيف" });
      setNewCategoryName("");
      setCategoryDialogOpen(false);
    },
  });

  // 🔥 دالة الحفظ المحدثة (Fix)
  const addItem = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("يجب تسجيل الدخول");

      // 1. تنظيف البيانات: تحويل النص الفارغ إلى null
      // هذا هو الإصلاح الرئيسي
      const cleanCategoryId = selectedCategoryId && selectedCategoryId !== "all" && selectedCategoryId !== ""
        ? selectedCategoryId 
        : null;

      const cleanQuantity = parseInt(newItemQuantity) || 0;
      
      // 2. إدخال الصنف أولاً
      const { data: item, error: itemError } = await supabase
        .from("inventory_items")
        .insert({
          user_id: user.id,
          category_id: cleanCategoryId, // ✅ أصبح الآن آمن
          name: newItemName,
          quantity: cleanQuantity,
          profit_per_unit: parseFloat(newItemProfitPerUnit) || 0,
          unit_type: newItemUnitType,
          is_archived: false
        })
        .select("id")
        .single();

      if (itemError) throw itemError;
      if (!item) throw new Error("فشل إنشاء المنتج");

      // 3. إدخال السجل (Log) في خطوة منفصلة
      if (cleanQuantity > 0) {
        const { error: logError } = await supabase.from("inventory_logs").insert({
          user_id: user.id,
          item_id: item.id,
          quantity_change: cleanQuantity,
          action: "add",
          profit: 0,
        });
        
        if (logError) {
          console.error("Failed to create log:", logError);
        }
      }
      
      return item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-logs"] });
      toast({ title: "تم إضافة الصنف بنجاح" });
      
      // تصفية النموذج
      setNewItemName("");
      setNewItemQuantity("");
      setNewItemProfitPerUnit("");
      setNewItemUnitType("قطعة");
      setSelectedCategoryId("");
      setItemDialogOpen(false);
    },
    onError: (err) => {
      toast({ 
        title: "خطأ", 
        description: err.message, 
        variant: "destructive" 
      });
    }
  });

  // Group items by category
  const groupedItems = items?.reduce(
    (acc, item) => {
      const categoryName = item.inventory_categories?.name || "بدون تصنيف";
      if (!acc[categoryName]) acc[categoryName] = [];
      acc[categoryName].push(item);
      return acc;
    },
    {} as Record<string, typeof items>
  );

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="flex items-center justify-between animate-slide-up">
          <div>
            <h1 className="text-2xl font-bold text-foreground">البضاعة</h1>
            <p className="text-muted-foreground">إدارة المخزون</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <FolderOpen className="h-4 w-4" />
                  تصنيف
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة تصنيف</DialogTitle>
                  <DialogDescription>أدخل اسم التصنيف الجديد</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>اسم التصنيف</Label>
                    <Input
                      placeholder="مثال: مشروبات، حلويات..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => addCategory.mutate()}
                    disabled={!newCategoryName}
                    className="w-full"
                  >
                    إضافة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-1">
                  <Plus className="h-4 w-4" />
                  صنف جديد
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>إضافة صنف</DialogTitle>
                  <DialogDescription>أدخل بيانات الصنف الجديد</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>التصنيف</Label>
                    <Select
                      value={selectedCategoryId}
                      onValueChange={setSelectedCategoryId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر تصنيفاً" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories?.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>اسم الصنف</Label>
                    <Input
                      placeholder="اسم الصنف"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>الكمية</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={newItemQuantity}
                        onChange={(e) => setNewItemQuantity(e.target.value)}
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>نوع الوحدة</Label>
                      <Select
                        value={newItemUnitType}
                        onValueChange={setNewItemUnitType}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="قطعة">قطعة</SelectItem>
                          <SelectItem value="كيلو">كيلو</SelectItem>
                          <SelectItem value="متر">متر</SelectItem>
                          <SelectItem value="لتر">لتر</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>ربح الوحدة (جنيه)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={newItemProfitPerUnit}
                      onChange={(e) => setNewItemProfitPerUnit(e.target.value)}
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground">
                      الربح لكل {newItemUnitType} عند البيع
                    </p>
                  </div>
                  <Button
                    onClick={() => addItem.mutate()}
                    disabled={!newItemName}
                    className="w-full"
                  >
                    إضافة
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Items List */}
        {groupedItems && Object.keys(groupedItems).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedItems).map(([categoryName, categoryItems]) => (
              <div key={categoryName} className="animate-slide-up">
                <h3 className="section-title">
                  <FolderOpen className="h-5 w-5 text-muted-foreground" />
                  {categoryName}
                </h3>
                <div className="notebook-paper divide-y divide-border">
                  {categoryItems?.map((item) => {
                    const unitType = (item as any).unit_type || "قطعة";
                    const profitPerUnit = Number((item as any).profit_per_unit) || 0;
                    
                    return (
                      <div key={item.id} className="record-item">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-accent" />
                            <div>
                              <span className="font-medium">{item.name}</span>
                              {profitPerUnit > 0 && (
                                <p className="text-xs text-income">
                                  ربح ال{unitType}: {profitPerUnit} جنيه
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="text-lg font-bold text-primary">
                              {item.quantity ?? 0}
                            </div>
                            <p className="text-xs text-muted-foreground">{unitType}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="notebook-paper p-8 text-center text-muted-foreground animate-slide-up">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد أصناف بعد</p>
            <p className="text-sm">اضغط على "صنف جديد" للبدء</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
