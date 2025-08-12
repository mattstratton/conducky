import React from "react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { IncidentDetailView } from '../../../../../components/IncidentDetailView';
import { AssignmentSection } from '@/components/incident-detail/AssignmentSection';
import IncidentActions from '@/components/incident-detail/IncidentActions';

// Define interfaces
interface User {
  id: string;
  email?: string;
  name?: string;
  avatar?: string;
  roles?: string[];
}

interface Incident {
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
  relatedFiles?: RelatedFile[];
  event?: {
    id: string;
    name: string;
    slug: string;
  };
  tags?: Array<{
    id: string;
    name: string;
    color: string;
  }>;
}

interface Comment {
  id: string;
  body: string;
  userId: string;
  authorId: string;
  incidentId: string;
  visibility: string;
  isMarkdown: boolean;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

interface RelatedFile {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
  uploader?: {
    id: string;
    name?: string | null;
    email?: string;
  };
}

interface AssignmentFields {
  assignedResponderId?: string;
  severity?: string;
  resolution?: string;
  state?: string;
}



export default function ReportDetail() {
  const router = useRouter();
  const eventSlug = Array.isArray(router.query.eventSlug)
    ? router.query.eventSlug[0]
    : router.query.eventSlug;
  const incidentId = Array.isArray(router.query.incidentId)
    ? router.query.incidentId[0]
    : router.query.incidentId;

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<User | null>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  // Comments state
  const [comments, setComments] = useState<Comment[]>([]);

  // State for related file management
  const [relatedFiles, setRelatedFiles] = useState<RelatedFile[]>([]);
  const [newRelatedFiles, setNewRelatedFiles] = useState<File[]>([]);
  const [uploadingRelatedFile, setUploadingRelatedFile] = useState<boolean>(false);
  const [relatedFileUploadMsg, setRelatedFileUploadMsg] = useState<string>("");

  const [assignmentFields, setAssignmentFields] = useState<AssignmentFields>({
    assignedResponderId: '',
    severity: '',
    resolution: '',
  });

  const [eventUsers, setEventUsers] = useState<User[]>([]);
  const [assignmentLoading, setAssignmentLoading] = useState<boolean>(false);
  const [assignmentError, setAssignmentError] = useState<string>('');
  const [assignmentSuccess, setAssignmentSuccess] = useState<string>('');

  // State management for state changes
  const [isStateChanging, setIsStateChanging] = useState(false);
  const [stateChangeError, setStateChangeError] = useState<string | null>(null);


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
    if (!eventSlug || !incidentId) return;

    setLoading(true);
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
      `/api/events/slug/${eventSlug}/incidents/${incidentId}`,
      { credentials: "include" }
    )
      .then((res) => {
        if (!res.ok) {
          if (res.status === 403) {
            throw new Error("You are not authorized to view this incident.");
          } else if (res.status === 404) {
            throw new Error("Report not found.");
          } else if (res.status === 401) {
            throw new Error("You must be logged in to view this incident.");
          } else {
            throw new Error(`Failed to fetch incident: ${res.status}`);
          }
        }
        return res.json();
      })
      .then((data) => {
        console.log('[DEBUG] API Response data:', JSON.stringify(data, null, 2));
        console.log('[DEBUG] Incident tags:', data.incident?.tags);
        setIncident(data.incident);
        if (data.incident.relatedFiles) {
          setRelatedFiles(data.incident.relatedFiles);
        }
        setAssignmentFields({
          assignedResponderId: data.incident.assignedResponderId || '',
          severity: data.incident.severity || '',
          resolution: data.incident.resolution || '',
        });
        setFetchError(undefined);
      })
      .catch((err) => {
        setFetchError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [eventSlug, incidentId]);

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
    if (!eventSlug || !incidentId) return;
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/api/events/slug/${eventSlug}/incidents/${incidentId}/comments`,
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : { comments: [] }))
      .then((data) => setComments(data.comments || []))
      .catch(() => setComments([]));
  }, [eventSlug, incidentId]);

  useEffect(() => {
    if (incident && incident.createdAt) {
      // setCreatedAtLocal(new Date(incident.createdAt).toLocaleString());
    }
    if (incident && incident.updatedAt) {
      // setUpdatedAtLocal(new Date(incident.updatedAt).toLocaleString());
    }
  }, [incident?.createdAt, incident?.updatedAt]);

  const isResponderOrAbove = userRoles.some((r) =>
    ["responder", "event_admin", "system_admin"].includes(r),
  );

  // Fetch event users for assignment dropdown if admin/responder
  useEffect(() => {
    if (!eventSlug || !isResponderOrAbove) return;

    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/events/slug/${eventSlug}/users?role=responder&limit=1000`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : { users: [] })
      .then(data => {

        fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/api/events/slug/${eventSlug}/users?role=event_admin&limit=1000`, { credentials: 'include' })
          .then(res2 => res2.ok ? res2.json() : { users: [] })
          .then(data2 => {
            const responders = data.users || [];
            const admins = data2.users || [];
            const combined = [...responders, ...admins];
            const uniqueUsers = Array.from(new Set(combined.map(u => u.id)))
              .map(id => {
                return combined.find(u => u.id === id)
              });
            setEventUsers(uniqueUsers as User[]);
          })

      })
      .catch(() => setEventUsers([]));
  }, [eventSlug, isResponderOrAbove]);

  const handleStateChange = async (newState: string, notes?: string, assignedToUserId?: string) => {
    if (!eventSlug || !incidentId) return;
    setIsStateChanging(true);
    setStateChangeError(null);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/slug/${eventSlug}/incidents/${incidentId}/state`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ state: newState, notes, assignedToUserId }),
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update incident state.');
      }
      const data = await res.json();
      setIncident(prev => prev ? { ...prev, state: data.incident.state, assignedResponderId: data.incident.assignedResponderId ?? prev.assignedResponderId } : null);
      if (data.history) {
        setStateHistory(prev => [...prev, data.history]);
      }
    } catch (err) {
      setStateChangeError(err instanceof Error ? err.message : 'State change failed');
    } finally {
      setIsStateChanging(false);
    }
  };

  const handleReopen = async (notes: string, assignedToUserId?: string) => {
    if (!eventSlug || !incidentId) return { success: false, error: 'Missing IDs' } as const;
    setIsStateChanging(true);
    setStateChangeError(null);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/events/slug/${eventSlug}/incidents/${incidentId}/reopen`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes, assignedToUserId }),
          credentials: 'include'
        }
      );
      let data: any = null;
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        const msg =
          res.status === 400 ? (data?.error || 'Invalid reopen request') :
          res.status === 403 ? 'You do not have permission to reopen this incident.' :
          res.status === 404 ? 'Incident or event not found.' :
          data?.error || 'Failed to reopen incident.';
        throw new Error(msg);
      }
      setIncident(prev => prev ? { ...prev, state: data.incident.state, assignedResponderId: data.incident.assignedResponderId ?? prev.assignedResponderId } : null);
      if (data.history) {
        setStateHistory(prev => [...prev, data.history]);
      }
      return { success: true } as const;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to reopen incident.';
      setStateChangeError(msg);
      return { success: false, error: msg } as const;
    } finally {
      setIsStateChanging(false);
    }
  };


  const handleCommentSubmit = async (body: string, visibility: string, isMarkdown?: boolean) => {
    if (!eventSlug || !incidentId) return { success: false, error: "Missing event or incident ID" };

    try {
      const res = await fetch(
        (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/api/events/slug/${eventSlug}/incidents/${incidentId}/comments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body, visibility, isMarkdown }),
          credentials: "include",
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        return { success: false, error: errorData.error || "Failed to submit comment." };
      }
      const data = await res.json();
      setComments((prev) => [...prev, data.comment]);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "An unexpected error occurred." };
    }
  };

  const handleEditSave = async (comment: Comment, body?: string, visibility?: string, isMarkdown?: boolean) => {
    if (!eventSlug || !incidentId) return { success: false, error: "Missing event or incident ID" };

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/slug/${eventSlug}/incidents/${incidentId}/comments/${comment.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body, visibility, isMarkdown }),
          credentials: 'include',
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        return { success: false, error: errorData.error || 'Failed to update comment.' };
      }
      const updatedComment = await res.json();
      setComments(prev => prev.map(c => c.id === comment.id ? updatedComment : c));
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
    }
  };

  const handleDeleteConfirm = async (comment: Comment) => {
    if (!eventSlug || !incidentId) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/slug/${eventSlug}/incidents/${incidentId}/comments/${comment.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );
      if (!res.ok) {
        throw new Error('Failed to delete comment.');
      }
      setComments(prev => prev.filter(c => c.id !== comment.id));
    } catch (error) {
      console.error(error);
    }
  };

  const handleRelatedFileUpload = async (files: File[]) => {
    if (!eventSlug || !incidentId || files.length === 0) return;

    setUploadingRelatedFile(true);
    setRelatedFileUploadMsg("");

    const formData = new FormData();
    files.forEach(file => {
      formData.append('relatedFiles', file);
    });

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/slug/${eventSlug}/incidents/${incidentId}/related-files`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
        }
      );

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || `HTTP error! status: ${res.status}`);
      }
      
      setRelatedFiles(prev => [...prev, ...responseData.files]);
      setNewRelatedFiles([]); // Clear the new files list
    } catch (err) {
      setRelatedFileUploadMsg(err instanceof Error ? err.message : "An unexpected error occurred during upload.");
    } finally {
      setUploadingRelatedFile(false);
    }
  };

  const handleRelatedFileDelete = async (file: RelatedFile) => {
    if (!eventSlug || !incidentId) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/slug/${eventSlug}/incidents/${incidentId}/related-files/${file.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete file.');
      }
      
      setRelatedFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (error) {
      console.error("Delete error:", error);
      // Optionally, show an error message to the user
    }
  };


  const handleAssignmentChange = async (updatedFields?: Record<string, string | undefined>) => {
    if (!eventSlug || !incidentId) return;
    setAssignmentLoading(true);
    setAssignmentError('');
    setAssignmentSuccess('');

    const payload = updatedFields || assignmentFields;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/events/slug/${eventSlug}/incidents/${incidentId}/assignment`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update assignment.');
      }

      const data = await res.json();
      setIncident(prev => prev ? { ...prev, ...data.incident } : null);
      setAssignmentSuccess('Incident assignment updated successfully.');
    } catch (err) {
      setAssignmentError(err instanceof Error ? err.message : 'Assignment failed');
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleTitleEdit = async (newTitle: string): Promise<void> => {
    if (!eventSlug || !incidentId) return Promise.reject("Missing event or incident ID");

    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/slug/${eventSlug}/incidents/${incidentId}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle }),
                credentials: 'include',
            }
        );
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to update title.');
        }
        const data = await res.json();
        setIncident(prev => prev ? { ...prev, title: data.incident.title } : null);
    } catch (error) {
        console.error(error);
        throw error;
    }
};

const handleDescriptionEdit = async (newDescription: string): Promise<void> => {
    if (!eventSlug || !incidentId) return Promise.reject("Missing event or incident ID");

    try {
        const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/events/slug/${eventSlug}/incidents/${incidentId}`,
            {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: newDescription }),
                credentials: 'include',
            }
        );
        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || 'Failed to update description.');
        }
        const data = await res.json();
        setIncident(prev => prev ? { ...prev, description: data.incident.description } : null);
    } catch (error) {
        console.error(error);
        throw error;
    }
};


  if (loading) return <div>Loading incident...</div>;
  if (fetchError) return <div>Error: {fetchError}</div>;
  if (!incident) return <div>Report not found.</div>;
  if (!user) return <div>User not authenticated.</div>;

  return (
    <>
      <IncidentDetailView
        incident={incident}
        user={user as User}
        userRoles={userRoles}
        comments={comments}
        relatedFiles={relatedFiles}
        onCommentSubmit={handleCommentSubmit}
        onEditSave={handleEditSave}
        onDeleteConfirm={handleDeleteConfirm}
        onStateChange={handleStateChange}
        onReopen={handleReopen}
        isStateChanging={isStateChanging}
        stateChangeError={stateChangeError}
        onAssignmentChange={handleAssignmentChange}
        assignmentFields={assignmentFields}
        setAssignmentFields={setAssignmentFields}
        eventUsers={eventUsers}
        assignmentLoading={assignmentLoading}
        assignmentError={assignmentError}
        assignmentSuccess={assignmentSuccess}
        onTitleEdit={handleTitleEdit}
        onDescriptionEdit={handleDescriptionEdit}
        onRelatedFileUpload={handleRelatedFileUpload}
        onRelatedFileDelete={handleRelatedFileDelete}
        newRelatedFiles={newRelatedFiles}
        setNewRelatedFiles={setNewRelatedFiles}
        relatedFileUploadMsg={relatedFileUploadMsg}
        uploadingRelatedFile={uploadingRelatedFile}
        isResponderOrAbove={isResponderOrAbove}
        apiBaseUrl={process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}
        stateHistory={stateHistory}
        eventSlug={eventSlug}
        // Provide reopen handler down to StateManagementSection via IncidentDetailView
        onIncidentUpdate={(updated) => setIncident(prev => prev ? { ...prev, ...updated } : updated)}
      />
      {/* Reopen is now integrated inside StateManagementSection actions */}
    </>
  );
}