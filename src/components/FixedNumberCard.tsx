import { useState } from "react";
import { Phone, Gauge, Settings, Edit2, Gauge as LimitIcon, Ban, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  isSelected?: boolean;
  isExpanded?: boolean;
  isSubmitting?: boolean;
  onSelect?: () => void;
  onUpdate?: (id: string, data: { phone_number?: string; name?: string; monthly_limit?: number }) => void;
  onDisable?: (id: string) => void;
  onSubmitTransfer?: (id: string, data: { amount: number; profit?: number; notes?: string }) => void;
  onToggleExpand?: (id: string | null) => void;
}

export default function FixedNumberCard({
  id,
  phoneNumber,
  name,
  used,
  limit,
  isDisabled = false,
  isSelected,
  isExpanded = false,
  isSubmitting = false,
  onSelect,
  onUpdate,
  onDisable,
  onSubmitTransfer,
  onToggleExpand,
}: FixedNumberCardProps) {
  const [manageOpen, setManageOpen] = useState(false);
  const [editMode, setEditMode] = useState<"number" | "limit" | null>(null);
  const [editPhoneNumber, setEditPhoneNumber] = useState(phoneNumber);
  const [editName, setEditName] = useState(name);
  const [editLimit, setEditLimit] = useState(limit.toString());
  const [disableDialogOpen, setDisableDialogOpen] = useState(false);
  
  // Inline form state
  const [amount, setAmount] = useState("");
  const [profit, setProfit] = useState("");
  const [notes, setNotes] = useState("");

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
  const cleanedPhone = editPhoneNumber.replace(/\D/g, "");

  if (cleanedPhone.length !== 11) {
    toast({
      title: "رقم غير صحيح",
      description: "رقم الهاتف يجب أن يكون 11 رقم",
      variant: "destructive",
    });
    return;
  }

  if (!onUpdate) return;

  onUpdate(id, {
    phone_number: cleanedPhone,
    name: editName?.trim() || name,
  });

  setEditMode(null);
  setManageOpen(false);
};

   
  };

  const handleSaveLimit = () => {
    if (onUpdate) {
      onUpdate(id, { monthly_limit: parseFloat(editLimit) || 0 });
      setEditMode(null);
      setManageOpen(false);
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
    // Prevent expansion when clicking settings
    if ((e.target as HTMLElement).closest('[data-settings-trigger]')) {
      return;
    }
    
    if (isDisabled) return;
    
    // Toggle expansion
    if (onToggleExpand) {
      onToggleExpand(isExpanded ? null : id);
    }
    onSelect?.();
  };

  const handleSubmitTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!amount || parseFloat(amount) <= 0) return;
    
    // Check limit
    const newAmount = parseFloat(amount);
    if (limit > 0 && (used + newAmount) > limit) {
      return; // Will be handled by parent
    }
    
    onSubmitTransfer?.(id, {
      amount: newAmount,
      profit: parseFloat(profit) || undefined,
      notes: notes || undefined,
    });
    
    // Reset form on success (parent will close expansion)
    setAmount("");
    setProfit("");
    setNotes("");
  };

  const wouldExceedLimit = limit > 0 && (used + (parseFloat(amount) || 0)) > limit;

  return (
    <>
      <div
        onClick={handleCardClick}
        className={`relative rounded-xl border-2 transition-all duration-300 group overflow-hidden ${
          isDisabled 
            ? "border-border/50 bg-muted/30 opacity-60 cursor-not-allowed"
            : isExpanded
              ? "border-income bg-income/5 shadow-lg"
              : isSelected
                ? "border-primary bg-primary/5 cursor-pointer"
                : "border-border hover:border-primary/50 hover:bg-accent/40 hover:shadow-lg active:scale-[0.98] active:bg-accent/60 bg-card cursor-pointer"
        }`}
      >
        {/* Main Card Content */}
        <div className="p-4 pb-3">
          {/* Top Actions Bar */}
          <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
            {/* Disabled Badge */}
            {isDisabled && (
              <div className="px-2.5 py-1 rounded-full bg-destructive/20 text-destructive text-xs font-medium">
                معطّل
              </div>
            )}
            
            {/* Manage Button - positioned at left (RTL) */}
            <Drawer open={manageOpen} onOpenChange={setManageOpen}>
              <DrawerTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  data-settings-trigger
                  className="h-9 w-9 p-0 ml-auto hover:bg-muted bg-muted/60 rounded-lg transition-all pointer-events-auto"
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Settings className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
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
          </div>

          {/* Card Content - with top padding for the actions bar */}
          <div className="flex items-start justify-between gap-3 mt-6">
            <div className="flex-1 min-w-0">
              {/* Phone number display */}
              <div className="flex items-center gap-2 mb-1">
                <Phone className={`h-4 w-4 shrink-0 ${isDisabled ? "text-muted-foreground" : isExpanded ? "text-income" : "text-primary"}`} />
                <span className="font-mono text-lg font-bold text-foreground" dir="ltr">
                  {phoneNumber}
                </span>
              </div>
              
              {/* Name */}
              {name && (
                <p className="text-sm text-muted-foreground truncate mb-2">{name}</p>
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
          
          {/* Clickable Hint Footer - only show when not expanded */}
          {!isDisabled && !isExpanded && (
            <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-center gap-2 text-xs text-muted-foreground/70 group-hover:text-primary/80 transition-colors">
              <span>اضغط لتسجيل تحويل</span>
            </div>
          )}
        </div>

        {/* Inline Expansion Form */}
        {isExpanded && !isDisabled && (
          <div 
            className="border-t-2 border-income/30 bg-income/5 p-4 space-y-4 animate-in slide-in-from-top-2 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-income flex items-center gap-2">
                تسجيل تحويل على هذا الرقم
              </h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 hover:bg-income/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand?.(null);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <form onSubmit={handleSubmitTransfer} className="space-y-3">
              {/* Amount */}
              <div className="space-y-1">
                <Label className="text-sm">المبلغ *</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-xl h-12 text-center"
                  dir="ltr"
                  autoFocus
                />
              </div>

              {/* Profit */}
              <div className="space-y-1">
                <Label className="text-sm flex items-center gap-2">
                  الربح
                  <span className="text-xs text-muted-foreground">(اختياري)</span>
                </Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={profit}
                  onChange={(e) => setProfit(e.target.value)}
                  className="text-lg h-10 text-center"
                  dir="ltr"
                />
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label className="text-sm flex items-center gap-2">
                  ملاحظات
                  <span className="text-xs text-muted-foreground">(اختياري)</span>
                </Label>
                <Textarea
                  placeholder="وصف التحويل..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
              </div>

              {/* Limit warning */}
              {wouldExceedLimit && parseFloat(amount) > 0 && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  <p className="font-medium">تجاوز الحد الشهري!</p>
                  <p className="text-xs mt-1">
                    المتبقي: {remaining.toLocaleString()} ج.م فقط
                  </p>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                disabled={
                  !amount || 
                  parseFloat(amount) <= 0 || 
                  wouldExceedLimit || 
                  isSubmitting
                }
                className="w-full h-12 text-base bg-income hover:bg-income/90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin ml-2" />
                    جاري الحفظ...
                  </>
                ) : wouldExceedLimit ? (
                  "تجاوز الحد الشهري"
                ) : (
                  "تسجيل التحويل"
                )}
              </Button>
            </form>
          </div>
        )}
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
