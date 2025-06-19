import React from 'react';
import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle } from 'lucide-react';

interface EventFormData {
  name: string;
  slug: string;
  description: string;
}

const INITIAL_FORM_DATA: EventFormData = {
  name: '',
  slug: '',
  description: ''
};

export default function CreateEvent() {
  const router = useRouter();
  const [formData, setFormData] = useState<EventFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<EventFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  if (process.env.NODE_ENV === 'development') {
    console.log('CreateEvent component loaded');
    console.log('Current submitError:', submitError);
    console.log('Current errors:', errors);
  }

  // Auto-generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    setFormData(prev => ({ ...prev, name, slug }));
    if (errors.name) setErrors(prev => ({ ...prev, name: undefined }));
    if (errors.slug) setErrors(prev => ({ ...prev, slug: undefined }));
  };

  const handleInputChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<EventFormData> = {};
    
    if (!formData.name.trim()) newErrors.name = 'Event name is required';
    if (!formData.slug.trim()) newErrors.slug = 'Event slug is required';
    if (formData.slug.length < 3) newErrors.slug = 'Slug must be at least 3 characters';
    if (!formData.description.trim()) newErrors.description = 'Description is required';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      const response = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/api/admin/events',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        // Redirect to event details where SuperAdmin can create admin invite
        router.push(`/admin/events/${data.event.id}/settings`);
      } else {
        const errorData = await response.json();
        setSubmitError(errorData.error || 'Failed to create event');
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Create New Event - Conducky Admin</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Button>
            
            <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
            <p className="text-gray-600 mt-2">
              Create a basic event that can be configured by an event administrator.
            </p>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Event Information</CardTitle>
              <CardDescription>
                Enter the essential details. An event administrator will be able to configure 
                the full event settings after accepting an invite.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {submitError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="name">Event Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="e.g., DevConf 2024"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">Event Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    placeholder="devconf-2024"
                    className={errors.slug ? 'border-red-500' : ''}
                  />
                  <p className="text-sm text-gray-500">
                    Used in URLs. Auto-generated from name, but you can customize it.
                  </p>
                  {errors.slug && (
                    <p className="text-sm text-red-600">{errors.slug}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Brief description of the event..."
                    rows={3}
                    className={errors.description ? 'border-red-500' : ''}
                  />
                  {errors.description && (
                    <p className="text-sm text-red-600">{errors.description}</p>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Next Steps Info */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Next Steps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Event Created</p>
                    <p className="text-gray-600">Basic event will be created with minimal information</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-medium">Create Admin Invite</p>
                    <p className="text-gray-600">Generate an invite link for someone to become the event administrator</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Event Setup</p>
                    <p className="text-gray-600">Event admin completes full configuration (CoC, contact info, etc.)</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
} 