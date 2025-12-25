import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight, Phone, Settings, Pencil, Trash2, Calendar, ArrowDownUp } from "lucide-react";
import { Link, useParams, Navigate, useNavigate } from "react-router-dom";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

export default function FixedNumberDetails() {
  const { user } = useAuth();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLimit, setEditLimit] = useState("");

  // Fetch fixed number details
  const { data: fixedNumber, isLoading: numberLoading } = useQuery({
    queryKey: ["fixed-number", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_numbers")
        .select("*")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Fetch transfers for this fixed number
  const { data: transfers, isLoading: transfersLoading } = useQuery({
    queryKey: ["fixed-number-transfers", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_number_transfers")
        .select("*")
        .eq("fixed_number_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });

  // Update fixed number mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: { name?: string; phone_number?: string; monthly_limit?: number }) => {
      const { error } = await supabase
        .from("fixed_numbers")
        .update(updates)
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-number", id] });
      queryClient.invalidateQueries({ queryKey: ["fixed-numbers"] });
      setEditDialogOpen(false);
      toast.success("تم تحديث بيانات الرقم");
    },
    onError: () => {
      toast.error("فشل تحديث البيانات");
    },
  });

  // Delete fixed number mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      // First delete all transfers for this number
      await supabase
        .from("fixed_number_transfers")
        .delete()
        .eq("fixed_number_id", id!);
      
      // Then delete the fixed number
      const { error } = await supabase
        .from("fixed_numbers")
        .delete()
        .eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-numbers"] });
      toast.success("تم حذف الرقم");
      navigate("/transfers");
    },
    onError: () => {
      toast.error("فشل حذف الرقم");
    },
  });

  // Calculate monthly usage
  const monthlyUsage = (() => {
    if (!transfers) return 0;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    return transfers
      .filter((t) => new Date(t.created_at) >= startOfMonth)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  })();

  const limit = Number(fixedNumber?.monthly_limit) || 0;
  const percentage = limit > 0 ? Math.min((monthlyUsage / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - monthlyUsage, 0);

  const getProgressColor = () => {
    if (fixedNumber?.is_disabled) return "bg-muted";
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 80) return "bg-amber-500";
    if (percentage >= 50) return "bg-primary";
    return "bg-income";
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) return "اليوم";
    if (d.toDateString() === yesterday.toDateString()) return "أمس";
    return d.toLocaleDateString("ar-EG", {
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("ar-EG", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const openEditDialog = () => {
    setEditName(fixedNumber?.name || "");
    setEditPhone(fixedNumber?.phone_number || "");
    setEditLimit(String(fixedNumber?.monthly_limit || 0));
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    updateMutation.mutate({
      name: editName,
      phone_number: editPhone,
      monthly_limit: Number(editLimit) || 0,
    });
  };

  const handleDelete = () => {
    deleteMutation.mutate();
  };

  if (!id) {
    return <Navigate to="/transfers" replace />;
  }

  const isLoading = numberLoading || transfersLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!fixedNumber) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Link
              to="/transfers"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-foreground">الرقم غير موجود</h1>
          </div>
          <p className="text-muted-foreground text-center py-12">
            لم يتم العثور على هذا الرقم
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header with Settings */}
        <div className="flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-3">
            <Link
              to="/transfers"
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">بيانات الرقم</h1>
            </div>
          </div>
          <button
            onClick={openEditDialog}
            className="p-2.5 rounded-xl bg-muted hover:bg-accent transition-colors"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Phone Number Hero Card */}
        <div 
          className={`notebook-paper p-6 animate-slide-up ${
            fixedNumber.is_disabled ? "opacity-60" : ""
          }`}
          style={{ animationDelay: "50ms" }}
        >
          <div className="flex items-center gap-4">
            <div className="p-4 rounded-2xl bg-primary/10">
              <Phone className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-mono text-2xl font-bold tracking-wide" dir="ltr">
                {fixedNumber.phone_number || "—"}
              </p>
              <p className="text-lg text-muted-foreground">{fixedNumber.name}</p>
            </div>
            {fixedNumber.is_disabled && (
              <span className="px-3 py-1.5 rounded-full bg-destructive/20 text-destructive text-sm font-medium">
                معطّل
              </span>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="animate-slide-up" style={{ animationDelay: "100ms" }}>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">ملخص الاستهلاك</h2>
          
          {/* Progress Bar */}
          {limit > 0 && (
            <div className="notebook-paper p-4 mb-3">
              <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className={`h-full transition-all duration-500 ${getProgressColor()}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>{Math.round(percentage)}% مستخدم</span>
                <span>من {limit.toLocaleString("ar-EG")}</span>
              </div>
            </div>
          )}
          
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="notebook-paper p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">الحد الشهري</p>
              <p className="font-bold text-xl">
                {limit > 0 ? limit.toLocaleString("ar-EG") : "—"}
              </p>
            </div>
            <div className="notebook-paper p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">المستخدم</p>
              <p className="font-bold text-xl text-primary">
                {monthlyUsage.toLocaleString("ar-EG")}
              </p>
            </div>
            <div className="notebook-paper p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">المتبقي</p>
              <p className={`font-bold text-xl ${limit > 0 && percentage >= 100 ? "text-destructive" : "text-income"}`}>
                {limit > 0 ? remaining.toLocaleString("ar-EG") : "∞"}
              </p>
            </div>
          </div>
        </div>

        {/* Linked Transfers */}
        <section className="animate-slide-up" style={{ animationDelay: "150ms" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <ArrowDownUp className="h-5 w-5 text-primary" />
              التحويلات المرتبطة
            </h2>
            {transfers && transfers.length > 0 && (
              <span className="text-sm text-muted-foreground bg-muted px-2 py-1 rounded-full">
                {transfers.length}
              </span>
            )}
          </div>
          
          <div className="space-y-2">
            {!transfers || transfers.length === 0 ? (
              <div className="notebook-paper p-8 text-center">
                <ArrowDownUp className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">لا توجد تحويلات على هذا الرقم</p>
              </div>
            ) : (
              transfers.map((t) => (
                <div
                  key={t.id}
                  className="notebook-paper p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/50">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {t.notes || "تحويل"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.created_at)} - {formatTime(t.created_at)}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-lg">
                    {Number(t.amount).toLocaleString("ar-EG")}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Actions */}
        <section className="animate-slide-up space-y-3" style={{ animationDelay: "200ms" }}>
          <h2 className="text-sm font-medium text-muted-foreground">الإجراءات</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={openEditDialog}
            >
              <Pencil className="h-5 w-5" />
              <span>تعديل البيانات</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="h-5 w-5" />
              <span>حذف الرقم</span>
            </Button>
          </div>
        </section>
      </div>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تعديل بيانات الرقم</DialogTitle>
            <DialogDescription>
              قم بتعديل بيانات الرقم والحد الشهري
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="اسم الرقم"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="رقم الهاتف"
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="space-y-2">
              <Label>الحد الشهري</Label>
              <Input
                type="number"
                value={editLimit}
                onChange={(e) => setEditLimit(e.target.value)}
                placeholder="0 = بدون حد"
                dir="ltr"
                className="text-left"
              />
              <p className="text-xs text-muted-foreground">
                اتركه 0 لإزالة الحد الشهري
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              إلغاء
            </Button>
            <Button onClick={handleSaveEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الرقم</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا الرقم؟ سيتم حذف جميع التحويلات المرتبطة به أيضاً.
              هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
