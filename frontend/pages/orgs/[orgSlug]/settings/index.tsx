import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Save } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  website?: string;
  logoUrl?: string;
}

export default function OrganizationSettings() {
  const router = useRouter();
  const { orgSlug } = router.query;
  
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgSlug || typeof orgSlug !== 'string') return;

    const fetchOrganization = async () => {
      try {
        setLoading(true);
        
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/organizations/slug/${orgSlug}`,
          { credentials: 'include' }
        );
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Organization not found');
          } else if (response.status === 403) {
            setError('You do not have access to this organization');
          } else {
            setError('Failed to load organization');
          }
          return;
        }
        
        const data = await response.json();
        setOrganization(data.organization);
        
      } catch (err) {
        console.error('Error fetching organization:', err);
        setError('Failed to load organization');
      } finally {
        setLoading(false);
      }
    };

    fetchOrganization();
  }, [orgSlug]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;

    try {
      setSaving(true);
      
      // TODO: Implement save functionality when API is ready
      console.log('Saving organization:', organization);
      
      // Mock save delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (err) {
      console.error('Error saving organization:', err);
      setError('Failed to save organization');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading settings...</p>
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

  return (
    <>
      <Head>
        <title>Settings - {organization.name}</title>
      </Head>
      
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Organization Settings</h1>
          <p className="text-muted-foreground">
            Manage settings for {organization.name}
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Basic Information
              </CardTitle>
              <CardDescription>
                                 Update your organization&apos;s basic details and branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={organization.name}
                  onChange={(e) => setOrganization({...organization, name: e.target.value})}
                  placeholder="Enter organization name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={organization.slug}
                  disabled
                  placeholder="organization-slug"
                  className="bg-muted cursor-not-allowed"
                />
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    URL slugs cannot be changed after creation to prevent broken links
                  </p>
                  <p className="text-xs text-amber-600 flex items-start gap-1">
                    <span className="text-amber-500">⚠️</span>
                    <span>Changing the slug would break all existing URLs, bookmarks, and integrations pointing to your organization</span>
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={organization.description || ''}
                  onChange={(e) => setOrganization({...organization, description: e.target.value})}
                  placeholder="Brief description of your organization"
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={organization.website || ''}
                  onChange={(e) => setOrganization({...organization, website: e.target.value})}
                  placeholder="https://example.com"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="logo">Organization Logo</Label>
                <div className="flex items-center space-x-4">
                  {organization.logoUrl && (
                    <img 
                      src={organization.logoUrl} 
                      alt="Current logo"
                      className="w-16 h-16 object-contain rounded border bg-white"
                    />
                  )}
                  <div className="flex-1">
                    <Input
                      id="logo"
                      type="file"
                      accept="image/*"
                      className="cursor-pointer"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Upload a new logo (square format recommended, max 5MB)
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>

        {/* Danger Zone */}
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Delete Organization</h4>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this organization and all its data
                </p>
              </div>
              <Button variant="destructive" disabled>
                Delete Organization
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 