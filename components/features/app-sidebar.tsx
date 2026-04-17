"use client";

import Link from "next/link";
import { useTransition } from "react";
import { usePathname } from "next/navigation";
import {
  Home,
  MessageSquare,
  UtensilsCrossed,
  Calendar,
  Target,
  Apple,
  User,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useSessionUser } from "@/lib/use-session-user";

const navigationItems = [
  { title: "Dashboard", href: "/", icon: Home },
  { title: "AI Assistant", href: "/assistant", icon: MessageSquare },
  { title: "Food Log", href: "/log", icon: UtensilsCrossed },
  { title: "Meal Plans", href: "/plans", icon: Calendar },
  { title: "Goals", href: "/goals", icon: Target },
  { title: "Foods", href: "/foods", icon: Apple },
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
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <Apple className="h-6 w-6 text-green-600" />
          <span className="text-xl font-bold">NutriAI</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
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
      <SidebarFooter>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton asChild isActive={pathname === item.href}>
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <div className="mt-4 rounded-lg border p-3">
              <p className="text-sm font-medium">{user?.name || "Signed in"}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
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
