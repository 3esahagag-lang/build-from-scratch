import { useAuth } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Phone, ChevronLeft, Hash, Banknote, Calendar, FileText, TrendingUp } from "lucide-react";
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
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "اليوم";
  if (diffDays === 1) return "أمس";
  return d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
}

export default function PhoneNumbersRecords() {
  const { user } = useAuth();
  const [selectedNumberId, setSelectedNumberId] = useState<string | null>(null);

  // Fetch all phone numbers
  const { data: phoneNumbers } = useQuery({
    queryKey: ["phone-numbers-list", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fixed_numbers")
        .select("id, name, phone_number, monthly_limit, is_disabled")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as PhoneNumber[];
    },
    enabled: !!user,
  });

  // Fetch transfers for selected phone number (from both tables)
  const { data: numberTransfers } = useQuery({
    queryKey: ["phone-number-transfers", selectedNumberId],
    queryFn: async () => {
      if (!selectedNumberId) return [];

      // Fetch from fixed_number_transfers
      const { data: fixedTransfers, error: fixedError } = await supabase
        .from("fixed_number_transfers")
        .select("id, amount, notes, created_at")
        .eq("fixed_number_id", selectedNumberId)
        .order("created_at", { ascending: false });

      if (fixedError) throw fixedError;

      // Fetch from transfers table (where fixed_number_id matches)
      const { data: linkedTransfers, error: linkedError } = await supabase
        .from("transfers")
        .select("id, amount, notes, created_at, profit, fixed_number_id")
        .eq("fixed_number_id", selectedNumberId)
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (linkedError) throw linkedError;

      // Combine and sort by date
      const combined = [
        ...(fixedTransfers || []).map(t => ({ ...t, profit: null, source: 'fixed' })),
        ...(linkedTransfers || []).map(t => ({ ...t, source: 'linked' })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return combined as Transfer[];
    },
    enabled: !!selectedNumberId,
  });

  // Get transfer count for each number
  const { data: transferCounts } = useQuery({
    queryKey: ["phone-numbers-transfer-counts", user?.id],
    queryFn: async () => {
      const [fixedTransfers, linkedTransfers] = await Promise.all([
        supabase.from("fixed_number_transfers").select("fixed_number_id"),
        supabase.from("transfers").select("fixed_number_id").not("fixed_number_id", "is", null).eq("is_archived", false),
      ]);

      const counts: Record<string, number> = {};
      
      fixedTransfers.data?.forEach(t => {
        counts[t.fixed_number_id] = (counts[t.fixed_number_id] || 0) + 1;
      });
      
      linkedTransfers.data?.forEach(t => {
        if (t.fixed_number_id) {
          counts[t.fixed_number_id] = (counts[t.fixed_number_id] || 0) + 1;
        }
      });

      return counts;
    },
    enabled: !!user,
  });

  const selectedNumber = phoneNumbers?.find(n => n.id === selectedNumberId);

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">
            {selectedNumberId ? selectedNumber?.name || "سجل الرقم" : "سجل أرقامي"}
          </h1>
          <p className="text-muted-foreground">
            {selectedNumberId 
              ? `تحويلات مرتبطة بالرقم ${selectedNumber?.phone_number || ""}`
              : "اختر رقمًا لعرض تحويلاته"
            }
          </p>
        </div>

        {/* Back button when viewing number details */}
        {selectedNumberId && (
          <button
            onClick={() => setSelectedNumberId(null)}
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>العودة للأرقام</span>
          </button>
        )}

        {/* Phone Numbers List */}
        {!selectedNumberId && (
          <div className="space-y-3">
            {phoneNumbers?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Phone className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>لا توجد أرقام مسجلة</p>
              </div>
            )}
            
            {phoneNumbers?.map((number, index) => (
              <button
                key={number.id}
                onClick={() => setSelectedNumberId(number.id)}
                className="w-full notebook-paper p-4 hover:bg-muted/30 transition-all duration-200 active:scale-[0.98] text-right animate-slide-up"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-3 rounded-xl ${number.is_disabled ? 'bg-muted/50' : 'bg-primary/10'}`}>
                      <Phone className={`h-5 w-5 ${number.is_disabled ? 'text-muted-foreground' : 'text-primary'}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{number.name}</h3>
                      {number.phone_number && (
                        <p className="text-sm text-muted-foreground" dir="ltr">{number.phone_number}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-muted">
                          <Hash className="h-3 w-3" />
                          {transferCounts?.[number.id] || 0} تحويل
                        </span>
                        {number.is_disabled && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-expense/20 text-expense">
                            معطل
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronLeft className="h-5 w-5 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Number Transfers List */}
        {selectedNumberId && (
          <div className="space-y-3">
            {numberTransfers?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>لا توجد تحويلات لهذا الرقم</p>
              </div>
            )}

            {numberTransfers?.map((transfer, index) => (
              <div
                key={transfer.id}
                className="notebook-paper p-4 animate-slide-up"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-income/10">
                      <Banknote className="h-4 w-4 text-income" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">
                          {Number(transfer.amount).toLocaleString()} ج.م
                        </span>
                        {transfer.profit && Number(transfer.profit) > 0 && (
                          <span className="text-xs text-income bg-income/10 px-1.5 py-0.5 rounded">
                            +{Number(transfer.profit).toLocaleString()} ربح
                          </span>
                        )}
                      </div>
                      {transfer.notes && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                          <FileText className="h-3 w-3" />
                          {transfer.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatDate(transfer.created_at)}
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
