import React from "react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Button, Card, Table } from "../../../../components";
import Avatar from "../../../../components/Avatar";
import ReportDetailView from "../../../../components/ReportDetailView";

const validStates = [
  "submitted",
  "acknowledged",
  "investigating",
  "resolved",
  "closed",
];

const visibilityOptions = [
  { value: "public", label: "Public (visible to all involved)" },
  { value: "internal", label: "Internal (responders/admins only)" },
];

export default function ReportDetail({ initialReport, error }) {
  const router = useRouter();
  const { "event-slug": eventSlug, id } = router.query;
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(error);
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [stateChangeError, setStateChangeError] = useState("");
  const [stateChangeSuccess, setStateChangeSuccess] = useState("");
  const [createdAtLocal, setCreatedAtLocal] = useState("");
  const [updatedAtLocal, setUpdatedAtLocal] = useState("");
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState("");
  const [commentVisibility, setCommentVisibility] = useState("public");
  const [commentError, setCommentError] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  // Add state for editing and deleting comments
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentBody, setEditCommentBody] = useState("");
  const [editCommentVisibility, setEditCommentVisibility] = useState("public");
  const [editError, setEditError] = useState("");
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  // Add state for evidence upload
  const [evidenceFiles, setEvidenceFiles] = useState(
    report && report.evidenceFiles ? report.evidenceFiles : [],
  );
  const [newEvidence, setNewEvidence] = useState([]);
  const [uploadingEvidence, setUploadingEvidence] = useState(false);
  const [evidenceUploadMsg, setEvidenceUploadMsg] = useState("");
  const [assignmentFields, setAssignmentFields] = useState({
    assignedResponderId: initialReport?.assignedResponderId || '',
    severity: initialReport?.severity || '',
    resolution: initialReport?.resolution || '',
  });
  const [eventUsers, setEventUsers] = useState([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const [assignmentSuccess, setAssignmentSuccess] = useState('');

  // Fetch user info
  useEffect(() => {
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/session",
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.user) setUser(data.user);
      });
  }, []);

  // Fetch user roles for this event after user is set
  useEffect(() => {
    if (eventSlug && user) {
      fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}/my-roles`,
        { credentials: "include" },
      )
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && data.roles) setUserRoles(data.roles);
        });
    }
  }, [eventSlug, user]);

  // Fetch comments for this report
  useEffect(() => {
    if (!eventSlug || !id) return;
    setCommentsLoading(true);
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/events/slug/${eventSlug}/reports/${id}/comments`,
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : { comments: [] }))
      .then((data) => setComments(data.comments || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [eventSlug, id]);

  useEffect(() => {
    if (report && report.createdAt) {
      setCreatedAtLocal(new Date(report.createdAt).toLocaleString());
    }
    if (report && report.updatedAt) {
      setUpdatedAtLocal(new Date(report.updatedAt).toLocaleString());
    }
  }, [report && report.createdAt, report && report.updatedAt]);

  const isSuperAdmin =
    user && user.roles && user.roles.includes("Global Admin");
  const canChangeState =
    isSuperAdmin ||
    userRoles.some((r) => ["Responder", "Admin", "Global Admin"].includes(r));
  const isResponderOrAbove = userRoles.some((r) =>
    ["Responder", "Admin", "SuperAdmin", "Global Admin"].includes(r),
  );

  // Helper: check if user is admin or superadmin
  const isAdminOrSuperAdmin = userRoles.some((r) =>
    ["Admin", "SuperAdmin", "Global Admin"].includes(r),
  );

  // Fetch event users for assignment dropdown if admin/responder
  useEffect(() => {
    if (!eventSlug || !isResponderOrAbove) return;
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/users?role=Responder&limit=1000`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : { users: [] })
      .then(data => {
        fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/users?role=Admin&limit=1000`, { credentials: 'include' })
          .then(res2 => res2.ok ? res2.json() : { users: [] })
          .then(data2 => {
            const all = [...(data.users || []), ...(data2.users || [])];
            const deduped = Object.values(all.reduce((acc, u) => { acc[u.id] = u; return acc; }, {}));
            setEventUsers(deduped);
          });
      });
  }, [eventSlug, isResponderOrAbove]);

  const handleStateChange = async (e) => {
    const newState = e.target.value;
    setStateChangeError("");
    setStateChangeSuccess("");
    setLoading(true);
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}/reports/${id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ state: newState }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        setStateChangeError(data.error || "Failed to change state");
      } else {
        const data = await res.json();
        setReport(data.report);
        setStateChangeSuccess("State updated!");
      }
    } catch (err) {
      setStateChangeError("Network error");
    }
    setLoading(false);
  };

  // Handle comment submit
  const handleCommentSubmit = async (body, visibility) => {
    setCommentError("");
    setCommentSubmitting(true);
    if (!body.trim()) {
      setCommentError("Comment cannot be empty.");
      setCommentSubmitting(false);
      return;
    }
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}/reports/${id}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            body: body,
            visibility: visibility,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        setCommentError(data.error || "Failed to add comment.");
      } else {
        setCommentBody("");
        setCommentVisibility("public");
        // Refetch comments
        fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
            `/events/slug/${eventSlug}/reports/${id}/comments`,
          { credentials: "include" },
        )
          .then((res) => (res.ok ? res.json() : { comments: [] }))
          .then((data) => setComments(data.comments || []));
      }
    } catch (err) {
      setCommentError("Network error");
    }
    setCommentSubmitting(false);
  };

  // Edit comment handler
  const handleEditSave = async (comment) => {
    setEditError("");
    if (!editCommentBody.trim()) {
      setEditError("Comment cannot be empty.");
      return;
    }
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}/reports/${id}/comments/${comment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            body: editCommentBody,
            visibility: editCommentVisibility,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || "Failed to update comment.");
      } else {
        setEditingCommentId(null);
        setEditCommentBody("");
        setEditCommentVisibility("public");
        // Refetch comments
        fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
            `/events/slug/${eventSlug}/reports/${id}/comments`,
          { credentials: "include" },
        )
          .then((res) => (res.ok ? res.json() : { comments: [] }))
          .then((data) => setComments(data.comments || []));
      }
    } catch (err) {
      setEditError("Network error");
    }
  };
  // Delete comment handler
  const handleDeleteConfirm = async (comment) => {
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}/reports/${id}/comments/${comment.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) {
        // Optionally show error
      }
      setDeletingCommentId(null);
      // Refetch comments
      fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}/reports/${id}/comments`,
        { credentials: "include" },
      )
        .then((res) => (res.ok ? res.json() : { comments: [] }))
        .then((data) => setComments(data.comments || []));
    } catch (err) {
      setDeletingCommentId(null);
    }
  };

  // Add a function to upload more evidence files
  const canUploadEvidence =
    user &&
    report &&
    report.reporterId &&
    (user.id === report.reporterId || isAdminOrSuperAdmin);
  const handleEvidenceUpload = async (filesOrEvent) => {
    let files;
    if (Array.isArray(filesOrEvent)) {
      files = filesOrEvent;
    } else {
      filesOrEvent.preventDefault();
      files = newEvidence;
    }
    if (!files.length) return;
    setUploadingEvidence(true);
    setEvidenceUploadMsg("");
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("evidence", files[i]);
    }
    const res = await fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/reports/${report.id}/evidence`,
      {
        method: "POST",
        body: formData,
        credentials: "include",
      },
    );
    if (res.ok) {
      setEvidenceUploadMsg("Evidence uploaded!");
      setNewEvidence([]);
      // Refetch evidence files
      const filesRes = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/reports/${report.id}/evidence`,
        { credentials: "include" },
      );
      if (filesRes.ok) {
        const data = await filesRes.json();
        setEvidenceFiles(data.files);
      }
      // Refetch the full report to update evidenceFiles and any other fields
      const reportRes = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}/reports/${id}`,
        { credentials: "include" },
      );
      if (reportRes.ok) {
        const data = await reportRes.json();
        setReport(data.report);
      }
    } else {
      setEvidenceUploadMsg("Failed to upload evidence.");
    }
    setUploadingEvidence(false);
  };

  // Evidence delete handler
  const handleEvidenceDelete = async (file) => {
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/reports/${report.id}/evidence/${file.id}`,
        {
          method: "DELETE",
          credentials: "include",
        },
      );
      if (!res.ok) {
        setEvidenceUploadMsg("Failed to delete evidence.");
        return;
      }
      // Refetch evidence files
      const filesRes = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/reports/${report.id}/evidence`,
        { credentials: "include" },
      );
      if (filesRes.ok) {
        const data = await filesRes.json();
        setEvidenceFiles(data.files);
      }
    } catch (err) {
      setEvidenceUploadMsg("Network error while deleting evidence.");
    }
  };

  // Save assignment fields handler
  const handleAssignmentChange = async () => {
    setAssignmentLoading(true);
    setAssignmentError('');
    setAssignmentSuccess('');
    if ((assignmentFields.state === 'resolved' || assignmentFields.state === 'closed') && !assignmentFields.resolution.trim()) {
      setAssignmentError('Resolution is required when report is resolved or closed.');
      setAssignmentLoading(false);
      return;
    }
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            assignedResponderId: assignmentFields.assignedResponderId || null,
            severity: assignmentFields.severity || null,
            resolution: assignmentFields.resolution || null,
          }),
        });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setAssignmentError(data.error || 'Failed to update report.');
        setAssignmentLoading(false);
        return;
      }
      const data = await res.json();
      setReport(data.report);
      setAssignmentSuccess('Updated!');
    } catch (err) {
      setAssignmentError('Network error');
    }
    setAssignmentLoading(false);
  };

  // Add handler for editing the report title
  const handleTitleEdit = async (newTitle) => {
    if (!newTitle || newTitle.length < 10 || newTitle.length > 70) {
      throw new Error("Title must be between 10 and 70 characters.");
    }
    const res = await fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/events/slug/${eventSlug}/reports/${id}/title`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newTitle }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to update title.");
    }
    const data = await res.json();
    setReport(data.report);
    return true;
  };

  if (fetchError) {
    return <div className="max-w-2xl mx-auto mt-12 p-6 bg-red-100 text-red-800 rounded shadow text-center">{fetchError}</div>;
  }
  if (!report) {
    return <div>Loading...</div>;
  }

  return (
    <ReportDetailView
      report={report}
      user={user}
      userRoles={userRoles}
      comments={comments}
      evidenceFiles={evidenceFiles}
      loading={loading}
      error={fetchError}
      onStateChange={handleStateChange}
      onCommentSubmit={handleCommentSubmit}
      onCommentEdit={handleEditSave}
      onCommentDelete={handleDeleteConfirm}
      onEvidenceUpload={handleEvidenceUpload}
      onEvidenceDelete={handleEvidenceDelete}
      stateChangeLoading={loading}
      stateChangeError={stateChangeError}
      stateChangeSuccess={stateChangeSuccess}
      adminMode={isResponderOrAbove}
      assignmentFields={assignmentFields}
      setAssignmentFields={setAssignmentFields}
      eventUsers={eventUsers}
      onAssignmentChange={handleAssignmentChange}
      assignmentLoading={assignmentLoading}
      assignmentError={assignmentError}
      assignmentSuccess={assignmentSuccess}
      apiBaseUrl={process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}
      onTitleEdit={handleTitleEdit}
    />
  );
}

export async function getServerSideProps(context) {
  const { id, "event-slug": eventSlug } = context.params;
  let initialReport = null;
  let error = null;
  if (!id || !eventSlug) {
    return {
      props: { initialReport: null, error: "Missing report ID or event slug." },
    };
  }
  try {
    const apiUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const fetchUrl = `${apiUrl}/events/slug/${eventSlug}/reports/${id}`;
    const headers = {};
    if (context.req && context.req.headers && context.req.headers.cookie) {
      headers["Cookie"] = context.req.headers.cookie;
    }
    const res = await fetch(fetchUrl, { headers, credentials: "include" });
    if (!res.ok) {
      if (res.status === 403) {
        error = "You are not authorized to view this report.";
      } else if (res.status === 404) {
        error = "Report not found.";
      } else if (res.status === 401) {
        error = "You must be logged in to view this report.";
      } else {
        error = `Failed to fetch report: ${res.status}`;
      }
      return { props: { initialReport: null, error } };
    }
    const data = await res.json();
    initialReport = data.report;
  } catch (err) {
    error = err.message;
  }
  return { props: { initialReport, error } };
}
