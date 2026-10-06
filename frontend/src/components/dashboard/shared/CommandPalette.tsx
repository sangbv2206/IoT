import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Moon, Download, Cpu } from "lucide-react";
import { toast } from "sonner";
import { BUYER_TABS } from "./constants";
import { TabKey } from "./types";
import { useNode } from "@/hooks/use-node-context";

export function CommandPalette({
  open,
  onClose,
  setTab,
  setNodeId: _setNodeIdProp,
  toggleDark,
  currentUserRole = "buyer",
}: {
  open: boolean;
  onClose: () => void;
  setTab: (t: TabKey) => void;
  setNodeId?: (id: string) => void;
  toggleDark?: () => void;
  currentUserRole?: string;
}) {
  const [q, setQ] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const { nodesList, setCurrentNodeId } = useNode();

  useEffect(() => {
    if (open) {
      setQ("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const items = useMemo(() => {
    return [
      ...BUYER_TABS.map((t) => ({
        label: `Chuyển tab: ${t.label}`,
        group: "Điều hướng",
        icon: t.icon,
        run: () => setTab(t.key)
      })),
      ...nodesList.map((n) => ({
        label: `Chuyển Node: ${n.name} (${n.chip})`,
        group: "Node/Phòng",
        icon: n.icon || Cpu,
        run: () => setCurrentNodeId(n.id)
      })),
      {
        label: "Xuất báo cáo cảm biến CSV",
        group: "Hành động",
        icon: Download,
        run: () => {
          setTab("sensors");
          toast.info("Đã chuyển tới tab Dữ liệu cảm biến.");
        }
      },
      {
        label: "Kiểm tra kết nối MQTT Broker",
        group: "Hệ thống",
        icon: Cpu,
        run: () => {
          setTab("settings");
          toast.info("Đã chuyển tới Cài đặt để kiểm tra kết nối MQTT.");
        }
      },
    ];
  }, [setTab, setCurrentNodeId, toggleDark, nodesList]);

  const filtered = useMemo(() => {
    return items.filter((i) => i.label.toLowerCase().includes(q.toLowerCase()));
  }, [items, q]);

  // Reset selectedIndex khi query thay đổi
  useEffect(() => {
    setSelectedIndex(0);
  }, [q]);

  // Tự động cuộn theo item đang chọn
  useEffect(() => {
    if (itemRefs.current[selectedIndex]) {
      itemRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Xử lý phím mũi tên, Enter và Escape
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (filtered.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run();
        onClose();
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/50 p-4 pt-24 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/70 bg-white/95 shadow-2xl animate-scale-in dark:bg-slate-900 dark:border-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={currentUserRole === "admin" ? "Tìm tab, tác vụ hệ thống..." : "Tìm thiết bị, cảm biến, log…"}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 text-slate-800 dark:text-white"
          />
          <kbd className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 cursor-pointer" onClick={onClose}>
            Esc
          </kbd>
        </div>
        <ul className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 && (
            <li className="px-3 py-8 text-center text-sm text-slate-400">Không có kết quả cho "{q}"</li>
          )}
          {filtered.map((it, i) => {
            const Icon = it.icon;
            const isSelected = i === selectedIndex;
            return (
              <li key={i}>
                <button
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  onClick={() => {
                    it.run();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(i)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition cursor-pointer ${
                    isSelected
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 font-medium"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500"}`} />
                  <span className="flex-1 truncate">{it.label}</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 shrink-0">{it.group}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
