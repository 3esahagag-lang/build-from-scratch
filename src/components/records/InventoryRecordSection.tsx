import { Package, Plus, Minus } from "lucide-react";

interface InventoryLog {
  id: string;
  action: string;
  quantity_change: number;
  created_at: string;
  inventory_items: { name: string } | null;
}

interface InventoryRecordSectionProps {
  inventoryLogs: InventoryLog[];
  formatDate: (date: Date) => string;
}

export default function InventoryRecordSection({
  inventoryLogs,
  formatDate,
}: InventoryRecordSectionProps) {
  const additions = inventoryLogs.filter((l) => l.action === "add");
  const sales = inventoryLogs.filter((l) => l.action === "sell");

  return (
    <div className="divide-y divide-border">
      {/* Additions */}
      {additions.length > 0 && (
        <div className="p-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Plus className="h-4 w-4 text-success" />
            إضافات
          </h4>
          <div className="space-y-2">
            {additions.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-accent" />
                  <div>
                    <div className="text-sm font-medium">
                      {log.inventory_items?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(new Date(log.created_at))}
                    </div>
                  </div>
                </div>
                <span className="font-bold text-success">
                  +{Math.abs(log.quantity_change)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sales */}
      {sales.length > 0 && (
        <div className="p-3">
          <h4 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
            <Minus className="h-4 w-4 text-accent" />
            مبيعات
          </h4>
          <div className="space-y-2">
            {sales.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-accent" />
                  <div>
                    <div className="text-sm font-medium">
                      {log.inventory_items?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(new Date(log.created_at))}
                    </div>
                  </div>
                </div>
                <span className="font-bold text-accent">
                  -{Math.abs(log.quantity_change)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {additions.length === 0 && sales.length === 0 && (
        <div className="p-6 text-center text-muted-foreground">
          لا توجد حركات
        </div>
      )}
    </div>
  );
}
