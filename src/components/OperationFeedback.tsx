import { ReactNode } from "react";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Loader2, 
  Info,
  RotateCcw
} from "lucide-react";
import { cn } from "@/lib/utils";

export type OperationStatus = 
  | "idle" 
  | "pending" 
  | "success" 
  | "warning" 
  | "error" 
  | "reversed";

interface OperationFeedbackProps {
  status: OperationStatus;
  message?: string;
  details?: string;
  className?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const statusConfig: Record<OperationStatus, {
  icon: typeof CheckCircle;
  bgClass: string;
  textClass: string;
  borderClass: string;
  label: string;
}> = {
  idle: {
    icon: Info,
    bgClass: "bg-muted/50",
    textClass: "text-muted-foreground",
    borderClass: "border-muted",
    label: "",
  },
  pending: {
    icon: Loader2,
    bgClass: "bg-warning/10",
    textClass: "text-warning",
    borderClass: "border-warning/30",
    label: "جاري المعالجة...",
  },
  success: {
    icon: CheckCircle,
    bgClass: "bg-success/10",
    textClass: "text-success",
    borderClass: "border-success/30",
    label: "تمت العملية بنجاح",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-500",
    borderClass: "border-amber-500/30",
    label: "تحذير",
  },
  error: {
    icon: XCircle,
    bgClass: "bg-destructive/10",
    textClass: "text-destructive",
    borderClass: "border-destructive/30",
    label: "حدث خطأ",
  },
  reversed: {
    icon: RotateCcw,
    bgClass: "bg-muted/50",
    textClass: "text-muted-foreground",
    borderClass: "border-muted",
    label: "تم التراجع",
  },
};

export function OperationFeedback({ 
  status, 
  message, 
  details, 
  className,
  onRetry,
  onDismiss,
}: OperationFeedbackProps) {
  if (status === "idle") return null;
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  return (
    <div 
      className={cn(
        "rounded-xl border p-4 animate-fade-in",
        config.bgClass,
        config.borderClass,
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Icon 
          className={cn(
            "h-5 w-5 mt-0.5 shrink-0",
            config.textClass,
            status === "pending" && "animate-spin"
          )} 
        />
        <div className="flex-1 space-y-1">
          <p className={cn("font-medium", config.textClass)}>
            {message || config.label}
          </p>
          {details && (
            <p className="text-sm text-muted-foreground">{details}</p>
          )}
        </div>
        {status === "error" && onRetry && (
          <button 
            onClick={onRetry}
            className="text-sm text-primary hover:underline"
          >
            إعادة المحاولة
          </button>
        )}
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <XCircle className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Inline status indicator
interface StatusIndicatorProps {
  status: OperationStatus;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function StatusIndicator({ 
  status, 
  size = "md", 
  showLabel = false,
  className 
}: StatusIndicatorProps) {
  if (status === "idle") return null;
  
  const config = statusConfig[status];
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };
  
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Icon 
        className={cn(
          sizeClasses[size],
          config.textClass,
          status === "pending" && "animate-spin"
        )} 
      />
      {showLabel && (
        <span className={cn("text-sm", config.textClass)}>
          {config.label}
        </span>
      )}
    </span>
  );
}

// Loading overlay for buttons/cards
interface LoadingOverlayProps {
  isLoading: boolean;
  children: ReactNode;
  message?: string;
}

export function LoadingOverlay({ isLoading, children, message }: LoadingOverlayProps) {
  return (
    <div className="relative">
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            {message && (
              <p className="text-sm text-muted-foreground">{message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Network status indicator
interface NetworkStatusProps {
  isOnline: boolean;
}

export function NetworkStatus({ isOnline }: NetworkStatusProps) {
  if (isOnline) return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 bg-destructive text-destructive-foreground text-center py-2 text-sm z-50">
      لا يوجد اتصال بالإنترنت - قد لا يتم حفظ التغييرات
    </div>
  );
}

// Limit warning component
interface LimitWarningProps {
  used: number;
  limit: number;
  unit?: string;
  showRemaining?: boolean;
  className?: string;
}

export function LimitWarning({ 
  used, 
  limit, 
  unit = "جنيه", 
  showRemaining = true,
  className 
}: LimitWarningProps) {
  if (limit <= 0) return null;
  
  const remaining = Math.max(0, limit - used);
  const percentage = Math.min(100, (used / limit) * 100);
  const isExceeded = used >= limit;
  const isNearLimit = percentage >= 80;
  
  return (
    <div className={cn("space-y-2", className)}>
      {/* Progress bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn(
            "h-full transition-all duration-300 rounded-full",
            isExceeded ? "bg-destructive" : isNearLimit ? "bg-amber-500" : "bg-primary"
          )}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-xs">
        <span className={cn(
          "font-medium",
          isExceeded ? "text-destructive" : isNearLimit ? "text-amber-500" : "text-muted-foreground"
        )}>
          {used.toLocaleString()} / {limit.toLocaleString()} {unit}
        </span>
        {showRemaining && (
          <span className={cn(
            isExceeded ? "text-destructive" : "text-muted-foreground"
          )}>
            {isExceeded 
              ? `تجاوز بـ ${(used - limit).toLocaleString()} ${unit}`
              : `متبقي: ${remaining.toLocaleString()} ${unit}`
            }
          </span>
        )}
      </div>
      
      {/* Warning message */}
      {isExceeded && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-2 text-center">
          <p className="text-sm text-destructive font-medium">
            تم تجاوز الحد الشهري - لا يمكن إجراء تحويلات جديدة
          </p>
        </div>
      )}
      {!isExceeded && isNearLimit && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 text-center">
          <p className="text-sm text-amber-500">
            اقتربت من الحد الشهري
          </p>
        </div>
      )}
    </div>
  );
}
