import React from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import { Play, Square, Loader2, Sparkles, Layers, Home, Sun, Moon, Film, LogOut, Leaf, Zap, Tv } from "lucide-react";
import { useScenes } from "./useScenes";

const ICON_MAP: Record<string, any> = { Home, Sun, Moon, Film, LogOut, Leaf, Layers, Zap, Tv };

export function ScenesCard({
  nodeId = "living",
  currentUser,
}: {
  nodeId?: string;
  currentUser?: any;
}) {
  const { scenes, activeSceneId, operatingId, handleToggleScene } = useScenes({ targetNodeId: nodeId, currentUser });
  const displayScenes = scenes.slice(0, 4);

  return (
    <GlassCard className="p-4 sm:p-5 rounded-3xl border border-white/80 dark:border-white/10 shadow-xs flex flex-col justify-between h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 text-white shadow-xs">
            <Sparkles className="h-3.5 w-3.5" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">Kịch Bản Nhanh</h3>
        </div>
        <span className="text-[10px] font-semibold text-slate-400">1 chạm</span>
      </div>

      <div className="space-y-2">
        {displayScenes.map((s) => {
          const Icon = ICON_MAP[s.iconName || "Home"] || Layers;
          const isActive = activeSceneId === s.id;
          const isLoading = operatingId === s.id;

          return (
            <div
              key={s.id}
              onClick={() => handleToggleScene(s)}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer text-xs select-none",
                isActive
                  ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200"
                  : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              )}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")} />
                <span className="font-semibold truncate">{s.name}</span>
              </div>

              <div className="shrink-0 ml-2">
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />
                ) : isActive ? (
                  <Square className="h-3.5 w-3.5 fill-indigo-600 text-indigo-600 dark:fill-indigo-400 dark:text-indigo-400" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-slate-400" />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
