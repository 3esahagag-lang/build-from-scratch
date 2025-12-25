import { Link, useLocation } from "react-router-dom";
import { Home, ArrowLeftRight, Package, HandCoins, BookOpen } from "lucide-react";

const navItems = [
  { path: "/", label: "الرئيسية", icon: Home },
  { path: "/transfers", label: "التحويلات", icon: ArrowLeftRight },
  { path: "/inventory", label: "البضاعة", icon: Package },
  { path: "/debts", label: "السلف", icon: HandCoins },
  { path: "/records", label: "السجل", icon: BookOpen },
];

export default function BottomNavigation() {
  const location = useLocation();

  // Don't show on auth page
  if (location.pathname === "/auth") {
    return null;
  }

  return (
    <nav
      aria-label="التنقل السفلي"
      className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg"
      style={{
        zIndex: 99999,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <div className="flex justify-around items-center py-2 px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-200 min-w-[60px] ${
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? "scale-110" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
