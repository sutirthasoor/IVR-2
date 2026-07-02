import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserCog,
  ListChecks,
  Phone,
  BarChart3,
  Settings,
  LogOut,
  Headphones,
  MessageSquare,
  FileText,
} from "lucide-react";
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
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

type Item = { title: string; url: string; icon: any };

const adminItems: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "User Management", url: "/users", icon: UserCog },
  { title: "Agents", url: "/agents", icon: Headphones },
  { title: "Leads", url: "/leads", icon: ListChecks },
  { title: "Call Logs", url: "/calls", icon: Phone },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Surveys", url: "/surveys", icon: FileText },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const managerItems: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Agents", url: "/agents", icon: Headphones },
  { title: "Team Leads", url: "/leads", icon: ListChecks },
  { title: "Call Logs", url: "/calls", icon: Phone },
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Surveys", url: "/surveys", icon: FileText },
  { title: "Reports", url: "/reports", icon: BarChart3 },
];

const agentItems: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "My Leads", url: "/my-leads", icon: ListChecks },
  { title: "My Calls", url: "/my-calls", icon: Phone },
  // Agents can view messages and surveys sent to them
  { title: "Messages", url: "/messages", icon: MessageSquare },
  { title: "Surveys", url: "/surveys", icon: FileText },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (!user) return null;
  const items =
    user.role === "agent" ? agentItems : user.role === "manager" ? managerItems : adminItems;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold">Call Hub Pro</span>
            <span className="text-xs text-muted-foreground capitalize">
              {user.role.replace("_", " ")}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const active = path === item.url || path.startsWith(item.url + "/");
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {user.fullName.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-medium">{user.fullName}</div>
            <div className="truncate text-[10px] text-muted-foreground">{user.email}</div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => logout()}
          className="justify-start gap-2 w-full"
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sign out</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}