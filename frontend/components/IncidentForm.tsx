import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { useForm, SubmitHandler } from "react-hook-form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Card } from "./ui/card";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "./ui/form";
import { Badge } from "./ui/badge";
import { CoCTeamList } from "./CoCTeamList";
import { TagSelector, Tag } from "./tags/TagSelector";
import { UserContext } from "../pages/_app";
import { Clock, AlertTriangle, Zap, Upload, FileText, X } from "lucide-react";

export interface IncidentFormProps {
  eventSlug: string;
  eventName?: string;
  onSuccess?: () => void;
}

interface IncidentFormValues {
  title: string;
  description: string;
  incidentAt?: string;
  parties?: string;
  location?: string;
  urgency?: string; // Made optional since reporters won't see it
  tags?: Tag[];
  relatedFiles?: File[];
}

const urgencyLevels = [
  { 
    value: "low", 
    label: "Low", 
    description: "Non-urgent, can be addressed later",
    icon: Clock,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
  },
  { 
    value: "medium", 
    label: "Medium", 
    description: "Needs attention soon",
    icon: AlertTriangle,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
  },
  { 
    value: "high", 
    label: "High", 
    description: "Urgent, needs immediate attention",
    icon: Zap,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
  },
  { 
    value: "critical", 
    label: "Critical", 
    description: "Emergency situation requiring immediate response",
    icon: AlertTriangle,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  },
];

