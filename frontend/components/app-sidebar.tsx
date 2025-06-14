import React from "react"
import {
  BookOpen,
  ClipboardList,
  Home,
  Settings2,
  Users,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavEvents } from "@/components/nav-projects"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"

export function AppSidebar({ user, events, ...props }: {
  user: {
    name: string
    email: string
    avatar?: string
    roles?: string[]
  }
  events: {
    name: string
    url: string
    icon: React.ElementType
    role?: string
  }[]
} & React.ComponentProps<typeof Sidebar>) {
  // Main nav links for Conducky
  const navMain = [
    {
      title: "Dashboard",
      url: "/",
      icon: Home,
      isActive: true,
    },
    {
      title: "Reports",
      url: "/reports",
      icon: ClipboardList,
    },
    {
      title: "Events",
      url: "/events",
      icon: Users,
    },
    {
      title: "Documentation",
      url: "/docs",
      icon: BookOpen,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: Settings2,
    },
  ];

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* Sidebar header is now empty since the app name is in the top bar */}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavEvents events={events} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={{ ...user, avatar: user.avatar || "", roles: user.roles || [] }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
