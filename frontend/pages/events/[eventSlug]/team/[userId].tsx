import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, ClockIcon, FileTextIcon, MessageSquareIcon, ShieldIcon } from 'lucide-react';
import { AppBreadcrumbs } from '@/components/AppBreadcrumbs';

interface UserProfile {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  roles: string[];
  joinDate: string;
  lastActivity: string | null;
}

interface Activity {
  id: string;
  type: 'report' | 'comment' | 'audit';
  action: string;
  title: string;
  details: {
    body?: string;
    type?: string;
    state?: string;
    targetType?: string;
    targetId?: string;
  };
  timestamp: string;
}

interface Report {
  id: string;
  title: string;
  type: string;
  state: string;
  urgency: string;
  createdAt: string;
}

export default function TeamMemberProfile() {
  const router = useRouter();
  const { eventSlug, userId } = router.query;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!eventSlug || !userId) return;

    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

        // Fetch user profile
        const profileRes = await fetch(`${apiUrl}/api/events/slug/${eventSlug}/users/${userId}`, {
          credentials: 'include'
        });

        if (!profileRes.ok) {
          if (profileRes.status === 403) {
            setError('You do not have permission to view this user profile.');
            return;
          }
          if (profileRes.status === 404) {
            setError('User not found in this event.');
            return;
          }
          throw new Error('Failed to fetch user profile');
        }

        const profileData = await profileRes.json();
        setProfile(profileData);

        // Fetch user activity
        const activityRes = await fetch(`${apiUrl}/api/events/slug/${eventSlug}/users/${userId}/activity?page=1&limit=10`, {
          credentials: 'include'
        });

        if (activityRes.ok) {
          const activityData = await activityRes.json();
          setActivities(activityData.activities || []);
        }

        // Fetch user reports
        const reportsRes = await fetch(`${apiUrl}/api/events/slug/${eventSlug}/users/${userId}/reports?page=1&limit=10`, {
          credentials: 'include'
        });

        if (reportsRes.ok) {
          const reportsData = await reportsRes.json();
          setReports(reportsData.reports || []);
        }

      } catch (err) {
        console.error('Error fetching user profile:', err);
        setError('Failed to load user profile. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [eventSlug, userId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'superadmin': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800';
      case 'responder': return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800';
      case 'reporter': return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
      default: return 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'report': return <FileTextIcon className="h-4 w-4" />;
      case 'comment': return <MessageSquareIcon className="h-4 w-4" />;
      case 'audit': return <ShieldIcon className="h-4 w-4" />;
      default: return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case 'submitted': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'resolved': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="h-16 w-16 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-6 bg-gray-200 rounded w-48"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <AppBreadcrumbs />
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Error</h2>
                <p className="text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => router.back()}>Go Back</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="w-full max-w-6xl mx-auto">
        <AppBreadcrumbs />

        {/* User Profile Header */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6">
              <Avatar className="h-20 w-20">
                {profile.user.avatarUrl && (
                  <AvatarImage 
                    src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api${profile.user.avatarUrl}`} 
                    alt={profile.user.name} 
                  />
                )}
                <AvatarFallback className="text-lg">
                  {profile.user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{profile.user.name}</h1>
                <p className="text-muted-foreground mb-3">{profile.user.email}</p>
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {profile.roles.map((role) => (
                    <Badge key={role} className={getRoleColor(role)}>
                      {role}
                    </Badge>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Joined:</span>
                    <span>{formatDate(profile.joinDate)}</span>
                  </div>
                  {profile.lastActivity && (
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Last active:</span>
                      <span>{formatDateTime(profile.lastActivity)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for different sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Role Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {profile.roles.map((role) => (
                      <div key={role} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">{role}</span>
                        <Badge className={getRoleColor(role)}>{role}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Reports:</span>
                      <span className="font-medium">{reports.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Recent Activities:</span>
                      <span className="font-medium">{activities.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Member Since:</span>
                      <span className="font-medium">{formatDate(profile.joinDate)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {activities.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No recent activity found.</p>
                ) : (
                  <div className="space-y-4">
                    {activities.map((activity) => (
                      <div key={activity.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex-shrink-0 mt-1">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{activity.title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{activity.action}</p>
                          {activity.details && activity.details.body && (
                            <p className="text-sm text-muted-foreground/80 mt-1">{activity.details.body}</p>
                          )}
                          <p className="text-xs text-muted-foreground/60 mt-2">{formatDateTime(activity.timestamp)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {reports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No reports found.</p>
                ) : (
                  <div className="space-y-4">
                    {reports.map((report) => (
                      <div key={report.id} className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                           onClick={() => router.push(`/events/${eventSlug}/reports/${report.id}`)}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{report.title}</h3>
                            <div className="flex items-center space-x-2 mt-2">
                              <Badge variant="outline">{report.type}</Badge>
                              <Badge className={getStateColor(report.state)}>{report.state}</Badge>
                              {report.urgency && (
                                <Badge variant="outline">{report.urgency}</Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">{formatDate(report.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 