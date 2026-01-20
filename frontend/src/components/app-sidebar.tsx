import {
  IconDeviceHeartMonitor,
  IconInnerShadowTop,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";
import { useMemo } from "react";
import { useSnapshot } from "valtio";
import { Link } from "wouter";
import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { application } from "@/states/application";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useSnapshot(application);

  const data = useMemo(() => {
    const result = {
      navMain: [
        {
          title: "Панели",
          url: "/panels",
          icon: IconDeviceHeartMonitor,
        },
      ],
      navSecondary: [
        {
          title: "Настройки",
          url: "#",
          icon: IconSettings,
        },
      ],
      documents: [
        {
          name: "Внутренние сервисы",
          url: "#",
        },
        {
          name: "Внешние сервисы",
          url: "#",
        },
      ],
    };

    if (user?.staff) {
      result.navMain.push({
        title: "Пользователи",
        url: "/users",
        icon: IconUsers,
      });
    }

    return result;
  }, [user]);

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <Link href="/">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">PingTower</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
