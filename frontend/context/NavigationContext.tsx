import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';

interface NavigationItem {
  title: string;
  href: string;
  icon?: string;
  context?: 'global' | 'event' | 'admin';
  timestamp?: number;
}

interface QuickJumpItem extends NavigationItem {
  description?: string;
  category?: 'recent' | 'shortcut' | 'favorite';
}

interface NavigationContextType {
  // Current navigation state
  currentContext: 'global' | 'event' | 'admin';
  currentEventSlug?: string;
  currentEventName?: string;
  
  // Recent pages
  recentPages: NavigationItem[];
  addRecentPage: (item: NavigationItem) => void;
  
  // Quick jump functionality
  quickJumpItems: QuickJumpItem[];
  searchQuickJump: (query: string) => QuickJumpItem[];
  
  // Favorites
  favorites: NavigationItem[];
  addFavorite: (item: NavigationItem) => void;
  removeFavorite: (href: string) => void;
  isFavorite: (href: string) => boolean;
  
  // Navigation helpers
  navigateToEvent: (eventSlug: string) => void;
  navigateToReport: (eventSlug: string, reportId: string) => void;
  goBack: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}

interface NavigationProviderProps {
  children: React.ReactNode;
  user?: {
    id: string;
    name?: string;
    email?: string;
    roles?: string[];
  };
  events?: Array<{
    slug: string;
    name: string;
    role?: string;
  }>;
}

