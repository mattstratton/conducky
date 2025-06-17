import React, { useState, useEffect, useMemo } from "react"
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
  
  // Track the user's selected event (persists when navigating out of event context)
  const [selectedEventSlug, setSelectedEventSlug] = useState<string | null>(null);
  
  // Track unread notification count
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // Update selected event when in event context
  useEffect(() => {
    const eventSlugMatch = router.asPath.match(/^\/events\/([^/]+)/);
    const currentEventSlug = eventSlugMatch ? eventSlugMatch[1] : null;
    
    if (currentEventSlug) {
      setSelectedEventSlug(currentEventSlug);
    }
  }, [router.asPath]);
  
  // Initialize selected event to first available event if none selected
  useEffect(() => {
    if (!selectedEventSlug && events.length > 0) {
      const firstEventUrl = events[0]?.url;
      if (firstEventUrl) {
        const match = firstEventUrl.match(/\/events\/([^/]+)/);
        if (match) {
          setSelectedEventSlug(match[1]);
        }
      }
    }
  }, [events, selectedEventSlug]);

  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/notifications/stats",
          { credentials: "include" }
        );
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.unread || 0);
        }
      } catch (error) {
        console.warn("Failed to fetch notification stats:", error);
      }
    };

    // Fetch on mount and when user changes
    if (user) {
      fetchUnreadCount();
      
      // Set up interval to refresh every 30 seconds
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user]);
  
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
  
  // Debug logging for development troubleshooting
  if (process.env.NODE_ENV === 'development') {
    console.log('Sidebar Debug:', {
      asPath: router.asPath,
      query: router.query,
      isEventContext,
      currentEventSlug,
      eventsLength: events.length
    });
  }

  // Memoize navigation building logic to improve performance
  const { globalNav, eventNav, showEventNav } = useMemo(() => {
    // Global navigation (always visible except in system admin)
    let globalNavItems: Array<{
      title: string;
      url: string;
      icon?: LucideIcon;
      isActive?: boolean;
      items?: Array<{ title: string; url: string; }>;
    }> = [];
    let eventNavItems: Array<{
      title: string;
      url: string;
      icon?: LucideIcon;
      isActive?: boolean;
      items?: Array<{ title: string; url: string; }>;
    }> = [];
    let shouldShowEventNav = false;

    if (isSystemAdmin && isSuperAdmin) {
      // System Admin Navigation (replaces everything)
      globalNavItems = [
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
      globalNavItems = [
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
          // TODO: Add badge support to NavMain component to show unread count
          // badge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount.toString()) : undefined,
        },
      ];

      // Add System Admin link if user is SuperAdmin
      if (isSuperAdmin) {
        globalNavItems.push({
          title: "System Admin",
          url: "/admin/dashboard",
          icon: Shield,
        });
      }

      // Event-specific navigation
      let targetEventSlug = currentEventSlug;

      if (isEventContext && currentEventSlug) {
        // In event context with a specific event
        targetEventSlug = currentEventSlug;
        shouldShowEventNav = true;
      } else if (!isEventContext && selectedEventSlug && events.length > 0) {
        // On global dashboard - show navigation for the user's selected event
        targetEventSlug = selectedEventSlug;
        shouldShowEventNav = true;
      } else if (isEventContext && !currentEventSlug) {
        // Show loading state for event navigation when in event context but slug not yet available
        shouldShowEventNav = true;
        eventNavItems = [
          {
            title: "Loading...",
            url: "#",
            icon: Home,
          },
        ];
      }

      if (shouldShowEventNav && targetEventSlug) {
        // Get user's role for the target event
        const targetEvent = events.find(event => event.url.includes(targetEventSlug));
        const userEventRole = targetEvent?.role;
        
        // Check role permissions
        const isEventAdmin = userEventRole === 'Admin' || isSuperAdmin;
        const isEventResponder = userEventRole === 'Responder' || isEventAdmin;

        // Base navigation items (available to all roles)
        eventNavItems = [
          {
            title: "Event Dashboard",
            url: `/events/${targetEventSlug}/dashboard`,
            icon: Home,
            isActive: router.asPath === `/events/${targetEventSlug}/dashboard`,
          },
          {
            title: "Reports",
            url: `/events/${targetEventSlug}/reports`,
            icon: ClipboardList,
            items: [
              {
                title: "All Reports",
                url: `/events/${targetEventSlug}/reports`,
              },
              {
                title: "Submit Report",
                url: `/events/${targetEventSlug}/reports/new`,
              },
            ],
          },
        ];

        // Team section (Responders and Admins only)
        if (isEventResponder) {
          const teamItems = [
            {
              title: "Team Members",
              url: `/events/${targetEventSlug}/team`,
            },
          ];

          // Send Invites only for Admins
          if (isEventAdmin) {
            teamItems.push({
              title: "Send Invites",
              url: `/events/${targetEventSlug}/team/invite`,
            });
          }

          eventNavItems.push({
            title: "Team",
            url: `/events/${targetEventSlug}/team`,
            icon: Users,
            items: teamItems,
          });
        }

        // Event Settings (Admins only)
        if (isEventAdmin) {
          eventNavItems.push({
            title: "Event Settings",
            url: `/events/${targetEventSlug}/settings`,
            icon: Settings2,
            items: [
              {
                title: "General Settings",
                url: `/events/${targetEventSlug}/settings`,
              },
              {
                title: "Code of Conduct",
                url: `/events/${targetEventSlug}/settings/code-of-conduct`,
              },
              {
                title: "Notifications",
                url: `/events/${targetEventSlug}/settings/notifications`,
              },
            ],
          });
        }
      }
    }

    return {
      globalNav: globalNavItems,
      eventNav: eventNavItems,
      showEventNav: shouldShowEventNav,
    };
  }, [
    isSystemAdmin,
    isSuperAdmin,
    router.asPath,
    isEventContext,
    currentEventSlug,
    selectedEventSlug,
    events,
  ]);

  // Collapsed event switcher: just the icon, opens the dropdown
  const CollapsedEventSwitcher = () => {
    if (!events.length) return null;
    return (
      <div className="flex flex-col items-center py-2">
        <NavEvents events={events} collapsed selectedEventSlug={selectedEventSlug} />
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
        <NavMain items={globalNav} label={isSystemAdmin ? "System" : "Platform"} />
        
        {/* Event Navigation Section (only show if not in system admin) */}
        {!isSystemAdmin && (
          <>
            {/* Event Switcher */}
            {state === "expanded" && <NavEvents events={events} selectedEventSlug={selectedEventSlug} />}
            
            {/* Event-specific Navigation - tighter integration with event picker */}
            {(showEventNav || eventNav.length > 0) && (
              <div className="mt-0">
                <NavMain items={eventNav} label="" />
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
