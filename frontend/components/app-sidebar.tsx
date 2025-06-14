import React from "react"
import {
  BookOpen,
  ClipboardList,
  Home,
  Settings2,
  Users,
  Shield,
  UserCog,
  type LucideIcon,
} from "lucide-react"
import { useRouter } from "next/router"

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
  const router = useRouter();
  
  // Wait for router to be ready to avoid hydration issues
  if (!router.isReady) {
    return (
      <Sidebar collapsible="icon" {...props}>
        <SidebarHeader />
        <SidebarContent>
          <div className="p-4 text-muted-foreground">Loading...</div>
        </SidebarContent>
        <SidebarFooter>
          <NavUser user={{ ...user, avatar: user.avatar || "", roles: user.roles || [] }} />
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    );
  }
  
  // Determine current context based on URL
  const isSystemAdmin = router.asPath.startsWith('/admin');
  const isEventContext = router.asPath.startsWith('/events/');
  
  // Check if user is SuperAdmin
  const isSuperAdmin = user.roles?.includes('SuperAdmin');

  // Get current event slug if in event context
  // Try router.query first (more reliable for dynamic routes), then fall back to asPath parsing
  const currentEventSlug = isEventContext 
    ? (router.query.eventSlug as string) || router.asPath.split('/')[2] 
    : null;
  
  // Debug logging to help troubleshoot (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('Sidebar Debug:', {
      asPath: router.asPath,
      query: router.query,
      isEventContext,
      currentEventSlug,
      eventsLength: events.length
    });
  }

  // Global navigation (always visible except in system admin)
  let globalNav: Array<{
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: Array<{ title: string; url: string; }>;
  }> = [];
  let eventNav: Array<{
    title: string;
    url: string;
    icon?: LucideIcon;
    isActive?: boolean;
    items?: Array<{ title: string; url: string; }>;
  }> = [];

  if (isSystemAdmin && isSuperAdmin) {
    // System Admin Navigation (replaces everything)
    globalNav = [
      {
        title: "System Dashboard",
        url: "/admin/dashboard",
        icon: Home,
        isActive: router.asPath === "/admin/dashboard",
      },
      {
        title: "Events Management",
        url: "/admin/events",
        icon: Users,
        items: [
          {
            title: "All Events",
            url: "/admin/events",
          },
          {
            title: "Create Event",
            url: "/admin/events/new",
          },
          {
            title: "Disabled Events",
            url: "/admin/events/disabled",
          },
        ],
      },
      {
        title: "System Settings",
        url: "/admin/system",
        icon: Settings2,
        items: [
          {
            title: "General Settings",
            url: "/admin/system/settings",
          },
          {
            title: "Backups",
            url: "/admin/system/backups",
          },
          {
            title: "Logs",
            url: "/admin/system/logs",
          },
        ],
      },
      {
        title: "User Management",
        url: "/admin/users",
        icon: UserCog,
      },
    ];
  } else {
    // Global Navigation (always visible)
    globalNav = [
      {
        title: "Home",
        url: "/dashboard",
        icon: Home,
        isActive: router.asPath === "/dashboard",
      },
      {
        title: "All Reports",
        url: "/dashboard/reports",
        icon: ClipboardList,
      },
      {
        title: "Notifications",
        url: "/dashboard/notifications",
        icon: BookOpen,
      },
    ];

    // Add System Admin link if user is SuperAdmin
    if (isSuperAdmin) {
      globalNav.push({
        title: "System Admin",
        url: "/admin/dashboard",
        icon: Shield,
      });
    }

    // Event-specific navigation (only when in event context)
    if (isEventContext && currentEventSlug) {
      // Get user's role for the current event
      const currentEvent = events.find(event => event.url.includes(currentEventSlug));
      const userEventRole = currentEvent?.role;
      
      // Check role permissions
      const isEventAdmin = userEventRole === 'Admin' || isSuperAdmin;
      const isEventResponder = userEventRole === 'Responder' || isEventAdmin;

      // Base navigation items (available to all roles)
      eventNav = [
        {
          title: "Event Dashboard",
          url: `/events/${currentEventSlug}/dashboard`,
          icon: Home,
          isActive: router.asPath === `/events/${currentEventSlug}/dashboard`,
        },
        {
          title: "Reports",
          url: `/events/${currentEventSlug}/reports`,
          icon: ClipboardList,
          items: [
            {
              title: "All Reports",
              url: `/events/${currentEventSlug}/reports`,
            },
            {
              title: "Submit Report",
              url: `/events/${currentEventSlug}/reports/new`,
            },
          ],
        },
      ];

      // Team section (Responders and Admins only)
      if (isEventResponder) {
        const teamItems = [
          {
            title: "Team Members",
            url: `/events/${currentEventSlug}/team`,
          },
        ];

        // Send Invites only for Admins
        if (isEventAdmin) {
          teamItems.push({
            title: "Send Invites",
            url: `/events/${currentEventSlug}/team/invite`,
          });
        }

        eventNav.push({
          title: "Team",
          url: `/events/${currentEventSlug}/team`,
          icon: Users,
          items: teamItems,
        });
      }

      // Event Settings (Admins only)
      if (isEventAdmin) {
        eventNav.push({
          title: "Event Settings",
          url: `/events/${currentEventSlug}/settings`,
          icon: Settings2,
          items: [
            {
              title: "General Settings",
              url: `/events/${currentEventSlug}/settings`,
            },
            {
              title: "Code of Conduct",
              url: `/events/${currentEventSlug}/settings/code-of-conduct`,
            },
            {
              title: "Notifications",
              url: `/events/${currentEventSlug}/settings/notifications`,
            },
          ],
        });
      }
    }
  }

  // Collapsed event switcher: just the icon, opens the dropdown
  const CollapsedEventSwitcher = () => {
    if (!events.length) return null;
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
        {/* Global Navigation */}
        <NavMain items={globalNav} />
        
        {/* Event Navigation Section (only show if not in system admin and has event nav) */}
        {!isSystemAdmin && (
          <>
            {/* Event Switcher */}
            {state === "expanded" && <NavEvents events={events} />}
            
            {/* Event-specific Navigation */}
            {eventNav.length > 0 && (
              <div className="mt-4">
                <NavMain items={eventNav} />
              </div>
            )}
          </>
        )}
      </SidebarContent>
      {state === "collapsed" && !isSystemAdmin && <CollapsedEventSwitcher />}
      <SidebarFooter>
        <NavUser user={{ ...user, avatar: user.avatar || "", roles: user.roles || [] }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
