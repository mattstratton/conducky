import React, { useState, ChangeEvent } from "react";
import { Card } from "./ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { TitleEditForm } from "./report-detail/TitleEditForm";
import { ReportStateSelector } from "./report-detail/ReportStateSelector";
import { StateManagementSection } from "./report-detail/StateManagementSection";
import { AssignmentSection } from "./report-detail/AssignmentSection";
import { EvidenceSection } from "./report-detail/EvidenceSection";
import { CommentsSection } from "./report-detail/CommentsSection";
import { ReportMetaTable } from "./report-detail/ReportMetaTable";
import { MobileQuickActions } from "./report-detail/MobileQuickActions";
import { Pencil, ChevronDown } from "lucide-react";

export interface ReportDetailViewProps {
  report: any;
  user: any;
  userRoles?: string[];
  comments?: any[]; // Deprecated - now fetched internally in CommentsSection
  evidenceFiles?: any[];
  adminMode?: boolean;
  loading?: boolean;
  error?: string;
  eventSlug?: string; // Required for new CommentsSection
  onStateChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  onEnhancedStateChange?: (newState: string, notes?: string, assignedToUserId?: string) => void;
  onAssignmentChange?: () => void;
  onCommentSubmit?: (body: string, visibility: string, isMarkdown?: boolean) => void;
  onCommentEdit?: (comment: any, body: string, visibility: string, isMarkdown?: boolean) => void;
  onCommentDelete?: (comment: any) => void;
  onEvidenceUpload?: (files: File[]) => void;
  onEvidenceDelete?: (file: any) => void;
  assignmentFields?: {
    assignedResponderId?: string;
    severity?: string;
    resolution?: string;
    [key: string]: any;
  };
  setAssignmentFields?: (f: any) => void;
  eventUsers?: any[];
  stateChangeLoading?: boolean;
  stateChangeError?: string;
  stateChangeSuccess?: string;
  assignmentLoading?: boolean;
  assignmentError?: string;
  assignmentSuccess?: string;
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
  onReportUpdate?: (updatedReport: any) => void; // New callback for report updates
  [key: string]: any;
}

