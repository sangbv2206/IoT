import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";
import {
  Wind,
  Droplets,
  MapPin,
  RefreshCw,
  Calendar,
  Thermometer,
  Sun,
  Moon,
  CloudSun,
  CloudMoon,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudFog,
  Snowflake,
} from "lucide-react";

export interface DailyForecast {
  dayName: string;
  dateStr: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitation: number;
  windSpeed: number;
}

export interface WeatherData {
  currentTemp: number;
  weatherCode: number;
  weatherLabel: string;
  windSpeed: number;
  humidity: number;
  apparentTemp?: number;
  isDay?: boolean;
  dateFormatted: string;
  locationName: string;
  daily: DailyForecast[];
  sunrise?: string;
  sunset?: string;
}

// =========================================================================
// WeatherAnimatedIcon — Render icon thời tiết sắc nét, nhẹ và mượt mà
// =========================================================================
export function WeatherAnimatedIcon({
  code,
  isDay = true,
  size = "md",
  className,
}: {
  code: number;
  isDay?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const iconSize = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-4 w-4" : "h-7 w-7";

  let Icon = isDay ? Sun : Moon;
  let colorClass = isDay ? "text-amber-500 animate-[spin_25s_linear_infinite]" : "text-indigo-400";

  if (code === 1 || code === 2) {
    Icon = isDay ? CloudSun : CloudMoon;
    colorClass = isDay ? "text-amber-500" : "text-indigo-300";
  } else if (code === 3) {
    Icon = Cloud;
    colorClass = "text-slate-400";
  } else if (code === 45 || code === 48) {
    Icon = CloudFog;
    colorClass = "text-slate-300";
  } else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    Icon = CloudRain;
    colorClass = "text-sky-400";
  } else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    Icon = Snowflake;
    colorClass = "text-cyan-300";
  } else if (code >= 95) {
    Icon = CloudLightning;
    colorClass = "text-yellow-400 animate-pulse";
  }

  return (
    <div className={cn("relative flex items-center justify-center select-none", className)}>
      <Icon className={cn(iconSize, colorClass, "drop-shadow-sm transition-all")} />
    </div>
  );
}

function getWeatherInfo(code: number, isDay = true): { label: string; tag: string } {
  if (!isDay) {
    if (code === 0) return { label: "Đêm quang đãng", tag: "Đêm thanh bình" };
    if (code <= 2) return { label: "Đêm ít mây", tag: "Trời dịu mát" };
    if (code === 3) return { label: "Đêm nhiều mây", tag: "Gió mát nhẹ" };
    if (code === 45 || code === 48) return { label: "Sương mù đêm", tag: "Tầm nhìn hạn chế" };
    if (code >= 51 && code <= 82) return { label: "Mưa rào đêm", tag: "Đêm có mưa" };
    if (code >= 95) return { label: "Dông sét đêm", tag: "Cẩn thận sấm chớp" };
    return { label: "Đêm dịu mát", tag: "Yên bình" };
  }
  if (code === 0) return { label: "Trời quang đãng", tag: "Nắng rực rỡ" };
  if (code <= 2) return { label: "Nắng nhẹ, có mây", tag: "Thời tiết lý tưởng" };
  if (code === 3) return { label: "Nhiều mây u ám", tag: "Trời dịu mát" };
  if (code === 45 || code === 48) return { label: "Sương mù", tag: "Tầm nhìn hạn chế" };
  if (code >= 51 && code <= 57) return { label: "Mưa phùn nhẹ", tag: "Mang theo ô" };
  if (code >= 61 && code <= 82) return { label: "Mưa rào", tag: "Có thể mưa to" };
  if (code >= 95) return { label: "Có dông sét", tag: "Cẩn thận sấm chớp" };
  return { label: "Nhiều mây", tag: "Dịu mát" };
}

function getInitialWeather(): WeatherData {
  const now = new Date();
  const isDay = now.getHours() >= 6 && now.getHours() < 18;
  const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
  const vnDayAbbr = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
  const dateFormatted = `${daysOfWeek[now.getDay()]}, ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}`;

  const initialDaily: DailyForecast[] = [];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    initialDaily.push({
      dayName: vnDayAbbr[d.getDay()],
      dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
      weatherCode: 1,
      tempMax: 30,
      tempMin: 23,
      precipitation: 0,
      windSpeed: 10,
    });
  }

  return {
    currentTemp: 27,
    weatherCode: 0,
    weatherLabel: isDay ? "Trời quang đãng" : "Đêm quang đãng",
    windSpeed: 6,
    humidity: 80,
    apparentTemp: 29,
    isDay,
    dateFormatted,
    locationName: "Phòng khách (Hà Nội)",
    sunrise: "05:48",
    sunset: "18:02",
    daily: initialDaily,
  };
}

