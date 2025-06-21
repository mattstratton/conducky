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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

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
  const [editingMember, setEditingMember] = useState<OrganizationMember | null>(null);
  const [newRole, setNewRole] = useState<'org_admin' | 'org_viewer'>('org_viewer');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
        
        // Extract members from organization data
        const organizationMembers: OrganizationMember[] = orgData.organization.memberships?.map((membership: {
          id: string;
          role: string;
          createdAt: string;
          user: {
            id: string;
            name?: string;
            email: string;
          };
        }) => ({
          id: membership.id,
          role: membership.role,
          createdAt: membership.createdAt,
          user: {
            id: membership.user.id,
            name: membership.user.name || membership.user.email,
            email: membership.user.email,
            avatar: undefined // TODO: Add avatar support
          }
        })) || [];
        
        setMembers(organizationMembers);
        setFilteredMembers(organizationMembers);
        
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

  const handleEditRole = (member: OrganizationMember) => {
    setEditingMember(member);
    setNewRole(member.role);
    setIsEditDialogOpen(true);
  };

  const handleSaveRole = async () => {
    if (!editingMember) return;
    
    try {
      // TODO: Implement API call to update member role
      console.log('Updating role for member:', editingMember.user.id, 'to:', newRole);
      
      // Update local state for now
      setMembers(members.map(member => 
        member.id === editingMember.id 
          ? { ...member, role: newRole }
          : member
      ));
      
      setIsEditDialogOpen(false);
      setEditingMember(null);
    } catch (err) {
      console.error('Error updating member role:', err);
    }
  };

  const handleRemoveMember = async (member: OrganizationMember) => {
    try {
      // TODO: Implement API call to remove member
      console.log('Removing member:', member.user.id);
      
      // Update local state for now
      setMembers(members.filter(m => m.id !== member.id));
    } catch (err) {
      console.error('Error removing member:', err);
    }
  };

  const handleViewProfile = (member: OrganizationMember) => {
    // For now, just show an alert since user profile pages don't exist yet
    alert(`User Profile: ${member.user.name}\nEmail: ${member.user.email}\nRole: ${getRoleLabel(member.role)}\nMember since: ${new Date(member.createdAt).toLocaleDateString()}`);
  };

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
                          <DropdownMenuItem onClick={() => handleEditRole(member)}>
                            Edit Role
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewProfile(member)}>
                            View Profile
                          </DropdownMenuItem>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onSelect={(e) => e.preventDefault()}
                              >
                                Remove Member
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <div className="flex flex-col space-y-2 text-center sm:text-left">
                                <AlertDialogTitle>Remove Member</AlertDialogTitle>
                                <div className="text-sm text-muted-foreground">
                                  Are you sure you want to remove {member.user.name} from this organization? 
                                  This action cannot be undone and they will lose access to all organization events.
                                </div>
                              </div>
                              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                                <AlertDialogCancel asChild>
                                  <Button variant="outline">Cancel</Button>
                                </AlertDialogCancel>
                                <Button 
                                  onClick={() => handleRemoveMember(member)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Remove Member
                                </Button>
                              </div>
                            </AlertDialogContent>
                          </AlertDialog>
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

      {/* Edit Role Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <div className="flex flex-col space-y-2 text-center sm:text-left">
            <DialogTitle>Edit Member Role</DialogTitle>
            <DialogDescription>
              Change the role for {editingMember?.user.name} in this organization.
            </DialogDescription>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={newRole} onValueChange={(value: 'org_admin' | 'org_viewer') => setNewRole(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="org_admin">Organization Admin</SelectItem>
                  <SelectItem value="org_viewer">Organization Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              {newRole === 'org_admin' ? (
                <p>Organization Admins can manage organization settings, create events, and view aggregated reports.</p>
              ) : (
                <p>Organization Viewers can view organization dashboard and aggregated metrics with read-only access.</p>
              )}
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRole}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 