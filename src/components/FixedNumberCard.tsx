import { useState } from "react";
import { Phone, Gauge, Settings, Edit2, Gauge as LimitIcon, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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

interface FixedNumberCardProps {
  id: string;
  phoneNumber: string;
  name: string;
  used: number;
  limit: number;
  isDisabled?: boolean;
  onSelect?: () => void;
  isSelected?: boolean;
  onUpdate?: (id: string, data: { phone_number?: string; name?: string; monthly_limit?: number }) => void;
  onDisable?: (id: string) => void;
}

export default function FixedNumberCard({
  id,
  phoneNumber,
  name,
  used,
  limit,
  isDisabled = false,
  onSelect,
  isSelected,
  onUpdate,
  onDisable,
}: FixedNumberCardProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const [editMode, setEditMode] = useState<"number" | "limit" | null>(null);
  const [editPhoneNumber, setEditPhoneNumber] = useState(phoneNumber);
  const [editName, setEditName] = useState(name);
  const [editLimit, setEditLimit] = useState(limit.toString());
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);

  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const remaining = Math.max(limit - used, 0);
  
  const getProgressColor = () => {
    if (isDisabled) return "bg-muted";
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 80) return "bg-amber-500";
    if (percentage >= 50) return "bg-primary";
    return "bg-income";
  };

  const getGaugeColor = () => {
    if (isDisabled) return "text-muted-foreground";
    if (percentage >= 100) return "text-destructive";
    if (percentage >= 80) return "text-amber-500";
    if (percentage >= 50) return "text-primary";
    return "text-income";
  };

  const validatePhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    setEditPhoneNumber(cleaned);
  };

  const handleSaveNumber = () => {
    if (editPhoneNumber.length === 11 && onUpdate) {
      onUpdate(id, { phone_number: editPhoneNumber, name: editName || editPhoneNumber });
      setEditMode(null);
    }
  };

  const handleSaveLimit = () => {
    if (onUpdate) {
      onUpdate(id, { monthly_limit: parseFloat(editLimit) || 0 });
      setEditMode(null);
    }
  };

  const handleDisable = () => {
    if (onDisable) {
      onDisable(id);
      setDisableDialogOpen(false);
      setManageOpen(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (isDisabled) return;
    onSelect?.();
  };

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`relative p-4 rounded-xl border-2 transition-all ${
          isDisabled 
            ? "border-border/50 bg-muted/30 opacity-60 cursor-not-allowed"
            : isSelected
              ? "border-primary bg-primary/5 cursor-pointer"
              : "border-border hover:border-primary/50 bg-card cursor-pointer"
        }`}
      >
        {/* Manage Button */}
        <Drawer open={manageOpen} onOpenChange={setManageOpen}>
          <DrawerTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 left-2 h-8 w-8 hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation();
              }}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[85dvh]">
            <DrawerHeader className="border-b border-border pb-4">
              <DrawerTitle className="text-xl">إدارة الرقم</DrawerTitle>
              <p className="text-sm text-muted-foreground font-mono" dir="ltr">{phoneNumber}</p>
            </DrawerHeader>
            
            <div className="p-4 space-y-4 overflow-y-auto">
              {editMode === null && (
                <div className="space-y-3">
                  {/* Edit Number */}
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-14"
                    onClick={() => {
                      setEditPhoneNumber(phoneNumber);
                      setEditName(name);
                      setEditMode("number");
                    }}
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Edit2 className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-right">
                      <p className="font-medium">تعديل الرقم</p>
                      <p className="text-xs text-muted-foreground">تغيير رقم الهاتف أو الاسم</p>
                    </div>
                  </Button>

                  {/* Edit Limit */}
                  <Button
                    variant="outline"
                    className="w-full justify-start gap-3 h-14"
                    onClick={() => {
                      setEditLimit(limit.toString());
                      setEditMode("limit");
                    }}
                  >
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <LimitIcon className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="text-right">
                      <p className="font-medium">تعديل الحد الشهري</p>
                      <p className="text-xs text-muted-foreground">
                        الحد الحالي: {limit > 0 ? `${limit.toLocaleString()} ج.م` : "غير محدد"}
                      </p>
                    </div>
                  </Button>

                  {/* Disable */}
                  {!isDisabled && (
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-14 border-destructive/30 hover:bg-destructive/10"
                      onClick={() => setDisableDialogOpen(true)}
                    >
                      <div className="p-2 rounded-lg bg-destructive/10">
                        <Ban className="h-5 w-5 text-destructive" />
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-destructive">تعطيل الرقم</p>
                        <p className="text-xs text-muted-foreground">إيقاف التحويلات على هذا الرقم</p>
                      </div>
                    </Button>
                  )}
                </div>
              )}

              {/* Edit Number Form */}
              {editMode === "number" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>رقم الهاتف (11 رقم)</Label>
                    <Input
                      type="tel"
                      placeholder="01xxxxxxxxx"
                      value={editPhoneNumber}
                      onChange={(e) => validatePhoneNumber(e.target.value)}
                      className="text-center font-mono text-lg"
                      dir="ltr"
                      maxLength={11}
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      {editPhoneNumber.length}/11 رقم
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>اسم مميز (اختياري)</Label>
                    <Input
                      placeholder="مثال: محمد أحمد"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditMode(null)}
                    >
                      إلغاء
                    </Button>
                    <Button
                      className="flex-1"
                      disabled={editPhoneNumber.length !== 11}
                      onClick={handleSaveNumber}
                    >
                      حفظ
                    </Button>
                  </div>
                </div>
              )}

              {/* Edit Limit Form */}
              {editMode === "limit" && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>الحد الشهري للتحويلات</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={editLimit}
                      onChange={(e) => setEditLimit(e.target.value)}
                      className="text-center text-lg"
                      dir="ltr"
                    />
                    <p className="text-xs text-muted-foreground text-center">
                      اتركه 0 لإلغاء الحد
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditMode(null)}
                    >
                      إلغاء
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSaveLimit}
                    >
                      حفظ
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DrawerContent>
        </Drawer>

        {/* Disabled Badge */}
        {isDisabled && (
          <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
            معطّل
          </div>
        )}

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Phone number display */}
            <div className="flex items-center gap-2 mb-1">
              <Phone className={`h-4 w-4 shrink-0 ${isDisabled ? "text-muted-foreground" : "text-primary"}`} />
              <span className="font-mono text-lg font-bold text-foreground" dir="ltr">
                {phoneNumber}
              </span>
            </div>
            
            {/* Name */}
            {name && (
              <p className="text-sm text-muted-foreground truncate">{name}</p>
            )}
            
            {/* Usage stats */}
            {limit > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">المستخدم</span>
                  <span className="font-medium">
                    {used.toLocaleString("ar-EG")} / {limit.toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className={`h-full transition-all duration-500 ${getProgressColor()}`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                
                {/* Remaining */}
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">المتبقي</span>
                  <span className={percentage >= 100 ? "text-destructive font-bold" : "text-income font-medium"}>
                    {remaining.toLocaleString("ar-EG")} ج.م
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Gauge indicator */}
          {limit > 0 && (
            <div className="flex flex-col items-center gap-1">
              <div className={`relative ${getGaugeColor()}`}>
                <Gauge className="h-10 w-10" />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                  {Math.round(percentage)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disable Confirmation Dialog */}
      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تعطيل الرقم؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إيقاف التحويلات على هذا الرقم. الرقم سيبقى ظاهراً في السجلات.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisable}
              className="bg-destructive hover:bg-destructive/90"
            >
              تعطيل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
