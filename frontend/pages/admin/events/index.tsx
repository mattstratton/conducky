import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Eye, 
  Edit, 
  Power, 
  PowerOff, 
  Users, 
  FileText, 
  Calendar,
  AlertCircle,
  ChevronDown,
  MoreHorizontal
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  contactEmail: string;
  website?: string;
  userCount: number;
  reportCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastActivity?: string;
}

interface EventsData {
  events: Event[];
  statistics: {
    totalEvents: number;
    activeEvents: number;
    totalUsers: number;
    totalReports: number;
  };
}

export default function SystemEventsManagement() {
  const router = useRouter();
  const [data, setData] = useState<EventsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchEventsData();
  }, []);

  const fetchEventsData = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/admin/events',
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status} ${response.statusText}`);
      }

      const eventsData = await response.json();
      setData(eventsData);
    } catch (error: unknown) {
      console.error('Error fetching events:', error);
      setError(error instanceof Error ? error.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const toggleEventStatus = async (eventId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/admin/events/${eventId}/toggle`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ enabled: !currentStatus }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to toggle event status');
      }

      // Refresh the data
      await fetchEventsData();
    } catch (error) {
      console.error('Error toggling event status:', error);
      // You could add a toast notification here
    }
  };

  const filteredEvents = data?.events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && event.isActive) ||
                         (statusFilter === 'inactive' && !event.isActive);
    return matchesSearch && matchesStatus;
  }) || [];

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getEventStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Active
      </Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100">
        Inactive
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Events Management</h1>
            <p className="text-gray-600">Loading events...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-8 bg-gray-200 rounded w-16 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-32"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Events Management</h1>
          </div>
          <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
          <Button 
            onClick={fetchEventsData} 
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Events Management - Conducky Admin</title>
        <meta name="description" content="Manage all events in the system" />
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Events Management</h1>
              <p className="text-gray-600">Manage all events in the system</p>
            </div>
            <Button onClick={() => router.push('/admin/events/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.statistics.totalEvents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  All events in system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Events</CardTitle>
                <Power className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data?.statistics.activeEvents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Currently active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.statistics.totalUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Across all events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.statistics.totalReports || 0}</div>
                <p className="text-xs text-muted-foreground">
                  All-time reports
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Events</CardTitle>
              <CardDescription>
                Search and filter events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search events by name or slug..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      Status: {statusFilter === 'all' ? 'All' : statusFilter === 'active' ? 'Active' : 'Inactive'}
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setStatusFilter('all')}>
                      All Events
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                      Active Only
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                      Inactive Only
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>

          {/* Desktop Table */}
          <div className="hidden md:block">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead>Reports</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{event.name}</div>
                            <div className="text-sm text-muted-foreground">/{event.slug}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getEventStatusBadge(event.isActive)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                            {event.userCount}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <FileText className="h-4 w-4 mr-1 text-muted-foreground" />
                            {event.reportCount}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(event.createdAt)}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/events/${event.slug}/dashboard`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Event
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/events/${event.id}/edit`}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => toggleEventStatus(event.id, event.isActive)}
                              >
                                {event.isActive ? (
                                  <>
                                    <PowerOff className="h-4 w-4 mr-2" />
                                    Disable
                                  </>
                                ) : (
                                  <>
                                    <Power className="h-4 w-4 mr-2" />
                                    Enable
                                  </>
                                )}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-4">
            {filteredEvents.map((event) => (
              <Card key={event.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{event.name}</CardTitle>
                    {getEventStatusBadge(event.isActive)}
                  </div>
                  <CardDescription>/{event.slug}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-1 text-muted-foreground" />
                      {event.userCount} users
                    </div>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1 text-muted-foreground" />
                      {event.reportCount} reports
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Created {formatDate(event.createdAt)}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/events/${event.slug}/dashboard`}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/admin/events/${event.id}/edit`}>
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Link>
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleEventStatus(event.id, event.isActive)}
                    >
                      {event.isActive ? (
                        <>
                          <PowerOff className="h-4 w-4 mr-1" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-1" />
                          Enable
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Empty State */}
          {filteredEvents.length === 0 && !loading && (
            <Card>
              <CardContent className="text-center py-12">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No events found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No events match your current filters.' 
                    : 'Get started by creating your first event.'}
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <Button onClick={() => router.push('/admin/events/new')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Event
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
} 