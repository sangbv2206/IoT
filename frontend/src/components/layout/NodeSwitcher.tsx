import { useState } from "react";
import { cn } from "@/lib/utils";
import { Cpu, Pencil, MoreVertical, Check, Info, Trash2 } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useNode } from "@/hooks/use-node-context";
import { getRoomTypeConfig } from "@/components/dashboard/shared/constants";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export function NodeSwitcher({
  dark = false,
  collapsed = false,
  className,
}: {
  dark?: boolean;
  collapsed?: boolean;
  className?: string;
}) {
  const { currentNode, currentNodeId, setCurrentNodeId, nodesList, nodesLoading, refreshNodes } = useNode();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingName, setEditingName] = useState("");
  const [saving, setSaving] = useState(false);

  // Quản lý Địa chỉ MAC bo mạch ESP32
  const [macAddress, setMacAddress] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("sh-hardware-mac") || "24:6F:28:B4:7A:1C";
    }
    return "24:6F:28:B4:7A:1C";
  });
  const [isEditingMac, setIsEditingMac] = useState(false);
  const [tempMacInput, setTempMacInput] = useState(macAddress);

  const handleSaveMac = () => {
    const clean = tempMacInput.trim().toUpperCase();
    if (!clean) {
      toast.error("Vui lòng nhập địa chỉ MAC!");
      return;
    }
    setMacAddress(clean);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sh-hardware-mac", clean);
      window.dispatchEvent(new Event("sh-mac-changed"));
    }
    setIsEditingMac(false);
    toast.success("Đã cập nhật Địa chỉ MAC phần cứng", {
      description: `Kết nối với bo mạch ESP32: ${clean}`,
    });
  };

  const handleEditName = async () => {
    if (!editingName.trim() || !currentNode) return;
    setSaving(true);

    try {
      const { data: updateData, error } = await supabase
        .from('iot_nodes')
        .update({ ten_phong: editingName.trim() })
        .eq('idnode', currentNode.id)
        .select();

      if (error) throw error;

      if (!updateData || updateData.length === 0) {
        toast.error(`Không tìm thấy node "${currentNode.id}" để cập nhật`);
        return;
      }

      const { data: verifyData, error: verifyError } = await supabase
        .from('iot_nodes')
        .select('ten_phong')
        .eq('idnode', currentNode.id)
        .single();

      if (verifyError || !verifyData) {
        toast.error('Tên có thể không được lưu');
      } else if (verifyData.ten_phong !== editingName.trim()) {
        toast.error('Tên không được cập nhật đúng');
      } else {
        toast.success('Đã cập nhật tên phòng!');
      }

      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (authSession?.user) {
        const { data: profile } = await supabase
          .from('nguoidung')
          .select('idnguoidung, hoten')
          .eq('auth_uid', authSession.user.id)
          .single();
        if (profile) {
          await supabase.from('nhatkyhoatdong').insert([{
            idnguoidung: profile.idnguoidung,
            ten_nguoi_thaotac: profile.hoten,
            hanhdong: `Đổi tên phòng node ${currentNode.id} thành "${editingName.trim()}"`,
            loai_thongbao: 'user_action',
            chi_tiet: `Đã đổi tên node ${currentNode.id} từ "${currentNode.name}" thành "${editingName.trim()}"`
          }]);
        }
      }

      setEditDialogOpen(false);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('nguoidung')
          .select('idnguoidung, vaitro')
          .eq('auth_uid', user.id)
          .single();
        if (profile) {
          await refreshNodes(profile.idnguoidung, profile.vaitro);
        }
      }
    } catch (err: any) {
      toast.error('Lỗi cập nhật tên phòng: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = () => {
    if (currentNode) {
      setEditingName(currentNode.name);
      setEditDialogOpen(true);
    }
  };

  const handleDeleteNode = async (nodeIdToDelete: string, nodeNameToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc muốn xóa Node cũ "${nodeNameToDelete}" (${nodeIdToDelete}) không?`)) {
      return;
    }
    try {
      const { error } = await supabase.from('iot_nodes').delete().eq('idnode', nodeIdToDelete);
      if (error) throw error;
      toast.success(`Đã xóa Node "${nodeNameToDelete}"`);
      await refreshNodes();
    } catch (err: any) {
      toast.error('Lỗi khi xóa node: ' + err.message);
    }
  };

  if (nodesLoading && nodesList.length === 0) {
    return (
      <div className={cn(
        "rounded-xl border p-2 animate-pulse",
        dark ? "border-white/10 bg-white/5" : "border-slate-200/80 bg-white/70",
        collapsed && "p-1.5",
        className,
      )}>
        <div className={cn("h-8 rounded-lg", dark ? "bg-white/10" : "bg-slate-200/60")} />
      </div>
    );
  }

  const renderMacDialog = () => (
    <Dialog open={isEditingMac} onOpenChange={setIsEditingMac}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Cpu className="h-5 w-5 text-indigo-500" />
            Cập nhật Địa chỉ MAC Bo mạch ESP32
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Nhập địa chỉ MAC phần cứng của vi điều khiển ESP32 đặt tại Phòng khách (định dạng: XX:XX:XX:XX:XX:XX) để ghép nối dữ liệu MQTT và database.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Địa chỉ MAC phần cứng
            </label>
            <Input
              value={tempMacInput}
              onChange={(e) => setTempMacInput(e.target.value)}
              placeholder="24:6F:28:B4:7A:1C"
              className="font-mono text-sm tracking-wider bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800"
            />
          </div>
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span>Gợi ý: Địa chỉ MAC thường được in trên tem chip ESP32 hoặc hiển thị qua Serial Monitor khi khởi động.</span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingMac(false)}
            className="text-xs border-slate-200 dark:border-slate-800 cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            size="sm"
            onClick={handleSaveMac}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
          >
            Lưu Địa chỉ MAC
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (nodesList.length === 0) {
    if (collapsed) {
      return (
        <>
          <div
            onClick={() => {
              setTempMacInput(macAddress);
              setIsEditingMac(true);
            }}
            className={cn("flex justify-center py-1.5 cursor-pointer group", className)}
            title={`ESP32 Hardware · MAC: ${macAddress} (Nhấn để cấu hình)`}
          >
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-md transition-transform group-hover:scale-105">
              <Cpu className="h-4 w-4" />
            </div>
          </div>
          {renderMacDialog()}
        </>
      );
    }

    return (
      <>
        <div
          className={cn(
            "rounded-xl border p-2 transition-all",
            dark
              ? "border-white/10 bg-white/5 hover:border-indigo-500/40 hover:bg-white/[0.08]"
              : "border-slate-200/80 bg-white/70 hover:border-indigo-300 hover:bg-white",
            className
          )}
        >
          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() => {
                setTempMacInput(macAddress);
                setIsEditingMac(true);
              }}
              className="flex items-center gap-2 min-w-0 flex-1 px-1 py-0.5 text-left cursor-pointer group"
              title="Nhấn để đổi địa chỉ MAC"
            >
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-sm transition-transform group-hover:scale-105">
                <Cpu className="h-3.5 w-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className={cn("truncate text-xs font-bold leading-tight flex items-center gap-1.5", dark ? "text-white" : "text-slate-800")}>
                  <span>ESP32 Phòng khách</span>
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 inline-block" title="Trực tuyến" />
                </div>
                <div className={cn("truncate text-[10px] font-mono leading-tight font-medium tracking-tight mt-0.5", dark ? "text-slate-400" : "text-slate-500")}>
                  MAC: {macAddress}
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setTempMacInput(macAddress);
                setIsEditingMac(true);
              }}
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-md transition-colors cursor-pointer",
                dark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              )}
              title="Chỉnh sửa địa chỉ MAC"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>
        </div>
        {renderMacDialog()}
      </>
    );
  }

  if (collapsed) {
    const roomConfig = getRoomTypeConfig(currentNode.loai_phong || "phong_khac");
    const NodeIcon = roomConfig.icon || Cpu;
    return (
      <>
        <div
          onClick={() => {
            setTempMacInput(macAddress);
            setIsEditingMac(true);
          }}
          className={cn("flex justify-center py-1.5 cursor-pointer group", className)}
          title={`${currentNode.name} · MAC: ${macAddress}`}
        >
          <div className={cn(
            "grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br text-white shadow-md transition-transform group-hover:scale-105",
            roomConfig.gradient,
          )}>
            <NodeIcon className="h-4 w-4" />
          </div>
        </div>
        {renderMacDialog()}
      </>
    );
  }

  const roomConfig = getRoomTypeConfig(currentNode.loai_phong || "phong_khac");
  const RoomIcon = roomConfig.icon || Cpu;

  return (
    <div className={cn(
      "rounded-xl border p-2",
      dark ? "border-white/10 bg-white/5" : "border-slate-200/80 bg-white/70",
      className,
    )}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1 px-1.5 py-1">
          <div className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br text-white shadow-sm",
            roomConfig.gradient,
          )}>
            <RoomIcon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className={cn("truncate text-xs font-bold leading-tight", dark ? "text-white" : "text-slate-800")}>
              {currentNode?.name || "Phòng khách"}
            </div>
            <div className={cn("truncate text-[10px] font-mono leading-tight font-medium mt-0.5", dark ? "text-slate-400" : "text-slate-500")}>
              MAC: {currentNode?.id || "Chưa có MAC"}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-md transition-colors cursor-pointer",
                dark ? "text-slate-400 hover:bg-white/10 hover:text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600",
              )}
              title="Chuyển đổi Node"
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-2 py-1">
              Chuyển đổi Node ({nodesList.length})
            </DropdownMenuLabel>
            {nodesList.map((node) => {
              const isSelected = node.id === currentNode?.id;
              const isOnline = node.trang_thai === "online";
              return (
                <DropdownMenuItem
                  key={node.id}
                  onClick={() => setCurrentNodeId(node.id)}
                  className={cn(
                    "cursor-pointer text-xs flex items-center justify-between py-1.5",
                    isSelected && "font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400"
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        isOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"
                      )}
                      title={isOnline ? "Online" : "Offline"}
                    />
                    <div className="truncate">
                      <div className="leading-tight">{node.name}</div>
                      <div className="text-[10px] font-mono text-slate-400 leading-tight mt-0.5">{node.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />}
                    {!isSelected && nodesList.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNode(node.id, node.name, e)}
                        className="p-1 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors text-slate-400 cursor-pointer"
                        title="Xóa node này"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </DropdownMenuItem>
              );
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={openEditDialog} className="cursor-pointer text-xs">
              <Pencil className="mr-2 h-3.5 w-3.5" /> Đổi tên phòng
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Edit Name Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-indigo-600 flex items-center gap-1.5 font-bold">
              <Pencil className="h-5 w-5 text-indigo-500" />
              Đổi tên phòng
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Cập nhật tên phòng cho thiết bị {currentNode?.id}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Tên phòng mới:</label>
              <Input
                placeholder="Ví dụ: Phòng ngủ, Phòng khách..."
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white h-9"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} className="border-slate-200 dark:border-slate-800 cursor-pointer">
              Hủy
            </Button>
            <Button onClick={handleEditName} disabled={saving || !editingName.trim()} className="bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer">
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MAC Dialog */}
      {renderMacDialog()}
    </div>
  );
}
