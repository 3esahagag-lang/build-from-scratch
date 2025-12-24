import { TrendingUp, TrendingDown, Phone } from "lucide-react";

interface Transfer {
  id: string;
  type: string;
  amount: number;
  notes: string | null;
  created_at: string;
  fixed_numbers: { name: string } | null;
}

interface FixedNumberTransfer {
  id: string;
  amount: number;
  notes: string | null;
  created_at: string;
  fixed_numbers: { name: string; phone_number: string | null } | null;
}

interface TransfersRecordSectionProps {
  transfers: Transfer[];
  fixedNumberTransfers: FixedNumberTransfer[];
  formatDate: (date: Date) => string;
}

export default function TransfersRecordSection({
  transfers,
  fixedNumberTransfers,
  formatDate,
}: TransfersRecordSectionProps) {
  const generalTransfers = transfers.filter((t) => !t.fixed_numbers);
  const linkedTransfers = transfers.filter((t) => t.fixed_numbers);

  return (
    <div className="divide-y divide-border">
      {/* General Transfers */}
      {generalTransfers.length > 0 && (
        <div className="p-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            تحويلات عامة
          </h4>
          <div className="space-y-2">
            {generalTransfers.slice(0, 10).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  {t.type === "income" ? (
                    <TrendingUp className="h-4 w-4 text-income" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-expense" />
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      {t.notes || (t.type === "income" ? "دخل" : "مصروف")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(new Date(t.created_at))}
                    </div>
                  </div>
                </div>
                <span
                  className={`font-bold ${
                    t.type === "income" ? "text-income" : "text-expense"
                  }`}
                >
                  {t.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Transfers (from transfers table) */}
      {linkedTransfers.length > 0 && (
        <div className="p-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Phone className="h-4 w-4" />
            تحويلات مربوطة بأرقام
          </h4>
          <div className="space-y-2">
            {linkedTransfers.slice(0, 10).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  {t.type === "income" ? (
                    <TrendingUp className="h-4 w-4 text-income" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-expense" />
                  )}
                  <div>
                    <div className="text-sm font-medium">
                      {t.notes || (t.type === "income" ? "دخل" : "مصروف")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      #{t.fixed_numbers?.name} • {formatDate(new Date(t.created_at))}
                    </div>
                  </div>
                </div>
                <span
                  className={`font-bold ${
                    t.type === "income" ? "text-income" : "text-expense"
                  }`}
                >
                  {t.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fixed Number Transfers (with limits) */}
      {fixedNumberTransfers.length > 0 && (
        <div className="p-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Phone className="h-4 w-4" />
            تحويلات الأرقام الثابتة
          </h4>
          <div className="space-y-2">
            {fixedNumberTransfers.slice(0, 10).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
              >
                <div>
                  <div className="text-sm font-medium">
                    {t.notes || t.fixed_numbers?.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    #{t.fixed_numbers?.name}
                    {t.fixed_numbers?.phone_number &&
                      ` • ${t.fixed_numbers.phone_number}`}{" "}
                    • {formatDate(new Date(t.created_at))}
                  </div>
                </div>
                <span className="font-bold text-primary">
                  {t.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {generalTransfers.length === 0 &&
        linkedTransfers.length === 0 &&
        fixedNumberTransfers.length === 0 && (
          <div className="p-6 text-center text-muted-foreground">
            لا توجد تحويلات
          </div>
        )}
    </div>
  );
}
