import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone,
  ChevronLeft,
  Hash,
  Banknote,
  Calendar,
  FileText,
  TrendingUp,
  ArrowUpCircle,
  Percent,
} from "lucide-react";
import { useState } from "react";

interface PhoneNumber {
  id: string;
  name: string;
  phone_number: string | null;
  monthly_limit: number | null;
  is_disabled: boolean | null;
}

interface Transfer {
  id: string;
  amount: number;
  notes: string | null;
  created_at: string;
  profit?: number | null;
  fixed_number_id?: string | null;
}

function formatDate(date: string): string {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return "اليوم";
  if (diffDays === 1) return "أمس";
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

export default function PhoneNumbersRecords() {
  const { user } = useAuth();
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);

  /* ===============================
     Fetch phone numbers
  =============================== */
  const { data: phoneNumbers } = useQuery({
    queryKey: ["phone-numbers-list", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_numbers")
        .select("id, name, phone_number, monthly_limit, is_disabled")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PhoneNumber[];
    },
  });

  /* ===============================
     Fetch transfers for selected number
     SINGLE SOURCE OF TRUTH
  =============================== */
  const { data: numberTransfers = [] } = useQuery({
  queryKey: ["phone-number-transfers", selectedNumberId, user?.id],
  enabled: !!selectedNumberId && !!user?.id,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("transfers")
      .select("id, amount, notes, created_at, profit, fixed_number_id")
      .eq("user_id", user!.id)          // ✅ السطر الحاسم
      .eq("fixed_number_id", selectedNumberId)
      .eq("is_archived", false)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Transfer[];
  },
});

  /* ===============================
     Transfer counts per number
  =============================== */
  const { data: transferCounts } = useQuery({
    queryKey: ["phone-numbers-transfer-counts", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transfers")
        .select("fixed_number_id")
        .eq("is_archived", false)
        .not("fixed_number_id", "is", null);

      if (error) throw error;

      const counts: Record<string, number> = {};
      data?.forEach((t) => {
        if (t.fixed_number_id) {
          counts[t.fixed_number_id] =
            (counts[t.fixed_number_id] || 0) + 1;
        }
      });

      return counts;
    },
  });

  const selectedNumber = phoneNumbers?.find(
    (n) => n.id === selectedNumberId
  );

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">
            {selectedNumberId
              ? selectedNumber?.name || "سجل الرقم"
              : "سجل أرقامي"}
          </h1>
          <p className="text-muted-foreground">
            {selectedNumberId
              ? `تحويلات مرتبطة بالرقم ${selectedNumber?.phone_number || ""}`
              : "اختر رقمًا لعرض تحويلاته"}
          </p>
        </div>

        {/* Back */}
        {selectedNumberId && (
          <button
            onClick={() => setSelectedNumberId(null)}
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            العودة للأرقام
          </button>
        )}

        {/* Numbers list */}
        {!selectedNumberId && (
          <div className="space-y-3">
            {phoneNumbers?.map((number) => (
              <button
                key={number.id}
                onClick={() => setSelectedNumberId(number.id)}
                className="w-full notebook-paper p-4 text-right"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold">{number.name}</h3>
                    <p dir="ltr" className="text-sm text-muted-foreground">
                      {number.phone_number}
                    </p>
                    <span className="text-xs">
                      {transferCounts?.[number.id] || 0} تحويل
                    </span>
                  </div>
                  <ChevronLeft />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Transfers */}
        {selectedNumberId && (
          <div className="space-y-4">
            {numberTransfers.length === 0 && (
              <p className="text-center text-muted-foreground">
                لا توجد تحويلات لهذا الرقم
              </p>
            )}

            {numberTransfers.map((t) => (
              <div key={t.id} className="notebook-paper p-4">
                <div className="flex justify-between">
                  <div>
                    <p className="font-bold">
                      {t.amount.toLocaleString()} ج.م
                    </p>
                    {t.profit ? (
                      <p className="text-xs text-income">
                        ربح: {t.profit.toLocaleString()}
                      </p>
                    ) : null}
                    {t.notes && (
                      <p className="text-sm text-muted-foreground">
                        {t.notes}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(t.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
