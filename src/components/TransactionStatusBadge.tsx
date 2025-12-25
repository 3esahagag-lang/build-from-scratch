// Transaction Status Badge - Visual indicator for transaction states
import { Badge } from "@/components/ui/badge";
import { getStatusInfo } from "@/lib/transactions/atomic";
import type { TransactionStatus } from "@/lib/transactions/types";
import { CheckCircle, Clock, XCircle, RotateCcw } from "lucide-react";

interface TransactionStatusBadgeProps {
  status: TransactionStatus;
  size?: "sm" | "md";
  showIcon?: boolean;
}

const statusIcons: Record<TransactionStatus, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle,
  failed: XCircle,
  reversed: RotateCcw,
};

const statusVariants: Record<TransactionStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "secondary",
  confirmed: "default",
  failed: "destructive",
  reversed: "outline",
};

export function TransactionStatusBadge({ 
  status, 
  size = "md",
  showIcon = true 
}: TransactionStatusBadgeProps) {
  const { label } = getStatusInfo(status);
  const Icon = statusIcons[status];
  const variant = statusVariants[status];

  return (
    <Badge 
      variant={variant}
      className={`${size === "sm" ? "text-xs px-1.5 py-0.5" : "text-sm px-2 py-1"} gap-1`}
    >
      {showIcon && <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />}
      {label}
    </Badge>
  );
}

export default TransactionStatusBadge;
