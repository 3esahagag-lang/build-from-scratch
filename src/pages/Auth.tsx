import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Mail, Lock, ArrowLeft, User, Send } from "lucide-react";
import { z } from "zod";

const authSchema = z.object({
  email: z.string().email("البريد الإلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل"),
});

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const confirmEmailDescription =
    "تم إرسال رسالة تأكيد إلى بريدك الإلكتروني. يرجى فتح الإيميل والضغط على رابط التفعيل قبل تسجيل الدخول.";
  const shownPendingToastRef = useRef(false);

  useEffect(() => {
    const redirectedFromGuard = Boolean(
      (location.state as { emailConfirmationRequired?: boolean } | null)?.emailConfirmationRequired
    );
    const hasUnconfirmedSession = Boolean(user && !user.email_confirmed_at);

    if ((redirectedFromGuard || hasUnconfirmedSession) && !shownPendingToastRef.current) {
      shownPendingToastRef.current = true;
      toast({
        title: "تأكيد البريد الإلكتروني مطلوب",
        description: confirmEmailDescription,
      });
    }

    if (!redirectedFromGuard && !hasUnconfirmedSession) {
      shownPendingToastRef.current = false;
    }
  }, [location.state, toast, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = authSchema.safeParse({ email, password });
    if (!validation.success) {
      toast({
        title: "خطأ في البيانات",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "خطأ في تسجيل الدخول",
              description: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
              variant: "destructive",
            });
          } else if (error.message.includes("Email not confirmed")) {
            toast({
              title: "تأكيد البريد الإلكتروني مطلوب",
              description: confirmEmailDescription,
            });
          } else {
            toast({
              title: "خطأ",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          // Supabase may return a session even when the email isn't confirmed.
          // We must hard-block navigation until email_confirmed_at is present.
          const { data } = await supabase.auth.getUser();
          const confirmedAt = data.user?.email_confirmed_at;

          if (!confirmedAt) {
            toast({
              title: "تأكيد البريد الإلكتروني مطلوب",
              description: confirmEmailDescription,
            });
            return;
          }

          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              title: "المستخدم موجود",
              description: "هذا البريد الإلكتروني مسجل بالفعل، يمكنك تسجيل الدخول",
              variant: "destructive",
            });
          } else {
            toast({
              title: "خطأ",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "تم إرسال رسالة التأكيد",
            description: confirmEmailDescription,
          });
          // Switch to login mode so user can log in after confirming
          setIsLogin(true);
          setPassword("");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          العودة
        </Button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4">
              <BookOpen className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">دفتر المحل</h1>
            <p className="text-muted-foreground mt-2">
              {isLogin ? "سجّل دخولك للمتابعة" : "أنشئ حساباً جديداً"}
            </p>
          </div>

          {/* Form */}
          <div className="notebook-paper p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pr-10"
                    dir="ltr"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full action-button"
                disabled={loading}
              >
                {loading ? "جاري التحميل..." : isLogin ? "تسجيل الدخول" : "إنشاء حساب"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {isLogin ? (
                  <>ليس لديك حساب؟ <span className="text-primary font-medium">أنشئ حساباً</span></>
                ) : (
                  <>لديك حساب؟ <span className="text-primary font-medium">سجّل دخولك</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Marketing Section */}
      <section className="px-6 py-8 text-center space-y-3">
        <p className="text-lg md:text-xl font-medium text-foreground leading-relaxed">
          محلي معمول عشان يسهّل شغلك
        </p>
        <p className="text-lg md:text-xl font-medium text-foreground leading-relaxed">
          سجّل حساباتك وتابع فلوسك في ثواني
        </p>
        <p className="text-lg md:text-xl font-medium text-foreground leading-relaxed">
          البضاعة والديون كلها قدام عينك
        </p>
        <p className="text-lg md:text-xl font-medium text-foreground leading-relaxed">
          من غير تعقيد ولا وجع دماغ
        </p>
        <p className="text-lg md:text-xl font-medium text-primary leading-relaxed">
          تطبيق بسيط لصاحب المحل البسيط
        </p>
      </section>

      {/* Footer */}
      <footer className="px-6 pb-8 text-center space-y-4">
        <p className="text-sm text-muted-foreground">
          جميع الحقوق محفوظة © 2026
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>تم تطوير تطبيق محلي بواسطة</span>
          <span className="inline-flex items-center gap-1 font-bold text-foreground">
            <User className="h-4 w-4" />
            عيسى
          </span>
        </div>
        
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">تواصل معي</p>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            asChild
          >
            <a href="mailto:essahagag1@gmail.com">
              <Send className="h-4 w-4" />
              essahagag1@gmail.com
            </a>
          </Button>
        </div>
      </footer>
    </div>
  );
}
