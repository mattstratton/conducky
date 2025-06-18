import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter } from "next/router";
import { CoCTeamList } from "./CoCTeamList";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Upload, X, FileText, AlertTriangle, Clock, Zap } from "lucide-react";

export interface ReportFormProps {
  eventSlug: string;
  eventName?: string;
  onSuccess?: () => void;
}

interface ReportFormValues {
  title: string;
  type: string;
  description: string;
  incidentAt?: string;
  parties?: string;
  location?: string;
  contactPreference: string;
  urgency: string;
  evidence?: File[];
}

const reportTypes = [
  { value: "harassment", label: "Harassment" },
  { value: "safety", label: "Safety" },
  { value: "other", label: "Other" },
];

const contactPreferences = [
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "in-person", label: "In-person meeting" },
  { value: "no-contact", label: "No contact needed" },
];

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

export const ReportForm: React.FC<ReportFormProps> = ({ eventSlug, eventName, onSuccess }) => {
  const router = useRouter();
  const form = useForm<ReportFormValues>({
    defaultValues: {
      title: "",
      type: "",
      description: "",
      incidentAt: "",
      parties: "",
      location: "",
      contactPreference: "email",
      urgency: "medium",
      evidence: [],
    },
  });
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);

  const handleSubmit: SubmitHandler<ReportFormValues> = async (data) => {
    setSubmitting(true);
    setMessage("");
    const { title, type, description, incidentAt, parties, location, contactPreference, urgency, evidence } = data;
    
    if (!title || title.length < 10 || title.length > 70) {
      form.setError("title", { message: "Title must be between 10 and 70 characters." });
      setSubmitting(false);
      return;
    }
    
    const formData = new FormData();
    formData.append("title", title);
    formData.append("type", type);
    formData.append("description", description);
    formData.append("contactPreference", contactPreference);
    formData.append("urgency", urgency);
    
    if (incidentAt) formData.append("incidentAt", new Date(incidentAt).toISOString());
    if (parties) formData.append("parties", parties);
    if (location) formData.append("location", location);
    if (evidence && evidence.length > 0) {
      for (let i = 0; i < evidence.length; i++) {
        formData.append("evidence", evidence[i]);
      }
    }
    
    const res = await fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/api/events/slug/${eventSlug}/reports`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      },
    );
    
    if (res.ok) {
      setMessage("Report submitted successfully!");
      form.reset();
      if (onSuccess) {
        onSuccess();
      } else {
        // Navigate to the new URL structure
        const eventUrl = `/events/${eventSlug}/reports`;
        if (router.asPath === eventUrl) {
          router.reload();
        } else {
          router.push(eventUrl);
        }
      }
    } else {
      const errorText = await res.text().catch(() => "Unknown error");
      setMessage(`Failed to submit report: ${res.status} ${errorText}`);
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
      const currentFiles = form.getValues("evidence") || [];
      form.setValue("evidence", [...currentFiles, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    const currentFiles = form.getValues("evidence") || [];
    const newFiles = currentFiles.filter((_, i) => i !== index);
    form.setValue("evidence", newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {eventName && (
        <div className="text-sm mb-4 text-muted-foreground">
          For event: <span className="font-medium">{eventName}</span>
        </div>
      )}
      
      {eventSlug && <CoCTeamList eventSlug={eventSlug} />}
      
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-6 text-foreground">
          Submit a Report
        </h3>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {/* Title */}
            <FormField
              name="title"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="report-title">Report Title *</FormLabel>
                  <FormControl>
                    <Input
                      id="report-title"
                      type="text"
                      {...field}
                      minLength={10}
                      maxLength={70}
                      required
                      placeholder="Enter a concise summary (10-70 characters)"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type and Urgency Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                name="type"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="report-type">Type *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {reportTypes.map((rt) => (
                            <SelectItem key={rt.value} value={rt.value}>
                              {rt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                name="urgency"
                control={form.control}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel htmlFor="urgency">Urgency Level *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange} required>
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
            </div>

            {/* Description */}
            <FormField
              name="description"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="report-description">Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      id="report-description"
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

            {/* Contact Preference */}
            <FormField
              name="contactPreference"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="contact-preference">Preferred Contact Method *</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange} required>
                      <SelectTrigger>
                        <SelectValue placeholder="How should we contact you?" />
                      </SelectTrigger>
                      <SelectContent>
                        {contactPreferences.map((pref) => (
                          <SelectItem key={pref.value} value={pref.value}>
                            {pref.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                  <span className="text-xs text-muted-foreground">
                    How would you prefer to be contacted about this report?
                  </span>
                </FormItem>
              )}
            />

            {/* Evidence Upload */}
            <FormField
              name="evidence"
              control={form.control}
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="report-evidence">Evidence Files</FormLabel>
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
                          id="report-evidence"
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
                          onClick={() => document.getElementById("report-evidence")?.click()}
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
                {submitting ? "Submitting..." : "Submit Report"}
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