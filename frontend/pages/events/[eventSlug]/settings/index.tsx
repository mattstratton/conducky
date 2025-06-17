import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Card } from "../../../../components/ui/card";
import { EventMetaEditor } from "../../../../components/EventMetaEditor";
import { InviteManager } from "../../../../components/InviteManager";
import { UserManager } from "../../../../components/UserManager";

interface User {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  role?: string;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  startDate?: string;
  endDate?: string;
  website?: string;
  description?: string;
  codeOfConduct?: string;
  contactEmail?: string;
}

export default function EventAdminPage() {
  const router = useRouter();
  const { eventSlug } = router.query as { eventSlug?: string };
  const [event, setEvent] = useState<Event | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userEventRoles, setUserEventRoles] = useState<string[]>([]);
  const [rolesList] = useState<string[]>(["Admin", "Responder", "Reporter"]);
  const [page, setPage] = useState(1);
  const [logoUploadLoading, setLogoUploadLoading] = useState(false);
  const [logoExists, setLogoExists] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const codeModalRef = useRef<HTMLDivElement>(null);
  const closeCodeModalBtnRef = useRef<HTMLButtonElement>(null);
  const [roleFilter] = useState("All");
  const [metaEditError, setMetaEditError] = useState("");
  const [metaEditSuccess, setMetaEditSuccess] = useState("");
  const [sort] = useState("name");
  const [order] = useState<"asc" | "desc">("asc");
  const [limit] = useState(10);

  const fetchEventUsers = () => {
    if (!eventSlug) return;
    let url = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/events/slug/${eventSlug}/users?sort=${sort}&order=${order}&page=${page}&limit=${limit}`;
    if (roleFilter && roleFilter !== "All") url += `&role=${encodeURIComponent(roleFilter)}`;
    fetch(url, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { users: [], total: 0 }))
      .then(() => {
        // setEventUsers(data.users || []);
      })
      .catch(() => {
        // setEventUsers([]);
      });
  };

  const fetchInvites = () => {
    if (!eventSlug) return;
    fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/events/slug/${eventSlug}/invites`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { invites: [] }))
      .then(() => {
        // InviteManager now handles invites
      })
      .catch(() => {
        // InviteManager now handles invites
      });
  };

  useEffect(() => {
    if (!eventSlug) return;
    
    // Fetch event details
    fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/events/slug/${eventSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Event not found");
        return res.json();
      })
      .then((data) => {
        setEvent(data.event);
      });
    
    // Fetch user session
    fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/session", { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data ? data.user : null));
    
    // Fetch user's event-specific roles
    fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/events/slug/${eventSlug}/my-roles`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.roles) {
          setUserEventRoles(data.roles);
        }
      })
      .catch(() => setUserEventRoles([]));
    
    fetchEventUsers();
    fetchInvites();
    fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/events/slug/${eventSlug}/logo`, { method: "HEAD" })
      .then((res) => setLogoExists(res.ok))
      .catch(() => setLogoExists(false));
  }, [eventSlug]);

  useEffect(() => { fetchEventUsers(); }, [sort, order, page, limit, eventSlug, roleFilter]);
  useEffect(() => { setPage(1); }, [sort, order, limit]);
  useEffect(() => { setPage(1); }, [sort, order, limit, roleFilter]);
  useEffect(() => {
    if (!eventSlug) return;
    fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/events/slug/${eventSlug}/logo`, { method: "HEAD" })
      .then((res) => setLogoExists(res.ok))
      .catch(() => setLogoExists(false));
  }, [eventSlug]);
  useEffect(() => {
    if (showCodeModal) {
      closeCodeModalBtnRef.current?.focus();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape") setShowCodeModal(false);
        else if (e.key === "Tab" && codeModalRef.current) {
          const focusableEls = codeModalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          const firstEl = focusableEls[0] as HTMLElement;
          const lastEl = focusableEls[focusableEls.length - 1] as HTMLElement;
          if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
          else if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [showCodeModal]);

  function hasGlobalRole(role: string): boolean {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  }

  function hasEventRole(role: string): boolean {
    return userEventRoles.includes(role);
  }

  const isSuperAdmin = hasGlobalRole("SuperAdmin");
  const isEventAdmin = hasEventRole("Admin");

  // Only allow SuperAdmins or Event Admins to access settings
  if (!isSuperAdmin && !isEventAdmin) {
    return (
      <div style={{ padding: 40 }}>
        <h2>you do not have rights to this page</h2>
      </div>
    );
  }

  // --- UI rendering for event meta, user management, invites, etc. ---
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200 p-4 sm:p-8">
      <Card className="w-full max-w-full sm:max-w-4xl lg:max-w-5xl mx-auto mb-8">
        <h2 className="text-2xl font-bold mb-6">Admin for {event?.name}</h2>
        {/* Event Meta Editing */}
        {event && (
          <EventMetaEditor
            event={event}
            eventSlug={event.slug}
            onMetaChange={(field, value) => {
              // Update local event state for immediate feedback
              setEvent((prev) => prev ? { ...prev, [field]: value } : prev);
            }}
            onMetaSave={async (field, value) => {
              // PATCH or upload logic for each field
              setMetaEditError("");
              setMetaEditSuccess("");
              try {
                if (field === "logo" && value instanceof File) {
                  setLogoUploadLoading(true);
                  const formData = new FormData();
                  formData.append("logo", value);
                  const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/api/events/slug/${event.slug}/logo`, {
                    method: "POST",
                    credentials: "include",
                    body: formData,
                  });
                  if (!res.ok) {
                    setMetaEditError("An unexpected error occurred.");
                    setLogoUploadLoading(false);
                    return;
                  }
                  setMetaEditSuccess("Logo uploaded!");
                  const data = await res.json();
                  setEvent(data.event);
                  setLogoUploadLoading(false);
                  return;
                } else {
                  const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/events/slug/${event.slug}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ [field]: value }),
                  });
                  if (!res.ok) {
                    setMetaEditError("An unexpected error occurred.");
                    return;
                  }
                  setMetaEditSuccess("Event metadata updated!");
                  const data = await res.json();
                  setEvent(data.event);
                }
              } catch {
                setMetaEditError("Network error");
              }
            }}
            metaEditError={metaEditError}
            metaEditSuccess={metaEditSuccess}
            logoExists={logoExists}
            logoUploadLoading={logoUploadLoading}
          />
        )}
        {/* User Management */}
        {event && (
          <UserManager eventSlug={event.slug} rolesList={rolesList} />
        )}
        {/* Invite Management */}
        {event && (
          <InviteManager eventSlug={event.slug} rolesList={rolesList} />
        )}
        <Link href={`/events/${eventSlug}/dashboard`} className="text-blue-600 hover:underline">← Back to Event</Link>
      </Card>
    </div>
  );
} 