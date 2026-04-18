"use client";

import { Loader2, PanelTop } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AppSidebar } from "@/components/features/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { useAppSettings } from "@/lib/use-app-settings";
import { useSessionUser } from "@/lib/use-session-user";
import { cn } from "@/lib/utils";

const authRoutes = new Set([
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/reset-password",
]);

const pageContent = {
  "/": {
    title: "Dashboard",
    description:
      "Daily progress, targets, and shortcuts across your nutrition workflow.",
  },
  "/assistant": {
    title: "AI Assistant",
    description:
      "Log meals, ask nutrition questions, and generate recommendations.",
  },
  "/log": {
    title: "Food Log",
    description: "Review meals, nutrition totals, and daily history.",
  },
  "/progress": {
    title: "Progress",
    description: "Explore longer-range trends, consistency, and goal context.",
  },
  "/plans": {
    title: "Meal Plans",
    description:
      "Organize weekly meal structure and keep active plans in view.",
  },
  "/goals": {
    title: "Goals",
    description: "Track active goals and measure progress over time.",
  },
  "/foods": {
    title: "Foods",
    description: "Maintain your food library and nutrition data.",
  },
  "/profile": {
    title: "Profile",
    description: "Personal details, body metrics, and nutrition targets.",
  },
  "/settings": {
    title: "Settings",
    description: "Appearance, app preferences, and account-level controls.",
  },
} as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isPending, user } = useSessionUser();
  const { data: settingsData } = useAppSettings();

  const isAuthRoute = pathname ? authRoutes.has(pathname) : false;
  const pageMeta =
    (pathname
      ? pageContent[pathname as keyof typeof pageContent]
      : undefined) ?? pageContent["/"];
  const compactMode = settingsData?.settings.compactMode ?? false;

  useEffect(() => {
    if (!isPending && !user && !isAuthRoute) {
      router.replace("/sign-in");
    }
  }, [isAuthRoute, isPending, router, user]);

  if (isAuthRoute) {
    return <>{children}</>;
  }

  if (isPending || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking session...
        </div>
      </div>
    );
  }

  return (
    <>
      <AppSidebar />
      <SidebarInset className="bg-[radial-gradient(circle_at_top,_rgba(133,163,139,0.18),_transparent_32%),linear-gradient(180deg,rgba(247,244,239,0.9),rgba(247,244,239,0))] dark:bg-[radial-gradient(circle_at_top,_rgba(86,116,92,0.2),_transparent_24%),linear-gradient(180deg,rgba(24,28,25,0.92),rgba(24,28,25,0.75))]">
        <header className="sticky top-0 z-20 flex min-h-18 shrink-0 items-center border-b border-border/70 bg-background/75 px-4 backdrop-blur xl:px-6">
          <div className="flex w-full items-center gap-3">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="hidden h-4 sm:block" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
                <PanelTop className="h-3.5 w-3.5" />
                NutriAI
              </div>
              <div className="mt-1">
                <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                  {pageMeta.title}
                </p>
                <p className="hidden truncate text-xs text-muted-foreground md:block">
                  {pageMeta.description}
                </p>
              </div>
            </div>
          </div>
        </header>
        <main
          className={cn(
            "page-shell flex-1 overflow-auto",
            compactMode ? "px-4 py-5 sm:px-5" : "px-4 py-6 sm:px-6 sm:py-8",
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
