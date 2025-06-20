import React from "react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ReportDetailView } from "../../../../../components/ReportDetailView";

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
  isMarkdown: boolean;
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

export default function ReportDetail() {
  const router = useRouter();
  const eventSlug = Array.isArray(router.query.eventSlug) 
    ? router.query.eventSlug[0] 
    : router.query.eventSlug;
  const reportId = Array.isArray(router.query.reportId) 
    ? router.query.reportId[0] 
    : router.query.reportId;

  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | undefined>(undefined);
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
  const [evidenceFiles, setEvidenceFiles] = useState<EvidenceFile[]>([]);
  const [newEvidence, setNewEvidence] = useState<File[]>([]);
  const [uploadingEvidence, setUploadingEvidence] = useState<boolean>(false);
  const [evidenceUploadMsg, setEvidenceUploadMsg] = useState<string>("");
  
  const [assignmentFields, setAssignmentFields] = useState<AssignmentFields>({
    assignedResponderId: '',
    severity: '',
    resolution: '',
  });
  
  const [eventUsers, setEventUsers] = useState<User[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState<boolean>(false);
  const [assignmentError, setAssignmentError] = useState<string>('');
  const [assignmentSuccess, setAssignmentSuccess] = useState<string>('');
  
  // State history
  const [stateHistory, setStateHistory] = useState<Array<{
    id: string;
    fromState: string;
    toState: string;
    changedBy: string;
    changedAt: string;
    notes?: string;
  }>>([]);

  // Fetch report data
  useEffect(() => {
    if (!eventSlug || !reportId) return;
    
    setLoading(true);
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + 
      `/events/slug/${eventSlug}/reports/${reportId}`,
      { credentials: "include" }
    )
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("You are not authorized to view this report.");
          } else if (res.status === 404) {
            throw new Error("Report not found.");
          } else if (res.status === 401) {
            throw new Error("You must be logged in to view this report.");
          } else {
            throw new Error(`Failed to fetch report: ${res.status}`);
          }
        }
        return res.json();
      })
      .then((data) => {
        setReport(data.report);
        if (data.report.evidenceFiles) {
          setEvidenceFiles(data.report.evidenceFiles);
        }
        setAssignmentFields({
          assignedResponderId: data.report.assignedResponderId || '',
          severity: data.report.severity || '',
          resolution: data.report.resolution || '',
        });
        setFetchError(undefined);
      })
      .catch((err) => {
        setFetchError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [eventSlug, reportId]);

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

    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/events/slug/${eventSlug}/users?role=Responder&limit=1000`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : { users: [] })
      .then(data => {

        fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/events/slug/${eventSlug}/users?role=Admin&limit=1000`, { credentials: 'include' })
          .then(res2 => res2.ok ? res2.json() : { users: [] })
          .then(data2 => {

            const all = [...(data.users || []), ...(data2.users || [])];
            const deduped = Object.values(all.reduce<Record<string, User>>((acc, u) => { 
              acc[u.id] = u; 
              return acc; 
            }, {}));

            setEventUsers(deduped);
          });
      });
  }, [eventSlug, isResponderOrAbove]);

  // Fetch state history for the report
  useEffect(() => {
    if (!report?.eventId || !reportId) return;
    
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + 
      `/api/events/${report.eventId}/reports/${reportId}/state-history`,
      { credentials: "include" }
    )
      .then((res) => res.ok ? res.json() : { history: [] })
      .then((data) => {
        setStateHistory(data.history || []);
      })
      .catch(() => {
        setStateHistory([]);
      });
  }, [report?.eventId, reportId]);

  // Enhanced state change handler to support notes and assignments
  const handleStateChange = async (newState: string, notes?: string, assignedToUserId?: string) => {
    setStateChangeError("");
    setStateChangeSuccess("");
    setLoading(true);
    try {
      const requestBody = { 
        state: newState, 
        notes,
        assignedTo: assignedToUserId 
      };
      
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/api/events/${report?.eventId}/reports/${reportId}/state`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(requestBody),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        setStateChangeError(data.error || "Failed to change state");
      } else {
        const data = await res.json();
        setReport(data.report);
        
        // Update assignment fields if assignment changed
        if (assignedToUserId !== undefined) {
          setAssignmentFields(prev => ({
            ...prev,
            assignedResponderId: assignedToUserId || ''
          }));
        }
        
        // Also update assignment fields from the returned report data
        if (data.report) {
          setAssignmentFields(prev => ({
            ...prev,
            assignedResponderId: data.report.assignedResponderId || '',
            severity: data.report.severity || prev.severity,
            resolution: data.report.resolution || prev.resolution,
            state: data.report.state
          }));
        }
        
        setStateChangeSuccess("State updated successfully!");
        
        // Refetch state history after state change
        if (data.report?.eventId) {
          fetch(
            (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + 
            `/api/events/${data.report.eventId}/reports/${reportId}/state-history`,
            { credentials: "include" }
          )
            .then((res) => res.ok ? res.json() : { history: [] })
            .then((historyData) => {
              setStateHistory(historyData.history || []);
            })
            .catch(() => {
              // Silently fail for state history
            });
        }
      }
    } catch (err) {
      setStateChangeError("Network error");
    }
    setLoading(false);
  };

  // Legacy state change handler for backward compatibility
  const handleLegacyStateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    await handleStateChange(e.target.value);
  };

  // Handle comment submit
  const handleCommentSubmit = async (body: string, visibility: string, isMarkdown?: boolean) => {
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
          `/api/events/slug/${eventSlug}/reports/${reportId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            body: body,
            visibility: visibility,
            isMarkdown: isMarkdown || false,
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
            `/api/events/slug/${eventSlug}/reports/${reportId}/comments`,
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
  const handleEditSave = async (comment: Comment, body?: string, visibility?: string, isMarkdown?: boolean) => {
    setEditError("");
    const bodyToSave = body || editCommentBody;
    const visibilityToSave = visibility || editCommentVisibility;
    
    if (!bodyToSave.trim()) {
      setEditError("Comment cannot be empty.");
      return;
    }
    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
          `/api/events/slug/${eventSlug}/reports/${reportId}/comments/${comment.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            body: bodyToSave,
            visibility: visibilityToSave,
            isMarkdown: isMarkdown || false,
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
            `/api/events/slug/${eventSlug}/reports/${reportId}/comments`,
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
          `/api/events/slug/${eventSlug}/reports/${reportId}/comments/${comment.id}`,
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
          `/api/events/slug/${eventSlug}/reports/${reportId}/comments`,
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
        `/api/events/slug/${eventSlug}/reports/${report!.id}/evidence`,
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
          `/api/events/slug/${eventSlug}/reports/${report!.id}/evidence`,
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
          `/api/events/slug/${eventSlug}/reports/${report!.id}/evidence/${file.id}`,
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
          `/api/events/slug/${eventSlug}/reports/${report!.id}/evidence`,
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

  // Early return for missing router params (better UX)
  if (!router.isReady) {
    return <div>Loading...</div>;
  }
  
  if (!eventSlug || !reportId) {
    return <div className="max-w-2xl mx-auto mt-12 p-6 bg-red-100 text-red-800 rounded shadow text-center">
      Invalid URL: Missing event or report ID
    </div>;
  }

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
      eventSlug={eventSlug}
      onStateChange={handleLegacyStateChange}
      onEnhancedStateChange={handleStateChange}
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
      stateHistory={stateHistory}
      apiBaseUrl={process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}
      onTitleEdit={handleTitleEdit}
    />
  );
}

// Remove getServerSideProps - we'll fetch data client-side to avoid session issues 