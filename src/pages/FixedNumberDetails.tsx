import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowRight,
  Phone,
  Settings,
  Pencil,
  Trash2,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
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
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLimit, setEditLimit] = useState("");

  /* ===============================
     Fetch fixed number
  =============================== */
  const { data: fixedNumber, isLoading: numberLoading } = useQuery({
    queryKey: ["fixed-number", id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_numbers")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  /* ===============================
     Fetch transfers (NEW SOURCE)
  =============================== */
  const { data: transfers = [], isLoading: transfersLoading } = useQuery({
    queryKey: ["fixed-number-transfers", id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfers")
        .select("*")
        .eq("fixed_number_id", id)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });

  /* ===============================
     Monthly usage
  =============================== */
  const monthlyUsage = (() => {
    if (!transfers.length) return 0;

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    return transfers
      .filter((t) => new Date(t.created_at) >= startOfMonth)
      .reduce((sum, t) => sum + Number(t.amount), 0);
  })();

  const limit = Number(fixedNumber?.monthly_limit || 0);
  const percentage = limit > 0 ? Math.min((monthlyUsage / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - monthlyUsage, 0);

  /* ===============================
     Mutations
  =============================== */
  const updateMutation = useMutation({
    mutationFn: async (updates: {
      name?: string;
      phone_number?: string;
      monthly_limit?: number;
      is_disabled?: boolean;
    }) => {
      const { error } = await supabase
        .from("fixed_numbers")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-number", id] });
      queryClient.invalidateQueries({ queryKey: ["fixed-numbers"] });
      toast.success("تم تحديث البيانات");
      setEditDialogOpen(false);
      setDisableDialogOpen(false);
    },
    onError: () => toast.error("فشل التحديث"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("fixed_numbers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fixed-numbers"] });
      toast.success("تم حذف الرقم");
      navigate("/transfers");
    },
    onError: () => toast.error("فشل الحذف"),
  });

  /* ===============================
     Helpers
  =============================== */
  const openEditDialog = () => {
    setEditName(fixedNumber?.name || "");
    setEditPhone(fixedNumber?.phone_number || "");
    setEditLimit(String(fixedNumber?.monthly_limit || ""));
    setEditDialogOpen(true);
  };

  const isLoading = numberLoading || transfersLoading;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[50vh]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (!fixedNumber) {
    return (
      <Layout>
        <p className="text-center text-muted-foreground">
          لم يتم العثور على الرقم
        </p>
      </Layout>
    );
  }

  /* ===============================
     JSX
  =============================== */
  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/transfers">
              <ArrowRight />
            </Link>
            <h1 className="text-2xl font-bold">{fixedNumber.name}</h1>
          </div>
          <Button variant="ghost" onClick={openEditDialog}>
            <Settings />
          </Button>
        </div>

        {/* Phone Card */}
        <div className="notebook-paper p-6">
          <div className="flex items-center gap-4">
            <Phone />
            <div>
              <p className="font-mono text-xl">{fixedNumber.phone_number}</p>
              {fixedNumber.is_disabled && (
                <span className="text-sm text-destructive">موقوف</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="notebook-paper p-4 text-center">
            <p className="text-sm text-muted-foreground">الحد</p>
            <p className="font-bold">{limit.toLocaleString("ar-EG")}</p>
          </div>
          <div className="notebook-paper p-4 text-center">
            <p className="text-sm text-muted-foreground">المستخدم</p>
            <p className="font-bold">{monthlyUsage.toLocaleString("ar-EG")}</p>
          </div>
          <div className="notebook-paper p-4 text-center">
            <p className="text-sm text-muted-foreground">المتبقي</p>
            <p className="font-bold">{remaining.toLocaleString("ar-EG")}</p>
          </div>
        </div>

        {/* Transfers */}
        <div className="space-y-2">
          {transfers.length === 0 && (
            <p className="text-center text-muted-foreground">
              لا توجد تحويلات
            </p>
          )}
          {transfers.map((t) => (
            <div key={t.id} className="notebook-paper p-4 flex justify-between">
              <div>
                <p className="text-sm">{t.notes || "—"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(t.created_at).toLocaleString("ar-EG")}
                </p>
              </div>
              <div className="font-bold">
                {Number(t.amount).toLocaleString("ar-EG")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dialogs */}
      {/* Edit */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تعديل الرقم</DialogTitle>
          </DialogHeader>

          <Label>الاسم</Label>
          <Input value={editName} onChange={(e) => setEditName(e.target.value)} />

          <Label>الرقم</Label>
          <Input
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
            dir="ltr"
          />

          <Label>الحد الشهري</Label>
          <Input
            type="number"
            value={editLimit}
            onChange={(e) => setEditLimit(e.target.value)}
            dir="ltr"
          />

          <DialogFooter>
            <Button
              onClick={() =>
                updateMutation.mutate({
                  name: editName,
                  phone_number: editPhone,
                  monthly_limit: Number(editLimit),
                })
              }
            >
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
