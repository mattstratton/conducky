import React, { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SearchIcon, UserPlusIcon, MoreHorizontalIcon, CalendarIcon, ClockIcon } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Check if current user has admin permissions
  const isAdmin = user && ['Admin', 'SuperAdmin'].some(role => 
    user.roles?.includes(role)
  );

  useEffect(() => {
    if (!eventSlug) return;

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
        console.error('Error fetching team members:', err);
        setError('Failed to load team members. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchTeamMembers();
  }, [eventSlug, debouncedSearchTerm, roleFilter, sortBy, sortOrder]);

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/events/slug/${eventSlug}/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        throw new Error('Failed to update user role');
      }

      // Refresh the team list
      window.location.reload();
    } catch (err) {
      console.error('Error updating user role:', err);
      alert('Failed to update user role. Please try again.');
    }
  };

  const handleRemoveUser = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this user from the event?')) {
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const response = await fetch(`${apiUrl}/api/events/slug/${eventSlug}/users/${userId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to remove user');
      }

      // Refresh the team list
      window.location.reload();
    } catch (err) {
      console.error('Error removing user:', err);
      alert('Failed to remove user. Please try again.');
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
      case 'superadmin': return 'bg-red-100 text-red-800 border-red-200';
      case 'admin': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'responder': return 'bg-green-100 text-green-800 border-green-200';
      case 'reporter': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getHighestRole = (roles: string[]) => {
    const roleHierarchy = ['SuperAdmin', 'Admin', 'Responder', 'Reporter'];
    for (const role of roleHierarchy) {
      if (roles.includes(role)) {
        return role;
      }
    }
    return roles[0] || 'Reporter';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <AppBreadcrumbs />
          <div className="mt-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                    </div>
                  </div>
                ))}
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
                <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
                <p className="text-gray-600 mb-4">{error}</p>
                <Button onClick={() => router.back()}>Go Back</Button>
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
            <p className="text-gray-600 mt-1">Manage event users and their roles</p>
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
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
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
                  <SelectItem value="SuperAdmin">SuperAdmin</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Responder">Responder</SelectItem>
                  <SelectItem value="Reporter">Reporter</SelectItem>
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
            <CardTitle>Users ({members.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No users found.</p>
                {isAdmin && (
                  <Button onClick={() => router.push(`/events/${eventSlug}/team/invite`)}>
                    <UserPlusIcon className="h-4 w-4 mr-2" />
                    Invite the first user
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Joined</TableHead>
                    <TableHead className="hidden md:table-cell">Last Active</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((member) => (
                    <TableRow key={member.id} className="cursor-pointer hover:bg-gray-50"
                             onClick={() => router.push(`/events/${eventSlug}/team/${member.id}`)}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            {member.avatarUrl ? (
                              <AvatarImage 
                                src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api${member.avatarUrl}`} 
                                alt={member.name} 
                              />
                            ) : null}
                            <AvatarFallback>
                              {member.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium">{member.name}</div>
                            <div className="text-sm text-gray-500">{member.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {member.roles.map((role) => (
                            <Badge key={role} className={getRoleColor(role)} variant="outline">
                              {role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <CalendarIcon className="h-3 w-3" />
                          <span>{formatDate(member.joinDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <ClockIcon className="h-3 w-3" />
                          <span>{formatDateTime(member.lastActivity)}</span>
                        </div>
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/events/${eventSlug}/team/${member.id}`);
                                }}
                              >
                                View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newRole = prompt('Enter new role:', getHighestRole(member.roles));
                                  if (newRole) handleRoleUpdate(member.id, newRole);
                                }}
                              >
                                Change Role
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveUser(member.id);
                                }}
                                className="text-red-600"
                              >
                                Remove from Event
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 