import React, { useState, useEffect, useMemo } from "react"
import {
  BookOpen,
  Building2,
  ClipboardList,
  Home,
  Settings2,
  Users,
  Shield,
  type LucideIcon,
} from "lucide-react"
import { useRouter } from "next/router"

import { NavMain } from "@/components/nav-main"
import { NavEvents } from "@/components/nav-projects"
import { NavOrganizations } from "@/components/nav-organizations"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"

export function AppSidebar({ user, events, organizations, globalRoles, ...props }: {
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
  organizations: {
    name: string
    slug: string
    role?: string
  }[]
  globalRoles?: string[]
} & React.ComponentProps<typeof Sidebar>) {
  const { state } = useSidebar();
  const router = useRouter();
  
  // Track the user's selected event (persists when navigating out of event context)
  const [selectedEventSlug, setSelectedEventSlug] = useState<string | null>(null);
  
  // Track the user's selected organization (persists when navigating out of org context)
  const [selectedOrgSlug, setSelectedOrgSlug] = useState<string | null>(null);
  
  // Track unread notification count
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // Use globalRoles from props, fallback to empty array
  const currentGlobalRoles = globalRoles || [];
  
  // Update selected event when in event context
  useEffect(() => {
    const eventSlugMatch = router.asPath.match(/^\/events\/([^/]+)/);
    const currentEventSlug = eventSlugMatch ? eventSlugMatch[1] : null;
    
    if (currentEventSlug) {
      setSelectedEventSlug(currentEventSlug);
    }
  }, [router.asPath]);
  
  // Update selected organization when in organization context
  useEffect(() => {
    const orgSlugMatch = router.asPath.match(/^\/orgs\/([^/]+)/);
    const currentOrgSlug = orgSlugMatch ? orgSlugMatch[1] : null;
    
    if (currentOrgSlug) {
      setSelectedOrgSlug(currentOrgSlug);
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

  // Initialize selected organization to first available organization if none selected
  useEffect(() => {
    if (!selectedOrgSlug && organizations.length > 0) {
      setSelectedOrgSlug(organizations[0].slug);
    }
  }, [organizations, selectedOrgSlug]);

  // Fetch unread notification count and global roles
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch notification stats
        const notificationResponse = await fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/users/me/notifications/stats",
          { credentials: "include" }
        );
        if (notificationResponse.ok) {
          const notificationData = await notificationResponse.json();
          setUnreadCount(notificationData.unread || 0);
        }

        // NOTE: Removed the events fetch here since events are passed as props
        // This was causing infinite re-renders and excessive API calls
        
      } catch (error) {
        console.warn("Failed to fetch user data:", error);
      }
    };

    // Fetch on mount and when user changes
    if (user) {
      fetchUserData();
      
      // Set up interval to refresh every 2 minutes (reduced from 30 seconds to reduce API load)
      const interval = setInterval(fetchUserData, 120000);
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
  const isOrgContext = router.asPath.startsWith('/orgs/');
  
  // Check if user is SuperAdmin using global roles
  const isSuperAdmin = currentGlobalRoles.includes('SuperAdmin');

  // Get current event slug if in event context
  // Try router.query first (more reliable for dynamic routes), then fall back to asPath parsing
  const currentEventSlug = isEventContext 
    ? (router.query.eventSlug as string) || router.asPath.split('/')[2] 
    : null;
  
  // Memoize navigation building logic to improve performance
  const { globalNav, orgNav, eventNav, showOrgNav, showEventNav } = useMemo(() => {
    // Global navigation (always visible except in system admin)
    let globalNavItems: Array<{
      title: string;
      url: string;
      icon?: LucideIcon;
      isActive?: boolean;
      badge?: string;
      items?: Array<{ title: string; url: string; }>;
    }> = [];
    let orgNavItems: Array<{
      title: string;
      url: string;
      icon?: LucideIcon;
      isActive?: boolean;
      badge?: string;
      items?: Array<{ title: string; url: string; }>;
    }> = [];
    let eventNavItems: Array<{
      title: string;
      url: string;
      icon?: LucideIcon;
      isActive?: boolean;
      badge?: string;
      items?: Array<{ title: string; url: string; }>;
    }> = [];
    let shouldShowOrgNav = false;
    let shouldShowEventNav = false;

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
        badge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount.toString()) : undefined,
      },
    ];

    // Add System Admin Navigation for SuperAdmins (always visible)
    if (isSuperAdmin) {
      globalNavItems.push(
        {
          title: "System Dashboard",
          url: "/admin/dashboard",
          icon: Shield,
          isActive: router.asPath === "/admin/dashboard",
        },
        {
          title: "Organizations",
          url: "/admin/organizations",
          icon: Building2,
          isActive: router.asPath.startsWith("/admin/organizations"),
          items: [
            {
              title: "All Organizations",
              url: "/admin/organizations",
            },
            {
              title: "Create Organization",
              url: "/admin/organizations/new",
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
        }
      );
    }

    // Organization-specific navigation
    let targetOrgSlug = isOrgContext ? router.asPath.split('/')[2] : null;
    
    if (isOrgContext && targetOrgSlug) {
      // In organization context with a specific organization
      shouldShowOrgNav = true;
    } else if (!isOrgContext && selectedOrgSlug && organizations.length > 0) {
      // On global dashboard - show navigation for the user's selected organization
      targetOrgSlug = selectedOrgSlug;
      shouldShowOrgNav = true;
    }
    
    if (shouldShowOrgNav && targetOrgSlug) {
      
      // Get user's role for the target organization
      const targetOrg = organizations.find(org => org.slug === targetOrgSlug);
      const userOrgRole = targetOrg?.role;
      
      // Check role permissions
      const isOrgAdmin = userOrgRole === 'org_admin' || isSuperAdmin;
      
      // Base navigation items (available to all org members)
      orgNavItems = [
        {
          title: "Organization Dashboard",
          url: `/orgs/${targetOrgSlug}`,
          icon: Home,
          isActive: router.asPath === `/orgs/${targetOrgSlug}`,
        },
        {
          title: "Events",
          url: `/orgs/${targetOrgSlug}/events`,
          icon: ClipboardList,
          isActive: router.asPath.startsWith(`/orgs/${targetOrgSlug}/events`),
        },
        {
          title: "Reports Overview",
          url: `/orgs/${targetOrgSlug}/reports`,
          icon: BookOpen,
          isActive: router.asPath.startsWith(`/orgs/${targetOrgSlug}/reports`),
        },
        {
          title: "Team",
          url: `/orgs/${targetOrgSlug}/team`,
          icon: Users,
          isActive: router.asPath.startsWith(`/orgs/${targetOrgSlug}/team`),
        },
      ];

      // Organization Settings (Admins only)
      if (isOrgAdmin) {
        orgNavItems.push({
          title: "Organization Settings",
          url: `/orgs/${targetOrgSlug}/settings`,
          icon: Settings2,
          isActive: router.asPath.startsWith(`/orgs/${targetOrgSlug}/settings`),
        });
      }
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
                title: "My Reports",
                url: `/events/${targetEventSlug}/my-reports`,
              },
              // Add "All Reports" for Responders and Admins
              ...(isEventResponder ? [{
                title: "All Reports",
                url: `/events/${targetEventSlug}/reports`,
              }] : []),
              {
                title: "Submit Report",
                url: `/events/${targetEventSlug}/reports/new`,
              },
            ],
          },
        ];

        // Users section (Responders and Admins only)
        if (isEventResponder) {
          const teamItems = [
            {
              title: "User List",
              url: `/events/${targetEventSlug}/team`,
            },
          ];

          if (isEventAdmin) {
            teamItems.push({
              title: "Invite Users",
              url: `/events/${targetEventSlug}/team/invite`,
            });
          }

          eventNavItems.push({
            title: "Users",
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

    return {
      globalNav: globalNavItems,
      orgNav: orgNavItems,
      eventNav: eventNavItems,
      showOrgNav: shouldShowOrgNav,
      showEventNav: shouldShowEventNav,
    };
  }, [
    isSystemAdmin,
    isSuperAdmin,
    router.asPath,
    isEventContext,
    isOrgContext,
    currentEventSlug,
    selectedEventSlug,
    selectedOrgSlug,
    events,
    organizations,
    user,
    unreadCount,
    currentGlobalRoles,
  ]);

  // Collapsed organization switcher: just the icon, opens the dropdown
  const CollapsedOrgSwitcher = () => {
    if (!organizations.length) return null;
    return (
      <div className="flex flex-col items-center py-2">
        <NavOrganizations organizations={organizations} collapsed selectedOrgSlug={selectedOrgSlug} />
      </div>
    );
  };

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
        {/* Global Navigation (includes system admin navigation for SuperAdmins) */}
        <NavMain items={globalNav} label="Platform" />
        
        {/* Organization Navigation Section */}
        {organizations.length > 0 && (
          <>
            {/* Organization Switcher */}
            {state === "expanded" && <NavOrganizations organizations={organizations} selectedOrgSlug={selectedOrgSlug} />}
            
            {/* Organization-specific Navigation */}
            {(showOrgNav || orgNav.length > 0) && (
              <div className="mt-0">
                <NavMain items={orgNav} label="" />
              </div>
            )}
          </>
        )}
        
        {/* Event Navigation Section */}
        <>
          {/* Event Switcher */}
          {state === "expanded" && <NavEvents events={events} selectedEventSlug={selectedEventSlug} />}
          
          {/* Event-specific Navigation */}
          {(showEventNav || eventNav.length > 0) && (
            <div className="mt-0">
              <NavMain items={eventNav} label="" />
            </div>
          )}
        </>
      </SidebarContent>
      {state === "collapsed" && (
        <>
          {organizations.length > 0 && <CollapsedOrgSwitcher />}
          <CollapsedEventSwitcher />
        </>
      )}
      <SidebarFooter>
        <NavUser user={{ ...user, avatar: user.avatar || "", roles: user.roles || [] }} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
