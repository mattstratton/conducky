import React from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { useRouter } from "next/router";
import { CoCTeamList } from "./CoCTeamList";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";

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
  evidence?: File[];
}

const reportTypes = [
  { value: "harassment", label: "Harassment" },
  { value: "safety", label: "Safety" },
  { value: "other", label: "Other" },
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
      evidence: [],
    },
  });
  const [message, setMessage] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit: SubmitHandler<ReportFormValues> = async (data) => {
    setSubmitting(true);
    setMessage("");
    const { title, type, description, incidentAt, parties, evidence } = data;
    if (!title || title.length < 10 || title.length > 70) {
      form.setError("title", { message: "Title must be between 10 and 70 characters." });
      setSubmitting(false);
      return;
    }
    const formData = new FormData();
    formData.append("title", title);
    formData.append("type", type);
    formData.append("description", description);
    if (incidentAt) formData.append("incidentAt", new Date(incidentAt).toISOString());
    if (parties) formData.append("parties", parties);
    if (evidence && evidence.length > 0) {
      for (let i = 0; i < evidence.length; i++) {
        formData.append("evidence", evidence[i]);
      }
    }
    const res = await fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/events/slug/${eventSlug}/reports`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      },
    );
    if (res.ok) {
      setMessage("Report submitted!");
      form.reset();
      const eventUrl = `/event/${eventSlug}`;
      if (onSuccess) {
        onSuccess();
      } else if (router.asPath === eventUrl) {
        router.reload();
      } else {
        router.push(eventUrl);
      }
    } else {
      const errorText = await res.text().catch(() => "Unknown error");
      setMessage(`Failed to submit report: ${res.status} ${errorText}`);
    }
    setSubmitting(false);
  };

  return (
    <Card className="max-w-xl mx-auto mt-8">
      {eventName && (
        <div className="text-sm mb-2 text-gray-500">
          For event: <b>{eventName}</b>
        </div>
      )}
      {eventSlug && <CoCTeamList eventSlug={eventSlug} />}
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">
        Submit a Report
      </h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FormField
            name="title"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="report-title">Report Title</FormLabel>
                <FormControl>
                  <input
                    id="report-title"
                    type="text"
                    {...field}
                    minLength={10}
                    maxLength={70}
                    required
                    className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Enter a concise summary (10-70 characters)"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="type"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="report-type">Type</FormLabel>
                <FormControl>
                  <select
                    id="report-type"
                    {...field}
                    required
                    className="mt-1 block w-64 max-w-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value="">Select type</option>
                    {reportTypes.map((rt) => (
                      <option key={rt.value} value={rt.value}>
                        {rt.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="description"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="report-description">Description</FormLabel>
                <FormControl>
                  <textarea
                    id="report-description"
                    {...field}
                    required
                    className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[80px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            name="incidentAt"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="incident-at">Date/Time of Incident (optional)</FormLabel>
                <FormControl>
                  <input
                    id="incident-at"
                    type="datetime-local"
                    {...field}
                    className="mt-1 block w-64 max-w-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </FormControl>
                <FormMessage />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  If known, please provide when the incident occurred.
                </span>
              </FormItem>
            )}
          />
          <FormField
            name="parties"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="parties">Involved Parties (optional)</FormLabel>
                <FormControl>
                  <input
                    id="parties"
                    type="text"
                    {...field}
                    className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="List names, emails, or descriptions (comma-separated or freeform)"
                  />
                </FormControl>
                <FormMessage />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  List anyone involved, if known. Separate multiple names with commas.
                </span>
              </FormItem>
            )}
          />
          <FormField
            name="evidence"
            control={form.control}
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="report-evidence">Evidence (optional)</FormLabel>
                <FormControl>
                  <input
                    id="report-evidence"
                    type="file"
                    multiple
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      field.onChange(e.target.files ? Array.from(e.target.files) : []);
                    }}
                    className="mt-1 block w-full"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={submitting} className="mt-2">
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
          {message && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {message}
            </p>
          )}
        </form>
      </Form>
    </Card>
  );
}; 