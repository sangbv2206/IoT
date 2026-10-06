import { useState, useMemo } from "react";
import { CalendarClock, Plus, Pencil, Trash2, Clock, Power } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAllDevices } from "@/hooks/use-all-devices";
import { useNode } from "@/hooks/use-node-context";
import { useSchedules, ScheduleRule, ScheduleDraft, DAY_LABELS } from "./useSchedules";

export function ScheduleTab({ currentUserRole = "buyer" }: { currentUserRole?: string; currentUserId?: number }) {
  const { devices } = useAllDevices();
  const { nodesList } = useNode();
  const { rules, loading, saveSchedule, removeSchedule, toggleSchedule } = useSchedules();

  const controllableDevices = useMemo(
    () => devices.filter((d) => !d.loai_thietbi.startsWith("cam_bien")),
    [devices]
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [draft, setDraft] = useState<ScheduleDraft>({
    id: null,
    device_id: null,
    action: "on",
    time: "20:00",
    days: [1, 2, 3, 4, 5],
    enabled: true,
  });

  const isEditing = Boolean(draft.id);
  const canEdit = currentUserRole !== "viewer";

  const handleOpenCreate = () => {
    setDraft({
      id: null,
      device_id: controllableDevices[0]?.id_thietbi || null,
      action: "on",
      time: "20:00",
      days: [1, 2, 3, 4, 5],
      enabled: true,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (rule: ScheduleRule) => {
    setDraft({
      id: rule.id,
      device_id: rule.id_thietbi,
      action: rule.action,
      time: rule.time,
      days: rule.days,
      enabled: rule.enabled,
    });
    setModalOpen(true);
  };

  const toggleDay = (idx: number) => {
    setDraft((p) => ({
      ...p,
      days: p.days.includes(idx) ? p.days.filter((d) => d !== idx) : [...p.days, idx].sort(),
    }));
  };

  const handleSave = async () => {
    const ok = await saveSchedule(draft);
    if (ok) setModalOpen(false);
  };

  return (
    <div className="space-y-5 max-w-[1200px] mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Lịch Hẹn Giờ</h2>
              <Badge variant="outline" className="text-xs">{rules.length}</Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tự động bật/tắt thiết bị theo khung giờ cài đặt</p>
          </div>
        </div>

        {canEdit && (
          <Button onClick={handleOpenCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-xs cursor-pointer">
            <Plus className="h-4 w-4" /> Thêm Lịch Hẹn
          </Button>
        )}
      </div>

      {/* Danh sách lịch hẹn */}
      <GlassCard className="p-4 sm:p-5">
        {loading ? (
          <div className="text-center py-12 text-sm text-slate-400 animate-pulse">Đang tải lịch hẹn...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-12 text-sm text-slate-400">Chưa có lịch hẹn nào được thiết lập.</div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rules.map((rule) => {
              const isOn = rule.action === "on";
              const nodeName = nodesList.find((n) => n.id === rule.node)?.name || rule.node;

              return (
                <li key={rule.id} className="py-3 flex flex-wrap items-center justify-between gap-3 px-2 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("grid h-9 w-9 place-items-center rounded-xl text-white shrink-0 shadow-xs", isOn ? "bg-emerald-500" : "bg-slate-400")}>
                      <Power className="h-4 w-4" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md">{nodeName}</span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">{rule.deviceName}</span>
                        <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", isOn ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-slate-100 text-slate-600 dark:bg-slate-800")}>
                          {isOn ? "BẬT" : "TẮT"}
                        </span>
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 font-mono font-medium text-slate-700 dark:text-slate-300">
                          <Clock className="h-3 w-3 text-slate-400" /> {rule.time}
                        </span>
                        <span>•</span>
                        <span>{rule.days.length === 7 ? "Hằng ngày" : rule.days.map((d) => DAY_LABELS[d]).join(", ")}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 ml-auto">
                    <Switch checked={rule.enabled} onCheckedChange={(val) => toggleSchedule(rule.id, val)} disabled={!canEdit} />
                    {canEdit && (
                      <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-800 pl-2">
                        <button onClick={() => handleOpenEdit(rule)} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg cursor-pointer" title="Sửa">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => removeSchedule(rule.id)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer" title="Xóa">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </GlassCard>

      {/* Modal Thêm & Sửa Lịch Hẹn */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-6 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
              {isEditing ? `Sửa Lịch Hẹn #${draft.id}` : "Thêm Lịch Hẹn Giờ"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Cài đặt lịch bật tắt thiết bị tự động
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 text-xs my-2">
            <div>
              <Label className="text-xs font-semibold text-slate-500">Thiết bị</Label>
              <Select value={draft.device_id ? String(draft.device_id) : ""} onValueChange={(val) => setDraft((s) => ({ ...s, device_id: Number(val) }))}>
                <SelectTrigger className="mt-1 h-9 rounded-xl"><SelectValue placeholder="Chọn thiết bị" /></SelectTrigger>
                <SelectContent>
                  {controllableDevices.map((d) => (
                    <SelectItem key={d.id_thietbi} value={String(d.id_thietbi)}>
                      {d.ten_hienthi || d.loai_thietbi} ({d.idnode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-500">Hành động</Label>
                <Select value={draft.action} onValueChange={(val) => setDraft((s) => ({ ...s, action: val as "on" | "off" }))}>
                  <SelectTrigger className="mt-1 h-9 rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on"><span className="font-semibold text-emerald-600">Bật / Mở</span></SelectItem>
                    <SelectItem value="off"><span className="font-semibold text-slate-500">Tắt / Đóng</span></SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-500">Giờ kích hoạt</Label>
                <Input type="time" value={draft.time} onChange={(e) => setDraft((s) => ({ ...s, time: e.target.value }))} className="mt-1 h-9 rounded-xl font-mono" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-500 mb-1.5 block">Lặp lại ({draft.days.length === 7 ? "Hằng ngày" : `${draft.days.length} ngày`})</Label>
              <div className="flex gap-1">
                {DAY_LABELS.map((label, idx) => {
                  const active = draft.days.includes(idx);
                  return (
                    <button key={label} type="button" onClick={() => toggleDay(idx)} className={cn("flex-1 h-8 rounded-lg text-xs font-bold border transition cursor-pointer", active ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}>
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-3 gap-2">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)} className="rounded-xl text-xs">Hủy</Button>
            <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold">{isEditing ? "Cập Nhật" : "Lưu Lịch Hẹn"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ScheduleTab;
