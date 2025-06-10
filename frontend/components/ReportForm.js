import React, { useState } from "react";
import { useRouter } from "next/router";
import CoCTeamList from "./CoCTeamList";
import Card from "./Card";
import Button from "./Button";

export default function ReportForm({ eventSlug, eventName, onSuccess }) {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [incidentAt, setIncidentAt] = useState("");
  const [parties, setParties] = useState("");
  const [evidence, setEvidence] = useState([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const reportTypes = [
    { value: "harassment", label: "Harassment" },
    { value: "safety", label: "Safety" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");
    const formData = new FormData();
    formData.append("type", type);
    formData.append("description", description);
    if (incidentAt)
      formData.append("incidentAt", new Date(incidentAt).toISOString());
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
      setType("");
      setDescription("");
      setIncidentAt("");
      setParties("");
      setEvidence([]);
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
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
            htmlFor="report-type"
          >
            Type
          </label>
          <select
            id="report-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
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
        </div>
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
            htmlFor="report-description"
          >
            Description
          </label>
          <textarea
            id="report-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[80px]"
          />
        </div>
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
            htmlFor="incident-at"
          >
            Date/Time of Incident (optional)
          </label>
          <input
            id="incident-at"
            type="datetime-local"
            value={incidentAt}
            onChange={(e) => setIncidentAt(e.target.value)}
            className="mt-1 block w-64 max-w-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            If known, please provide when the incident occurred.
          </span>
        </div>
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
            htmlFor="parties"
          >
            Involved Parties (optional)
          </label>
          <input
            id="parties"
            type="text"
            value={parties}
            onChange={(e) => setParties(e.target.value)}
            className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            placeholder="List names, emails, or descriptions (comma-separated or freeform)"
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            List anyone involved, if known. Separate multiple names with commas.
          </span>
        </div>
        <div>
          <label
            className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1"
            htmlFor="report-evidence"
          >
            Evidence (optional)
          </label>
          <input
            id="report-evidence"
            type="file"
            multiple
            onChange={(e) => setEvidence(Array.from(e.target.files))}
            className="mt-1 block w-full"
          />
        </div>
        <Button type="submit" disabled={submitting} className="mt-2">
          {submitting ? "Submitting..." : "Submit Report"}
        </Button>
        {message && (
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {message}
          </p>
        )}
      </form>
    </Card>
  );
}
