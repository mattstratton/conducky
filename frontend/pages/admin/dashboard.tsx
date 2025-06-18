import React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Plus, Users, FileText, Calendar, TrendingUp, AlertCircle } from 'lucide-react';



interface SystemStats {
  totalEvents: number;
  activeEvents: number;
  totalUsers: number;
  totalReports: number;
  reportsByState: Record<string, number>;
  recentActivity: Array<{
    id: string;
    title: string;
    state: string;
    eventName: string;
    eventSlug: string;
    createdAt: string;
  }>;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/admin/events/stats',
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch system stats: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setStats(data);
    } catch (error: unknown) {
      console.error('Error fetching system stats:', error);
      setError(error instanceof Error ? error.message : 'Failed to load system statistics');
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'resolved':
        return 'bg-green-100 text-green-800';
      case 'closed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">System Admin Dashboard</h1>
            <p className="text-gray-600">Loading system statistics...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
            <h1 className="text-3xl font-bold text-gray-900">System Admin Dashboard</h1>
          </div>
          <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
              <span className="text-red-800">{error}</span>
            </div>
          </div>
          <Button 
            onClick={fetchSystemStats} 
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
        <title>System Admin Dashboard - Conducky</title>
        <meta name="description" content="System administration dashboard for Conducky" />
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">System Admin Dashboard</h1>
              <p className="text-gray-600">Overview of all events and system activity</p>
            </div>
            <Button onClick={() => router.push('/admin/events/new')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalEvents || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.activeEvents || 0} active events
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
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
                <div className="text-2xl font-bold">{stats?.totalReports || 0}</div>
                <p className="text-xs text-muted-foreground">
                  All-time reports
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Health</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Healthy</div>
                <p className="text-xs text-muted-foreground">
                  All systems operational
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Reports by State */}
            <Card>
              <CardHeader>
                <CardTitle>Reports by State</CardTitle>
                <CardDescription>
                  Current status of all reports across events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.reportsByState && Object.entries(stats.reportsByState).map(([state, count]) => (
                    <div key={state} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge className={getStateColor(state)}>
                          {state.replace('_', ' ').toUpperCase()}
                        </Badge>
                      </div>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))}
                  {(!stats?.reportsByState || Object.keys(stats.reportsByState).length === 0) && (
                    <p className="text-sm text-gray-500">No reports yet</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Latest reports across all events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                    stats.recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-center justify-between border-b pb-2 last:border-b-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500">{activity.eventName}</span>
                            <Badge className={getStateColor(activity.state)}>
                              {activity.state.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 ml-4">
                          {formatDate(activity.createdAt)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common administrative tasks
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/admin/events')}
                    className="h-20 flex-col gap-2"
                  >
                    <Calendar className="h-6 w-6" />
                    Manage Events
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/admin/events/new')}
                    className="h-20 flex-col gap-2"
                  >
                    <Plus className="h-6 w-6" />
                    Create Event
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => router.push('/admin/system/settings')}
                    className="h-20 flex-col gap-2"
                  >
                    <TrendingUp className="h-6 w-6" />
                    System Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}