const IncidentFormComponent: React.FC<IncidentFormProps> = ({ eventSlug, eventName, onSuccess }) => {
  const router = useRouter();
  const { user } = useContext(UserContext);
  const [userEventRoles, setUserEventRoles] = useState<string[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  
  const form = useForm<IncidentFormValues>({
    defaultValues: {
      title: "",
      description: "",
      incidentAt: "",
      parties: "",
      location: "",
      urgency: "medium", // Default value for when urgency is shown
      tags: [],
      relatedFiles: [],
    },
  });
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);

  // Fetch user's event-specific roles
  useEffect(() => {
    if (!eventSlug || !user) {
      setRolesLoading(false);
      return;
    }

    const fetchUserEventRoles = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const response = await fetch(`${apiUrl}/api/events/slug/${eventSlug}/my-roles`, {
          credentials: 'include'
        });

        if (response.ok) {
          const rolesData = await response.json();
          setUserEventRoles(rolesData?.roles || []);
        } else {
          setUserEventRoles([]);
        }
      } catch (error) {
        console.error('Error fetching user event roles:', error);
        setUserEventRoles([]);
      } finally {
        setRolesLoading(false);
      }
    };

    fetchUserEventRoles();
  }, [eventSlug, user]);

  // Check if user has responder or higher privileges (can see urgency field)
  const canSetUrgency = userEventRoles.some(role => 
    ['responder', 'event_admin', 'system_admin'].includes(role)
  ) || (user?.roles && user.roles.includes('system_admin'));

  const handleSubmit: SubmitHandler<IncidentFormValues> = async (data) => {
    setSubmitting(true);
    setMessage("");
    const { title, description, incidentAt, parties, location, urgency, tags, relatedFiles } = data;
    
    if (!title || title.length < 10 || title.length > 70) {
      form.setError("title", { message: "Title must be between 10 and 70 characters." });
      setSubmitting(false);
      return;
    }
    
    // Validate incident date if provided - prevent future dates
    if (incidentAt) {
      const incidentDate = new Date(incidentAt);
      if (isNaN(incidentDate.getTime())) {
        form.setError("incidentAt", { message: "Please enter a valid date and time." });
        setSubmitting(false);
        return;
      }

      // Check if date is not too far in the future
      const now = new Date();
      const maxFutureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now
      if (incidentDate > maxFutureDate) {
        form.setError("incidentAt", { message: "Incident date cannot be more than 24 hours in the future." });
        setSubmitting(false);
        return;
      }
    }
    
    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    
    // Only include urgency if user can set it, otherwise backend will use default
    if (canSetUrgency && urgency) {
      formData.append("urgency", urgency);
    }
    
    if (incidentAt) formData.append("incidentAt", new Date(incidentAt).toISOString());
    if (parties) formData.append("parties", parties);
    if (location) formData.append("location", location);
    
    // Add tags as JSON array
    if (tags && tags.length > 0) {
      formData.append("tags", JSON.stringify(tags.map(tag => tag.id)));
    }
    
    if (relatedFiles && relatedFiles.length > 0) {
      for (let i = 0; i < relatedFiles.length; i++) {
        formData.append("relatedFiles", relatedFiles[i]);
      }
    }
    
    const res = await fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/api/events/slug/${eventSlug}/incidents`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      },
    );
    
    if (res.ok) {
      setMessage("Incident submitted successfully!");
      form.reset();
      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate to the new URL structure
        const eventUrl = `/events/${eventSlug}/incidents`;
        if (router.asPath === eventUrl) {
          router.reload();
        } else {
          router.push(eventUrl);
        }
      }
    } else {
      const errorText = await res.text().catch(() => "Unknown error");
      setMessage(`Failed to submit incident: ${res.status} ${errorText}`);
    }
    setSubmitting(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      const currentFiles = form.getValues("relatedFiles") || [];
      form.setValue("relatedFiles", [...currentFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const currentFiles = form.getValues("relatedFiles") || [];
    const newFiles = currentFiles.filter((_, i) => i !== index);
    form.setValue("relatedFiles", newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Show loading state while checking roles
  if (rolesLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        {eventName && (
          <div className="text-sm mb-4 text-muted-foreground">
            For event: <span className="font-medium">{eventName}</span>
          </div>
        )}
        <Card className="p-6">
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading form...</div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {eventName && (
        <div className="text-sm mb-4 text-muted-foreground">
          For event: <span className="font-medium">{eventName}</span>
        </div>
      )}
      
      {eventSlug && (
        <>
          <CoCTeamList eventSlug={eventSlug} />
          <p className="mt-2 text-sm text-muted-foreground">
            The Code of Conduct team can see every incident submitted to this event, including its
            full details. Only submit an incident if you are comfortable with them reading it.
          </p>
        </>
      )}

      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-6 text-foreground">
          Submit an Incident
        </h3>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              name="title"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="incident-title">Incident Title *</FormLabel>
                  <FormControl>
                    <Input
                      id="incident-title"
                      type="text"
                      {...field}
                      minLength={10}
                      maxLength={70}
                      required
                      placeholder="Enter a concise summary (10-70 characters)"
                    />
                  </FormControl>
                  <FormDescription>
                    The title is not encrypted and can appear in lists and searches. Keep sensitive
                    details out of it and put them in the description instead.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Urgency - Only show to responders and above */}
            {canSetUrgency && (
              <FormField
                name="urgency"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="urgency">Urgency Level</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select urgency" />
                        </SelectTrigger>
                        <SelectContent>
                          {urgencyLevels.map((level) => {
                            const IconComponent = level.icon;
                            return (
                              <SelectItem key={level.value} value={level.value}>
                                <div className="flex items-center gap-2">
                                  <IconComponent className="h-4 w-4" />
                                  <span>{level.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                    {field.value && (
                      <div className="mt-2">
                        <Badge className={urgencyLevels.find(l => l.value === field.value)?.color}>
                          {urgencyLevels.find(l => l.value === field.value)?.description}
                        </Badge>
                      </div>
                    )}
                  </FormItem>
                )}
              />
            )}

            {/* Description */}
            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="incident-description">Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      id="incident-description"
                      {...field}
                      required
                      className="min-h-[120px]"
                      placeholder="Please provide a detailed description of the incident..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags - Only show to responders and above */}
            {canSetUrgency && (
              <FormField
                name="tags"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <TagSelector
                      eventSlug={eventSlug}
                      selectedTags={field.value || []}
                      onTagsChange={field.onChange}
                      disabled={submitting}
                    />
                  </FormItem>
                )}
              />
            )}

            {/* Date/Time and Location Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="incidentAt"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="incident-at">Date/Time of Incident</FormLabel>
                    <FormControl>
                      <Input
                        id="incident-at"
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <span className="text-xs text-muted-foreground">
                      If known, when did the incident occur?
                    </span>
                  </FormItem>
                )}
              />

              <FormField
                name="location"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="location">Location of Incident</FormLabel>
                    <FormControl>
                      <Input
                        id="location"
                        type="text"
                        {...field}
                        placeholder="e.g., Main conference hall, Room 205, Online"
                      />
                    </FormControl>
                    <FormMessage />
                    <span className="text-xs text-muted-foreground">
                      Where did the incident take place?
                    </span>
                  </FormItem>
                )}
              />
            </div>

            {/* Involved Parties */}
            <FormField
              name="parties"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="parties">Involved Parties</FormLabel>
                  <FormControl>
                    <Input
                      id="parties"
                      type="text"
                      {...field}
                      placeholder="Names, emails, or descriptions (comma-separated)"
                    />
                  </FormControl>
                  <FormMessage />
                  <span className="text-xs text-muted-foreground">
                    List anyone involved, if known. You can use names, email addresses, or descriptions.
                  </span>
                </FormItem>
              )}
            />

            {/* Evidence Upload */}
            <FormField
              name="relatedFiles"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="incident-related-files">Related Files</FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {/* Drag and Drop Area */}
                      <div
                        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                          dragActive
                            ? "border-primary bg-primary/5"
                            : "border-muted-foreground/25 hover:border-muted-foreground/50"
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                      >
                        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm font-medium mb-1">
                          Drop files here or click to upload
                        </p>
                        <p className="text-xs text-muted-foreground mb-4">
                          Screenshots, documents, audio, video files are supported
                        </p>
                        <input
                          id="incident-related-files"
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            if (e.target.files) {
                              const newFiles = Array.from(e.target.files);
                              const currentFiles = field.value || [];
                              field.onChange([...currentFiles, ...newFiles]);
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => document.getElementById("incident-related-files")?.click()}
                        >
                          Choose Files
                        </Button>
                      </div>

                      {/* File List */}
                      {field.value && field.value.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Selected Files:</p>
                          {field.value.map((file, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{file.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatFileSize(file.size)}
                                  </p>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeFile(index)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                  <span className="text-xs text-muted-foreground">
                    Optional: Upload any relevant evidence such as screenshots, documents, or media files.
                  </span>
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <div className="flex flex-col gap-4">
              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? "Submitting..." : "Submit Incident"}
              </Button>
              
              {message && (
                <div className={`text-sm p-3 rounded-lg ${
                  message.includes("successfully") 
                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}>
                  {message}
                </div>
              )}
            </div>
          </form>
        </Form>
      </Card>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const IncidentForm = React.memo(IncidentFormComponent); 