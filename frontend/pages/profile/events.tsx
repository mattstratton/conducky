import React, { useState, useContext, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { UserContext } from '../_app';
import { 
  Calendar, 
  Users, 
  ExternalLink, 
  LogOut, 
  Plus, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Shield
} from 'lucide-react';
import Link from 'next/link';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface User {
  id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  roles: string[];
}

export default function ProfileEvents() {
  const { user } = useContext(UserContext) as UserContextType;
  
  // Events state
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Join event state
  const [inviteCode, setInviteCode] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [joinSuccess, setJoinSuccess] = useState('');
  
  // Leave event state
  const [leavingEventId, setLeavingEventId] = useState<string | null>(null);

  // Fetch user events
  const fetchEvents = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`${apiUrl}/api/users/me/events`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      setError('Failed to load your events. Please try again.');
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [user]);

  // Join event with invite code
  const handleJoinEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = inviteCode.trim();
    if (!trimmedCode) {
      setJoinError('Please enter an invite code.');
      return;
    }

    // Basic format validation for invite codes
    if (trimmedCode.length < 3 || !/^[A-Za-z0-9]+$/.test(trimmedCode)) {
      setJoinError('Please enter a valid invite code format.');
      return;
    }

    setJoinError('');
    setJoinSuccess('');
    setJoinLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/invites/${trimmedCode}/redeem`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setJoinError(data.error || 'Failed to join event');
        return;
      }

      setJoinSuccess(`Successfully joined event! ${data.eventSlug ? `You can now access it.` : ''}`);
      setInviteCode('');
      
      // Refresh events list
      await fetchEvents();
    } catch {
      setJoinError('Network error. Please try again.');
    } finally {
      setJoinLoading(false);
    }
  };

  // Leave event
  const handleLeaveEvent = async (event: Event) => {
    if (!window.confirm(`Are you sure you want to leave "${event.name}"? This action cannot be undone.`)) {
      return;
    }

    setLeavingEventId(event.id);

    try {
      const response = await fetch(`${apiUrl}/api/users/me/events/${event.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || 'Failed to leave event');
        return;
      }

      // Refresh events list
      await fetchEvents();
    } catch {
      alert('Network error. Please try again.');
    } finally {
      setLeavingEventId(null);
    }
  };

  // Get role badge variant
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'Admin':
        return 'destructive';
      case 'Responder':
        return 'default';
      case 'Reporter':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'Admin':
        return <Shield className="h-3 w-3" />;
      case 'Responder':
        return <CheckCircle className="h-3 w-3" />;
      case 'Reporter':
        return <Clock className="h-3 w-3" />;
      default:
        return null;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 transition-colors duration-200">
        <Card className="w-full max-w-4xl mx-auto p-4 sm:p-8">
          <p className="text-center text-muted-foreground">You must be logged in to view your events.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 transition-colors duration-200">
      <div className="w-full max-w-4xl mx-auto space-y-6">
        
        {/* Join Event */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Join Event
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter an invite code to join a new event
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoinEvent} className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="inviteCode" className="sr-only">Invite Code</Label>
                  <Input
                    id="inviteCode"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    placeholder="Enter invite code (e.g., ABC123XYZ)"
                    className="font-mono"
                  />
                </div>
                <Button type="submit" disabled={joinLoading}>
                  {joinLoading ? 'Joining...' : 'Join Event'}
                </Button>
              </div>
              
              {joinError && (
                <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {joinError}
                </div>
              )}
              
              {joinSuccess && (
                <div className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {joinSuccess}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* My Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              My Events
              <Badge variant="outline" className="ml-auto">
                {events.length} {events.length === 1 ? 'event' : 'events'}
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Events you are a member of and your roles
            </p>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground">Loading your events...</div>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-600 dark:text-red-400 flex items-center justify-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </div>
                <Button 
                  variant="outline" 
                  onClick={fetchEvents} 
                  className="mt-4"
                >
                  Try Again
                </Button>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="text-muted-foreground mb-2">You haven&apos;t joined any events yet</div>
                <div className="text-sm text-muted-foreground">
                  Use an invite code above to join your first event
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {events.map((event, index) => (
                  <div key={event.id}>
                    <div className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg truncate">
                            {event.name}
                          </h3>
                          <div className="flex gap-1 flex-wrap">
                            {event.roles.map((role) => (
                              <Badge 
                                key={role} 
                                variant={getRoleBadgeVariant(role)}
                                className="flex items-center gap-1"
                              >
                                {getRoleIcon(role)}
                                {role}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        {event.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {event.description}
                          </p>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Event ID: {event.slug}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <Link href={`/events/${event.slug}/dashboard`}>
                          <Button variant="outline" size="sm" className="flex items-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            View Event
                          </Button>
                        </Link>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLeaveEvent(event)}
                          disabled={leavingEventId === event.id}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950"
                        >
                          {leavingEventId === event.id ? (
                            'Leaving...'
                          ) : (
                            <>
                              <LogOut className="h-4 w-4" />
                              <span className="sr-only">Leave event</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {index < events.length - 1 && <Separator className="my-4" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Role Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Role Information
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Understanding your roles and permissions
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <Shield className="h-3 w-3" />
                      Admin
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Full event management access. Can manage users, settings, and all reports.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Responder
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Can view and respond to all reports. Handle incident investigations.
                  </p>
                </div>
                
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Reporter
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Can submit reports and view own submissions. Basic event access.
                  </p>
                </div>
              </div>
              
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-medium mb-2">Need a role change?</h4>
                <p className="text-sm text-muted-foreground">
                  Contact an event admin to request role changes. You cannot modify your own roles for security reasons.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 