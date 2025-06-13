import React, { useState, ChangeEvent } from "react";
import { Card } from "./ui/card";
import { Table } from "./Table";
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
  comments?: any[];
  evidenceFiles?: any[];
  adminMode?: boolean;
  loading?: boolean;
  error?: string;
  onStateChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  onAssignmentChange?: () => void;
  onCommentSubmit?: (body: string, visibility: string) => void;
  onCommentEdit?: (comment: any, body: string, visibility: string) => void;
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
  comments = [],
  evidenceFiles = [],
  adminMode = false,
  loading = false,
  error = "",
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
      />
      <Table>
        <tbody>
          <tr>
            <td className="font-bold">State</td>
            <td>
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
            </td>
          </tr>
          {adminMode && (
            <tr>
              <td colSpan={2}>
                <AssignmentSection
                  assignmentFields={assignmentFields}
                  setAssignmentFields={setAssignmentFields}
                  eventUsers={eventUsers}
                  loading={assignmentLoading}
                  error={assignmentError}
                  success={assignmentSuccess}
                  onSave={onAssignmentChange}
                />
              </td>
            </tr>
          )}
        </tbody>
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
      <CommentsSection
        comments={comments}
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
    </Card>
  );
};

export default ReportDetailView; 