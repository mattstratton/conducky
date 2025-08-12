import React, { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import { useLogger } from '@/hooks/useLogger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  SearchIcon, 
  UserPlusIcon, 
  MoreVertical, 
  CalendarIcon, 
  ClockIcon, 
  Eye, 
  FileText, 
  UserCog, 
  UserMinus,
  AlertCircle 
} from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { UserContext } from '@/pages/_app';
import { AppBreadcrumbs } from '@/components/AppBreadcrumbs';


interface TeamMember {
  id: string;
  name: string;
  email: string;
  roles: string[];
  avatarUrl: string | null;
  joinDate?: string;
  lastActivity?: string;
}

interface TeamResponse {
  users: TeamMember[];
  total: number;
}

export default function EventTeam() {
  const router = useRouter();
  const { eventSlug } = router.query;
  const { user } = useContext(UserContext);
  const { error: logError } = useLogger();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Event-specific user roles
  const [userEventRoles, setUserEventRoles] = useState<string[]>([]);
  
  // Role change dialog state
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [newRole, setNewRole] = useState('');
  
  // Remove user dialog state
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<TeamMember | null>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Helper functions to check roles
  function hasGlobalRole(role: string): boolean {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  }

  function hasEventRole(role: string): boolean {
    return userEventRoles.includes(role);
  }

  // Check if current user has admin permissions (global system admin OR event admin)
  const isAdmin = hasGlobalRole('system_admin') || hasEventRole('event_admin');

  // Check if current user can see the dropdown (responders and admins)
  const canSeeDropdown = hasGlobalRole('system_admin') || hasEventRole('event_admin') || hasEventRole('responder');

  // Fetch user's event-specific roles
  useEffect(() => {
    if (!eventSlug || !user) return;

    const fetchUserEventRoles = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const response = await fetch(`${apiUrl}/api/events/slug/${eventSlug}/my-roles`, {
          credentials: 'include'
        });

        if (response.ok) {
          const rolesData = await response.json();
          setUserEventRoles(rolesData?.roles || []);
        } else {
          setUserEventRoles([]);
        }
      } catch (error) {
        logError('Error fetching user event roles', { 
          eventSlug: typeof eventSlug === 'string' ? eventSlug : eventSlug?.[0], 
          userId: user?.id 
        }, error as Error);
        setUserEventRoles([]);
      }
    };

    fetchUserEventRoles();
  }, [eventSlug, user]);

  useEffect(() => {
    if (!eventSlug || !user) return;

    const fetchTeamMembers = async () => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          search: debouncedSearchTerm,
          role: roleFilter === 'all' ? '' : roleFilter,
          sort: sortBy,
          order: sortOrder,
          page: '1',
          limit: '50'
        });

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const response = await fetch(`${apiUrl}/api/events/slug/${eventSlug}/users?${params}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          if (response.status === 403) {
            setError('You do not have permission to view team members.');
            return;
          }
          throw new Error('Failed to fetch team members');
        }

        const data: TeamResponse = await response.json();
        setMembers(data.users || []);

      } catch (err) {
        logError('Error fetching team members', { 
          eventSlug: typeof eventSlug === 'string' ? eventSlug : eventSlug?.[0] 
        }, err as Error);
        setError('Failed to load team members. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [eventSlug, debouncedSearchTerm, roleFilter, sortBy, sortOrder, user]);

  const handleRoleUpdate = async (userId: string, role: string) => {
    try {
      const member = members.find(m => m.id === userId);
      if (!member) {
        setError('User not found');
        return;
      }
      
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/events/slug/${eventSlug}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ 
          name: member.name,
          email: member.email,
          role: role 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      // Update local state instead of reloading
      setMembers(prevMembers => 
        prevMembers.map(m => 
          m.id === userId 
            ? { ...m, roles: [role] }
            : m
        )
      );
      
      setShowRoleDialog(false);
      setSelectedMember(null);
    } catch (err) {
      logError('Error updating user role', { 
        eventSlug: typeof eventSlug === 'string' ? eventSlug : eventSlug?.[0],
        userId,
        role 
      }, err as Error);
      setError('Failed to update user role. Please try again.');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/events/slug/${eventSlug}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to remove user');
      }

      // Remove user from local state instead of reloading
      setMembers(prevMembers => prevMembers.filter(m => m.id !== userId));
      setShowRemoveDialog(false);
      setMemberToRemove(null);
    } catch (err) {
      logError('Error removing user', { 
        eventSlug: typeof eventSlug === 'string' ? eventSlug : eventSlug?.[0],
        userId 
      }, err as Error);
      setError('Failed to remove user. Please try again.');
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'system_admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'event_admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'responder': return 'bg-green-100 text-green-800 border-green-200';
      case 'reporter': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHighestRole = (roles: string[]) => {
    const roleHierarchy = ['system_admin', 'event_admin', 'responder', 'reporter'];
    for (const role of roleHierarchy) {
      if (roles.includes(role)) {
        return role;
      }
    }
    return roles[0] || 'reporter';
  };

  const openRoleDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setNewRole(getHighestRole(member.roles));
    setShowRoleDialog(true);
  };

  const openRemoveDialog = (member: TeamMember) => {
    setMemberToRemove(member);
    setShowRemoveDialog(true);
  };

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (user === null && !loading) {
      router.push(`/login?next=${encodeURIComponent(router.asPath)}`);
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <AppBreadcrumbs />
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <div className="text-muted-foreground">Loading team members...</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error && !members.length) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <AppBreadcrumbs />
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-destructive mb-2">Access Denied</h2>
                <div className="text-muted-foreground">{error}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="w-full max-w-6xl mx-auto">
        <AppBreadcrumbs />

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
          <div>
            <h1 className="text-2xl font-bold">Users</h1>
            <p className="text-muted-foreground mt-1">Manage event users and their roles</p>
          </div>
          {isAdmin && (
            <Button onClick={() => router.push(`/events/${eventSlug}/team/invite`)}>
              <UserPlusIcon className="h-4 w-4 mr-2" />
              Invite Users
            </Button>
          )}
        </div>

        {/* Filters */}
        <Card className="mt-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="system_admin">System Admin</SelectItem>
                  <SelectItem value="event_admin">Event Admin</SelectItem>
                  <SelectItem value="responder">Responder</SelectItem>
                  <SelectItem value="reporter">Reporter</SelectItem>
                </SelectContent>
              </Select>
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [sort, order] = value.split('-');
                setSortBy(sort);
                setSortOrder(order);
              }}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name-asc">Name A-Z</SelectItem>
                  <SelectItem value="name-desc">Name Z-A</SelectItem>
                  <SelectItem value="email-asc">Email A-Z</SelectItem>
                  <SelectItem value="email-desc">Email Z-A</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Team Members Table */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Team Members ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-8">
                <UserPlusIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">No users found.</p>
                {isAdmin && (
                  <Button onClick={() => router.push(`/events/${eventSlug}/team/invite`)}>
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Invite the first user
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="hidden sm:table-cell">Joined</TableHead>
                      <TableHead className="hidden md:table-cell">Last Active</TableHead>
                      {canSeeDropdown && <TableHead className="w-12"></TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow 
                        key={member.id} 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/events/${eventSlug}/team/${member.id}`)}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              {member.avatarUrl ? (
                                <AvatarImage 
                                  src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api${member.avatarUrl}`} 
                                  alt={member.name} 
                                />
                              ) : null}
                              <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-foreground">{member.name}</div>
                              <div className="text-sm text-muted-foreground">{member.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {member.roles.map((role) => (
                              <Badge key={role} className={getRoleColor(role)} variant="outline">
                                {role.replace('_', ' ')}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <CalendarIcon className="h-3 w-3" />
                            <span>{formatDate(member.joinDate)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                            <ClockIcon className="h-3 w-3" />
                            <span>{formatDateTime(member.lastActivity)}</span>
                          </div>
                        </TableCell>
                        {canSeeDropdown && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/events/${eventSlug}/team/${member.id}`);
                                  }}
                                  className="flex items-center"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Profile
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    router.push(`/events/${eventSlug}/incidents?userId=${member.id}`);
                                  }}
                                  className="flex items-center"
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  User&apos;s Incidents
                                </DropdownMenuItem>
                                {isAdmin && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openRoleDialog(member);
                                      }}
                                      className="flex items-center"
                                    >
                                      <UserCog className="h-4 w-4 mr-2" />
                                      Change Role
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openRemoveDialog(member);
                                      }}
                                      className="flex items-center text-destructive focus:text-destructive"
                                    >
                                      <UserMinus className="h-4 w-4 mr-2" />
                                      Remove from Event
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="mt-6 border-destructive">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                Change the role for {selectedMember?.name} ({selectedMember?.email})
              </DialogDescription>
            </div>
            <div>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="event_admin">Event Admin</SelectItem>
                  <SelectItem value="responder">Responder</SelectItem>
                  <SelectItem value="reporter">Reporter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRoleDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => selectedMember && handleRoleUpdate(selectedMember.id, newRole)}
                disabled={!newRole}
              >
                Update Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove User Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <div className="space-y-4">
            <div>
              <DialogTitle>Remove User from Event</DialogTitle>
              <DialogDescription>
                Are you sure you want to remove {memberToRemove?.name} ({memberToRemove?.email}) from this event? 
                This action cannot be undone.
              </DialogDescription>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowRemoveDialog(false)}>
                Cancel
              </Button>
              <Button 
                variant="destructive"
                onClick={() => memberToRemove && handleRemoveUser(memberToRemove.id)}
              >
                Remove User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 