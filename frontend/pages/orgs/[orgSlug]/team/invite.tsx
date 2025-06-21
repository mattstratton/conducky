import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { OrganizationInviteManager } from '../../../../components/OrganizationInviteManager';
import { AppBreadcrumbs } from '../../../../components/AppBreadcrumbs';

interface User {
  id: string;
  name: string;
  email: string;
  roles?: string[];
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function OrganizationInviteUsersPage() {
  const router = useRouter();
  const { orgSlug } = router.query as { orgSlug?: string };
  const [user, setUser] = useState<User | null>(null);
  const [userOrgRole, setUserOrgRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const rolesList = ["org_admin", "org_viewer"];

  useEffect(() => {
    if (!orgSlug) return;

        const fetchData = async () => {
      try {
        // Fetch user session first
        const userRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/session`,
          { credentials: 'include' }
        );
        let userData = null;
        if (userRes.ok) {
          userData = await userRes.json();
          setUser(userData?.user || null);
        } else if (userRes.status === 401) {
          setError('Please log in to access this page');
          return;
        } else {
          setError('Failed to load user session');
          return;
        }

        // Fetch organization details
        const orgRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/organizations/slug/${orgSlug}`,
          { credentials: 'include' }
        );
        if (orgRes.ok) {
          const orgData = await orgRes.json();
          setOrganization(orgData.organization);
          
          // Check user's organization role
          const currentUser = userData?.user;
          if (currentUser && orgData.organization?.memberships) {
            const userMembership = orgData.organization.memberships.find(
              (m: { user: { id: string } }) => m.user.id === currentUser.id
            );
            setUserOrgRole(userMembership?.role || null);
          }
        } else if (orgRes.status === 404) {
          setError('Organization not found');
          return;
        } else if (orgRes.status === 403) {
          setError('Access denied to this organization');
          return;
        } else {
          setError('Failed to load organization details');
          return;
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load page data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [orgSlug]);

  function hasGlobalRole(role: string): boolean {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  }

  const isSuperAdmin = hasGlobalRole("SuperAdmin");
  const isOrgAdmin = userOrgRole === "org_admin";

  if (loading) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <AppBreadcrumbs />
          <div className="mt-6 animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-20 bg-gray-200 rounded"></div>
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

  // Only allow SuperAdmins or Organization Admins to access invite page
  if (!isSuperAdmin && !isOrgAdmin) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="w-full max-w-6xl mx-auto">
          <AppBreadcrumbs />
          <Card className="mt-6">
            <CardContent className="p-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">Access Denied</h2>
                <p className="text-muted-foreground mb-4">You do not have permission to access this page.</p>
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
            <h1 className="text-2xl font-bold">Invite Users</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage invitation links for {organization?.name || 'this organization'}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.push(`/orgs/${orgSlug}/team`)}
          >
            ← Back to Team
          </Button>
        </div>

        {/* Invite Management */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Invitation Links</CardTitle>
          </CardHeader>
          <CardContent>
            {organization && (
              <OrganizationInviteManager 
                organizationId={organization.id} 
                rolesList={rolesList} 
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 