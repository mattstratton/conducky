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
import { Input } from '@/components/ui/input';
import { 
  Calendar, 
  Plus, 
  Search, 
  Filter,
  MoreHorizontal,
  ExternalLink
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    reports: number;
    userEventRoles: number;
  };
}

export default function OrganizationEvents() {
  const router = useRouter();
  const { orgSlug } = router.query;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgSlug || typeof orgSlug !== 'string') return;

    const fetchData = async () => {
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
        
        // Fetch organization events from API
        const eventsResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/organizations/${orgData.organization.id}/events`,
          { credentials: 'include' }
        );
        
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setEvents(eventsData.events || []);
          setFilteredEvents(eventsData.events || []);
        } else {
          console.error('Failed to fetch organization events:', eventsResponse.status);
          // Fall back to empty array if API call fails
          setEvents([]);
          setFilteredEvents([]);
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load organization data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgSlug]);

  // Filter events based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredEvents(events);
    } else {
      const filtered = events.filter(event =>
        event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        event.slug.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEvents(filtered);
    }
  }, [searchTerm, events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading events...</p>
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

  const getEventStatus = (event: Event) => {
    if (event._count.reports > 0) {
      return { label: 'Active', variant: 'destructive' as const };
    }
    return { label: 'Quiet', variant: 'secondary' as const };
  };

  return (
    <>
      <Head>
        <title>Events - {organization.name}</title>
      </Head>
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Events</h1>
            <p className="text-muted-foreground">
              Manage events in {organization.name}
            </p>
          </div>
          <Button asChild>
            <Link href={`/orgs/${orgSlug}/events/new`}>
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Link>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm ? 'No events found' : 'No events yet'}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm 
                  ? 'Try adjusting your search terms'
                  : 'Create your first event to get started with incident management'
                }
              </p>
              {!searchTerm && (
                <Button asChild>
                  <Link href={`/orgs/${orgSlug}/events/new`}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => {
              const status = getEventStatus(event);
              return (
                <Card key={event.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{event.name}</CardTitle>
                      <CardDescription className="mt-1">
                        Created {new Date(event.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/events/${event.slug}/dashboard`}>
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open Event
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/events/${event.slug}/settings`}>
                            Edit Settings
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Reports</span>
                        <span className="text-sm font-medium">{event._count.reports}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Team Members</span>
                        <span className="text-sm font-medium">{event._count.userEventRoles}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Last Updated</span>
                        <span className="text-sm font-medium">
                          {new Date(event.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2 mt-4">
                      <Button asChild size="sm" className="flex-1">
                        <Link href={`/events/${event.slug}/dashboard`}>
                          Manage
                        </Link>
                      </Button>
                      
                      {event._count.reports > 0 && (
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/events/${event.slug}/reports`}>
                            View Reports
                          </Link>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Summary Stats */}
        {filteredEvents.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{filteredEvents.length}</div>
                  <div className="text-sm text-muted-foreground">Total Events</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {filteredEvents.reduce((sum, event) => sum + event._count.reports, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Reports</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {filteredEvents.reduce((sum, event) => sum + event._count.userEventRoles, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Team Members</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {filteredEvents.filter(event => event._count.reports > 0).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Active Events</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
} 