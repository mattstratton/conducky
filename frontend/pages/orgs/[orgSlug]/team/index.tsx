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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Users, 
  Search, 
  MoreHorizontal,
  UserPlus,
  Shield,
  Eye
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface OrganizationMember {
  id: string;
  role: 'org_admin' | 'org_viewer';
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export default function OrganizationTeam() {
  const router = useRouter();
  const { orgSlug } = router.query;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<OrganizationMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
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
        
        // TODO: Fetch organization members when API is ready
        // For now, use mock data
        const mockMembers: OrganizationMember[] = [
          {
            id: '1',
            role: 'org_admin',
            createdAt: '2024-01-15T00:00:00Z',
            user: {
              id: '1',
              name: 'John Doe',
              email: 'john@acmeconf.org',
              avatar: undefined
            }
          },
          {
            id: '2',
            role: 'org_viewer',
            createdAt: '2024-03-10T00:00:00Z',
            user: {
              id: '2',
              name: 'Sarah Chen',
              email: 'sarah@acmeconf.org',
              avatar: undefined
            }
          },
          {
            id: '3',
            role: 'org_admin',
            createdAt: '2024-02-20T00:00:00Z',
            user: {
              id: '3',
              name: 'Mike Wilson',
              email: 'mike@acmeconf.org',
              avatar: undefined
            }
          }
        ];
        
        setMembers(mockMembers);
        setFilteredMembers(mockMembers);
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load organization data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgSlug]);

  // Filter members based on search term and role
  useEffect(() => {
    let filtered = members;
    
    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (roleFilter !== 'all') {
      filtered = filtered.filter(member => member.role === roleFilter);
    }
    
    setFilteredMembers(filtered);
  }, [searchTerm, roleFilter, members]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading team...</p>
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

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'org_admin':
        return 'Organization Admin';
      case 'org_viewer':
        return 'Organization Viewer';
      default:
        return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'org_admin':
        return 'default' as const;
      case 'org_viewer':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'org_admin':
        return Shield;
      case 'org_viewer':
        return Eye;
      default:
        return Users;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <Head>
        <title>Team - {organization.name}</title>
      </Head>
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Team</h1>
            <p className="text-muted-foreground">
              Manage team members for {organization.name}
            </p>
          </div>
          <Button asChild>
            <Link href={`/orgs/${orgSlug}/team/invite`}>
              <UserPlus className="w-4 h-4 mr-2" />
              Invite Member
            </Link>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="org_admin">Organization Admin</SelectItem>
              <SelectItem value="org_viewer">Organization Viewer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Members List */}
        {filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {searchTerm || roleFilter !== 'all' ? 'No members found' : 'No team members yet'}
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm || roleFilter !== 'all'
                  ? 'Try adjusting your search or filter settings'
                  : 'Invite your first team member to get started'
                }
              </p>
              {!searchTerm && roleFilter === 'all' && (
                <Button asChild>
                  <Link href={`/orgs/${orgSlug}/team/invite`}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite Member
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredMembers.map((member) => {
              const RoleIcon = getRoleIcon(member.role);
              return (
                <Card key={member.id}>
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center space-x-4">
                      <Avatar className="w-12 h-12">
                        <AvatarFallback>
                          {getInitials(member.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-medium">{member.user.name}</h3>
                        <p className="text-sm text-muted-foreground">{member.user.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Member since {new Date(member.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <RoleIcon className="w-4 h-4 text-muted-foreground" />
                        <Badge variant={getRoleBadgeVariant(member.role)}>
                          {getRoleLabel(member.role)}
                        </Badge>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/orgs/${orgSlug}/team/${member.user.id}`}>
                              View Profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Summary Stats */}
        {filteredMembers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organization Admins</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {members.filter(m => m.role === 'org_admin').length}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organization Viewers</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {members.filter(m => m.role === 'org_viewer').length}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Role Descriptions */}
        <Card>
          <CardHeader>
            <CardTitle>Role Descriptions</CardTitle>
            <CardDescription>
              Understanding the different organization roles and their permissions
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h4 className="font-medium">Organization Admin</h4>
                <p className="text-sm text-muted-foreground">
                  Can manage organization settings, create events, view aggregated reports, and assign event roles. 
                  Cannot see individual report details unless also assigned event-level roles.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <Eye className="w-5 h-5 text-secondary mt-0.5" />
              <div>
                <h4 className="font-medium">Organization Viewer</h4>
                <p className="text-sm text-muted-foreground">
                  Can view organization dashboard and aggregated metrics. 
                  Read-only access to organization events list and summary data.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 