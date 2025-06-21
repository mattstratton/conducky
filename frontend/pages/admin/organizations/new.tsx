import React, { useState, useContext } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Building2, AlertCircle } from 'lucide-react';
import { UserContext } from '../../_app';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FormData {
  name: string;
  slug: string;
  description: string;
  website: string;
  logo?: File | null;
}

interface FormErrors {
  name?: string;
  slug?: string;
  description?: string;
  website?: string;
  logo?: string;
  general?: string;
}

export default function CreateOrganization() {
  const router = useRouter();
  const { user } = useContext(UserContext);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    slug: '',
    description: '',
    website: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check authentication and SuperAdmin status
  React.useEffect(() => {
    if (user === null && authChecked) {
      router.replace('/login?next=' + encodeURIComponent('/admin/organizations/new'));
      return;
    }
    
    if (user && authChecked && !user.roles?.includes('SuperAdmin')) {
      router.replace('/dashboard');
      return;
    }
  }, [user, authChecked, router]);

  React.useEffect(() => {
    const timer = setTimeout(() => setAuthChecked(true), 0);
    return () => clearTimeout(timer);
  }, []);

  // Auto-generate slug from name
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFormData(prev => ({
      ...prev,
      name,
      slug: name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
    }));
    
    if (errors.name) {
      setErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const slug = e.target.value
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    
    setFormData(prev => ({ ...prev, slug }));
    
    if (errors.slug) {
      setErrors(prev => ({ ...prev, slug: undefined }));
    }
  };

  const handleInputChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, logo: file }));
    if (errors.logo) {
      setErrors(prev => ({ ...prev, logo: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Organization name is required';
    } else if (formData.name.length < 3) {
      newErrors.name = 'Organization name must be at least 3 characters';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (formData.slug.length < 3) {
      newErrors.slug = 'Slug must be at least 3 characters';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug can only contain lowercase letters, numbers, and hyphens';
    }

    if (formData.website && !formData.website.match(/^https?:\/\/.+/)) {
      newErrors.website = 'Website must be a valid URL (starting with http:// or https://)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/organizations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name.trim(),
            slug: formData.slug.trim(),
            description: formData.description.trim() || undefined,
            website: formData.website.trim() || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 400 && errorData.message?.includes('slug')) {
          setErrors({ slug: 'This slug is already taken' });
        } else if (response.status === 400) {
          setErrors({ general: errorData.message || 'Invalid input data' });
        } else {
          setErrors({ general: 'Failed to create organization. Please try again.' });
        }
        return;
      }

      // Redirect to the new organization's admin view
      router.push(`/admin/organizations`);
      
    } catch (error) {
      console.error('Error creating organization:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything while checking authentication
  if (!authChecked || !user) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Create Organization</h1>
            <p className="text-muted-foreground">Checking authorization...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user.roles?.includes('SuperAdmin')) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Create Organization - Admin - Conducky</title>
      </Head>

      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Header */}
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/organizations">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Organizations
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Create Organization</h1>
              <p className="text-muted-foreground">
                Create a new organization to manage events and teams
              </p>
            </div>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="w-5 h-5 mr-2" />
                Organization Details
              </CardTitle>
              <CardDescription>
                Provide basic information about the organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              {errors.general && (
                <Alert className="mb-6" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.general}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Organization Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    placeholder="e.g., Tech Conference Organizers"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                {/* Slug */}
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <Input
                    id="slug"
                    type="text"
                    value={formData.slug}
                    onChange={handleSlugChange}
                    placeholder="tech-conference-organizers"
                    className={errors.slug ? 'border-red-500' : ''}
                  />
                  <p className="text-sm text-muted-foreground">
                    This will be used in URLs: /orgs/{formData.slug || 'your-slug'}
                  </p>
                  {errors.slug && (
                    <p className="text-sm text-red-600">{errors.slug}</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={handleInputChange('description')}
                    placeholder="Brief description of the organization..."
                    rows={3}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={handleInputChange('website')}
                    placeholder="https://example.com"
                    className={errors.website ? 'border-red-500' : ''}
                  />
                  {errors.website && (
                    <p className="text-sm text-red-600">{errors.website}</p>
                  )}
                </div>

                {/* Logo */}
                <div className="space-y-2">
                  <Label htmlFor="logo">Organization Logo</Label>
                  <Input
                    id="logo"
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className={errors.logo ? 'border-red-500' : ''}
                  />
                  <p className="text-sm text-muted-foreground">
                    Upload a logo for your organization (optional)
                  </p>
                  {errors.logo && (
                    <p className="text-sm text-red-600">{errors.logo}</p>
                  )}
                  {formData.logo && (
                    <p className="text-sm text-green-600">
                      Selected: {formData.logo.name}
                    </p>
                  )}
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-4 pt-6 border-t">
                  <Button type="button" variant="outline" asChild>
                    <Link href="/admin/organizations">Cancel</Link>
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Organization'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What happens next?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• The organization will be created with you as the initial admin</p>
              <p>• You can then invite other users to join as admins or viewers</p>
              <p>• Organization admins can create events and manage team members</p>
              <p>• All events created within the organization will be linked to it</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
} 