export const ReportDetailView: React.FC<ReportDetailViewProps> = ({
  report,
  user,
  userRoles = [],
  comments = [], // Deprecated but kept for backward compatibility
  evidenceFiles = [],
  adminMode = false,
  loading = false,
  error = "",
  eventSlug,
  onStateChange = () => {},
  onEnhancedStateChange,
  onAssignmentChange = () => {},
  onCommentSubmit,
  onCommentEdit,
  onCommentDelete,
  onEvidenceUpload,
  onEvidenceDelete,
  assignmentFields = {},
  setAssignmentFields = () => {},
  eventUsers = [],
  stateChangeLoading = false,
  stateChangeError = "",
  stateChangeSuccess = "",
  assignmentLoading = false,
  assignmentError = "",
  assignmentSuccess = "",
  stateHistory = [],
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  onTitleEdit,
  onReportUpdate,
  ...rest
}) => {
  const isSuperAdmin = user && user.roles && user.roles.includes("Global Admin");
  const isResponderOrAbove = userRoles.some((r) =>
    ["Responder", "Event Admin", "SuperAdmin", "Global Admin"].includes(r)
  );
  const isAdminOrSuperAdmin = userRoles.some((r) =>
    ["Event Admin", "SuperAdmin", "Global Admin"].includes(r)
  );
  const canChangeState = isSuperAdmin || isResponderOrAbove;
  const canEditTitle = user && (user.id === report.reporterId || isAdminOrSuperAdmin);

  const [commentBody, setCommentBody] = useState("");
  const [commentVisibility, setCommentVisibility] = useState("public");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentBody, setEditCommentBody] = useState("");
  const [editCommentVisibility, setEditCommentVisibility] = useState("public");
  const [newEvidence, setNewEvidence] = useState<File[]>([]);
  const [evidenceUploadMsg, setEvidenceUploadMsg] = useState("");
  const [deletingEvidenceId, setDeletingEvidenceId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingState, setEditingState] = useState(false);

  // Mobile collapsible sections state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    details: false,
    state: false,
    evidence: false,
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
  if (!report) return null;

  return (
    <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 lg:px-8 py-4 space-y-4">
      {/* Title Section - Always visible */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex-1">
            {editingTitle ? (
              <TitleEditForm
                initialTitle={report.title || ""}
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
                  {report.title || <span className="italic text-gray-400">(untitled)</span>}
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
                  Report ID: {report.id}
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
          <h2 className="text-lg font-semibold">Report Details</h2>
          <ChevronDown 
            className={`h-5 w-5 transition-transform lg:hidden ${
              collapsedSections.details ? 'rotate-180' : ''
            }`} 
          />
        </button>
        <div className={`${collapsedSections.details ? 'hidden' : 'block'} lg:block`}>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <ReportMetaTable
              id={report.id}
              type={report.type}
              description={report.description}
              reporter={report.reporter}
              location={report.location}
              contactPreference={report.contactPreference}
              incidentAt={report.incidentAt}
              parties={report.parties}
              canEditLocation={isResponderOrAbove || (user && user.id === report.reporterId)}
              canEditContactPreference={user && user.id === report.reporterId}
              canEditIncidentAt={isResponderOrAbove || (user && user.id === report.reporterId)}
              canEditParties={isResponderOrAbove || (user && user.id === report.reporterId)}
              canEditDescription={isAdminOrSuperAdmin || (user && user.id === report.reporterId)}
              canEditType={isResponderOrAbove || (user && user.id === report.reporterId)}
              onLocationEdit={async (location) => {
                try {
                  const response = await fetch(`${apiBaseUrl}/api/events/${report.eventId}/reports/${report.id}/location`, {
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

                  // Update local state with the response data
                  const responseData = await response.json();
                  if (onReportUpdate && responseData.report) {
                    onReportUpdate(responseData.report);
                  }
                } catch (error) {
                  console.error('Failed to update location:', error);
                  const errorMessage = error instanceof Error ? error.message : 'Failed to update location. Please try again.';
                  alert(errorMessage);
                }
              }}
              onContactPreferenceEdit={async (contactPreference) => {
                try {
                  const response = await fetch(`${apiBaseUrl}/api/events/${report.eventId}/reports/${report.id}/contact-preference`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ contactPreference }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error((errorData as { error?: string }).error || 'Failed to update contact preference');
                  }

                  // Update local state with the response data
                  const responseData = await response.json();
                  if (onReportUpdate && responseData.report) {
                    onReportUpdate(responseData.report);
                  }
                } catch (error) {
                  console.error('Failed to update contact preference:', error);
                  const errorMessage = error instanceof Error ? error.message : 'Failed to update contact preference. Please try again.';
                  alert(errorMessage);
                }
              }}
              onIncidentAtEdit={async (incidentAt) => {
                try {
                  const response = await fetch(`${apiBaseUrl}/api/events/${report.eventId}/reports/${report.id}/incident-date`, {
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

                  // Update local state with the response data
                  const responseData = await response.json();
                  if (onReportUpdate && responseData.report) {
                    onReportUpdate(responseData.report);
                  }
                } catch (error) {
                  console.error('Failed to update incident date:', error);
                  const errorMessage = error instanceof Error ? error.message : 'Failed to update incident date. Please try again.';
                  alert(errorMessage);
                }
              }}
              onPartiesEdit={async (parties) => {
                try {
                  const response = await fetch(`${apiBaseUrl}/api/events/${report.eventId}/reports/${report.id}/parties`, {
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

                  // Update local state with the response data
                  const responseData = await response.json();
                  if (onReportUpdate && responseData.report) {
                    onReportUpdate(responseData.report);
                  }
                } catch (error) {
                  console.error('Failed to update parties involved:', error);
                  const errorMessage = error instanceof Error ? error.message : 'Failed to update parties involved. Please try again.';
                  alert(errorMessage);
                }
              }}
              onDescriptionEdit={async (description) => {
                try {
                  const response = await fetch(`${apiBaseUrl}/api/events/${report.eventId}/reports/${report.id}/description`, {
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

                  // Update local state with the response data
                  const responseData = await response.json();
                  if (onReportUpdate && responseData.report) {
                    onReportUpdate(responseData.report);
                  }
                } catch (error) {
                  console.error('Failed to update description:', error);
                  const errorMessage = error instanceof Error ? error.message : 'Failed to update description. Please try again.';
                  alert(errorMessage);
                }
              }}
              onTypeEdit={async (type) => {
                try {
                  const response = await fetch(`${apiBaseUrl}/api/events/${report.eventId}/reports/${report.id}/type`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ type }),
                  });

                  if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error((errorData as { error?: string }).error || 'Failed to update type');
                  }

                  // Update local state with the response data
                  const responseData = await response.json();
                  if (onReportUpdate && responseData.report) {
                    onReportUpdate(responseData.report);
                  }
                } catch (error) {
                  console.error('Failed to update type:', error);
                  const errorMessage = error instanceof Error ? error.message : 'Failed to update type. Please try again.';
                  alert(errorMessage);
                }
              }}
            />
          </div>
        </div>
      </Card>

      {/* State Management Section - Collapsible on mobile */}
      <Card className="overflow-hidden">
        <button
          onClick={() => toggleSection('state')}
          className="w-full p-4 sm:p-6 flex items-center justify-between bg-background hover:bg-muted/50 transition-colors lg:cursor-default lg:pointer-events-none"
        >
          <h2 className="text-lg font-semibold">Status & Assignment</h2>
          <ChevronDown 
            className={`h-5 w-5 transition-transform lg:hidden ${
              collapsedSections.state ? 'rotate-180' : ''
            }`} 
          />
        </button>
        <div className={`${collapsedSections.state ? 'hidden' : 'block'} lg:block`}>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            {onEnhancedStateChange ? (
              <StateManagementSection
                currentState={report.state}
                allowedTransitions={getAllowedTransitions(report.state)}
                onStateChange={onEnhancedStateChange}
                loading={stateChangeLoading}
                error={stateChangeError}
                success={stateChangeSuccess}
                canChangeState={canChangeState}
                eventUsers={eventUsers}
                assignedResponderId={assignmentFields.assignedResponderId}
                stateHistory={stateHistory}
              />
            ) : (
              /* Legacy State Management */
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-bold">State</TableCell>
                    <TableCell>
                      {canChangeState ? (
                        editingState ? (
                          <div className="flex items-center gap-2">
                            <ReportStateSelector
                              currentState={report.state}
                              allowedTransitions={getAllowedTransitions(report.state)}
                              onChange={onStateChange}
                              loading={stateChangeLoading}
                              error={stateChangeError}
                              success={stateChangeSuccess}
                            />
                            <button type="button" onClick={() => setEditingState(false)} className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-xs">Cancel</button>
                          </div>
                        ) : (
                          <span className="flex items-center gap-2">
                            {report.state}
                            <button type="button" onClick={() => setEditingState(true)} className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Edit state">
                              <Pencil size={16} />
                            </button>
                          </span>
                        )
                      ) : (
                        report.state
                      )}
                    </TableCell>
                  </TableRow>
                  {adminMode && (
                    <TableRow>
                      <TableCell colSpan={2}>
                        <AssignmentSection
                          assignmentFields={assignmentFields}
                          setAssignmentFields={setAssignmentFields}
                          eventUsers={eventUsers}
                          loading={assignmentLoading}
                          error={assignmentError}
                          success={assignmentSuccess}
                          onSave={onAssignmentChange}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </Card>

      {/* Evidence Section - Collapsible on mobile */}
      <Card className="overflow-hidden" data-section="evidence">
        <button
          onClick={() => toggleSection('evidence')}
          className="w-full p-4 sm:p-6 flex items-center justify-between bg-background hover:bg-muted/50 transition-colors lg:cursor-default lg:pointer-events-none"
        >
          <h2 className="text-lg font-semibold">
            Evidence {evidenceFiles.length > 0 && `(${evidenceFiles.length})`}
          </h2>
          <ChevronDown 
            className={`h-5 w-5 transition-transform lg:hidden ${
              collapsedSections.evidence ? 'rotate-180' : ''
            }`} 
          />
        </button>
        <div className={`${collapsedSections.evidence ? 'hidden' : 'block'} lg:block`}>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            <EvidenceSection
              evidenceFiles={evidenceFiles}
              apiBaseUrl={apiBaseUrl}
              report={report}
              isResponderOrAbove={isResponderOrAbove}
              deletingEvidenceId={deletingEvidenceId}
              setDeletingEvidenceId={setDeletingEvidenceId}
              onEvidenceDelete={onEvidenceDelete}
              onEvidenceUpload={onEvidenceUpload}
              evidenceUploadMsg={evidenceUploadMsg}
              newEvidence={newEvidence}
              setNewEvidence={setNewEvidence}
            />
          </div>
        </div>
      </Card>

      {/* Comments Section - Collapsible on mobile */}
      <Card className="overflow-hidden" data-section="comments">
        <button
          onClick={() => toggleSection('comments')}
          className="w-full p-4 sm:p-6 flex items-center justify-between bg-background hover:bg-muted/50 transition-colors lg:cursor-default lg:pointer-events-none"
        >
          <h2 className="text-lg font-semibold">Comments</h2>
          <ChevronDown 
            className={`h-5 w-5 transition-transform lg:hidden ${
              collapsedSections.comments ? 'rotate-180' : ''
            }`} 
          />
        </button>
        <div className={`${collapsedSections.comments ? 'hidden' : 'block'} lg:block`}>
          <div className="px-4 sm:px-6 pb-4 sm:pb-6">
            {eventSlug && (
              <CommentsSection
                reportId={report.id}
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

      {/* Mobile Quick Actions - Fixed floating button */}
      <MobileQuickActions
        canAddComment={!!eventSlug}
        canUploadEvidence={isResponderOrAbove || (user && user.id === report.reporterId)}
        canEditReport={canEditTitle}
        onAddComment={() => {
          // Scroll to comments section and focus input
          const commentsSection = document.querySelector('[data-section="comments"]');
          if (commentsSection) {
            commentsSection.scrollIntoView({ behavior: 'smooth' });
            // Focus the comment input after scrolling
            setTimeout(() => {
              const commentInput = document.querySelector('textarea[placeholder*="comment"]') as HTMLTextAreaElement;
              if (commentInput) {
                commentInput.focus();
              }
            }, 500);
          }
        }}
        onUploadEvidence={() => {
          // Scroll to evidence section and focus file input
          const evidenceSection = document.querySelector('[data-section="evidence"]');
          if (evidenceSection) {
            evidenceSection.scrollIntoView({ behavior: 'smooth' });
            // Focus the file input after scrolling
            setTimeout(() => {
              const fileInput = document.querySelector('#evidence-upload-input') as HTMLInputElement;
              if (fileInput) {
                fileInput.click();
              }
            }, 500);
          }
        }}
        onEditReport={() => {
          // Scroll to title and enable editing
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => {
            setEditingTitle(true);
          }, 300);
        }}
        onShare={() => {
          // Copy current URL to clipboard
          if (navigator.share) {
            navigator.share({
              title: report.title || 'Report',
              url: window.location.href
            });
          } else {
            navigator.clipboard.writeText(window.location.href);
            // Could show a toast notification here
          }
        }}
      />
    </div>
  );
};

export default ReportDetailView; 