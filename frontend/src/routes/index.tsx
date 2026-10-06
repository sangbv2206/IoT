import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { LandingPage } from "@/components/layout/LandingPage";
import { CommandPalette } from "@/components/dashboard/shared/CommandPalette";
import { BottomNav } from "@/components/layout/BottomNav";
import { AllDevicesProvider } from "@/hooks/use-all-devices";
import { useDashboard } from "@/hooks/use-dashboard";

// ── Lazy-loaded tabs ────────────────────────────────────────────────────────
const DashboardTab = lazy(() => import("@/components/dashboard/tabs/overview/DashboardTab").then(m => ({ default: m.DashboardTab })));
const ScenesTab = lazy(() => import("@/components/dashboard/tabs/scenes/ScenesTab").then(m => ({ default: m.ScenesTab })));
const SensorsTab = lazy(() => import("@/components/dashboard/tabs/sensors/SensorsTab").then(m => ({ default: m.SensorsTab })));
const ScheduleTab = lazy(() => import("@/components/dashboard/tabs/schedule/ScheduleTab").then(m => ({ default: m.ScheduleTab })));
const ActivityTab = lazy(() => import("@/components/dashboard/tabs/activity/ActivityTab").then(m => ({ default: m.ActivityTab })));
const NotificationsTab = lazy(() => import("@/components/dashboard/tabs/notifications/NotificationsTab").then(m => ({ default: m.NotificationsTab })));
const SettingsTab = lazy(() => import("@/components/dashboard/tabs/settings/SettingsTab").then(m => ({ default: m.SettingsTab })));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Home Control | Cổng IoT" },
      { name: "description", content: "Bảng điều khiển giám sát và điều khiển Smart Home qua cổng IoT ESP32-S3." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const d = useDashboard();

  const [visitedTabs, setVisitedTabs] = useState<Set<string>>(() => new Set([d.tab]));

  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(d.tab)) return prev;
      const next = new Set(prev);
      next.add(d.tab);
      return next;
    });
  }, [d.tab]);

  if (d.sessionLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-sm font-medium text-slate-500">Đang kết nối cổng IoT...</span>
        </div>
      </div>
    );
  }

  if (!d.currentUser) return <LandingPage />;

  if (!d.node) {
    return (
      <div className="min-h-screen grid place-items-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <span className="text-sm font-medium text-slate-500">Đang tải dữ liệu node...</span>
        </div>
      </div>
    );
  }

  const unreadAlerts = d.alerts.filter((a) => !d.readAlertIds.includes(a.id)).length;

  return (
    <AllDevicesProvider currentUser={d.currentUser}>
      <div className="relative min-h-screen text-slate-800 bg-[radial-gradient(1200px_600px_at_-10%_-10%,#dbe7ff_0%,transparent_60%),linear-gradient(180deg,#f6f7fb_0%,#eef1f8_100%)]">
        {d.connectionError && (
          <div className="fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-3 bg-rose-600 px-4 py-2.5 text-white text-sm font-medium shadow-lg">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="truncate">{d.connectionError}</span>
            <button
              onClick={() => { d.setConnectionError(null); window.location.reload(); }}
              className="ml-2 rounded bg-white/20 px-3 py-1 text-xs font-semibold hover:bg-white/30"
            >
              Thử lại
            </button>
          </div>
        )}

        <div className={cn("relative z-10 flex min-h-screen", d.connectionError && "pt-10")}>
          {d.mobileSidebarOpen && (
            <div className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity" onClick={() => d.setMobileSidebarOpen(false)} />
          )}

          <Sidebar
            tab={d.tab}
            setTab={d.setTab}
            alertCount={unreadAlerts}
            supabaseOnline={d.supabaseOnline}
            mqttOnline={d.mqttOnline}
            currentUserRole={d.currentUser.vaitro}
            onCloseMobile={() => d.setMobileSidebarOpen(false)}
            className={cn("fixed inset-y-0 left-0 z-50 h-full border-r shadow-2xl transition-transform duration-300 transform lg:hidden bg-white border-slate-200", d.mobileSidebarOpen ? "translate-x-0" : "-translate-x-full")}
          />

          <Sidebar
            tab={d.tab}
            setTab={d.setTab}
            alertCount={unreadAlerts}
            supabaseOnline={d.supabaseOnline}
            mqttOnline={d.mqttOnline}
            currentUserRole={d.currentUser.vaitro}
            className="hidden lg:flex sticky top-0 h-screen"
          />

          <main className="flex-1 min-w-0 flex flex-col">
            <Header
              title={d.title}
              nodeName={d.node.name}
              alerts={d.alerts}
              readAlertIds={d.readAlertIds}
              onMarkAsRead={d.markAsRead}
              onMarkAllAsRead={d.markAllAsRead}
              bellPing={d.bellPing}
              onOpen={() => d.setBellPing(false)}
              openPalette={() => d.setPaletteOpen(true)}
              currentUser={d.currentUser}
              onMenuClick={() => d.setMobileSidebarOpen(true)}
              lastSensorTime={d.lastSensorTime}
              onNavigateToNotifications={() => d.setTab("notifications")}
            />
            <div className="flex-1 p-2.5 sm:p-4 md:p-6 lg:p-8 pb-24 md:pb-6">
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" /></div>}>
                {visitedTabs.has("dashboard") && (
                  <div className={cn(d.tab !== "dashboard" && "hidden")}>
                    <DashboardTab
                      sensors={d.legacySensors}
                      sensorHistory={d.sensorHistory}
                      nodeName={d.node.name}
                      nodeId={d.nodeId}
                      thresholds={d.thresholds}
                      nodeDevices={d.nodeDevices}
                      onNodeDeviceToggle={d.handleNodeDeviceToggle}
                      onNodeDeviceModeChange={d.handleNodeDeviceModeChange}
                      onNodeDeviceUpdateConfig={d.handleNodeDeviceConfigChange}
                      currentUser={d.currentUser}
                    />
                  </div>
                )}
                {visitedTabs.has("scenes") && (
                  <div className={cn(d.tab !== "scenes" && "hidden")}>
                    <ScenesTab currentUser={d.currentUser} nodeId={d.nodeId} />
                  </div>
                )}
                {visitedTabs.has("sensors") && (
                  <div className={cn(d.tab !== "sensors" && "hidden")}>
                    <SensorsTab />
                  </div>
                )}
                {visitedTabs.has("schedule") && (
                  <div className={cn(d.tab !== "schedule" && "hidden")}>
                    <ScheduleTab currentUserRole={d.currentUser.vaitro} currentUserId={d.currentUser.idnguoidung} />
                  </div>
                )}
                {visitedTabs.has("activity") && (
                  <div className={cn(d.tab !== "activity" && "hidden")}>
                    <ActivityTab currentUserId={d.currentUserId} currentNodeId={d.nodeId} currentUserRole={d.currentUser.vaitro} nodesList={d.nodesList} />
                  </div>
                )}
                {visitedTabs.has("notifications") && (
                  <div className={cn(d.tab !== "notifications" && "hidden")}>
                    <NotificationsTab readAlertIds={d.readAlertIds} onMarkAsRead={d.markAsRead} onMarkAllAsRead={d.markAllAsRead} currentUser={d.currentUser} alerts={d.alerts} />
                  </div>
                )}
                {visitedTabs.has("settings") && (
                  <div className={cn(d.tab !== "settings" && "hidden")}>
                    <SettingsTab currentUserRole={d.currentUser.vaitro} currentUser={d.currentUser} />
                  </div>
                )}
              </Suspense>
            </div>
          </main>
        </div>

        <CommandPalette open={d.paletteOpen} onClose={() => d.setPaletteOpen(false)} setTab={d.setTab} setNodeId={d.setNodeId} currentUserRole={d.currentUser.vaitro} />
        <BottomNav activeTab={d.tab} onTabChange={(t) => d.setTab(t)} />
      </div>
    </AllDevicesProvider>
  );
}
