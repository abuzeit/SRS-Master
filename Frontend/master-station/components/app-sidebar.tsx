"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { LayoutDashboard, Map as MapIcon, GitCompare, FileText, Bell, Database } from "lucide-react"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const data = {
    navMain: [
      {
        title: "Operations",
        items: [
          {
            title: "Dashboard",
            url: "/",
            icon: LayoutDashboard,
          },
          {
            title: "Map View",
            url: "/map",
            icon: MapIcon,
          },
        ],
      },
      {
        title: "Analytics",
        items: [
          {
            title: "Compare Stations",
            url: "/compare",
            icon: GitCompare,
          },
        ],
      },
      {
        title: "Monitoring",
        items: [
          {
            title: "Trip Logs",
            url: "/logs",
            icon: FileText,
          },
          {
            title: "Alarms",
            url: "/alarms",
            icon: Bell,
          },
        ],
      },
    ],
  }

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/" />}>
              <div className="flex aspect-square size-8 items-center justify-center">
                <img src="/logo.png" alt="SRS Master Logo" className="size-8" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none">
                <span className="font-bold text-lg">SRS Master</span>
                <span className="text-muted-foreground text-xs">v1.0.0</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {data.navMain.map((group) => (
              <SidebarMenuItem key={group.title}>
                <SidebarMenuButton className="font-medium text-zinc-400">
                  {group.title}
                </SidebarMenuButton>
                {group.items?.length ? (
                  <SidebarMenuSub className="ms-0 border-s-0 px-1.5 gap-1 flex flex-col mt-1">
                    {group.items.map((item) => {
                      const isActive = pathname === item.url;
                      return (
                        <SidebarMenuSubItem key={item.title}>
                          <SidebarMenuSubButton
                            isActive={isActive}
                            render={<Link href={item.url} />}
                          >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.title}
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      )
                    })}
                  </SidebarMenuSub>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
