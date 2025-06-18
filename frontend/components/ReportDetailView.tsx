import React, { useState, ChangeEvent } from "react";
import { Card } from "./ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { TitleEditForm } from "./report-detail/TitleEditForm";
import { ReportStateSelector } from "./report-detail/ReportStateSelector";
import { AssignmentSection } from "./report-detail/AssignmentSection";
import { EvidenceSection } from "./report-detail/EvidenceSection";
import { CommentsSection } from "./report-detail/CommentsSection";
import { ReportMetaTable } from "./report-detail/ReportMetaTable";
import { Pencil } from "lucide-react";

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
  apiBaseUrl?: string;
  onTitleEdit?: (title: string) => Promise<void>;
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
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  onTitleEdit,
  ...rest
}) => {
  const isSuperAdmin = user && user.roles && user.roles.includes("Global Admin");
  const isResponderOrAbove = userRoles.some((r) =>
    ["Responder", "Admin", "SuperAdmin", "Global Admin"].includes(r)
  );
  const isAdminOrSuperAdmin = userRoles.some((r) =>
    ["Admin", "SuperAdmin", "Global Admin"].includes(r)
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
    <Card className="max-w-3xl mx-auto p-4 sm:p-8 mt-8">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
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
          ) :
            <h2 className="text-2xl font-bold break-words flex items-center gap-2">
              {report.title || <span className="italic text-gray-400">(untitled)</span>}
              {canEditTitle && (
                <button type="button" onClick={() => setEditingTitle(true)} className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Edit title">
                  <Pencil size={18} />
                </button>
              )}
            </h2>
          }
        </div>
      </div>
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

            // Refresh the page to show updated data
            window.location.reload();
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

            // Refresh the page to show updated data
            window.location.reload();
          } catch (error) {
            console.error('Failed to update contact preference:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update contact preference. Please try again.';
            alert(errorMessage);
          }
        }}
        onIncidentAtEdit={async (incidentAt) => {
          // TODO: Implement incident date edit API call
          console.log('Edit incident date:', incidentAt);
        }}
        onPartiesEdit={async (parties) => {
          // TODO: Implement parties edit API call
          console.log('Edit parties:', parties);
        }}
        onDescriptionEdit={async (description) => {
          // TODO: Implement description edit API call
          console.log('Edit description:', description);
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

            // Refresh the page to show updated data
            window.location.reload();
          } catch (error) {
            console.error('Failed to update type:', error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to update type. Please try again.';
            alert(errorMessage);
          }
        }}
      />
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
      <EvidenceSection
        evidenceFiles={evidenceFiles}
        apiBaseUrl={apiBaseUrl}
        user={user}
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
    </Card>
  );
};

export default ReportDetailView; 