import React, { useState, useEffect } from "react";
import { Plus, Layers, Play, Square, Pencil, Trash2, Loader2, Home, Sun, Moon, Film, LogOut, Leaf, Zap, Tv } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { useNode } from "@/hooks/use-node-context";
import { SmartScene, useScenes } from "./useScenes";

const ICON_MAP: Record<string, any> = { Home, Sun, Moon, Film, LogOut, Leaf, Layers, Zap, Tv };

// ─── Modal Thêm mới & Chỉnh sửa Kịch bản ─────────────────────────────
function SceneModal({
  open,
  onOpenChange,
  editingScene,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingScene: SmartScene | null;
  onSave: (scene: SmartScene) => Promise<boolean>;
}) {
  const isCreate = !editingScene;
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [iconName, setIconName] = useState("Home");
  const [devices, setDevices] = useState<SmartScene["devices"]>({
    den: { enabled: true, state: true, brightness: 80 },
    quat: { enabled: true, state: true, speed: 2 },
    rem_cua: { enabled: true, state: true, position: 100 },
    tivi: { enabled: true, state: false },
  });

  useEffect(() => {
    if (editingScene) {
      setName(editingScene.name);
      setDesc(editingScene.desc || "");
      setIconName(editingScene.iconName || "Home");
      setDevices(JSON.parse(JSON.stringify(editingScene.devices || {})));
    } else {
      setName("");
      setDesc("");
      setIconName("Home");
      setDevices({
        den: { enabled: true, state: true, brightness: 80 },
        quat: { enabled: true, state: true, speed: 2 },
        rem_cua: { enabled: true, state: true, position: 100 },
        tivi: { enabled: true, state: false },
      });
    }
  }, [editingScene, open]);

  const handleSubmit = async () => {
    const s: SmartScene = {
      id: editingScene?.id || `scene_${Date.now()}`,
      name: name.trim() || "Kịch bản mới",
      desc: desc.trim(),
      iconName,
      isCustom: true,
      devices,
    };
    await onSave(s);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6 rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
            {isCreate ? "Tạo Kịch Bản Mới" : `Sửa Kịch Bản: ${editingScene?.name}`}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Thiết lập kịch bản tự động cho các thiết bị
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          <div>
            <Label className="text-xs font-semibold text-slate-500">Tên kịch bản</Label>
            <Input placeholder="Ví dụ: Về nhà, Đi ngủ..." value={name} onChange={(e) => setName(e.target.value)} className="mt-1 rounded-xl h-9" />
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-500">Mô tả</Label>
            <Input placeholder="Mô tả ngắn hành động..." value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 rounded-xl h-9" />
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Biểu tượng</Label>
            <div className="flex gap-2 flex-wrap">
              {Object.keys(ICON_MAP).map((k) => {
                const Icon = ICON_MAP[k];
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setIconName(k)}
                    className={cn(
                      "h-8 w-8 rounded-xl grid place-items-center border cursor-pointer transition",
                      iconName === k ? "bg-indigo-600 text-white border-indigo-600 shadow-xs" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Thiết bị trong kịch bản */}
          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Label className="text-xs font-semibold text-slate-500 block">Thiết bị áp dụng</Label>

            {/* Đèn */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Đèn ({devices.den?.state ? `${devices.den.brightness}%` : "Tắt"})</span>
                <Switch checked={Boolean(devices.den?.state)} onCheckedChange={(v) => setDevices((p) => ({ ...p, den: { enabled: true, state: v, brightness: p.den?.brightness ?? 80 } }))} />
              </div>
              {devices.den?.state && (
                <Slider value={[devices.den?.brightness ?? 80]} min={10} max={100} step={10} onValueChange={([b]) => setDevices((p) => ({ ...p, den: { enabled: true, state: true, brightness: b } }))} />
              )}
            </div>

            {/* Quạt */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Quạt ({devices.quat?.state ? `Số ${devices.quat.speed}` : "Tắt"})</span>
                <Switch checked={Boolean(devices.quat?.state)} onCheckedChange={(v) => setDevices((p) => ({ ...p, quat: { enabled: true, state: v, speed: p.quat?.speed ?? 2 } }))} />
              </div>
              {devices.quat?.state && (
                <div className="flex gap-1.5 pt-0.5">
                  {[1, 2, 3].map((s) => (
                    <button key={s} type="button" onClick={() => setDevices((p) => ({ ...p, quat: { enabled: true, state: true, speed: s } }))} className={cn("flex-1 py-0.5 rounded-lg border font-bold text-xs cursor-pointer", devices.quat?.speed === s ? "bg-sky-500 text-white border-sky-500" : "bg-white dark:bg-slate-800")}>
                      Số {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rèm */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Rèm cửa ({devices.rem_cua?.position ?? 100}%)</span>
              </div>
              <Slider value={[devices.rem_cua?.position ?? 100]} min={0} max={100} step={10} onValueChange={([pos]) => setDevices((p) => ({ ...p, rem_cua: { enabled: true, state: pos > 0, position: pos } }))} />
            </div>

            {/* Smart Tivi */}
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tv className="h-4 w-4 text-purple-500" />
                  <span className="font-semibold">Smart Tivi ({devices.tivi?.state ? "Bật" : "Tắt"})</span>
                </div>
                <Switch
                  checked={Boolean(devices.tivi?.state)}
                  onCheckedChange={(v) =>
                    setDevices((p) => ({
                      ...p,
                      tivi: { enabled: true, state: v },
                    }))
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-3 gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs">Hủy</Button>
          <Button size="sm" onClick={handleSubmit} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">{isCreate ? "Tạo Kịch Bản" : "Lưu Thay Đổi"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Component Chính: ScenesTab ─────────────────────────────────────
export function ScenesTab({
  currentUser,
  nodeId = "living",
}: {
  currentUser?: { hoten: string; email: string; idnguoidung?: number; vaitro?: string } | null;
  nodeId?: string;
}) {
  const { currentNode } = useNode();
  const targetNodeId = currentNode?.id || nodeId;
  const { scenes, activeSceneId, operatingId, handleSaveScene, handleDeleteScene, handleToggleScene } = useScenes({ targetNodeId, currentUser });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingScene, setEditingScene] = useState<SmartScene | null>(null);

  const onSave = async (scene: SmartScene) => {
    const ok = await handleSaveScene(scene);
    if (ok) setModalOpen(false);
    return Boolean(ok);
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Kịch Bản Thông Minh</h2>
              <Badge variant="outline" className="text-xs">{scenes.length}</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Kích hoạt nhanh các trạng thái thiết bị phòng trong 1 chạm</p>
          </div>
        </div>

        <Button onClick={() => { setEditingScene(null); setModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-1.5 cursor-pointer shadow-xs">
          <Plus className="h-4 w-4" /> Thêm Kịch Bản
        </Button>
      </div>

      {/* Lưới các kịch bản */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {scenes.map((scene) => {
          const Icon = ICON_MAP[scene.iconName || "Home"] || Layers;
          const isActive = activeSceneId === scene.id;
          const isOperating = operatingId === scene.id;

          return (
            <div
              key={scene.id}
              className={cn(
                "group relative flex flex-col justify-between p-4 rounded-3xl border transition-all select-none bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-xs hover:shadow-md hover:-translate-y-0.5",
                isActive ? "border-indigo-400 ring-2 ring-indigo-400/30 bg-indigo-50/20" : "border-slate-200/80 dark:border-white/10"
              )}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className={cn("grid h-10 w-10 place-items-center rounded-2xl text-white shadow-xs", isActive ? "bg-gradient-to-br from-indigo-500 to-sky-500 shadow-indigo-300" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button type="button" onClick={() => { setEditingScene(scene); setModalOpen(true); }} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer" title="Sửa">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {scene.isCustom && (
                      <button type="button" onClick={(e) => handleDeleteScene(scene.id, e)} className="p-1 rounded-lg text-slate-400 hover:text-rose-600 cursor-pointer" title="Xóa">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-2.5">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">{scene.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{scene.desc}</p>
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className={cn("text-[11px] font-semibold", isActive ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400")}>
                  {isActive ? "Đang chạy" : "Sẵn sàng"}
                </span>
                <button
                  type="button"
                  disabled={isOperating}
                  onClick={() => handleToggleScene(scene)}
                  className={cn(
                    "flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer",
                    isActive ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-300" : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-none"
                  )}
                >
                  {isOperating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isActive ? <><Square className="h-3 w-3 fill-current" /> Tắt</> : <><Play className="h-3 w-3 fill-current" /> Bật</>}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <SceneModal open={modalOpen} onOpenChange={setModalOpen} editingScene={editingScene} onSave={onSave} />
    </div>
  );
}

export default ScenesTab;
