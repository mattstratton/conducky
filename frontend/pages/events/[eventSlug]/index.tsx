import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import ReactMarkdown from "react-markdown";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { Alert, AlertDescription } from "../../../components/ui/alert";
import { Separator } from "../../../components/ui/separator";
import { 
  ShieldCheck, 
  MessageSquare, 
  Users, 
  Clock, 
  ArrowRight, 
  Mail, 
  Globe, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  Eye,
  FileText,
  UserPlus
} from "lucide-react";

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  website?: string;
  contactEmail?: string;
  codeOfConduct?: string;
  logo?: any;
}

interface UserRoles {
  roles: string[];
}

export default function PublicEventPage() {
  const router = useRouter();
  const { eventSlug } = router.query;
  const [event, setEvent] = useState<Event | null>(null);
  const [userRoles, setUserRoles] = useState<UserRoles | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    if (!eventSlug) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch event data (public)
        const eventResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/slug/${eventSlug}`
        );
        
        if (!eventResponse.ok) {
          throw new Error("Event not found");
        }
        
        const eventData = await eventResponse.json();
        setEvent(eventData.event);

        // Check if user is authenticated and has roles
        try {
          const rolesResponse = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/slug/${eventSlug}/my-roles`,
            { credentials: 'include' }
          );
          
          if (rolesResponse.ok) {
            const rolesData = await rolesResponse.json();
            setUserRoles(rolesData);
            setIsAuthenticated(true);
          }
        } catch (rolesError) {
          // User not authenticated or no roles - this is fine for public view
          setIsAuthenticated(false);
        }
        
      } catch (err: any) {
        setError(err.message || "Failed to load event");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [eventSlug]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const hasEventAccess = userRoles && userRoles.roles.length > 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 dark:text-gray-400">Loading event...</p>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error || "The event you're looking for doesn't exist or may have been moved."}
            </p>
            <Button onClick={() => router.push('/')} variant="outline">
              Return Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header Section */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-6">
            {/* Event Logo */}
            {event.logo && (
              <div className="flex-shrink-0">
                <img 
                  src={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/slug/${event.slug}/logo`}
                  alt={`${event.name} logo`}
                  className="w-20 h-20 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
                />
              </div>
            )}
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {event.name}
              </h1>
              
              {event.description && (
                <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
                  {event.description}
                </p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                {event.startDate && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {event.endDate && event.startDate !== event.endDate 
                        ? `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`
                        : formatDate(event.startDate)
                      }
                    </span>
                  </div>
                )}
                
                {event.website && (
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    <a 
                      href={event.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Event Website
                    </a>
                  </div>
                )}
                
                {event.contactEmail && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <a 
                      href={`mailto:${event.contactEmail}`}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      {event.contactEmail}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-3">
            {hasEventAccess && (
              <Button 
                onClick={() => router.push(`/events/${event.slug}/dashboard`)}
                className="flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                Go to Event Dashboard
              </Button>
            )}
            
            {!isAuthenticated && (
              <Button 
                onClick={() => router.push(`/login?redirect=/events/${event.slug}`)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Login for Event Access
              </Button>
            )}
            
            {isAuthenticated && !hasEventAccess && event.contactEmail && (
              <Button 
                onClick={() => window.location.href = `mailto:${event.contactEmail}?subject=Request access to ${event.name}`}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Request Event Access
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        
        {/* Incident Reporting Process */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Safe and Confidential Incident Reporting
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-gray-600 dark:text-gray-400">
              Our incident management system ensures that all reports are handled professionally, 
              confidentially, and with care. Here's how the process works:
            </p>
            
            {/* Process Steps */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold">1. Submit Report</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Securely submit your incident report with as much detail as you're comfortable sharing
                </p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                  <Eye className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold">2. Acknowledged</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Your report is reviewed and acknowledged by our response team within 24 hours
                </p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto">
                  <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <h3 className="font-semibold">3. Investigation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Trained responders investigate the incident and work toward a resolution
                </p>
              </div>
              
              <div className="text-center space-y-3">
                <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold">4. Resolution</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  The incident is resolved and you're updated on the outcome and next steps
                </p>
              </div>
            </div>

            <Separator />
            
            {/* Reporting Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">How to Report an Incident</h3>
              
              <div className="grid gap-4 md:grid-cols-2">
                {/* Authenticated Reporting */}
                {isAuthenticated && hasEventAccess && (
                  <Card className="border-blue-200 dark:border-blue-800">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">Submit Report (Recommended)</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Submit a detailed report through our secure system. You can track progress and receive updates.
                          </p>
                          <Button 
                            onClick={() => router.push(`/events/${event.slug}/reports/new`)}
                            size="sm"
                            className="w-full"
                          >
                            Submit Report
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {/* Anonymous Reporting (Future) */}
                <Card className="border-gray-200 dark:border-gray-700">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <ShieldCheck className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">Anonymous Reporting</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          Submit an anonymous report if you prefer not to identify yourself. Coming soon.
                        </p>
                        <Button 
                          size="sm"
                          variant="outline"
                          disabled
                          className="w-full"
                        >
                          Coming Soon
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Direct Contact */}
                {event.contactEmail && (
                  <Card className="border-orange-200 dark:border-orange-800">
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <Mail className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold mb-2">Direct Contact</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            For urgent matters or if you prefer email contact.
                          </p>
                          <Button 
                            onClick={() => window.location.href = `mailto:${event.contactEmail}?subject=Incident Report for ${event.name}`}
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            Email Organizers
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
            
            {/* Privacy Notice */}
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertDescription>
                <strong>Your privacy matters:</strong> All reports are handled confidentially. 
                Only authorized response team members have access to incident details. 
                We never share personal information without explicit consent.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Code of Conduct */}
        {event.codeOfConduct && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Code of Conduct
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none max-h-96 overflow-y-auto">
                <ReactMarkdown>{event.codeOfConduct}</ReactMarkdown>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  onClick={() => router.push(`/events/${event.slug}/code-of-conduct`)}
                  variant="outline"
                  size="sm"
                >
                  View Full Code of Conduct
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Access Information */}
        {!hasEventAccess && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-green-600" />
                Get Event Access
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                To submit reports, participate in discussions, or join the response team, 
                you'll need to be invited to this event.
              </p>
              
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                <h4 className="font-semibold mb-2">How to get access:</h4>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Event organizers will send you an invite link</li>
                  <li>• Check your email for an invitation from this event</li>
                  <li>• Contact the event organizers if you need access</li>
                  {!isAuthenticated && <li>• <a href="/register" className="text-blue-600 dark:text-blue-400 hover:underline">Create an account</a> if you don't have one</li>}
                </ul>
              </div>
              
              <div className="flex gap-3">
                {event.contactEmail && (
                  <Button 
                    onClick={() => window.location.href = `mailto:${event.contactEmail}?subject=Request access to ${event.name}`}
                    variant="outline"
                  >
                    Request Access
                  </Button>
                )}
                
                {!isAuthenticated && (
                  <Button 
                    onClick={() => router.push('/register')}
                    variant="outline"
                  >
                    Create Account
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 