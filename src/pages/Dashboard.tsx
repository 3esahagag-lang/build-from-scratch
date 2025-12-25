import { useState } from "react";
import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeftRight, 
  Package, 
  HandCoins,
  ShoppingCart,
  Wallet
} from "lucide-react";
import SellProductsDrawer from "@/components/SellProductsDrawer";
import PayDebtsDrawer from "@/components/PayDebtsDrawer";

export default function Dashboard() {
  const [sellDrawerOpen, setSellDrawerOpen] = useState(false);
  const [payDebtsDrawerOpen, setPayDebtsDrawerOpen] = useState(false);

  return (
    <Layout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Welcome */}
        <div className="animate-slide-up">
          <h1 className="text-2xl font-bold text-foreground">مرحباً بك</h1>
          <p className="text-muted-foreground">ماذا تريد أن تفعل اليوم؟</p>
        </div>

        {/* Quick Actions - Primary */}
        <div className="space-y-3">
          <h2 className="section-title">إجراءات سريعة</h2>
          
          <div className="grid gap-4 animate-slide-up" style={{ animationDelay: "50ms" }}>
            {/* Sell Products Action */}
            <Button
              onClick={() => setSellDrawerOpen(true)}
              className="w-full h-24 text-xl font-bold bg-gradient-to-l from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
            >
              <ShoppingCart className="h-8 w-8 ml-4" />
              بيع بضاعتك
            </Button>
            
            {/* Pay Debts Action */}
            <Button
              onClick={() => setPayDebtsDrawerOpen(true)}
              className="w-full h-24 text-xl font-bold bg-gradient-to-l from-warning to-warning/80 hover:from-warning/90 hover:to-warning/70 text-warning-foreground shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl"
            >
              <Wallet className="h-8 w-8 ml-4" />
              سدّد سلفتك
            </Button>
          </div>
        </div>

        {/* Secondary Quick Actions */}
        <div className="space-y-3">
          <h2 className="section-title">إدخال سريع</h2>
          
          <div className="grid gap-3 animate-slide-up" style={{ animationDelay: "100ms" }}>
            <Link to="/transfers">
              <Button
                variant="outline"
                className="w-full h-16 text-base border-2 hover:bg-primary/10 hover:border-primary transition-all duration-200 rounded-xl"
              >
                <ArrowLeftRight className="h-5 w-5 ml-3 text-primary" />
                تسجيل تحويل
              </Button>
            </Link>
            
            <Link to="/inventory">
              <Button
                variant="outline"
                className="w-full h-16 text-base border-2 hover:bg-accent/10 hover:border-accent transition-all duration-200 rounded-xl"
              >
                <Package className="h-5 w-5 ml-3 text-accent" />
                تسجيل بضاعة
              </Button>
            </Link>
            
            <Link to="/debts">
              <Button
                variant="outline"
                className="w-full h-16 text-base border-2 hover:bg-warning/10 hover:border-warning transition-all duration-200 rounded-xl"
              >
                <HandCoins className="h-5 w-5 ml-3 text-warning" />
                تسجيل سلفة
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Modals */}
      <SellProductsDrawer open={sellDrawerOpen} onOpenChange={setSellDrawerOpen} />
      <PayDebtsDrawer open={payDebtsDrawerOpen} onOpenChange={setPayDebtsDrawerOpen} />
    </Layout>
  );
}
