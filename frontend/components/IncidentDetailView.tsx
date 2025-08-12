import React, { useState } from "react";
import { Card } from "./ui/card";
import { TitleEditForm } from './incident-detail/TitleEditForm';
import { StateManagementSection } from './incident-detail/StateManagementSection';
import { AssignmentSection } from './incident-detail/AssignmentSection';
import { RelatedFileSection } from './incident-detail/RelatedFileSection';
import { CommentsSection } from './incident-detail/CommentsSection';
import { IncidentMetaTable } from './incident-detail/IncidentMetaTable';
import { Pencil, ChevronDown } from "lucide-react";
import { logger } from "@/lib/logger";

interface User {
  id: string;
  name?: string;
  email?: string;
  roles?: string[];
}

interface RelatedFile {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  state: string;
  createdAt: string;
  updatedAt: string;
  reporterId?: string;
  assignedResponderId?: string;
  severity?: string;
  urgency?: string;
  location?: string;
  parties?: string;
  incidentAt?: string;
  resolution?: string;
  eventId?: string;
  reporter?: {
    id: string;
    name?: string;
    email: string;
  };
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

interface EventUser {
  id: string;
  name?: string;
  email?: string;
  roles?: string[];
}

interface AssignmentFields {
  assignedResponderId?: string;
  severity?: string;
  resolution?: string;
}

export interface IncidentDetailViewProps {
  incident: Incident;
  user: User;
  userRoles?: string[];
  comments?: Comment[];
  relatedFiles?: RelatedFile[];
  loading?: boolean;
  error?: string;
  eventSlug?: string;
  isStateChanging?: boolean;
  stateChangeError?: string | null;
  onEnhancedStateChange?: (newState: string, notes?: string, assignedToUserId?: string) => void;
  onAssignmentChange?: () => void;
  onCommentSubmit?: (body: string, visibility: string, isMarkdown?: boolean) => void;
  onCommentEdit?: (comment: Comment, body: string, visibility: string, isMarkdown?: boolean) => void;
  onCommentDelete?: (comment: Comment) => void;
  onDeleteConfirm?: (comment: Comment) => Promise<void>;
  onEditSave?: (comment: Comment, body?: string, visibility?: string, isMarkdown?: boolean) => Promise<{ success: boolean; error?: string }>;
  onStateChange?: (newState: string, notes?: string, assignedToUserId?: string) => Promise<void>;
  onReopen?: (notes: string, assignedToUserId?: string) => Promise<{ success: boolean; error?: string }>;
  onDescriptionEdit?: (newDescription: string) => Promise<void>;
  onRelatedFileUpload?: (files: File[]) => void;
  onRelatedFileDelete?: (file: RelatedFile) => void;
  newRelatedFiles?: File[];
  setNewRelatedFiles?: (files: File[]) => void;
  relatedFileUploadMsg?: string;
  uploadingRelatedFile?: boolean;
  isResponderOrAbove?: boolean;
  assignmentFields?: AssignmentFields;
  setAssignmentFields?: (fields: AssignmentFields) => void;
  eventUsers?: EventUser[];
  assignmentLoading?: boolean;
  assignmentError?: string | null;
  assignmentSuccess?: string | null;
  stateHistory?: Array<{
    id: string;
    fromState: string;
    toState: string;
    changedBy: string;
    changedAt: string;
    notes?: string;
  }>;
  apiBaseUrl?: string;
  onTitleEdit?: (title: string) => Promise<void>;
  onIncidentUpdate?: (updatedIncident: Incident) => void;
  onTagsEdit?: (tags: Array<{ id: string; name: string; color: string }>) => Promise<void>;
}

export const IncidentDetailView: React.FC<IncidentDetailViewProps> = ({
  incident,
  user,
  userRoles = [],
  relatedFiles = [],
  loading = false,
  error = "",
  eventSlug,
  onReopen,
  onAssignmentChange = () => {},
  onCommentSubmit,
  onCommentEdit,
  onCommentDelete,
  onRelatedFileUpload,
  onRelatedFileDelete,
  assignmentFields = {},
  setAssignmentFields = () => {},
  eventUsers = [],
  stateHistory = [],
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  onTitleEdit,
  onIncidentUpdate,
  onTagsEdit,
  onStateChange
}) => {
  const isSystemAdmin = user && user.roles && user.roles.includes("system_admin");
  const isResponderOrAbove = userRoles.some((r) =>
    ["responder", "event_admin", "system_admin"].includes(r)
  );
  const isAdminOrSystemAdmin = userRoles.some((r) =>
    ["event_admin", "system_admin"].includes(r)
  );
  const canChangeState = isSystemAdmin || isResponderOrAbove;
  const canEditTitle = user && (user.id === incident.reporterId || isAdminOrSystemAdmin);

  const [editingTitle, setEditingTitle] = useState(false);
  const [deletingRelatedFileId, setDeletingRelatedFileId] = useState<string | null>(null);
  const [newRelatedFiles, setNewRelatedFiles] = useState<File[]>([]);
  
  // State for comments that is managed here and passed down
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState<string>("");
  const [editCommentVisibility, setEditCommentVisibility] = useState<string>("public");
  const [commentBody, setCommentBody] = useState<string>("");
  const [commentVisibility, setCommentVisibility] = useState<string>("public");


  // Mobile collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    details: false,
    state: false,
    relatedFiles: false,
    comments: false
  });

  const toggleSection = (section: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  function getAllowedTransitions(current: string): string[] {
    switch (current) {
      case "submitted": return ["acknowledged", "investigating", "resolved", "closed"];
      case "acknowledged": return ["investigating", "resolved", "closed"];
      case "investigating": return ["resolved", "closed"];
      case "resolved": return ["closed"];
      case "closed": return [];
      default: return [];
    }
  }

  if (loading) return <Card>Loading...</Card>;
  if (error) return <Card className="text-red-600">{error}</Card>;
  if (!incident) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 py-4 space-y-4">
      {/* Title Section - Always visible */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            {editingTitle ? (
              <TitleEditForm
                initialTitle={incident.title || ""}
                onSave={async (title) => {
                  if (onTitleEdit) {
                    await onTitleEdit(title);
                    setEditingTitle(false);
                  }
                }}
                onCancel={() => setEditingTitle(false)}
              />
            ) : (
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold break-words">
                  {incident.title || <span className="italic text-gray-400">(untitled)</span>}
                  {canEditTitle && (
                    <button 
                      type="button" 
                      onClick={() => setEditingTitle(true)} 
                      className="ml-3 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 touch-manipulation" 
                      aria-label="Edit title"
                    >
                      <Pencil size={20} />
                    </button>
                  )}
                </h1>
                <div className="text-sm text-muted-foreground">
                  Incident ID: {incident.id}
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Report Details Section - Collapsible on mobile */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('details')}
          className="w-full p-4 sm:p-6 flex items-center justify-between bg-background hover:bg-muted/50 transition-colors lg:cursor-default lg:pointer-events-none"
        >
          <h2 className="text-lg font-semibold">Incident Details</h2>
          <ChevronDown 
            className={`h-5 w-5 transition-transform lg:hidden ${
              collapsedSections.details ? 'rotate-180' : ''
            }`} 
          />
        </button>
        <div className={`${collapsedSections.details ? 'hidden' : 'block'} lg:block`}>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <IncidentMetaTable
              id={incident.id}
              description={incident.description}
              reporter={incident.reporter}
              location={incident.location}
              incidentAt={incident.incidentAt}
              parties={incident.parties}
              eventName={incident.event?.name}
              eventSlug={eventSlug}
              tags={incident.tags}
              userRoles={userRoles}
              canEditTags={isResponderOrAbove}
              onTagsEdit={onTagsEdit}
              canEditLocation={isResponderOrAbove || (user && user.id === incident.reporterId)}
              canEditIncidentAt={isResponderOrAbove || (user && user.id === incident.reporterId)}
              canEditParties={isResponderOrAbove || (user && user.id === incident.reporterId)}
              canEditDescription={isAdminOrSystemAdmin || (user && user.id === incident.reporterId)}
              onLocationEdit={async (location) => {
                try {
                  const response = await fetch(`${apiBaseUrl}/api/events/${incident.eventId}/incidents/${incident.id}/location`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ location }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error((errorData as { error?: string }).error || 'Failed to update location');
                  }

                  const responseData = await response.json();
                  if (onIncidentUpdate && responseData.incident) {
                    onIncidentUpdate(responseData.incident);
                  }
                } catch (error) {
                  logger.error('Failed to update location', { 
                    error: error instanceof Error ? error.message : String(error),
                    incidentId: incident.id,
                    eventId: incident.eventId,
                    context: 'incident_detail_location_update'
                  });
                  const errorMessage = error instanceof Error ? error.message : 'Failed to update location. Please try again.';
                  alert(errorMessage);
                }
              }}

              onIncidentAtEdit={async (incidentAt) => {
                try {
                  const response = await fetch(`${apiBaseUrl}/api/events/${incident.eventId}/incidents/${incident.id}/incident-date`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ incidentAt }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error((errorData as { error?: string }).error || 'Failed to update incident date');
                  }

                  const responseData = await response.json();
                  if (onIncidentUpdate && responseData.incident) {
                    onIncidentUpdate(responseData.incident);
                  }
                } catch (error) {
                   logger.error('Failed to update incident date', { 
                    error: error instanceof Error ? error.message : String(error),
                    incidentId: incident.id,
                    eventId: incident.eventId,
                    context: 'incident_detail_date_update'
                  });
                  const errorMessage = error instanceof Error ? error.message : 'Failed to update incident date. Please try again.';
                  alert(errorMessage);
                }
              }}
              onPartiesEdit={async (parties) => {
                try {
                  const response = await fetch(`${apiBaseUrl}/api/events/${incident.eventId}/incidents/${incident.id}/parties`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ parties }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error((errorData as { error?: string }).error || 'Failed to update parties involved');
                  }
                  
                  const responseData = await response.json();
                  if (onIncidentUpdate && responseData.incident) {
                    onIncidentUpdate(responseData.incident);
                  }
                } catch (error) {
                   logger.error('Failed to update parties involved', { 
                    error: error instanceof Error ? error.message : String(error),
                    incidentId: incident.id,
                    eventId: incident.eventId,
                    context: 'incident_detail_parties_update'
                  });
                  const errorMessage = error instanceof Error ? error.message : 'Failed to update parties involved. Please try again.';
                  alert(errorMessage);
                }
              }}

              onDescriptionEdit={async (description) => {
                try {
                  const response = await fetch(`${apiBaseUrl}/api/events/${incident.eventId}/incidents/${incident.id}/description`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ description }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error((errorData as { error?: string }).error || 'Failed to update description');
                  }
                  
                  const responseData = await response.json();
                  if (onIncidentUpdate && responseData.incident) {
                    onIncidentUpdate(responseData.incident);
                  }
                } catch (error) {
                  logger.error('Failed to update description', { 
                    error: error instanceof Error ? error.message : String(error),
                    incidentId: incident.id,
                    eventId: incident.eventId,
                    context: 'incident_detail_description_update'
                  });
                  const errorMessage = error instanceof Error ? error.message : 'Failed to update description. Please try again.';
                  alert(errorMessage);
                }
              }}
            />
          </div>
        </div>
      </Card>

      {/* State & Assignment Section - Collapsible on mobile */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('state')}
          className="w-full p-4 sm:p-6 flex items-center justify-between bg-background hover:bg-muted/50 transition-colors lg:cursor-default lg:pointer-events-none"
        >
          <h2 className="text-lg font-semibold">State & Assignment</h2>
          <ChevronDown 
            className={`h-5 w-5 transition-transform lg:hidden ${
              collapsedSections.state ? 'rotate-180' : ''
            }`} 
          />
        </button>
        <div className={`${collapsedSections.state ? 'hidden' : 'block'} lg:block`}>
          <div className="p-4 sm:p-6 space-y-4">
            <StateManagementSection
              currentState={incident.state}
              allowedTransitions={getAllowedTransitions(incident.state)}
              onStateChange={onStateChange || (() => {})}
              canChangeState={canChangeState}
              stateHistory={stateHistory}
              eventUsers={eventUsers}
              assignedResponderId={assignmentFields.assignedResponderId}
              onReopen={onReopen}
            />
            <AssignmentSection
              assignmentFields={assignmentFields}
              onSave={onAssignmentChange}
              setAssignmentFields={setAssignmentFields}
              eventUsers={eventUsers}
              isResponderOrAbove={isResponderOrAbove}
            />
          </div>
        </div>
      </Card>
      
      {/* Related Files Section - Collapsible on mobile */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('relatedFiles')}
          className="w-full p-4 sm:p-6 flex items-center justify-between bg-background hover:bg-muted/50 transition-colors lg:cursor-default lg:pointer-events-none"
        >
          <h2 className="text-lg font-semibold">Related Files</h2>
          <ChevronDown 
            className={`h-5 w-5 transition-transform lg:hidden ${
              collapsedSections.relatedFiles ? 'rotate-180' : ''
            }`} 
          />
        </button>
        <div className={`${collapsedSections.relatedFiles ? 'hidden' : 'block'} lg:block`}>
          <div className="p-4 sm:p-6">
            <RelatedFileSection
              relatedFiles={relatedFiles}
              apiBaseUrl={apiBaseUrl}
              incident={incident}
              onRelatedFileUpload={onRelatedFileUpload}
              onRelatedFileDelete={onRelatedFileDelete}
              isResponderOrAbove={isResponderOrAbove}
              deletingRelatedFileId={deletingRelatedFileId}
              setDeletingRelatedFileId={setDeletingRelatedFileId}
              newRelatedFiles={newRelatedFiles}
              setNewRelatedFiles={setNewRelatedFiles}
              eventSlug={eventSlug}
              incidentId={incident?.id}
            />
          </div>
        </div>
      </Card>

      {/* Comments Section - Collapsible on mobile */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('comments')}
          className="w-full p-4 sm:p-6 flex items-center justify-between bg-background hover:bg-muted/50 transition-colors"
        >
          <h2 className="text-lg font-semibold">Comments</h2>
          <ChevronDown 
            className={`h-5 w-5 transition-transform ${
              collapsedSections.comments ? 'rotate-180' : ''
            }`} 
          />
        </button>
        <div className={`${collapsedSections.comments ? 'hidden' : 'block'}`}>
          <div className="p-4 sm:p-6">
            {eventSlug && (
              <CommentsSection 
                incidentId={incident.id}
                eventSlug={eventSlug}
                user={user}
                isResponderOrAbove={isResponderOrAbove}
                editingCommentId={editingCommentId}
                setEditingCommentId={setEditingCommentId}
                editCommentBody={editCommentBody}
                setEditCommentBody={setEditCommentBody}
                editCommentVisibility={editCommentVisibility}
                setEditCommentVisibility={setEditCommentVisibility}
                onCommentEdit={onCommentEdit}
                onCommentDelete={onCommentDelete}
                onCommentSubmit={onCommentSubmit}
                commentBody={commentBody}
                setCommentBody={setCommentBody}
                commentVisibility={commentVisibility}
                setCommentVisibility={setCommentVisibility}
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default IncidentDetailView; 