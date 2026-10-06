import React from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Cpu,
  Layers,
  Settings,
} from "lucide-react";
import { TabKey } from "@/components/dashboard/shared/types";

interface BottomNavProps {
  activeTab: string;
  onTabChange: (tab: TabKey) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  const navItems = [
    { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { id: "sensors", label: "Cảm biến", icon: Cpu },
    { id: "scenes", label: "Kịch bản", icon: Layers },
    { id: "settings", label: "Cài đặt", icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 flex justify-around items-center z-50 md:hidden px-3 shadow-2xl">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id as TabKey)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-12 rounded-xl transition-all",
              isActive
                ? "text-cyan-400 font-semibold bg-cyan-500/10"
                : "text-slate-400 hover:text-slate-200"
            )}
          >
            <Icon className="h-5 w-5 mb-0.5" />
            <span className="text-[11px] truncate max-w-full">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
