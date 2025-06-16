import React, { useState, useEffect, useContext } from 'react';
import { UserContext } from '../_app';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { 
  Bell, 
  BellOff, 
  Check, 
  CheckCheck, 
  Trash2, 
  Filter,
  AlertCircle,
  Info,
  AlertTriangle,
  Zap,
  Calendar,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';

// User context type
interface User {
  id: string;
  email?: string;
  name?: string;
  roles?: string[];
  avatarUrl?: string;
}

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

interface Notification {
  id: string;
  type: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
  actionUrl?: string;
  event?: {
    id: string;
    name: string;
    slug: string;
  };
  report?: {
    id: string;
    title: string;
    state: string;
  };
}

interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byPriority: Record<string, number>;
}

const NotificationCenter: React.FC = () => {
  const { user } = useContext(UserContext) as UserContextType;
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string>('');
  const [error, setError] = useState('');
  
  // Filters and pagination
  const [currentTab, setCurrentTab] = useState('all');
  const [typeFilter, setTypeFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (currentTab === 'unread') {
        params.append('unreadOnly', 'true');
      }
      if (typeFilter) {
        params.append('type', typeFilter);
      }
      if (priorityFilter) {
        params.append('priority', priorityFilter);
      }

      const response = await fetch(`/api/users/me/notifications?${params}`);
      const data = await response.json();

      if (response.ok) {
        setNotifications(data.notifications);
        setTotalPages(data.pagination.totalPages);
      } else {
        setError(data.error || 'Failed to fetch notifications');
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch notification statistics
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/users/me/notifications/stats');
      const data = await response.json();

      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch notification stats:', err);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      setActionLoading(notificationId);
      
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId 
              ? { ...n, isRead: true, readAt: new Date().toISOString() }
              : n
          )
        );
        await fetchStats(); // Refresh stats
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to mark notification as read');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading('');
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      setActionLoading('mark-all');
      
      const response = await fetch('/api/users/me/notifications/read-all', {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
        );
        await fetchStats(); // Refresh stats
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to mark all notifications as read');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading('');
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      setActionLoading(notificationId);
      
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        await fetchStats(); // Refresh stats
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete notification');
      }
    } catch {
      setError('Network error');
    } finally {
      setActionLoading('');
    }
  };

  // Get priority icon and color
  const getPriorityDisplay = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return { icon: Zap, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950' };
      case 'high':
        return { icon: AlertTriangle, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950' };
      case 'normal':
        return { icon: Info, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950' };
      case 'low':
        return { icon: AlertCircle, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-950' };
      default:
        return { icon: Info, color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-950' };
    }
  };

  // Get notification type display name
  const getTypeDisplayName = (type: string) => {
    switch (type) {
      case 'report_submitted':
        return 'Report Submitted';
      case 'report_assigned':
        return 'Report Assigned';
      case 'report_status_changed':
        return 'Status Changed';
      case 'report_comment_added':
        return 'New Comment';
      case 'event_invitation':
        return 'Event Invitation';
      case 'event_role_changed':
        return 'Role Changed';
      case 'system_announcement':
        return 'System Announcement';
      default:
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  // Effects
  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchStats();
    }
  }, [user, currentTab, typeFilter, priorityFilter, page]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      fetchStats(); // Refresh stats to update unread count
    }, 30000);

    return () => clearInterval(interval);
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 transition-colors duration-200">
        <Card className="w-full max-w-4xl mx-auto p-4 sm:p-8">
          <p className="text-muted-foreground">Please log in to view notifications.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 transition-colors duration-200">
      <div className="w-full max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bell className="h-8 w-8" />
              Notifications
            </h1>
            {stats && (
              <p className="text-muted-foreground mt-1">
                {stats.unread > 0 ? (
                  <>You have <span className="font-semibold text-foreground">{stats.unread}</span> unread notifications</>
                ) : (
                  'All caught up! No unread notifications.'
                )}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchNotifications();
                fetchStats();
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {stats && stats.unread > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={actionLoading === 'mark-all'}
              >
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.unread}</div>
                <p className="text-xs text-muted-foreground">Unread</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.total - stats.unread}</div>
                <p className="text-xs text-muted-foreground">Read</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {stats.byPriority.high || 0}
                </div>
                <p className="text-xs text-muted-foreground">High Priority</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters and Tabs */}
        <Card>
          <CardContent className="p-6">
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="unread" className="relative">
                    Unread
                    {stats && stats.unread > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 text-xs">
                        {stats.unread > 99 ? '99+' : stats.unread}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Types</SelectItem>
                      <SelectItem value="report_submitted">Report Submitted</SelectItem>
                      <SelectItem value="report_assigned">Report Assigned</SelectItem>
                      <SelectItem value="report_status_changed">Status Changed</SelectItem>
                      <SelectItem value="report_comment_added">New Comment</SelectItem>
                      <SelectItem value="event_invitation">Event Invitation</SelectItem>
                      <SelectItem value="event_role_changed">Role Changed</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Priorities</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <TabsContent value="all" className="mt-0">
                <NotificationList />
              </TabsContent>
              <TabsContent value="unread" className="mt-0">
                <NotificationList />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  function NotificationList() {
    if (loading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start space-x-4 p-4 border rounded-lg">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 dark:text-red-400">{error}</p>
          <Button 
            variant="outline" 
            onClick={() => {
              fetchNotifications();
              fetchStats();
            }}
            className="mt-4"
          >
            Try Again
          </Button>
        </div>
      );
    }

    if (notifications.length === 0) {
      return (
        <div className="text-center py-12">
          <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No notifications</h3>
          <p className="text-muted-foreground">
            {currentTab === 'unread' 
              ? "You're all caught up! No unread notifications."
              : "You don't have any notifications yet."
            }
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {notifications.map((notification) => {
          const priorityDisplay = getPriorityDisplay(notification.priority);
          const PriorityIcon = priorityDisplay.icon;

          return (
            <div
              key={notification.id}
              className={`p-4 border rounded-lg transition-colors ${
                notification.isRead 
                  ? 'bg-background' 
                  : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {/* Priority Icon */}
                  <div className={`p-2 rounded-full ${priorityDisplay.bg}`}>
                    <PriorityIcon className={`h-4 w-4 ${priorityDisplay.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-sm">{notification.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {getTypeDisplayName(notification.type)}
                      </Badge>
                      {notification.priority !== 'normal' && (
                        <Badge 
                          variant={notification.priority === 'urgent' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {notification.priority}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-2">
                      {notification.message}
                    </p>

                    {/* Event/Report Context */}
                    {(notification.event || notification.report) && (
                      <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                        {notification.event && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {notification.event.name}
                          </span>
                        )}
                        {notification.report && (
                          <span>Report: {notification.report.title}</span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(notification.createdAt)}
                        {notification.isRead && notification.readAt && (
                          <span className="ml-2">• Read {formatRelativeTime(notification.readAt)}</span>
                        )}
                      </span>

                      {notification.actionUrl && (
                        <Link href={notification.actionUrl}>
                          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {!notification.isRead && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAsRead(notification.id)}
                      disabled={actionLoading === notification.id}
                      className="h-8 w-8 p-0"
                      title="Mark as read"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteNotification(notification.id)}
                    disabled={actionLoading === notification.id}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                    title="Delete notification"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            
            <span className="text-sm text-muted-foreground px-4">
              Page {page} of {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    );
  }
};

export default NotificationCenter; 