import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';

interface AppBreadcrumbsProps {
  eventName?: string;
}

export function AppBreadcrumbs({ eventName }: AppBreadcrumbsProps) {
  const router = useRouter();
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

  return (
    <Breadcrumb className="ml-4">
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <BreadcrumbSeparator />}
            <BreadcrumbItem>
              {crumb.href && index < breadcrumbs.length - 1 ? (
                <BreadcrumbLink asChild>
                  <Link href={crumb.href} className="text-sm text-muted-foreground hover:text-foreground">
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="text-sm font-medium">
                  {crumb.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </React.Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
} 