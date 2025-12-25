import { Home, ArrowLeftRight, Package, HandCoins, BookOpen, BarChart3 } from "lucide-react";

export const navItems = [
  { path: "/", label: "الرئيسية", icon: Home },
  { path: "/transfers", label: "التحويلات", icon: ArrowLeftRight },
  { path: "/inventory", label: "البضاعة", icon: Package },
  { path: "/debts", label: "السلف", icon: HandCoins },
  { path: "/records", label: "السجل", icon: BookOpen },
  { path: "/reports", label: "التقارير", icon: BarChart3 },
] as const;
