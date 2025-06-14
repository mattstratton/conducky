/* global process */
import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ModalContext } from "../../../context/ModalContext";
import { Button } from "@/components/ui/button";
import { Card } from "../../../components/ui/card";
import { ReportForm } from "../../../components/ReportForm";
import EventMetaCard from "../../../components/EventMetaCard";

// Define valid report states
const validStates = [
  "submitted",
  "acknowledged",
  "investigating",
  "resolved",
  "closed",
] as const;

type ReportState = typeof validStates[number];

interface User {
  id: string;
  name: string;
  email: string;
}

interface Reporter {
  id: string;
  email?: string;
}

interface Report {
  id: string;
  type: string;
  description: string;
  state: ReportState;
  reporter?: Reporter;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
}

interface StateChangeStatus {
  loading: boolean;
  error: string;
  success: string;
}

type StateChangeMap = {
  [reportId: string]: StateChangeStatus;
};

export default function EventDashboard() {
  const router = useRouter();
  const { eventSlug } = router.query;
  const [event, setEvent] = useState<Event | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [stateChange, setStateChange] = useState<StateChangeMap>({}); 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { openModal } = useContext(ModalContext) as any;

  // Inline edit state for metadata
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [metaEditError, setMetaEditError] = useState<string>("");
  const [metaEditSuccess, setMetaEditSuccess] = useState<string>("");
  
  // Logo upload state
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoUploadLoading, setLogoUploadLoading] = useState<boolean>(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [logoExists, setLogoExists] = useState<boolean>(false);

  // Fetch event details and user session
  useEffect(() => {
    if (!eventSlug) return;
    setLoading(true);
    // Fetch event details
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/event/slug/${eventSlug}`,
    )
      .then((res) => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then((data) => setEvent(data.event))
      .catch(() => setError("Event not found"));
    // Fetch user session
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/session",
      {
        credentials: "include",
      },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data ? data.user : null))
      .catch(() => setUser(null));
  }, [eventSlug]);

  // Fetch reports for this event
  useEffect(() => {
    if (!eventSlug) return;
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/events/slug/${eventSlug}/reports`,
    )
      .then((res) => res.json())
      .then((data) => setReports(data.reports || []))
      .catch(() => setReports([]));
    setLoading(false);
  }, [eventSlug, stateChange]); // refetch on state change

  // Fetch user roles for this event
  useEffect(() => {
    if (!eventSlug) return;
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/events/slug/${eventSlug}/my-roles`,
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : { roles: [] }))
      .then((data) => setUserRoles(data.roles || []));
  }, [eventSlug]);

  useEffect(() => {
    if (!eventSlug) return;
    // Check if logo exists
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/events/slug/${eventSlug}/logo`,
      { method: "HEAD" },
    )
      .then((res) => setLogoExists(res.ok))
      .catch(() => setLogoExists(false));
  }, [eventSlug, logoPreview]);

  if (error)
    return (
      <div style={{ padding: 40 }}>
        <h2>{error}</h2>
      </div>
    );
  if (loading || !event)
    return (
      <div style={{ padding: 40 }}>
        <h2>Loading event...</h2>
      </div>
    );

  // If user is not logged in, show login prompt and limited event info
  if (!user) {
    return (
      <div className="font-sans p-4 min-h-screen bg-background">
        <Card className="mb-6 max-w-4xl mx-auto p-4 sm:p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-4 text-foreground">Please Log In</h1>
            <p className="text-muted-foreground mb-4">
              You need to log in to access the full event dashboard and submit reports.
            </p>
            <Link href="/login">
              <Button className="px-6 py-2">
                Log In
              </Button>
            </Link>
          </div>
        </Card>
        <EventMetaCard
          event={event}
          logoPreview={logoPreview ?? undefined}
          logoExists={logoExists}
          eventSlug={eventSlug as string}
          showCodeButton={true}
          showEdit={false}
          editingField={undefined}
          editValue={""}
          onEditStart={() => {}}
          onEditChange={() => {}}
          onEditSave={() => {}}
          onEditCancel={() => {}}
          metaEditError=""
          metaEditSuccess=""
          logoUploadLoading={false}
          handleLogoFileChange={() => {}}
          logoFile={undefined}
        />
      </div>
    );
  }

  // Determine what to show based on user role
  const isSuperAdmin = userRoles.includes("SuperAdmin");
  const isAdmin = userRoles.includes("Admin");
  const isResponder = userRoles.includes("Responder");
  const canChangeState = isResponder || isAdmin || isSuperAdmin;

  // Handler for inline state change
  const handleStateChange = async (reportId: string, newState: ReportState) => {
    setStateChange((prev) => ({
      ...prev,
      [reportId]: { loading: true, error: "", success: "" },
    }));
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}/reports/${reportId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ state: newState }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        setStateChange((prev) => ({
          ...prev,
          [reportId]: {
            loading: false,
            error: data.error || "Failed to change state",
            success: "",
          },
        }));
      } else {
        setStateChange((prev) => ({
          ...prev,
          [reportId]: { loading: false, error: "", success: "State updated!" },
        }));
      }
    } catch {
      setError("Network error");
    }
  };

  // Handler to start editing a field
  const startEdit = (field: string, value?: string) => {
    setEditingField(field);
    setEditValue(value || "");
    setMetaEditError("");
    setMetaEditSuccess("");
    if (field === "logo") {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  // Handler to save edit
  const saveEdit = async () => {
    setMetaEditError("");
    setMetaEditSuccess("");
    const patchBody: Record<string, string> = {};
    if (editingField) {
      patchBody[editingField] = editValue;
    }
    // Special case: logo file upload
    if (editingField === "logo" && logoFile) {
      setLogoUploadLoading(true);
      const formData = new FormData();
      formData.append("logo", logoFile);
      try {
        const res = await fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
            `/events/slug/${eventSlug}/logo`,
          {
            method: "POST",
            credentials: "include",
            body: formData,
          },
        );
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMetaEditError(data.error || "Failed to upload logo.");
          setLogoUploadLoading(false);
          return;
        }
        setMetaEditSuccess("Logo uploaded!");
        const data = await res.json();
        setEvent(data.event);
        setEditingField(null);
        setLogoUploadLoading(false);
        return;
      } catch {
        setError("Network error");
        setLogoUploadLoading(false);
        return;
      }
    }
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(patchBody),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMetaEditError(data.error || "Failed to update event metadata.");
        return;
      }
      setMetaEditSuccess("Event metadata updated!");
      const data = await res.json();
      setEvent(data.event);
      setEditingField(null);
    } catch {
      setError("Network error");
    }
  };

  // Handler to cancel editing
  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
    setMetaEditError("");
    setMetaEditSuccess("");
    setLogoFile(null);
    setLogoPreview(null);
  };

  // Handle logo file selection
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  return (
    <div className="font-sans p-4 min-h-screen bg-background">
      <EventMetaCard
        event={event}
        logoPreview={logoPreview ?? undefined}
        logoExists={logoExists}
        eventSlug={eventSlug as string}
        showCodeButton={true}
        showEdit={false}
        editingField={undefined}
        editValue={""}
        onEditStart={() => {}}
        onEditChange={() => {}}
        onEditSave={() => {}}
        onEditCancel={() => {}}
        metaEditError=""
        metaEditSuccess=""
        logoUploadLoading={false}
        handleLogoFileChange={() => {}}
        logoFile={undefined}
      />
      <EventMetaCard
        event={event}
        logoPreview={logoPreview ?? undefined}
        logoExists={logoExists}
        eventSlug={eventSlug as string}
        showCodeButton={true}
        showEdit={isAdmin || isSuperAdmin}
        editingField={editingField ?? undefined}
        editValue={editValue}
        onEditStart={(field, value) => startEdit(field, value as string | undefined)}
        onEditChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditValue(e.target.value)}
        onEditSave={saveEdit}
        onEditCancel={cancelEdit}
        metaEditError={metaEditError}
        metaEditSuccess={metaEditSuccess}
        logoUploadLoading={logoUploadLoading}
        handleLogoFileChange={handleLogoFileChange}
        logoFile={logoFile ?? undefined}
      />
      <Card className="mb-6 max-w-4xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-4 text-foreground">Event: {event.name}</h1>
        <p className="text-sm font-medium text-muted-foreground">
          <b>Slug:</b> {event.slug}
        </p>
        <Link
          href="/"
          className="text-primary hover:underline"
        >
          ← Back to Events
        </Link>
        <hr className="my-4 border-border" />
        {/* Submit Report Button */}
        <div className="mb-6 flex justify-start">
          <Button
            onClick={() => openModal(event.slug, event.name)}
            className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm"
          >
            Submit Report
          </Button>
        </div>
        <hr className="my-4 border-border" />
        {/* Show reports for all roles, but filter for regular users */}
        <div>
          <h2 className="text-xl font-bold mb-4 text-foreground">
            {isResponder || isAdmin || isSuperAdmin
              ? "All Reports"
              : "Your Reports"}
          </h2>
          {/* Card view for mobile */}
          <div className="block sm:hidden">
            {reports.length === 0 ? (
              <p className="text-muted-foreground">
                No reports yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {(isResponder || isAdmin || isSuperAdmin
                  ? reports
                  : reports.filter(
                      (r) => r.reporter && user && r.reporter.id === user.id,
                    )
                ).map((report) => (
                  <Card key={report.id} className="flex flex-col gap-2 p-4">
                    <div className="font-semibold text-lg text-foreground">{report.type}</div>
                    <div className="text-sm text-muted-foreground mb-2">
                      {report.description}
                    </div>
                    <div className="flex flex-col gap-1 text-sm">
                      <span>
                        State:{" "}
                        {canChangeState ? (
                          <>
                            <select
                              value={report.state}
                              onChange={(e) =>
                                handleStateChange(report.id, e.target.value as ReportState)
                              }
                              disabled={stateChange[report.id]?.loading}
                              className="mr-2 px-2 py-1 rounded border border-border bg-background text-foreground sm:px-2 sm:py-1 sm:text-sm"
                            >
                              {validStates.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            {stateChange[report.id]?.error && (
                              <span className="text-destructive ml-2">
                                {stateChange[report.id].error}
                              </span>
                            )}
                            {stateChange[report.id]?.success && (
                              <span className="text-green-600 ml-2">
                                {stateChange[report.id].success}
                              </span>
                            )}
                          </>
                        ) : (
                          report.state
                        )}
                      </span>
                      {report.reporter && (
                        <span className="text-xs text-muted-foreground">
                          by {report.reporter.email || "anonymous"}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <Link
                        href={`/events/${event.slug}/reports/${report.id}`}
                        className="text-primary underline"
                      >
                        View Details
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          {/* List view for desktop */}
          <div className="hidden sm:block">
            {reports.length === 0 ? (
              <p className="text-muted-foreground">
                No reports yet.
              </p>
            ) : (
              <ul className="list-disc pl-8">
                {(isResponder || isAdmin || isSuperAdmin
                  ? reports
                  : reports.filter(
                      (r) => r.reporter && user && r.reporter.id === user.id,
                    )
                ).map((report) => (
                  <li key={report.id} className="mb-4">
                    <b className="text-foreground">{report.type}</b>: {report.description} (state:{" "}
                    {canChangeState ? (
                      <>
                        <select
                          value={report.state}
                          onChange={(e) =>
                            handleStateChange(report.id, e.target.value as ReportState)
                          }
                          disabled={stateChange[report.id]?.loading}
                          className="mr-4 px-2 py-1 rounded border border-border bg-background text-foreground sm:px-2 sm:py-1 sm:text-sm"
                        >
                          {validStates.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {stateChange[report.id]?.error && (
                          <span className="text-destructive ml-4">
                            {stateChange[report.id].error}
                          </span>
                        )}
                        {stateChange[report.id]?.success && (
                          <span className="text-green-600 ml-4">
                            {stateChange[report.id].success}
                          </span>
                        )}
                      </>
                    ) : (
                      report.state
                    )}
                    )
                    {report.reporter && (
                      <span className="text-sm text-muted-foreground">
                        {" "}
                        — by {report.reporter.email || "anonymous"}
                      </span>
                    )}{" "}
                    <Link
                      href={`/events/${event.slug}/reports/${report.id}`}
                      className="text-primary"
                    >
                      View Details
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
      <ReportForm eventSlug={eventSlug as string} />
    </div>
  );
} 