export function NavigationProvider({ children, user, events = [] }: NavigationProviderProps) {
  const router = useRouter();
  const [recentPages, setRecentPages] = useState<NavigationItem[]>([]);
  const [favorites, setFavorites] = useState<NavigationItem[]>([]);

  // Determine current context based on route
  const currentContext: 'global' | 'event' | 'admin' = React.useMemo(() => {
    if (router.pathname.startsWith('/admin')) return 'admin';
    if (router.pathname.startsWith('/events/')) return 'event';
    return 'global';
  }, [router.pathname]);

  // Get current event slug and name
  const currentEventSlug = React.useMemo(() => {
    if (currentContext === 'event') {
      const eventSlug = router.query.eventSlug;
      return Array.isArray(eventSlug) ? eventSlug[0] : eventSlug;
    }
    return undefined;
  }, [currentContext, router.query.eventSlug]);

  const currentEventName = React.useMemo(() => {
    if (currentEventSlug) {
      const event = events.find(e => e.slug === currentEventSlug);
      return event?.name;
    }
    return undefined;
  }, [currentEventSlug, events]);

  // Load favorites from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const stored = localStorage.getItem(`conducky_favorites_${user.id}`);
      if (stored) {
        try {
          setFavorites(JSON.parse(stored));
        } catch (e) {
          console.warn('Failed to parse stored favorites:', e);
        }
      }
    }
  }, [user?.id]);

  // Save favorites to localStorage with debouncing
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id) {
      const timeoutId = setTimeout(() => {
        if (favorites.length > 0) {
          localStorage.setItem(`conducky_favorites_${user.id}`, JSON.stringify(favorites));
        }
      }, 500); // Debounce by 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [favorites, user?.id]);

  // Add recent page when route changes with cleanup
  useEffect(() => {
    if (router.isReady && router.pathname !== '/') {
      const pageTitle = getPageTitle(router.pathname, router.query, currentEventName);
      if (pageTitle) {
        addRecentPage({
          title: pageTitle,
          href: router.asPath,
          context: currentContext,
          timestamp: Date.now(),
        });
      }
    }
  }, [router.asPath, router.isReady, currentContext, currentEventName]);

  // Add recent page function with improved cleanup
  const addRecentPage = useCallback((item: NavigationItem) => {
    setRecentPages(prev => {
      // Remove if already exists
      const filtered = prev.filter(page => page.href !== item.href);
      // Add to beginning
      const updated = [item, ...filtered];
      // Keep only last 10 items and clean up old entries (older than 7 days)
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      return updated
        .filter(page => !page.timestamp || page.timestamp > oneWeekAgo)
        .slice(0, 10);
    });
  }, []);

  // Favorites management
  const addFavorite = useCallback((item: NavigationItem) => {
    setFavorites(prev => {
      if (prev.some(fav => fav.href === item.href)) return prev;
      return [...prev, item];
    });
  }, []);

  const removeFavorite = useCallback((href: string) => {
    setFavorites(prev => prev.filter(fav => fav.href !== href));
  }, []);

  const isFavorite = useCallback((href: string) => {
    return favorites.some(fav => fav.href === href);
  }, [favorites]);

  // Generate quick jump items
  const quickJumpItems = React.useMemo((): QuickJumpItem[] => {
    const items: QuickJumpItem[] = [];

    // Add shortcuts
    items.push(
      { title: 'Dashboard', href: '/dashboard', category: 'shortcut', description: 'Global dashboard' },
      { title: 'All Reports', href: '/dashboard/reports', category: 'shortcut', description: 'Cross-event reports' },
      { title: 'Notifications', href: '/dashboard/notifications', category: 'shortcut', description: 'Your notifications' },
      { title: 'Profile', href: '/profile', category: 'shortcut', description: 'Your profile settings' }
    );

    // Add admin shortcuts for SuperAdmins
    if (user?.roles?.includes('SuperAdmin')) {
      items.push(
        { title: 'System Admin', href: '/admin/dashboard', category: 'shortcut', description: 'System administration' },
        { title: 'Manage Events', href: '/admin/events', category: 'shortcut', description: 'Event management' },
        { title: 'System Settings', href: '/admin/system/settings', category: 'shortcut', description: 'System configuration' }
      );
    }

    // Add event shortcuts
    events.forEach(event => {
      items.push(
        { 
          title: `${event.name} Dashboard`, 
          href: `/events/${event.slug}/dashboard`, 
          category: 'shortcut', 
          description: `${event.name} dashboard (${event.role})`,
          context: 'event'
        },
        { 
          title: `${event.name} Reports`, 
          href: `/events/${event.slug}/reports`, 
          category: 'shortcut', 
          description: `${event.name} reports`,
          context: 'event'
        }
      );
    });

    // Add favorites
    favorites.forEach(fav => {
      items.push({ ...fav, category: 'favorite' });
    });

    // Add recent pages
    recentPages.forEach(page => {
      items.push({ ...page, category: 'recent' });
    });

    return items;
  }, [user?.roles, events, favorites, recentPages]);

  // Search quick jump items
  const searchQuickJump = useCallback((query: string): QuickJumpItem[] => {
    if (!query.trim()) return quickJumpItems;
    
    const lowerQuery = query.toLowerCase();
    return quickJumpItems.filter(item => 
      item.title.toLowerCase().includes(lowerQuery) ||
      item.description?.toLowerCase().includes(lowerQuery)
    );
  }, [quickJumpItems]);

  // Navigation helpers with improved back button optimization
  const navigateToEvent = useCallback((eventSlug: string) => {
    router.push(`/events/${eventSlug}/dashboard`);
  }, [router]);

  const navigateToReport = useCallback((eventSlug: string, reportId: string) => {
    router.push(`/events/${eventSlug}/reports/${reportId}`);
  }, [router]);

  const goBack = useCallback(() => {
    // Smart back navigation - try to go to a meaningful parent page
    const currentPath = router.asPath;
    
    // If we're on a deep page, try to go to logical parent
    if (currentPath.includes('/reports/') && currentPath.match(/\/reports\/[^/]+$/)) {
      // From report detail to report list
      const eventSlug = router.query.eventSlug as string;
      if (eventSlug) {
        router.push(`/events/${eventSlug}/reports`);
        return;
      }
    }
    
    if (currentPath.includes('/events/') && currentPath.includes('/team/') && router.query.userId) {
      // From team member detail to team list
      const eventSlug = router.query.eventSlug as string;
      if (eventSlug) {
        router.push(`/events/${eventSlug}/team`);
        return;
      }
    }
    
    if (currentPath.includes('/admin/events/') && currentPath.includes('/edit')) {
      // From edit event to events list
      router.push('/admin/events');
      return;
    }
    
    // Default browser back if no smart navigation applies
    if (window.history.length > 1) {
      router.back();
    } else {
      // Fallback to dashboard if no history
      router.push('/dashboard');
    }
  }, [router]);

  const value: NavigationContextType = {
    currentContext,
    currentEventSlug,
    currentEventName,
    recentPages,
    addRecentPage,
    quickJumpItems,
    searchQuickJump,
    favorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    navigateToEvent,
    navigateToReport,
    goBack,
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

// Helper function to generate page titles
function getPageTitle(pathname: string, query: Record<string, string | string[] | undefined>, eventName?: string): string | null {
  // Skip certain paths
  const skipPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
  if (skipPaths.includes(pathname)) return null;

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/dashboard') return 'System Admin Dashboard';
    if (pathname === '/admin/events') return 'Manage Events';
    if (pathname === '/admin/events/new') return 'Create Event';
    if (pathname.includes('/admin/events/') && pathname.includes('/edit')) return 'Edit Event';
    if (pathname === '/admin/system/settings') return 'System Settings';
    if (pathname === '/admin/users') return 'Manage Users';
    return 'System Admin';
  }

  if (pathname.startsWith('/events/') && eventName) {
    if (pathname.includes('/dashboard')) return `${eventName} Dashboard`;
    if (pathname.includes('/reports/new')) return `${eventName} - New Report`;
    if (pathname.includes('/reports/') && query.reportId) return `${eventName} - Report #${query.reportId}`;
    if (pathname.includes('/reports')) return `${eventName} Reports`;
    if (pathname.includes('/team/invite')) return `${eventName} - Invite Team`;
    if (pathname.includes('/team/') && query.userId) return `${eventName} - Team Member`;
    if (pathname.includes('/team')) return `${eventName} Team`;
    if (pathname.includes('/settings')) return `${eventName} Settings`;
    if (pathname.includes('/code-of-conduct')) return `${eventName} Code of Conduct`;
    return eventName;
  }

  if (pathname === '/dashboard') return 'Dashboard';
  if (pathname === '/dashboard/reports') return 'All Reports';
  if (pathname === '/dashboard/notifications') return 'Notifications';
  if (pathname === '/profile') return 'Profile';
  if (pathname === '/profile/settings') return 'Profile Settings';
  if (pathname === '/profile/events') return 'My Events';

  return null;
} 