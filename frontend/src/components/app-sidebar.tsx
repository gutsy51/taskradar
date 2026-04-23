import {
  IconBriefcase,
  IconLayoutGrid,
  IconRadar,
  IconSettings,
} from "@tabler/icons-react";
import { useSnapshot } from "valtio";
import { Link } from "wouter";
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

const NAV_MAIN = [
  { title: "Задания",   url: "/tasks",   icon: IconBriefcase  },
  { title: "Источники", url: "/sources", icon: IconLayoutGrid },
];

const NAV_SECONDARY = [
  { title: "Настройки", url: "#", icon: IconSettings },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user } = useSnapshot(application);


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
                <IconRadar className="!size-5" />
                <span className="text-base font-semibold">TaskRadar</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <NavMain items={NAV_MAIN} />
        <NavSecondary items={NAV_SECONDARY} className="mt-auto" />
      </SidebarContent>

      {user && (
        <SidebarFooter>
          <NavUser user={user} />
        </SidebarFooter>
      )}
    </Sidebar>
  );
}
