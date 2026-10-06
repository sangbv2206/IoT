import { useState } from "react";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import {
  Menu,
  Home,
  Search,
  Sun,
  Moon,
  Bell,
  User,
  UserCircle,
  Settings as SettingsIcon,
  LogOut,
  Clock,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Alert } from "@/components/dashboard/shared/types";
import { useRelativeTime } from "@/hooks/use-smart-home";
import { useCustomTime } from "@/hooks/use-custom-time.tsx";

function AlertItem({
  alert,
  isRead,
  onMark,
  onNavigate,
}: {
  alert: Alert;
  isRead: boolean;
  onMark: () => void;
  onNavigate?: () => void;
}) {
  const rel = useRelativeTime(alert.ts);
  return (
    <DropdownMenuItem
      className={cn(
        "flex flex-col items-start gap-0.5 cursor-pointer transition-colors duration-200",
        isRead ? "opacity-60" : "bg-indigo-50/40 dark:bg-indigo-950/40 font-semibold"
      )}
      onClick={() => {
        onMark();
        onNavigate?.();
      }}
    >
      <div className="flex w-full items-center justify-between">
        <span className={cn("text-sm font-semibold", isRead ? "text-slate-500 dark:text-slate-400" : alert.level === "error" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400")}>
          {alert.title}
        </span>
        {!isRead && <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0 ml-2" />}
      </div>
      <span className="text-xs text-slate-600 dark:text-slate-400 leading-normal">
        {rel} · {alert.detail}
      </span>
    </DropdownMenuItem>
  );
}

export function Header({
  title,
  nodeName,
  alerts,
  readAlertIds,
  onMarkAsRead,
  onMarkAllAsRead,
  bellPing,
  onOpen,
  dark = false,
  toggleDark,
  openPalette,
  currentUser,
  onMenuClick,
  lastSensorTime,
  currentUserRole = "buyer",
  supabaseOnline: _supabaseOnline = true,
  mqttOnline: _mqttOnline = true,
  onNavigateToNotifications,
}: {
  title: string;
  nodeName: string;
  alerts: Alert[];
  readAlertIds: number[];
  onMarkAsRead: (id: number) => void;
  onMarkAllAsRead: (ids: number[]) => void;
  bellPing: boolean;
  onOpen: () => void;
  dark?: boolean;
  toggleDark?: () => void;
  openPalette: () => void;
  currentUser: { hoten: string; email: string } | null;
  onMenuClick?: () => void;
  lastSensorTime?: Date | null;
  currentUserRole?: string;
  supabaseOnline?: boolean;
  mqttOnline?: boolean;
  onNavigateToNotifications?: () => void;
}) {
  const unreadAlerts = alerts.filter((a) => !readAlertIds.includes(a.id));
  
  // Custom Time Hook
  const { currentTime, isCustom, setCustomTime, addOffset, resetToRealTime } = useCustomTime();
  const [timeDialogOpen, setTimeDialogOpen] = useState(false);
  const [pickerValue, setPickerValue] = useState("");

  const nodeOnline = lastSensorTime ? (currentTime.getTime() - new Date(lastSensorTime).getTime() < 30000) : false;

  // Format date for datetime-local input
  const handleOpenTimeDialog = () => {
    const tzoffset = currentTime.getTimezoneOffset() * 60000;
    const localISOTime = new Date(currentTime.getTime() - tzoffset).toISOString().slice(0, 16);
    setPickerValue(localISOTime);
    setTimeDialogOpen(true);
  };

  const handleApplyPickerTime = () => {
    if (!pickerValue) return;
    const selectedDate = new Date(pickerValue);
    if (!isNaN(selectedDate.getTime())) {
      setCustomTime(selectedDate);
      toast.success("Đã cập nhật thời gian hệ thống!", {
        description: `Thời gian hiện tại: ${selectedDate.toLocaleString("vi-VN")}`,
      });
      setTimeDialogOpen(false);
    }
  };

  const handleApplyPreset = (hours: number, days = 0) => {
    addOffset(hours, days);
    toast.success("Đã thay đổi thời gian!", {
      description: `Đã ${hours >= 0 ? "cộng" : "trừ"} ${Math.abs(hours)} giờ ${days ? `và ${days} ngày` : ""}`,
    });
  };

  const handleResetTime = () => {
    resetToRealTime();
    toast.success("Đã khôi phục thời gian thực của hệ thống!");
    setTimeDialogOpen(false);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex items-center gap-3 border-b px-6 py-4 backdrop-blur-xl lg:px-8 transition-colors duration-200",
        dark ? "border-white/10 bg-slate-950/70 text-slate-100" : "border-slate-200/80 bg-white/85 text-slate-900 shadow-sm",
      )}
    >
      <button
        onClick={onMenuClick}
        aria-label="Mở menu"
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center rounded-xl border shadow-sm transition lg:hidden cursor-pointer",
          dark
            ? "border-white/15 bg-white/10 text-slate-200 hover:bg-white/15"
            : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900",
        )}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h1 className={cn("truncate text-lg font-bold sm:text-xl", dark ? "text-white" : "text-slate-900")}>
              {title}
            </h1>
            {currentUserRole !== "admin" && nodeName && nodeName !== "Không có Node" && (
              <Badge className="hidden md:inline-flex rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold hover:bg-indigo-100">
                <Home className="mr-1 h-3 w-3" /> {nodeName}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Search palette trigger */}
      <button
        onClick={openPalette}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl border px-2.5 py-2 text-xs shadow-sm transition cursor-pointer sm:px-3 font-semibold",
          dark
            ? "border-white/15 bg-white/10 text-slate-200 hover:bg-white/15"
            : "border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200",
        )}
      >
        <Search className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-indigo-500" />
        <span className="hidden md:inline">Tìm nhanh…</span>
        <kbd className={cn("ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold hidden lg:inline-block", dark ? "bg-white/15 text-slate-300" : "bg-slate-200 text-slate-700")}>
          Ctrl K
        </kbd>
      </button>

      {/* Alert Dropdown */}
      <DropdownMenu onOpenChange={(o) => o && onOpen()}>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "relative grid h-10 w-10 place-items-center rounded-xl border shadow-sm transition cursor-pointer",
              dark
                ? "border-white/15 bg-white/10 text-slate-200 hover:bg-white/15"
                : "border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900",
              bellPing && "animate-[bell-shake_0.6s_ease-in-out]",
            )}
          >
            <Bell className="h-4 w-4" />
            {unreadAlerts.length > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[10px] font-extrabold text-white shadow-md">
                {unreadAlerts.length}
                {bellPing && <span className="absolute inset-0 animate-ping rounded-full bg-rose-500 opacity-70" />}
              </span>
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-80 max-w-[calc(100vw-2rem)] border-slate-200 dark:border-slate-800">
          <DropdownMenuLabel className="flex items-center justify-between font-bold">
            <span>Cảnh báo gần đây</span>
            {unreadAlerts.length > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMarkAllAsRead(unreadAlerts.map((a) => a.id));
                }}
                className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-bold cursor-pointer border-0 bg-transparent p-0 outline-none"
              >
                Đọc tất cả
              </button>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {alerts.length === 0 && (
            <div className="px-3 py-4 text-center text-xs text-slate-500 font-medium">Chưa có cảnh báo</div>
          )}
          {alerts.slice(0, 6).map((a) => (
            <AlertItem
              key={a.id}
              alert={a}
              isRead={readAlertIds.includes(a.id)}
              onMark={() => onMarkAsRead(a.id)}
              onNavigate={() => onNavigateToNotifications?.()}
            />
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => onNavigateToNotifications?.()}
            className="cursor-pointer font-bold text-indigo-600 dark:text-indigo-400"
          >
            Xem thêm
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Profile / Login Button */}
      {currentUser ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className={cn(
              "flex items-center gap-3 rounded-xl border py-1.5 pl-1.5 pr-3 shadow-sm transition cursor-pointer",
              dark
                ? "border-white/15 bg-white/10 hover:bg-white/15"
                : "border-slate-300 bg-slate-100 hover:bg-slate-200"
            )}>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-sky-400 text-white font-bold">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden text-left sm:block">
                <div className={cn("text-sm font-bold leading-tight", dark ? "text-white" : "text-slate-900")}>
                  {currentUser.hoten}
                </div>
                <div className={cn("text-[11px] font-medium leading-tight", dark ? "text-slate-300" : "text-slate-600")}>
                  {currentUser.email}
                </div>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 border-slate-200 dark:border-slate-800">
            <DropdownMenuLabel className="font-bold">Tài khoản</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="cursor-pointer font-medium">
                <UserCircle className="mr-2 h-4 w-4" /> Hồ sơ
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="cursor-pointer font-medium">
                <SettingsIcon className="mr-2 h-4 w-4" /> Cài đặt tài khoản
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={async () => {
                await supabase.auth.signOut();
                toast.success("Đã đăng xuất thành công!");
              }}
              className="text-rose-600 focus:text-rose-600 font-bold cursor-pointer"
            >
              <LogOut className="mr-2 h-4 w-4" /> Đăng xuất
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          asChild
          className="bg-gradient-to-r from-indigo-500 to-sky-500 text-white shadow-md shadow-indigo-500/20 hover:opacity-90 cursor-pointer font-bold"
        >
          <Link to="/login">
            <User className="mr-2 h-4 w-4" /> Đăng nhập
          </Link>
        </Button>
      )}

      {/* Custom Time Dialog */}
      <Dialog open={timeDialogOpen} onOpenChange={setTimeDialogOpen}>
        <DialogContent className="sm:max-w-md border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Clock className="h-5 w-5 text-indigo-500" />
              Tùy chỉnh Thời gian Hệ thống
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
              Chọn thời gian giả lập để kiểm tra các kịch bản hẹn giờ tự động, biểu đồ thời gian thực hoặc kiểm thử hệ thống.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Current Custom Time Info */}
            <div className={cn(
              "rounded-xl p-3 border text-center space-y-1 transition-all",
              isCustom
                ? "border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
                : "border-indigo-500/20 bg-indigo-500/5 text-slate-900 dark:text-slate-100"
            )}>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                Thời gian hiện tại đang áp dụng
              </div>
              <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                {currentTime.toLocaleString("vi-VN")}
              </div>
              {isCustom && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-bold flex items-center justify-center gap-1">
                  <Clock className="h-3 w-3" /> Đang dùng thời gian giả lập (Offset)
                </div>
              )}
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Lối tắt chỉnh thời gian nhanh:
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset(1)}
                  className="text-xs font-semibold cursor-pointer"
                >
                  +1 Giờ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset(-1)}
                  className="text-xs font-semibold cursor-pointer"
                >
                  -1 Giờ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApplyPreset(0, 1)}
                  className="text-xs font-semibold cursor-pointer"
                >
                  +1 Ngày
                </Button>
              </div>
            </div>

            {/* Exact Datetime Picker */}
            <div className="space-y-1.5">
              <Label htmlFor="custom-datetime" className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nhập ngày giờ cụ thể:
              </Label>
              <Input
                id="custom-datetime"
                type="datetime-local"
                value={pickerValue}
                onChange={(e) => setPickerValue(e.target.value)}
                className="text-sm font-semibold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between">
            {isCustom ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleResetTime}
                className="font-bold cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Khôi phục giờ thực
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setTimeDialogOpen(false)}
                className="font-semibold cursor-pointer"
              >
                Hủy
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyPickerTime}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold cursor-pointer"
              >
                Áp dụng
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}
