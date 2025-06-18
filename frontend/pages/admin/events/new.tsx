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
import { Separator } from '@/components/ui/separator';
import {
  Calendar,
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Globe,
  Mail,
  FileText,
  Users,
  Settings
} from 'lucide-react';

interface EventFormData {
  name: string;
  slug: string;
  description: string;
  website: string;
  contactEmail: string;
  startDate: string;
  endDate: string;
  codeOfConduct: string;
}

const INITIAL_FORM_DATA: EventFormData = {
  name: '',
  slug: '',
  description: '',
  website: '',
  contactEmail: '',
  startDate: '',
  endDate: '',
  codeOfConduct: ''
};

const STEPS = [
  {
    id: 'basic',
    title: 'Basic Information',
    description: 'Event name, slug, and description',
    icon: FileText,
  },
  {
    id: 'details',
    title: 'Event Details',
    description: 'Dates, website, and contact information',
    icon: Calendar,
  },
  {
    id: 'conduct',
    title: 'Code of Conduct',
    description: 'Event policies and guidelines',
    icon: Users,
  },
  {
    id: 'review',
    title: 'Review & Create',
    description: 'Confirm details and create event',
    icon: Check,
  },
];

export default function CreateEvent() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<EventFormData>(INITIAL_FORM_DATA);
  const [errors, setErrors] = useState<Partial<EventFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

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

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<EventFormData> = {};
    
    switch (step) {
      case 0: // Basic Information
        if (!formData.name.trim()) newErrors.name = 'Event name is required';
        if (!formData.slug.trim()) newErrors.slug = 'Event slug is required';
        if (formData.slug.length < 3) newErrors.slug = 'Slug must be at least 3 characters';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        break;
        
      case 1: // Event Details
        if (!formData.contactEmail.trim()) {
          newErrors.contactEmail = 'Contact email is required';
        } else if (!/\S+@S+\.\S+/.test(formData.contactEmail)) {
          newErrors.contactEmail = 'Please enter a valid email address';
        }
        if (formData.website && !/^https?:\/S+/.test(formData.website)) {
          newErrors.website = 'Please enter a valid URL (including http:// or https://)';
        }
        if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
          newErrors.endDate = 'End date must be after start date';
        }
        break;
        
      case 2: // Code of Conduct
        if (!formData.codeOfConduct.trim()) {
          newErrors.codeOfConduct = 'Code of Conduct is required';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep - 1)) return;
    
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
            description: formData.description || undefined,
            website: formData.website || undefined,
            contactEmail: formData.contactEmail,
            startDate: formData.startDate || undefined,
            endDate: formData.endDate || undefined,
            codeOfConduct: formData.codeOfConduct,
          }),
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        router.push(`/admin/events?created=${data.event.slug}`);
      } else {
        const errorData = await response.json();
        setSubmitError(errorData.error || 'Failed to create event');
      }
    } catch (error) {
      setSubmitError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
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
              <p className="text-sm text-gray-600">
                This will be used in URLs: /events/{formData.slug || 'event-slug'}
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
                placeholder="Brief description of your event..."
                rows={4}
                className={errors.description ? 'border-red-500' : ''}
              />
              {errors.description && (
                <p className="text-sm text-red-600">{errors.description}</p>
              )}
            </div>
          </div>
        );
        
      case 1:
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className={errors.endDate ? 'border-red-500' : ''}
                />
                {errors.endDate && (
                  <p className="text-sm text-red-600">{errors.endDate}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">Event Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => handleInputChange('website', e.target.value)}
                placeholder="https://example.com"
                className={errors.website ? 'border-red-500' : ''}
              />
              {errors.website && (
                <p className="text-sm text-red-600">{errors.website}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email *</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                placeholder="contact@example.com"
                className={errors.contactEmail ? 'border-red-500' : ''}
              />
              <p className="text-sm text-gray-600">
                This email will be used for incident reports and contact
              </p>
              {errors.contactEmail && (
                <p className="text-sm text-red-600">{errors.contactEmail}</p>
              )}
            </div>
          </div>
        );
        
      case 2:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="codeOfConduct">Code of Conduct *</Label>
              <Textarea
                id="codeOfConduct"
                value={formData.codeOfConduct}
                onChange={(e) => handleInputChange('codeOfConduct', e.target.value)}
                placeholder="Enter your event's code of conduct..."
                rows={12}
                className={errors.codeOfConduct ? 'border-red-500' : ''}
              />
              <p className="text-sm text-gray-600">
                This will be shown to users when they submit reports
              </p>
              {errors.codeOfConduct && (
                <p className="text-sm text-red-600">{errors.codeOfConduct}</p>
              )}
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Review Event Details</h3>
              
              <div className="space-y-4">
                <div>
                  <strong>Event Name:</strong> {formData.name}
                </div>
                <div>
                  <strong>Slug:</strong> {formData.slug}
                </div>
                <div>
                  <strong>Description:</strong> {formData.description}
                </div>
                {formData.startDate && (
                  <div>
                    <strong>Start Date:</strong> {new Date(formData.startDate).toLocaleDateString()}
                  </div>
                )}
                {formData.endDate && (
                  <div>
                    <strong>End Date:</strong> {new Date(formData.endDate).toLocaleDateString()}
                  </div>
                )}
                {formData.website && (
                  <div>
                    <strong>Website:</strong> <a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{formData.website}</a>
                  </div>
                )}
                <div>
                  <strong>Contact Email:</strong> {formData.contactEmail}
                </div>
                <div>
                  <strong>Code of Conduct:</strong> {formData.codeOfConduct.substring(0, 100)}...
                </div>
              </div>
            </div>
            
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <>
      <Head>
        <title>Create New Event - System Admin - Conducky</title>
        <meta name="description" content="Create a new event in the Conducky system" />
      </Head>

      <div className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Button 
              variant="outline" 
              onClick={() => router.push('/admin/events')}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Events
            </Button>
            <h1 className="text-3xl font-bold text-gray-900">Create New Event</h1>
            <p className="text-gray-600">Set up a new event for incident management</p>
          </div>

          {/* Progress Steps */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                      isCompleted 
                        ? 'bg-green-500 border-green-500 text-white'
                        : isActive
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-white border-gray-300 text-gray-500'
                    }`}>
                      {isCompleted ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>
                    <div className="ml-3 hidden sm:block">
                      <p className={`text-sm font-medium ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500">{step.description}</p>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`hidden sm:block w-16 h-0.5 ml-4 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Form Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {React.createElement(STEPS[currentStep].icon, { className: "h-5 w-5" })}
                {STEPS[currentStep].title}
              </CardTitle>
              <CardDescription>
                {STEPS[currentStep].description}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {renderStepContent()}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex gap-2">
              {currentStep < STEPS.length - 1 ? (
                <Button onClick={nextStep}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'Creating...' : 'Create Event'}
                  <Check className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 