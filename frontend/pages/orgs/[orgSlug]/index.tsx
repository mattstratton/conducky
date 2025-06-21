import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Calendar, 
  Users, 
  ClipboardList, 
  Plus, 
  Settings, 
  ExternalLink,
  Activity
} from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  _count: {
    events: number;
    memberships: number;
  };
}

interface Event {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  createdAt: string;
  _count: {
    reports: number;
  };
}

interface ActivityItem {
  id: string;
  type: 'report' | 'event' | 'member';
  title: string;
  description: string;
  timestamp: string;
  eventSlug?: string;
}

export default function OrganizationDashboard() {
  const router = useRouter();
  const { orgSlug } = router.query;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgSlug || typeof orgSlug !== 'string') return;

    const fetchOrganizationData = async () => {
      try {
        setLoading(true);
        
        // Fetch organization details
        const orgResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/organizations/slug/${orgSlug}`,
          { credentials: 'include' }
        );
        
        if (!orgResponse.ok) {
          if (orgResponse.status === 404) {
            setError('Organization not found');
          } else if (orgResponse.status === 403) {
            setError('You do not have access to this organization');
          } else {
            setError('Failed to load organization');
          }
          return;
        }
        
        const orgData = await orgResponse.json();
        setOrganization(orgData.organization);
        
        // TODO: Fetch organization events when API is ready
        // For now, use mock data
        setEvents([
          {
            id: '1',
            name: 'DevConf Berlin 2025',
            slug: 'devconf-berlin-2025',
            organizationId: orgData.organization.id,
            createdAt: '2024-01-15T00:00:00Z',
            _count: { reports: 3 }
          },
          {
            id: '2', 
            name: 'PyCon Portland 2025',
            slug: 'pycon-portland-2025',
            organizationId: orgData.organization.id,
            createdAt: '2024-02-01T00:00:00Z',
            _count: { reports: 0 }
          }
        ]);
        
        // TODO: Fetch recent activity when API is ready
        setRecentActivity([
          {
            id: '1',
            type: 'report',
            title: 'New report submitted',
            description: 'DevConf Berlin - Harassment incident reported',
            timestamp: '2024-12-21T10:30:00Z',
            eventSlug: 'devconf-berlin-2025'
          },
          {
            id: '2',
            type: 'event',
            title: 'Event created',
            description: 'PyCon Portland 2025 added to organization',
            timestamp: '2024-12-20T14:15:00Z',
            eventSlug: 'pycon-portland-2025'
          }
        ]);
        
      } catch (err) {
        console.error('Error fetching organization data:', err);
        setError('Failed to load organization data');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganizationData();
  }, [orgSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Error</h1>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button 
            onClick={() => router.push('/dashboard')} 
            className="mt-4"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  if (!organization) {
    return null;
  }

  const activeEvents = events.filter(event => event._count.reports > 0);
  const totalReports = events.reduce((sum, event) => sum + event._count.reports, 0);

  return (
    <>
      <Head>
        <title>{organization.name} - Organization Dashboard</title>
      </Head>
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Organization Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
              {organization.logoUrl ? (
                <img 
                  src={organization.logoUrl} 
                  alt={organization.name}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <Building2 className="w-8 h-8 text-primary" />
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{organization.name}</h1>
              {organization.description && (
                <p className="text-muted-foreground mt-1">{organization.description}</p>
              )}
              {organization.website && (
                <a 
                  href={organization.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-primary hover:underline mt-2"
                >
                  {organization.website} <ExternalLink className="ml-1 w-4 h-4" />
                </a>
              )}
            </div>
          </div>
          <Button asChild>
            <Link href={`/orgs/${orgSlug}/settings`}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Link>
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Events</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organization._count.events}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalReports}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{organization._count.memberships}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Events</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeEvents.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Events and Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Events */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Events</CardTitle>
                <CardDescription>Recent events in this organization</CardDescription>
              </div>
              <Button asChild size="sm">
                <Link href={`/orgs/${orgSlug}/events`}>
                  View All
                </Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {events.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No events yet</p>
              ) : (
                events.slice(0, 3).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{event.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {event._count.reports} reports
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {event._count.reports > 0 && (
                        <Badge variant="secondary">
                          {event._count.reports} pending
                        </Badge>
                      )}
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/events/${event.slug}/dashboard`}>
                          Manage
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates across your organization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentActivity.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(item.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for organization management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Button asChild className="h-auto p-4 flex-col">
                <Link href={`/orgs/${orgSlug}/events/new`}>
                  <Plus className="w-6 h-6 mb-2" />
                  Create Event
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto p-4 flex-col">
                <Link href={`/orgs/${orgSlug}/team`}>
                  <Users className="w-6 h-6 mb-2" />
                  Manage Team
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto p-4 flex-col">
                <Link href={`/orgs/${orgSlug}/reports`}>
                  <ClipboardList className="w-6 h-6 mb-2" />
                  View Reports
                </Link>
              </Button>
              
              <Button asChild variant="outline" className="h-auto p-4 flex-col">
                <Link href={`/orgs/${orgSlug}/settings`}>
                  <Settings className="w-6 h-6 mb-2" />
                  Settings
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 