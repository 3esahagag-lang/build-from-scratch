import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Wallet, 
  TrendingUp, 
  HandCoins, 
  Package,
  Loader2
} from "lucide-react";
import { useFinancialSnapshot, SnapshotPeriod } from "@/hooks/useFinancialSnapshot";

const periodLabels: Record<SnapshotPeriod, string> = {
  today: "اليوم",
  week: "هذا الأسبوع",
  month: "هذا الشهر",
};

export default function FinancialSnapshot() {
  const [period, setPeriod] = useState<SnapshotPeriod>("today");
  const { data, isLoading, error } = useFinancialSnapshot(period);

  if (error) {
    return null; // Fail silently for snapshot
  }

  return (
    <div className="space-y-4">
      {/* Period Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="section-title">ملخص مالي</h2>
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {(Object.keys(periodLabels) as SnapshotPeriod[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? "default" : "ghost"}
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setPeriod(p)}
            >
              {periodLabels[p]}
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {/* Net Balance */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">صافي الرصيد</p>
                  <p className={`text-xl font-bold ${
                    (data?.netBalance || 0) >= 0 ? "text-success" : "text-destructive"
                  }`}>
                    {(data?.netBalance || 0).toLocaleString("ar-EG")}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center">
                  <Wallet className="h-4 w-4 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Profit */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-success/10 to-success/5">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">الأرباح</p>
                  <p className="text-xl font-bold text-success">
                    {(data?.totalProfit || 0).toLocaleString("ar-EG")}
                  </p>
                </div>
                <div className="h-9 w-9 rounded-full bg-success/20 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Debts Summary */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-warning/10 to-warning/5">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">ديون مفتوحة</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-warning">
                      {data?.debtsOwedToYou || 0}
                    </span>
                    <span className="text-xs text-muted-foreground">لك</span>
                    <span className="text-muted-foreground">/</span>
                    <span className="text-xl font-bold text-destructive">
                      {data?.debtsYouOwe || 0}
                    </span>
                    <span className="text-xs text-muted-foreground">عليك</span>
                  </div>
                </div>
                <div className="h-9 w-9 rounded-full bg-warning/20 flex items-center justify-center">
                  <HandCoins className="h-4 w-4 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Low Stock */}
          <Card className="border-0 shadow-sm bg-gradient-to-br from-accent/10 to-accent/5">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">مخزون منخفض</p>
                  <p className={`text-xl font-bold ${
                    (data?.lowStockItems || 0) > 0 ? "text-destructive" : "text-foreground"
                  }`}>
                    {data?.lowStockItems || 0}
                    <span className="text-xs text-muted-foreground mr-1">منتج</span>
                  </p>
                </div>
                <div className="h-9 w-9 rounded-full bg-accent/20 flex items-center justify-center">
                  <Package className="h-4 w-4 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
