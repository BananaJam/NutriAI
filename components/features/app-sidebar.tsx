"use client";

import {
  Apple,
  Calendar,
  Home,
  LineChart,
  LogOut,
  MessageSquare,
  Settings,
  Target,
  User,
  UtensilsCrossed,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth-client";
import { useSessionUser } from "@/lib/use-session-user";

const navigationItems = [
  { title: "Dashboard", href: "/", icon: Home },
  { title: "Food Log", href: "/log", icon: UtensilsCrossed },
  { title: "Meal Plans", href: "/plans", icon: Calendar },
  { title: "Progress", href: "/progress", icon: LineChart },
  { title: "Foods", href: "/foods", icon: Apple },
  { title: "Goals", href: "/goals", icon: Target },
  { title: "AI Assistant", href: "/assistant", icon: MessageSquare },
];

const settingsItems = [
  { title: "Profile", href: "/profile", icon: User },
  { title: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useSessionUser();
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await authClient.signOut();
      window.location.href = "/sign-in";
    });
  };

  return (
    <Sidebar className="border-r border-sidebar-border/80">
      <SidebarHeader className="border-b border-sidebar-border/80 px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sidebar-primary/10 text-sidebar-primary">
            <Apple className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-base font-semibold tracking-tight">
              NutriAI
            </span>
            <span className="text-xs text-sidebar-foreground/70">
              Nutrition workspace
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="px-3 text-[11px] font-semibold tracking-[0.16em] uppercase">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="h-10 rounded-xl px-3 text-sm data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-sm"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border/80 px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className="h-10 rounded-xl px-3 text-sm data-[active=true]:bg-sidebar-primary data-[active=true]:text-sidebar-primary-foreground data-[active=true]:shadow-sm"
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <div className="mt-5 rounded-2xl border border-sidebar-border/80 bg-sidebar-accent/45 p-4 shadow-sm">
              <p className="text-[11px] font-semibold tracking-[0.16em] text-sidebar-foreground/65 uppercase">
                Account
              </p>
              <p className="mt-2 text-sm font-semibold text-sidebar-foreground">
                {user?.name || "Signed in"}
              </p>
              <p className="mt-1 text-xs text-sidebar-foreground/70">
                {user?.email}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4 w-full justify-start rounded-xl border-sidebar-border/80 bg-background/80"
                onClick={handleSignOut}
                disabled={isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                {isPending ? "Signing out..." : "Sign out"}
              </Button>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarFooter>
    </Sidebar>
  );
}
