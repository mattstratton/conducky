import React from "react";
import { useRouter } from "next/router";
import { useEffect, useState, useContext } from "react";
import Link from "next/link";
import { ModalContext } from "../../context/ModalContext";
import { Button, Input, Card, Table } from "../../components";
import ReactMarkdown from "react-markdown";
import { PencilIcon, CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import CoCTeamList from "../../components/CoCTeamList";

const validStates = [
  "submitted",
  "acknowledged",
  "investigating",
  "resolved",
  "closed",
];

export default function EventDashboard() {
  const router = useRouter();
  const { "event-slug": eventSlug } = router.query;
  const [event, setEvent] = useState(null);
  const [reports, setReports] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stateChange, setStateChange] = useState({}); // { [reportId]: { loading, error, success } }
  const { openModal } = useContext(ModalContext);
  const [showCodeModal, setShowCodeModal] = useState(false);
  // Inline edit state for metadata
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [metaEditError, setMetaEditError] = useState("");
  const [metaEditSuccess, setMetaEditSuccess] = useState("");
  // Logo upload state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUploadLoading, setLogoUploadLoading] = useState(false);
  const [userRoles, setUserRoles] = useState([]);
  const [logoExists, setLogoExists] = useState(false);
  const [cocTeam, setCocTeam] = useState([]);
  const [cocTeamLoading, setCocTeamLoading] = useState(false);
  const [cocTeamError, setCocTeamError] = useState("");

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

  // Fetch Code of Conduct Team (Responders/Admins) for this event
  useEffect(() => {
    if (!user || !eventSlug) return;
    setCocTeamLoading(true);
    setCocTeamError("");
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/events/slug/${eventSlug}/users?role=Responder`,
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        // Fetch Admins as well
        fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
            `/events/slug/${eventSlug}/users?role=Admin`,
          { credentials: "include" },
        )
          .then((res2) => (res2.ok ? res2.json() : Promise.reject(res2)))
          .then((data2) => {
            // Combine and dedupe by user id
            const all = [...(data.users || []), ...(data2.users || [])];
            const deduped = Object.values(
              all.reduce((acc, u) => {
                acc[u.id] = u;
                return acc;
              }, {}),
            );
            setCocTeam(deduped);
            setCocTeamLoading(false);
          })
          .catch(() => {
            setCocTeamError("Failed to load Code of Conduct Team.");
            setCocTeamLoading(false);
          });
      })
      .catch(() => {
        setCocTeamError("Failed to load Code of Conduct Team.");
        setCocTeamLoading(false);
      });
  }, [user, eventSlug]);

  // Helper: check user role for this event
  function hasRole(role) {
    return userRoles.includes(role);
  }

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

  // If user is not logged in, only show the event meta section
  if (!user) {
    return (
      <div className="font-sans p-4 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
        <Card className="mb-6 max-w-4xl mx-auto p-4 sm:p-8">
          {/* Event Metadata Display (copied from above) */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-4">
            {/* Logo */}
            {(() => {
              const backendBaseUrl =
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
              let logoSrc =
                logoPreview ||
                (logoExists
                  ? `${backendBaseUrl}/events/slug/${eventSlug}/logo`
                  : null);
              return logoSrc ? (
                <img
                  src={logoSrc}
                  alt="Event Logo"
                  className="w-24 h-24 object-contain rounded bg-white border border-gray-200 dark:border-gray-700"
                />
              ) : null;
            })()}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl font-bold">{event.name}</h1>
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-200 mb-2">
                <span className="flex items-center gap-1">
                  <b>Start:</b>{" "}
                  {event.startDate ? (
                    new Date(event.startDate).toLocaleDateString()
                  ) : (
                    <span className="italic text-gray-400">(none)</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <b>End:</b>{" "}
                  {event.endDate ? (
                    new Date(event.endDate).toLocaleDateString()
                  ) : (
                    <span className="italic text-gray-400">(none)</span>
                  )}
                </span>
                <span className="flex items-center gap-1">
                  <b>Website:</b>{" "}
                  {event.website ? (
                    <a
                      href={event.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 underline"
                    >
                      {event.website}
                    </a>
                  ) : (
                    <span className="italic text-gray-400">(none)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Description:</span>
                <span className="ml-2 text-gray-800 dark:text-gray-100">
                  {event.description || (
                    <span className="italic text-gray-400">(none)</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">Code of Conduct:</span>
                <button
                  onClick={() => setShowCodeModal(true)}
                  className="text-blue-600 dark:text-blue-400 underline font-medium"
                >
                  View Code of Conduct
                </button>
              </div>
            </div>
          </div>
        </Card>
        {/* Code of Conduct Modal for anonymous users */}
        {showCodeModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
              <button
                onClick={() => setShowCodeModal(false)}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl"
                aria-label="Close"
              >
                &times;
              </button>
              <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Code of Conduct
              </h2>
              <div className="prose dark:prose-invert max-h-[60vh] overflow-y-auto">
                <ReactMarkdown>{event.codeOfConduct}</ReactMarkdown>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Determine what to show based on user role
  const isSuperAdmin = hasRole("SuperAdmin");
  const isAdmin = hasRole("Admin");
  const isResponder = hasRole("Responder");
  const isRegularUser = user && !isSuperAdmin && !isAdmin && !isResponder;
  const isAnonymous = !user;
  const canChangeState = isResponder || isAdmin || isSuperAdmin;

  // Handler for inline state change
  const handleStateChange = async (reportId, newState) => {
    setStateChange((prev) => ({
      ...prev,
      [reportId]: { loading: true, error: "", success: "" },
    }));
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}/reports/${reportId}/state`,
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
    } catch (err) {
      setStateChange((prev) => ({
        ...prev,
        [reportId]: { loading: false, error: "Network error", success: "" },
      }));
    }
  };

  // Handler to start editing a field
  const startEdit = (field, value) => {
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
    let patchBody = {};
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
      } catch (err) {
        setMetaEditError("Network error");
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
    } catch (err) {
      setMetaEditError("Network error");
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
  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  return (
    <div className="font-sans p-4 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      {/* Event Metadata Display */}
      <Card className="mb-6 max-w-4xl mx-auto p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-4">
          {/* Logo */}
          <div className="relative">
            {(() => {
              const backendBaseUrl =
                process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
              let logoSrc =
                logoPreview ||
                (logoExists
                  ? `${backendBaseUrl}/events/slug/${eventSlug}/logo`
                  : null);
              return logoSrc ? (
                <img
                  src={logoSrc}
                  alt="Event Logo"
                  className="w-24 h-24 object-contain rounded bg-white border border-gray-200 dark:border-gray-700"
                />
              ) : null;
            })()}
            {(isAdmin || isSuperAdmin) &&
              (editingField === "logo" ? (
                <div className="absolute top-0 left-0 w-24 h-24 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 rounded z-10 p-2">
                  <div className="flex flex-col gap-1 w-full">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-200">
                      Upload Logo
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoFileChange}
                      className="block w-full text-xs text-gray-700 dark:text-gray-200"
                    />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      or
                    </span>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full text-xs"
                      placeholder="Logo URL"
                      disabled={!!logoFile}
                    />
                  </div>
                  <div className="flex gap-1 mt-2">
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="text-green-600"
                      aria-label="Save logo"
                      disabled={logoUploadLoading}
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-gray-500"
                      aria-label="Cancel edit"
                      disabled={logoUploadLoading}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                  {logoUploadLoading && (
                    <span className="text-xs text-gray-500 mt-1">
                      Uploading...
                    </span>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startEdit("logo", event.logo)}
                  className="absolute top-1 right-1 text-blue-600 bg-white dark:bg-gray-900 rounded-full p-1 shadow"
                  aria-label="Edit logo"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
              ))}
          </div>
          <div className="flex-1">
            {/* Name */}
            <div className="flex items-center gap-2 mb-2">
              {editingField === "name" ? (
                <>
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-2xl font-bold"
                    style={{ minWidth: 120 }}
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="text-green-600"
                    aria-label="Save event name"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="text-gray-500"
                    aria-label="Cancel edit"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold">{event.name}</h1>
                  {(isAdmin || isSuperAdmin) && (
                    <button
                      type="button"
                      onClick={() => startEdit("name", event.name)}
                      className="text-blue-600"
                      aria-label="Edit event name"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  )}
                </>
              )}
            </div>
            {/* Dates and Website */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-700 dark:text-gray-200 mb-2">
              {/* Start Date */}
              <span className="flex items-center gap-1">
                <b>Start:</b>
                {editingField === "startDate" ? (
                  <>
                    <input
                      type="date"
                      value={editValue ? editValue.slice(0, 10) : ""}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="text-green-600 ml-1"
                      aria-label="Save start date"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-gray-500 ml-1"
                      aria-label="Cancel edit"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    {event.startDate ? (
                      new Date(event.startDate).toLocaleDateString()
                    ) : (
                      <span className="italic text-gray-400">(none)</span>
                    )}
                    {(isAdmin || isSuperAdmin) && (
                      <button
                        type="button"
                        onClick={() => startEdit("startDate", event.startDate)}
                        className="text-blue-600 ml-1"
                        aria-label="Edit start date"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </span>
              {/* End Date */}
              <span className="flex items-center gap-1">
                <b>End:</b>
                {editingField === "endDate" ? (
                  <>
                    <input
                      type="date"
                      value={editValue ? editValue.slice(0, 10) : ""}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="text-green-600 ml-1"
                      aria-label="Save end date"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-gray-500 ml-1"
                      aria-label="Cancel edit"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    {event.endDate ? (
                      new Date(event.endDate).toLocaleDateString()
                    ) : (
                      <span className="italic text-gray-400">(none)</span>
                    )}
                    {(isAdmin || isSuperAdmin) && (
                      <button
                        type="button"
                        onClick={() => startEdit("endDate", event.endDate)}
                        className="text-blue-600 ml-1"
                        aria-label="Edit end date"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </span>
              {/* Website */}
              <span className="flex items-center gap-1">
                <b>Website:</b>
                {editingField === "website" ? (
                  <>
                    <input
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      placeholder="https://example.com"
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="text-green-600 ml-1"
                      aria-label="Save website"
                    >
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-gray-500 ml-1"
                      aria-label="Cancel edit"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    {event.website ? (
                      <a
                        href={event.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 underline"
                      >
                        {event.website}
                      </a>
                    ) : (
                      <span className="italic text-gray-400">(none)</span>
                    )}
                    {(isAdmin || isSuperAdmin) && (
                      <button
                        type="button"
                        onClick={() => startEdit("website", event.website)}
                        className="text-blue-600 ml-1"
                        aria-label="Edit website"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                    )}
                  </>
                )}
              </span>
            </div>
            {/* Description */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">Description:</span>
              {editingField === "description" ? (
                <>
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full min-h-[60px]"
                    style={{ minWidth: 180 }}
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="ml-2 text-green-600"
                    aria-label="Save description"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="ml-1 text-gray-500"
                    aria-label="Cancel edit"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <span className="ml-2 text-gray-800 dark:text-gray-100">
                    {event.description || (
                      <span className="italic text-gray-400">(none)</span>
                    )}
                  </span>
                  {(isAdmin || isSuperAdmin) && (
                    <button
                      type="button"
                      onClick={() =>
                        startEdit("description", event.description)
                      }
                      className="ml-2 text-blue-600"
                      aria-label="Edit description"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  )}
                </>
              )}
            </div>
            {/* Code of Conduct */}
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium">Code of Conduct:</span>
              {editingField === "codeOfConduct" ? (
                <>
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full min-h-[100px] font-mono"
                    style={{ minWidth: 180 }}
                    placeholder="Enter code of conduct in markdown..."
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="ml-2 text-green-600"
                    aria-label="Save code of conduct"
                  >
                    <CheckIcon className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="ml-1 text-gray-500"
                    aria-label="Cancel edit"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowCodeModal(true)}
                    className="text-blue-600 dark:text-blue-400 underline font-medium"
                  >
                    View Code of Conduct
                  </button>
                  {(isAdmin || isSuperAdmin) && (
                    <button
                      type="button"
                      onClick={() =>
                        startEdit("codeOfConduct", event.codeOfConduct)
                      }
                      className="ml-2 text-blue-600"
                      aria-label="Edit code of conduct"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                  )}
                </>
              )}
            </div>
            {/* Success/Error messages */}
            {(metaEditSuccess || metaEditError) && (
              <div className="mt-2">
                {metaEditSuccess && (
                  <span className="text-green-600 dark:text-green-400">
                    {metaEditSuccess}
                  </span>
                )}
                {metaEditError && (
                  <span className="text-red-600 dark:text-red-400 ml-4">
                    {metaEditError}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Code of Conduct Team Section (only for logged-in users) */}
        {user && <CoCTeamList eventSlug={eventSlug} />}
      </Card>
      {/* Code of Conduct Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
            <button
              onClick={() => setShowCodeModal(false)}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl"
              aria-label="Close"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Code of Conduct
            </h2>
            <div className="prose dark:prose-invert max-h-[60vh] overflow-y-auto">
              <ReactMarkdown>{event.codeOfConduct}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
      <Card className="mb-6 max-w-4xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-4">Event: {event.name}</h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-300">
          <b>Slug:</b> {event.slug}
        </p>
        <Link
          href="/"
          className="text-blue-700 dark:text-blue-400 hover:underline"
        >
          ← Back to Events
        </Link>
        <hr className="my-4 border-gray-200 dark:border-gray-700" />
        {/* Submit Report Button */}
        <div className="mb-6 flex justify-start">
          <Button
            onClick={() => openModal(event.slug, event.name)}
            className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm"
          >
            Submit Report
          </Button>
        </div>
        <hr className="my-4 border-gray-200 dark:border-gray-700" />
        {/* Show reports for all roles, but filter for regular users */}
        <div>
          <h2 className="text-xl font-bold mb-4">
            {isResponder || isAdmin || isSuperAdmin
              ? "All Reports"
              : "Your Reports"}
          </h2>
          {/* Card view for mobile */}
          <div className="block sm:hidden">
            {reports.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
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
                    <div className="font-semibold text-lg">{report.type}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">
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
                                handleStateChange(report.id, e.target.value)
                              }
                              disabled={stateChange[report.id]?.loading}
                              className="mr-2 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 sm:px-2 sm:py-1 sm:text-sm"
                            >
                              {validStates.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            {stateChange[report.id]?.error && (
                              <span className="text-red-500 dark:text-red-400 ml-2">
                                {stateChange[report.id].error}
                              </span>
                            )}
                            {stateChange[report.id]?.success && (
                              <span className="text-green-500 dark:text-green-400 ml-2">
                                {stateChange[report.id].success}
                              </span>
                            )}
                          </>
                        ) : (
                          report.state
                        )}
                      </span>
                      {report.reporter && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          by {report.reporter.email || "anonymous"}
                        </span>
                      )}
                    </div>
                    <div className="mt-2">
                      <Link
                        href={`/event/${event.slug}/report/${report.id}`}
                        className="text-blue-500 dark:text-blue-400 underline"
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
              <p className="text-gray-500 dark:text-gray-400">
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
                    <b>{report.type}</b>: {report.description} (state:{" "}
                    {canChangeState ? (
                      <>
                        <select
                          value={report.state}
                          onChange={(e) =>
                            handleStateChange(report.id, e.target.value)
                          }
                          disabled={stateChange[report.id]?.loading}
                          className="mr-4 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 sm:px-2 sm:py-1 sm:text-sm"
                        >
                          {validStates.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                        {stateChange[report.id]?.error && (
                          <span className="text-red-500 dark:text-red-400 ml-4">
                            {stateChange[report.id].error}
                          </span>
                        )}
                        {stateChange[report.id]?.success && (
                          <span className="text-green-500 dark:text-green-400 ml-4">
                            {stateChange[report.id].success}
                          </span>
                        )}
                      </>
                    ) : (
                      report.state
                    )}
                    )
                    {report.reporter && (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {" "}
                        — by {report.reporter.email || "anonymous"}
                      </span>
                    )}{" "}
                    <Link
                      href={`/event/${event.slug}/report/${report.id}`}
                      className="text-blue-500 dark:text-blue-400"
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
    </div>
  );
}

// Simple report submission form
function ReportForm({ eventSlug }) {
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [incidentAt, setIncidentAt] = useState("");
  const [parties, setParties] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [evidence, setEvidence] = useState([]);

  // Report types from schema
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
    } else {
      setMessage("Failed to submit report.");
    }
    setSubmitting(false);
  };

  return (
    <Card className="max-w-xl mx-auto mt-8">
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
