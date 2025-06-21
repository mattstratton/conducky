import React, { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Search, 
  Building2, 
  Users, 
  Calendar, 
  FileText, 
  ExternalLink,
  Settings,
  MoreVertical,
  Filter
} from 'lucide-react';
import { UserContext } from '../../_app';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    events: number;
    memberships: number;
  };
  memberships: Array<{
    user: {
      id: string;
      name: string;
      email: string;
    };
    role: string;
  }>;
}

export default function AdminOrganizations() {
  const router = useRouter();
  const { user } = useContext(UserContext);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrganizations, setFilteredOrganizations] = useState<Organization[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication and SuperAdmin status
  useEffect(() => {
    if (user === null && authChecked) {
      router.replace('/login?next=' + encodeURIComponent('/admin/organizations'));
      return;
    }
    
    if (user && authChecked && !user.roles?.includes('SuperAdmin')) {
      router.replace('/dashboard');
      return;
    }
  }, [user, authChecked, router]);

  useEffect(() => {
    const timer = setTimeout(() => setAuthChecked(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user && user.roles?.includes('SuperAdmin')) {
      fetchOrganizations();
    }
  }, [user]);

  // Filter organizations based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOrganizations(organizations);
    } else {
      const filtered = organizations.filter(org =>
        org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredOrganizations(filtered);
    }
  }, [searchTerm, organizations]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/organizations`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch organizations: ${response.status}`);
      }

      const data = await response.json();
      setOrganizations(data.organizations || []);
      setFilteredOrganizations(data.organizations || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getOrgAdmins = (org: Organization) => {
    return org.memberships.filter(m => m.role === 'org_admin');
  };

  // Don't render anything while checking authentication
  if (!authChecked || !user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Organizations Management</h1>
            <p className="text-gray-600">Checking authorization...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user.roles?.includes('SuperAdmin')) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Access Denied</h1>
            <p className="text-gray-600">You do not have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Organizations Management</h1>
            <p className="text-gray-600">Loading organizations...</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
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
            <h1 className="text-3xl font-bold text-gray-900">Organizations Management</h1>
          </div>
          <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
            <span className="text-red-800">{error}</span>
          </div>
          <Button onClick={fetchOrganizations} className="mt-4" variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const totalEvents = organizations.reduce((sum, org) => sum + org._count.events, 0);
  const totalMembers = organizations.reduce((sum, org) => sum + org._count.memberships, 0);

  return (
    <>
      <Head>
        <title>Organizations Management - Admin - Conducky</title>
      </Head>

      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-7xl space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Organizations Management</h1>
              <p className="text-muted-foreground">
                Manage all organizations in the system
              </p>
            </div>
            <Button asChild>
              <Link href="/admin/organizations/new">
                <Plus className="w-4 h-4 mr-2" />
                Create Organization
              </Link>
            </Button>
          </div>

          {/* System Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{organizations.length}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEvents}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMembers}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Events/Org</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {organizations.length > 0 ? (totalEvents / organizations.length).toFixed(1) : '0'}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Organizations Grid */}
          {filteredOrganizations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? 'No organizations found' : 'No organizations yet'}
                </h3>
                <p className="text-muted-foreground text-center mb-4">
                  {searchTerm 
                    ? 'Try adjusting your search terms'
                    : 'Create your first organization to get started'
                  }
                </p>
                {!searchTerm && (
                  <Button asChild>
                    <Link href="/admin/organizations/new">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Organization
                    </Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOrganizations.map((org) => {
                const orgAdmins = getOrgAdmins(org);
                
                return (
                  <Card key={org.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-start justify-between space-y-0">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          {org.logoUrl ? (
                            <img 
                              src={org.logoUrl} 
                              alt={org.name}
                              className="w-8 h-8 rounded-lg object-cover"
                            />
                          ) : (
                            <Building2 className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-lg font-semibold truncate">
                            {org.name}
                          </CardTitle>
                          <CardDescription className="text-sm text-muted-foreground">
                            {org.slug}
                          </CardDescription>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/orgs/${org.slug}`}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Organization
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/organizations/${org.id}/edit`}>
                              <Settings className="w-4 h-4 mr-2" />
                              Edit Settings
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {org.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {org.description}
                        </p>
                      )}
                      
                      {org.website && (
                        <a 
                          href={org.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm text-primary hover:underline"
                        >
                          {org.website} <ExternalLink className="ml-1 w-3 h-3" />
                        </a>
                      )}

                      {/* Organization Stats */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-muted-foreground">
                            <Calendar className="w-4 h-4 mr-1" />
                            {org._count.events} events
                          </div>
                          <div className="flex items-center text-muted-foreground">
                            <Users className="w-4 h-4 mr-1" />
                            {org._count.memberships} members
                          </div>
                        </div>
                      </div>

                      {/* Organization Admins */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Organization Admins:</p>
                        <div className="space-y-1">
                          {orgAdmins.length > 0 ? (
                            orgAdmins.slice(0, 2).map((admin) => (
                              <div key={admin.user.id} className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {admin.user.name}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {admin.user.email}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">No admins assigned</span>
                          )}
                          {orgAdmins.length > 2 && (
                            <span className="text-xs text-muted-foreground">
                              +{orgAdmins.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Created Date */}
                      <div className="pt-2 border-t">
                        <span className="text-xs text-muted-foreground">
                          Created {formatDate(org.createdAt)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
} 