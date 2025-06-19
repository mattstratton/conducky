import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { useNavigation } from '@/context/NavigationContext';
import { Home, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AppBreadcrumbsProps {
  eventName?: string;
  className?: string;
}

export function AppBreadcrumbs({ eventName, className }: AppBreadcrumbsProps) {
  const router = useRouter();
  const { currentContext, addFavorite, isFavorite, removeFavorite } = useNavigation();
  const pathname = router.pathname;
  const query = router.query;

  // Don't show breadcrumbs on certain pages
  const hiddenPaths = ['/', '/login', '/register', '/forgot-password', '/reset-password'];
  if (hiddenPaths.includes(pathname)) {
    return null;
  }

  const breadcrumbs: Array<{ label: string; href?: string }> = [];

  // Always start with Dashboard for authenticated users
  breadcrumbs.push({ label: 'Dashboard', href: '/dashboard' });

  // Handle different route patterns
  if (pathname.startsWith('/admin')) {
    // Admin routes
    breadcrumbs[0] = { label: 'System Admin', href: '/admin/dashboard' };
    
    if (pathname === '/admin/dashboard') {
      breadcrumbs.push({ label: 'Dashboard' });
    } else if (pathname.startsWith('/admin/events')) {
      breadcrumbs.push({ label: 'Events', href: '/admin/events' });
      
      if (pathname === '/admin/events/new') {
        breadcrumbs.push({ label: 'New Event' });
      } else if (pathname.includes('/edit')) {
        breadcrumbs.push({ label: 'Edit Event' });
      } else if (pathname.includes('/settings')) {
        breadcrumbs.push({ label: 'Settings' });
      }
    } else if (pathname.startsWith('/admin/system')) {
      breadcrumbs.push({ label: 'System', href: '/admin/system' });
      
      if (pathname.includes('/settings')) {
        breadcrumbs.push({ label: 'Settings' });
      } else if (pathname.includes('/backups')) {
        breadcrumbs.push({ label: 'Backups' });
      } else if (pathname.includes('/logs')) {
        breadcrumbs.push({ label: 'Logs' });
      }
    } else if (pathname.startsWith('/admin/users')) {
      breadcrumbs.push({ label: 'Users', href: '/admin/users' });
    }
  } else if (pathname.startsWith('/events/')) {
    // Event-scoped routes
    const eventSlug = query.eventSlug as string;
    
    if (eventSlug && eventName) {
      breadcrumbs.push({ 
        label: eventName, 
        href: `/events/${eventSlug}/dashboard` 
      });
      
      if (pathname.includes('/reports')) {
        breadcrumbs.push({ 
          label: 'Reports', 
          href: `/events/${eventSlug}/reports` 
        });
        
        if (pathname.includes('/new')) {
          breadcrumbs.push({ label: 'New Report' });
        } else if (query.reportId) {
          breadcrumbs.push({ label: 'Report Details' });
        }
      } else if (pathname.includes('/team')) {
        breadcrumbs.push({ 
          label: 'Team', 
          href: `/events/${eventSlug}/team` 
        });
        
        if (pathname.includes('/invite')) {
          breadcrumbs.push({ label: 'Invite Members' });
        } else if (query.userId) {
          breadcrumbs.push({ label: 'User Details' });
        }
      } else if (pathname.includes('/settings')) {
        breadcrumbs.push({ 
          label: 'Settings', 
          href: `/events/${eventSlug}/settings` 
        });
        
        if (pathname.includes('/code-of-conduct')) {
          breadcrumbs.push({ label: 'Code of Conduct' });
        } else if (pathname.includes('/notifications')) {
          breadcrumbs.push({ label: 'Notifications' });
        }
      } else if (pathname.includes('/code-of-conduct')) {
        breadcrumbs.push({ label: 'Code of Conduct' });
      }
    }
  } else if (pathname.startsWith('/dashboard')) {
    // Global dashboard routes
    if (pathname === '/dashboard/reports') {
      breadcrumbs.push({ label: 'All Reports' });
    } else if (pathname === '/dashboard/notifications') {
      breadcrumbs.push({ label: 'Notifications' });
    }
  } else if (pathname.startsWith('/profile')) {
    // Profile routes
    breadcrumbs.push({ label: 'Profile', href: '/profile' });
    
    if (pathname === '/profile/settings') {
      breadcrumbs.push({ label: 'Settings' });
    } else if (pathname === '/profile/events') {
      breadcrumbs.push({ label: 'Events' });
    }
  } else if (pathname.startsWith('/invite/')) {
    // Invite acceptance
    breadcrumbs.push({ label: 'Accept Invite' });
  }

  // Don't render if we only have one breadcrumb (just Dashboard)
  if (breadcrumbs.length <= 1) {
    return null;
  }

  // Get current page info for favorites
  const currentPage = breadcrumbs[breadcrumbs.length - 1];
  const currentPageUrl = currentPage?.href || pathname; // Use current pathname if no href
  const currentPageFavorited = isFavorite(currentPageUrl);

  const handleFavoriteToggle = () => {
    if (currentPageFavorited) {
      removeFavorite(currentPageUrl);
    } else {
      addFavorite({
        title: currentPage.label,
        href: currentPageUrl,
        context: currentContext,
      });
    }
  };

  return (
    <div className={cn("flex items-center gap-2 ml-4", className)}>
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={index}>
              {index > 0 && <BreadcrumbSeparator><ChevronRight className="h-4 w-4" /></BreadcrumbSeparator>}
              <BreadcrumbItem>
                {crumb.href && index < breadcrumbs.length - 1 ? (
                  <BreadcrumbLink asChild>
                    <Link href={crumb.href} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
                      {index === 0 && <Home className="h-3 w-3" />}
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="text-sm font-medium flex items-center gap-1">
                    {index === 0 && <Home className="h-3 w-3" />}
                    {crumb.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
      
      {/* Quick Jump hint for desktop */}
      <div className="hidden md:flex items-center gap-2 ml-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1 px-2 py-1 bg-muted/50 rounded">
          <span>Press</span>
          <kbd className="px-1 py-0.5 bg-background border rounded text-xs">Ctrl+K</kbd>
          <span>to search</span>
        </div>
      </div>
      
      {/* Favorite button for current page */}
      {currentPage && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleFavoriteToggle}
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
          title={currentPageFavorited ? "Remove from favorites" : "Add to favorites"}
        >
          <svg
            className="h-3 w-3"
            fill={currentPageFavorited ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </Button>
      )}
    </div>
  );
} 