export function WeatherCard({
  className,
  location = "Phòng khách (Hà Nội)",
  latitude = 21.0285,
  longitude = 105.8542,
  onSunTimes,
}: {
  className?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  onSunTimes?: (times: { sunrise: string; sunset: string }) => void;
}) {
  const [data, setData] = useState<WeatherData>(getInitialWeather);
  const [loading, setLoading] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,apparent_temperature,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset&forecast_days=8&timezone=Asia%2FBangkok`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Weather fetch error");
      const json = await res.json();

      const current = json.current;
      const daily = json.daily;
      const now = new Date();
      const daysOfWeek = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const dateFormatted = `${daysOfWeek[now.getDay()]}, ${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}`;
      const vnDayAbbr = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

      const forecastList: DailyForecast[] = [];
      const count = Math.min(daily.time.length, 8);
      for (let i = 1; i < count; i++) {
        const d = new Date(daily.time[i]);
        forecastList.push({
          dayName: vnDayAbbr[d.getDay()],
          dateStr: `${d.getDate()}/${d.getMonth() + 1}`,
          weatherCode: daily.weather_code[i],
          tempMax: Math.round(daily.temperature_2m_max[i]),
          tempMin: Math.round(daily.temperature_2m_min[i]),
          precipitation: Math.round(daily.precipitation_sum[i] || 0),
          windSpeed: Math.round(daily.wind_speed_10m_max[i] || 0),
        });
      }

      const isDay = current.is_day === 1;
      const info = getWeatherInfo(current.weather_code, isDay);
      const apparentTemp = current.apparent_temperature != null ? Math.round(current.apparent_temperature) : Math.round(current.temperature_2m);

      let sunriseStr = "05:48";
      let sunsetStr = "18:02";
      if (daily.sunrise?.[0]) {
        sunriseStr = new Date(daily.sunrise[0]).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      }
      if (daily.sunset?.[0]) {
        sunsetStr = new Date(daily.sunset[0]).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
      }

      onSunTimes?.({ sunrise: sunriseStr, sunset: sunsetStr });

      setData({
        currentTemp: Math.round(current.temperature_2m),
        weatherCode: current.weather_code,
        weatherLabel: info.label,
        windSpeed: Math.round(current.wind_speed_10m),
        humidity: Math.round(current.relative_humidity_2m),
        apparentTemp,
        isDay,
        dateFormatted,
        locationName: location,
        daily: forecastList,
        sunrise: sunriseStr,
        sunset: sunsetStr,
      });
    } catch (err) {
      console.warn("Dùng dữ liệu thời tiết dự phòng:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
    const timer = setInterval(fetchWeather, 15 * 60 * 1000);
    return () => clearInterval(timer);
  }, [latitude, longitude]);

  const currentInfo = getWeatherInfo(data.weatherCode, data.isDay ?? true);
  const feelsLike = data.apparentTemp ?? data.currentTemp;

  return (
    <GlassCard
      className={cn(
        "relative overflow-hidden p-4 sm:p-5 transition-all duration-300 rounded-3xl border border-white/80 dark:border-slate-800/80 shadow-md bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl flex flex-col justify-between h-full group",
        className
      )}
    >
      {/* Dynamic Ambient Aura */}
      <div
        className={cn(
          "pointer-events-none absolute -right-14 -top-14 h-52 w-52 rounded-full blur-3xl transition-all duration-700",
          !data.isDay
            ? "bg-indigo-600/25 dark:bg-purple-900/30"
            : data.weatherCode === 0
              ? "bg-amber-400/25 dark:bg-amber-500/20"
              : data.weatherCode <= 2
                ? "bg-sky-400/20 dark:bg-indigo-500/20"
                : "bg-blue-400/20 dark:bg-cyan-500/15"
        )}
      />

      {/* Header: Ngày tháng & Địa điểm */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400 pb-2.5 border-b border-slate-100/70 dark:border-slate-800/60 gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <Calendar className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span className="font-bold tracking-tight text-slate-800 dark:text-slate-200 whitespace-nowrap">
            {data.dateFormatted}
          </span>
        </div>

        <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 min-w-0 justify-end">
          <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
          <span className="font-medium text-xs truncate max-w-[120px] sm:max-w-[150px]" title={data.locationName}>
            {data.locationName}
          </span>
          <button
            onClick={fetchWeather}
            disabled={loading}
            className="ml-0.5 p-1 hover:text-indigo-600 text-slate-400 transition cursor-pointer hover:rotate-180 duration-500 shrink-0"
            title="Làm mới thời tiết"
          >
            <RefreshCw className={cn("h-3 w-3", loading && "animate-spin text-indigo-500")} />
          </button>
        </div>
      </div>

      {/* Thời tiết hiện tại */}
      <div className="my-3 sm:my-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "relative grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-2xl border shadow-xs group-hover:scale-105 transition-transform duration-300 shrink-0",
              !data.isDay
                ? "bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-indigo-500/20"
                : "bg-gradient-to-br from-amber-500/10 via-sky-500/10 to-indigo-500/10 border-white/60 dark:border-slate-700/60"
            )}
          >
            <WeatherAnimatedIcon code={data.weatherCode} isDay={data.isDay} size="lg" />
          </div>

          <div className="min-w-0">
            <div className="text-sm sm:text-base font-black tracking-tight text-slate-800 dark:text-white leading-tight whitespace-nowrap">
              {data.weatherLabel}
            </div>
            <div
              className={cn(
                "inline-flex items-center gap-1 text-[10px] sm:text-[10.5px] font-bold px-2 py-0.5 rounded-full mt-1 border whitespace-nowrap",
                !data.isDay
                  ? "text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-200/60 dark:border-indigo-800/60"
                  : "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/50"
              )}
            >
              <span>{currentInfo.tag}</span>
            </div>
          </div>
        </div>

        <div className="flex items-baseline shrink-0">
          <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight">
            {data.currentTemp}
          </span>
          <span className={cn("text-lg sm:text-xl lg:text-2xl font-bold ml-0.5", !data.isDay ? "text-indigo-400" : "text-amber-500")}>
            °C
          </span>
        </div>
      </div>

      {/* 3 Pills: Gió, Độ ẩm, Cảm giác */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 my-1">
        <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 min-w-0">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 shrink-0">
            <Wind className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </div>
          <div className="min-w-0 flex-1 leading-none">
            <div className="text-[8px] sm:text-[8.5px] text-slate-400 font-semibold tracking-tight whitespace-nowrap">Gió</div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums whitespace-nowrap mt-0.5">
              {data.windSpeed} <span className="text-[9px] font-normal text-slate-400">km/h</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 min-w-0">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 shrink-0">
            <Droplets className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </div>
          <div className="min-w-0 flex-1 leading-none">
            <div className="text-[8px] sm:text-[8.5px] text-slate-400 font-semibold tracking-tight whitespace-nowrap">Độ ẩm</div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums whitespace-nowrap mt-0.5">
              {data.humidity}%
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 p-1.5 sm:p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 min-w-0">
          <div className="grid h-6 w-6 place-items-center rounded-lg bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 shrink-0">
            <Thermometer className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </div>
          <div className="min-w-0 flex-1 leading-none">
            <div className="text-[8px] sm:text-[8.5px] text-slate-400 font-semibold tracking-tighter whitespace-nowrap">Cảm giác</div>
            <div className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 tabular-nums whitespace-nowrap mt-0.5">
              {feelsLike}°C
            </div>
          </div>
        </div>
      </div>

      <div className="my-2 h-px w-full bg-slate-100 dark:bg-slate-800/70" />

      {/* Dự báo 7 ngày */}
      <div className="grid grid-cols-7 gap-1 text-center pb-0.5">
        {data.daily.map((item, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center justify-between rounded-xl py-1 px-0.5 transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:-translate-y-0.5 border border-transparent hover:border-slate-200/60 dark:hover:border-slate-700/60"
          >
            <div className="text-[10.5px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">
              {item.dayName}
            </div>
            <div className="text-[8px] sm:text-[9px] text-slate-400 font-medium leading-tight mb-0.5">
              {item.dateStr}
            </div>
            <div className="my-0.5 grid h-6 w-6 sm:h-7 sm:w-7 place-items-center">
              <WeatherAnimatedIcon code={item.weatherCode} isDay={true} size="sm" />
            </div>
            <div className="text-[10.5px] sm:text-xs font-black text-slate-800 dark:text-slate-100 tabular-nums whitespace-nowrap">
              {item.tempMax}°
            </div>
            <div className="my-0.5 h-1 sm:h-1.5 w-3.5 sm:w-5 rounded-full bg-slate-200/80 dark:bg-slate-700/80 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-sky-400 via-amber-400 to-rose-500 rounded-full" />
            </div>
            <div className="text-[8.5px] sm:text-[9.5px] font-semibold text-slate-400 dark:text-slate-500 tabular-nums whitespace-nowrap">
              {item.tempMin}°
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
