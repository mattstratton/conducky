import React from "react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Card } from "../../../../../components/ui/card";
import { Table } from "../../../../../components/Table";
import { ReportDetailView } from "../../../../../components/ReportDetailView";
import { GetServerSideProps } from "next";

// Define interfaces
interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  roles?: string[];
}

interface Report {
  id: string;
  title: string;
  description: string;
  state: string;
  reporterId: string;
  createdAt: string;
  updatedAt: string;
  eventId: string;
  assignedResponderId?: string;
  severity?: string;
  resolution?: string;
  evidenceFiles?: EvidenceFile[];
}

interface Comment {
  id: string;
  body: string;
  userId: string;
  reportId: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

interface EvidenceFile {
  id: string;
  filename: string;
  originalname: string;
  path: string;
  mimetype: string;
  size: number;
  reportId: string;
  createdAt: string;
}

interface AssignmentFields {
  assignedResponderId: string;
  severity: string;
  resolution: string;
  state?: string;
}

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

interface ReportDetailProps {
  initialReport: Report | null;
  error: string | null;
}

export default function ReportDetail({ initialReport, error }: ReportDetailProps) {
  const router = useRouter();
  const eventSlug = Array.isArray(router.query.eventSlug) 
    ? router.query.eventSlug[0] 
    : router.query.eventSlug;
  const reportId = Array.isArray(router.query.reportId) 
    ? router.query.reportId[0] 
    : router.query.reportId;
  const [report, setReport] = useState<Report | null>(initialReport);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(error);
  const [user, setUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [stateChangeError, setStateChangeError] = useState<string>("");
  const [stateChangeSuccess, setStateChangeSuccess] = useState<string>("");
  const [createdAtLocal, setCreatedAtLocal] = useState<string>("");
  const [updatedAtLocal, setUpdatedAtLocal] = useState<string>("");
  
  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(true);
  const [commentBody, setCommentBody] = useState<string>("");
  const [commentVisibility, setCommentVisibility] = useState<string>("public");
  const [commentError, setCommentError] = useState<string>("");
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);
  
  // Add state for editing and deleting comments
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState<string>("");
  const [editCommentVisibility, setEditCommentVisibility] = useState<string>("public");
  const [editError, setEditError] = useState<string>("");
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  
  // Add state for evidence upload
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>(
    report && report.evidenceFiles ? report.evidenceFiles : [],
  );
  const [newEvidence, setNewEvidence] = useState<File[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState<boolean>(false);
  const [evidenceUploadMsg, setEvidenceUploadMsg] = useState<string>("");
  
  const [assignmentFields, setAssignmentFields] = useState<AssignmentFields>({
    assignedResponderId: initialReport?.assignedResponderId || '',
    severity: initialReport?.severity || '',
    resolution: initialReport?.resolution || '',
  });
  
  const [eventUsers, setEventUsers] = useState<User[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState<boolean>(false);
  const [assignmentError, setAssignmentError] = useState<string>('');
  const [assignmentSuccess, setAssignmentSuccess] = useState<string>('');

  // Fetch user info
  useEffect(() => {
    fetch(
              (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + "/api/session",
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
          `/api/events/slug/${eventSlug}/my-roles`,
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
    if (!eventSlug || !reportId) return;
    setCommentsLoading(true);
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/api/events/slug/${eventSlug}/reports/${reportId}/comments`,
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : { comments: [] }))
      .then((data) => setComments(data.comments || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [eventSlug, reportId]);

  useEffect(() => {
    if (report && report.createdAt) {
      setCreatedAtLocal(new Date(report.createdAt).toLocaleString());
    }
    if (report && report.updatedAt) {
      setUpdatedAtLocal(new Date(report.updatedAt).toLocaleString());
    }
  }, [report?.createdAt, report?.updatedAt]);

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
    console.log('[DEBUG] Fetching responders for assignment dropdown');
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/users?role=Responder&limit=1000`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : { users: [] })
      .then(data => {
        console.log('[DEBUG] Fetched responders:', data.users);
        fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/users?role=Admin&limit=1000`, { credentials: 'include' })
          .then(res2 => res2.ok ? res2.json() : { users: [] })
          .then(data2 => {
            console.log('[DEBUG] Fetched admins:', data2.users);
            const all = [...(data.users || []), ...(data2.users || [])];
            const deduped = Object.values(all.reduce<Record<string, User>>((acc, u) => { 
              acc[u.id] = u; 
              return acc; 
            }, {}));
            console.log('[DEBUG] Final eventUsers for assignment dropdown:', deduped);
            setEventUsers(deduped);
          });
      });
  }, [eventSlug, isResponderOrAbove]);

  const handleStateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newState = e.target.value;
    setStateChangeError("");
    setStateChangeSuccess("");
    setLoading(true);
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/api/events/slug/${eventSlug}/reports/${reportId}`,
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
  const handleCommentSubmit = async (body: string, visibility: string) => {
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
          `/events/slug/${eventSlug}/reports/${reportId}/comments`,
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
            `/events/slug/${eventSlug}/reports/${reportId}/comments`,
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
  const handleEditSave = async (comment: Comment) => {
    setEditError("");
    if (!editCommentBody.trim()) {
      setEditError("Comment cannot be empty.");
      return;
    }
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}/reports/${reportId}/comments/${comment.id}`,
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
            `/events/slug/${eventSlug}/reports/${reportId}/comments`,
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
  const handleDeleteConfirm = async (comment: Comment) => {
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}/reports/${reportId}/comments/${comment.id}`,
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
          `/events/slug/${eventSlug}/reports/${reportId}/comments`,
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
    
  const handleEvidenceUpload = async (filesOrEvent: File[] | React.FormEvent<HTMLFormElement>) => {
    let files: File[];
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
        `/reports/${report!.id}/evidence`,
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
          `/reports/${report!.id}/evidence`,
        { credentials: "include" },
      );
      if (filesRes.ok) {
        const data = await filesRes.json();
        setEvidenceFiles(data.files);
      }
      // Refetch the full report to update evidenceFiles and any other fields
      const reportRes = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/events/slug/${eventSlug}/reports/${reportId}`,
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
  const handleEvidenceDelete = async (file: EvidenceFile) => {
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/reports/${report!.id}/evidence/${file.id}`,
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
          `/reports/${report!.id}/evidence`,
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
  const handleAssignmentChange = async (updatedFields?: any) => {
    // Use the passed fields if available, otherwise use current state
    const fieldsToSave = updatedFields || assignmentFields;
    setAssignmentLoading(true);
    setAssignmentError('');
    setAssignmentSuccess('');
    

    
    if ((fieldsToSave.state === 'resolved' || fieldsToSave.state === 'closed') && 
        !fieldsToSave.resolution?.trim()) {
      setAssignmentError('Resolution is required when report is resolved or closed.');
      setAssignmentLoading(false);
      return;
    }
    
    const payload = {
      assignedResponderId: fieldsToSave.assignedResponderId ? fieldsToSave.assignedResponderId : null,
      severity: fieldsToSave.severity ? fieldsToSave.severity : null,
      resolution: fieldsToSave.resolution ? fieldsToSave.resolution : null,
    };
    
    
    
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + 
        `/events/slug/${eventSlug}/reports/${reportId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        }
      );
      
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
  const handleTitleEdit = async (newTitle: string): Promise<void> => {
    if (!newTitle || newTitle.length < 10 || newTitle.length > 70) {
      throw new Error("Title must be between 10 and 70 characters.");
    }
    const res = await fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/events/slug/${eventSlug}/reports/${reportId}/title`,
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

export const getServerSideProps: GetServerSideProps = async (context) => {
  const reportId = Array.isArray(context.params?.reportId) 
    ? context.params.reportId[0] 
    : context.params?.reportId;
  const eventSlug = Array.isArray(context.params?.eventSlug) 
    ? context.params.eventSlug[0] 
    : context.params?.eventSlug;
  let initialReport: Report | null = null;
  let error: string | null = null;
  
  if (!reportId || !eventSlug) {
    return {
      props: { initialReport: null, error: "Missing report ID or event slug." },
    };
  }
  
  try {
    const apiUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const fetchUrl = `${apiUrl}/events/slug/${eventSlug}/reports/${reportId}`;
    const headers: HeadersInit = {};
    
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
  } catch (err: any) {
    error = err.message;
  }
  
  return { props: { initialReport, error } };
}; 