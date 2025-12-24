import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface Debt {
  id: string;
  type: string;
  amount: number;
  description: string;
  is_paid: boolean | null;
  created_at: string;
}

interface DebtsRecordSectionProps {
  debts: Debt[];
  formatDate: (date: Date) => string;
}

export default function DebtsRecordSection({
  debts,
  formatDate,
}: DebtsRecordSectionProps) {
  const owedToMe = debts.filter((d) => d.type === "owed_to_me");
  const owedByMe = debts.filter((d) => d.type === "owed_by_me");

  return (
    <div className="divide-y divide-border">
      {/* Owed To Me - سلفة لي */}
      {owedToMe.length > 0 && (
        <div className="p-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4 text-owed-to-me" />
            سلفة لي (عليهم)
          </h4>
          <div className="space-y-2">
            {owedToMe.slice(0, 10).map((d) => (
              <div
                key={d.id}
                className={`flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 ${
                  d.is_paid ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="h-4 w-4 text-owed-to-me" />
                  <div>
                    <div className="text-sm font-medium">{d.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(new Date(d.created_at))}
                      {d.is_paid && " • مسدد"}
                    </div>
                  </div>
                </div>
                <span className="font-bold text-owed-to-me">
                  {d.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Owed By Me - سلفة علي */}
      {owedByMe.length > 0 && (
        <div className="p-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4 text-owed-by-me" />
            سلفة عليّ (لهم)
          </h4>
          <div className="space-y-2">
            {owedByMe.slice(0, 10).map((d) => (
              <div
                key={d.id}
                className={`flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 ${
                  d.is_paid ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-owed-by-me" />
                  <div>
                    <div className="text-sm font-medium">{d.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(new Date(d.created_at))}
                      {d.is_paid && " • مسدد"}
                    </div>
                  </div>
                </div>
                <span className="font-bold text-owed-by-me">
                  {d.amount.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {owedToMe.length === 0 && owedByMe.length === 0 && (
        <div className="p-6 text-center text-muted-foreground">
          لا توجد سلف
        </div>
      )}
    </div>
  );
}
