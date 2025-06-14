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
  useSidebar,
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
  const { state } = useSidebar();
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

  // Collapsed event switcher: just the icon, opens the dropdown
  const CollapsedEventSwitcher = () => {
    if (!events.length) return null;
    const currentEvent = events[0]; // fallback to first event
    return (
      <div className="flex flex-col items-center py-2">
        <NavEvents events={events} collapsed />
      </div>
    );
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* Sidebar header is now empty since the app name is in the top bar */}
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        {state === "expanded" && <NavEvents events={events} />}
      </SidebarContent>
      {state === "collapsed" && <CollapsedEventSwitcher />}
      <SidebarFooter>
        <NavUser user={{ ...user, avatar: user.avatar || "", roles: user.roles || [] }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
