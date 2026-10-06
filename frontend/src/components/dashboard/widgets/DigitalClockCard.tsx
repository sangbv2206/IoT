import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Sunrise,
  Sun,
  SunMedium,
  Sunset,
  Moon,
  MapPin,
} from "lucide-react";

function getPeriod(hours: number) {
  if (hours >= 5 && hours < 11) {
    return {
      label: "Buổi sáng",
      quote: "Ngày mới tràn đầy năng lượng",
      icon: Sunrise,
      badgeBg: "bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/25",
      aura: "bg-amber-400/20 dark:bg-amber-500/15",
    };
  }
  if (hours >= 11 && hours < 14) {
    return {
      label: "Buổi trưa",
      quote: "Nghỉ trưa thư thái",
      icon: Sun,
      badgeBg: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-300 border-yellow-500/25",
      aura: "bg-yellow-400/20 dark:bg-yellow-500/15",
    };
  }
  if (hours >= 14 && hours < 18) {
    return {
      label: "Buổi chiều",
      quote: "Làm việc tập trung & hiệu quả",
      icon: SunMedium,
      badgeBg: "bg-sky-500/15 text-sky-600 dark:text-sky-300 border-sky-500/25",
      aura: "bg-sky-400/20 dark:bg-sky-500/15",
    };
  }
  if (hours >= 18 && hours < 22) {
    return {
      label: "Buổi tối",
      quote: "Ấm cúng sum vầy bên gia đình",
      icon: Sunset,
      badgeBg: "bg-orange-500/15 text-orange-600 dark:text-orange-300 border-orange-500/25",
      aura: "bg-orange-500/20 dark:bg-purple-900/25",
    };
  }
  return {
    label: "Đêm thanh tĩnh",
    quote: "Chúc bạn giấc ngủ an lành",
    icon: Moon,
    badgeBg: "bg-purple-500/15 text-purple-600 dark:text-purple-300 border-purple-500/25",
    aura: "bg-indigo-600/20 dark:bg-purple-900/30",
  };
}

export function DigitalClockCard({ className }: { className?: string }) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hoursNum = time.getHours();
  const secondsNum = time.getSeconds();

  const hours = String(hoursNum).padStart(2, "0");
  const minutes = String(time.getMinutes()).padStart(2, "0");
  const seconds = String(secondsNum).padStart(2, "0");

  const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const dateFormatted = `${daysOfWeek[time.getDay()]}, ${time.getDate()} tháng ${time.getMonth() + 1}, ${time.getFullYear()}`;

  const isNight = hoursNum >= 18 || hoursNum < 6;
  const period = getPeriod(hoursNum);
  const PeriodIcon = period.icon;

  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (secondsNum / 60) * circumference;

  return (
    <GlassCard
      className={cn(
        "relative overflow-hidden p-5 sm:p-6 rounded-3xl border border-white/80 dark:border-slate-800/80 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:shadow-lg group select-none min-h-[175px]",
        className
      )}
    >
      {/* Vòm sáng Aura */}
      <div className={cn("pointer-events-none absolute -left-16 -top-16 h-52 w-52 rounded-full blur-3xl transition-all duration-1000", period.aura)} />

      {/* Hiệu ứng hạt sao đêm */}
      {isNight && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-3 right-36 h-1 w-1 rounded-full bg-amber-200/80 animate-ping" />
          <div className="absolute top-7 right-48 h-1 w-1 rounded-full bg-indigo-300/70 animate-pulse" />
        </div>
      )}

      {/* DÒNG 1: Badge thời điểm & Lời chào */}
      <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-100/80 dark:border-slate-800/60 gap-2">
        <div className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs whitespace-nowrap shrink-0", period.badgeBg)}>
          <PeriodIcon className="h-3.5 w-3.5 shrink-0 animate-pulse" />
          <span>{period.label}</span>
        </div>
        <div className="text-right text-[11px] sm:text-xs font-medium text-slate-500 dark:text-slate-400 italic whitespace-nowrap">
          "{period.quote}"
        </div>
      </div>

      {/* DÒNG 2: Đồng hồ số & Vòng giây */}
      <div className="relative z-10 my-3 flex items-center justify-between gap-4">
        <div className="flex items-baseline tracking-tight">
          <span className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
            {hours}
          </span>
          <span className="text-4xl sm:text-5xl font-black text-indigo-500 dark:text-indigo-400 mx-1.5 animate-pulse leading-none">
            :
          </span>
          <span className="text-5xl sm:text-6xl font-black text-slate-900 dark:text-white tabular-nums tracking-tighter">
            {minutes}
          </span>
        </div>

        {/* Vòng tròn đếm giây */}
        <div className="relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
            <circle
              cx="28"
              cy="28"
              r={radius}
              stroke="currentColor"
              strokeWidth="2.5"
              strokeDasharray="2 3.5"
              fill="none"
              className="text-slate-200 dark:text-slate-700/60"
            />
            <circle
              cx="28"
              cy="28"
              r={radius}
              stroke="#6366f1"
              strokeWidth="3.2"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-700 ease-linear drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]"
            />
          </svg>
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-300 tabular-nums leading-none">
              :{seconds}
            </span>
            <span className="text-[7.5px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-tighter mt-0.5">
              GIÂY
            </span>
          </div>
        </div>
      </div>

      {/* DÒNG 3: Lịch ngày tháng & Địa điểm */}
      <div className="relative z-10 pt-3 border-t border-slate-100/80 dark:border-slate-800/60 flex items-center justify-between text-xs sm:text-sm">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-semibold min-w-0">
          <Calendar className="h-4 w-4 text-indigo-500 shrink-0" />
          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
            {dateFormatted}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500 text-xs font-medium shrink-0 ml-2">
          <MapPin className="h-3 w-3 text-indigo-500" />
          <span>Hà Nội</span>
        </div>
      </div>
    </GlassCard>
  );
}
