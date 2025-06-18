import React from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle, 
  Copy, 
  Mail, 
  Users, 
  Settings,
  ExternalLink 
} from 'lucide-react';

interface EventData {
  id: string;
  name: string;
  slug: string;
  description: string;
  isActive: boolean;
  website?: string;
  contactEmail?: string;
  startDate?: string;
  endDate?: string;
  codeOfConduct?: string;
  setupComplete: boolean;
}

interface InviteLink {
  id: string;
  code: string;
  email: string;
  role: string;
  status: string;
  createdAt: string;
  expiresAt: string;
}

export default function SystemEventSettings() {
  const router = useRouter();
  const { eventId } = router.query;
  const [event, setEvent] = useState<EventData | null>(null);
  const [invites, setInvites] = useState<InviteLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Invite creation state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Admin');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  useEffect(() => {
    if (eventId) {
      fetchEventData();
      fetchInvites();
    }
  }, [eventId]);

  const fetchEventData = async () => {
    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/admin/events/${eventId}`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setEvent(data.event);
      } else {
        setError('Failed to load event data');
      }
    } catch {
      setError('Network error loading event data');
    }
  };

  const fetchInvites = async () => {
    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/admin/events/${eventId}/invites`,
        { credentials: 'include' }
      );
      
      if (response.ok) {
        const data = await response.json();
        setInvites(data.invites || []);
      }
    } catch {
      console.warn('Could not load invites');
    } finally {
      setLoading(false);
    }
  };

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      setInviteError('Email is required');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteError('Please enter a valid email address');
      return;
    }

    setIsCreatingInvite(true);
    setInviteError('');
    setInviteSuccess('');

    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/admin/events/${eventId}/invites`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: inviteEmail,
            role: inviteRole,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setInviteSuccess(`Invite created successfully! Invite code: ${data.invite.code}`);
        setInviteEmail('');
        fetchInvites(); // Refresh invites list
      } else {
        const errorData = await response.json();
        setInviteError(errorData.error || 'Failed to create invite');
      }
    } catch {
      setInviteError('Network error creating invite');
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const copyInviteLink = (code: string) => {
    const inviteUrl = `${window.location.origin}/invite/${code}`;
    navigator.clipboard.writeText(inviteUrl);
    // TODO: Show toast notification
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <p>Loading event settings...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error || 'Event not found'}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{event.name} - System Settings - Conducky Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.push('/admin/events')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Button>
            
            <div className="flex items-center gap-4 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{event.name}</h1>
              <Badge variant={event.isActive ? "default" : "secondary"}>
                {event.isActive ? 'Active' : 'Setup Required'}
              </Badge>
            </div>
            
            <p className="text-gray-600">
              System-level event management and administration
            </p>
          </div>

          {/* Event Status */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Event Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Setup Status</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {event.isActive ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-600">Complete</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <span className="text-amber-600">Requires Event Admin Setup</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Event URL</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-600">/events/{event.slug}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.open(`/events/${event.slug}`, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Basic Event Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Event details configured during creation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Event Name</Label>
                  <p className="text-sm text-gray-900 mt-1">{event.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Slug</Label>
                  <p className="text-sm text-gray-900 mt-1">{event.slug}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm text-gray-900 mt-1">{event.description}</p>
              </div>
            </CardContent>
          </Card>

          {/* Admin Invites */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Event Administrator Invites
              </CardTitle>
              <CardDescription>
                Create invite links for event administrators to complete event setup
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Create Invite Form */}
              <form onSubmit={createInvite} className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <Label htmlFor="inviteEmail">Administrator Email</Label>
                    <Input
                      id="inviteEmail"
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="admin@example.com"
                      className={inviteError ? 'border-red-500' : ''}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="inviteRole">Role</Label>
                    <select
                      id="inviteRole"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Responder">Responder</option>
                    </select>
                  </div>
                </div>

                {inviteError && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{inviteError}</AlertDescription>
                  </Alert>
                )}

                {inviteSuccess && (
                  <Alert className="mt-4">
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{inviteSuccess}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={isCreatingInvite}
                  className="mt-4"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  {isCreatingInvite ? 'Creating...' : 'Create Invite'}
                </Button>
              </form>

              <Separator className="my-6" />

              {/* Existing Invites */}
              <div>
                <h3 className="font-medium mb-4">Pending Invites</h3>
                {invites.length === 0 ? (
                  <p className="text-sm text-gray-500">No invites created yet</p>
                ) : (
                  <div className="space-y-3">
                    {invites.map((invite) => (
                      <div key={invite.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{invite.email}</p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Badge variant="outline">{invite.role}</Badge>
                            <span>•</span>
                            <span>{invite.status}</span>
                            <span>•</span>
                            <span>Expires {new Date(invite.expiresAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInviteLink(invite.code)}
                        >
                          <Copy className="mr-2 h-3 w-3" />
                          Copy Link
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          {!event.isActive && (
            <Card>
              <CardHeader>
                <CardTitle>Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mt-0.5">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Create Admin Invite</p>
                      <p className="text-gray-600">Generate an invite link for the event administrator</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mt-0.5">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Send Invite</p>
                      <p className="text-gray-600">Share the invite link with the person who will manage this event</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mt-0.5">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Event Setup Complete</p>
                      <p className="text-gray-600">Admin completes event configuration (CoC, contact info, etc.)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
} 