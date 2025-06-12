import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "./index";
import { Table } from "./index";
import Avatar from "./Avatar";

const validStates = [
  "submitted",
  "acknowledged",
  "investigating",
  "resolved",
  "closed",
];

export default function ReportDetailView({
  report,
  user,
  userRoles = [],
  comments = [],
  evidenceFiles = [],
  adminMode = false,
  loading = false,
  error = "",
  onStateChange,
  onAssignmentChange,
  onCommentSubmit,
  onCommentEdit,
  onCommentDelete,
  onEvidenceUpload,
  onEvidenceDelete,
  assignmentFields = {}, // { assignedResponderId, severity, resolution, ... }
  setAssignmentFields = () => {},
  eventUsers = [], // for assignment dropdown
  stateChangeLoading = false,
  stateChangeError = "",
  stateChangeSuccess = "",
  assignmentLoading = false,
  assignmentError = "",
  assignmentSuccess = "",
  apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000",
  onTitleEdit,
  ...rest
}) {
  // Role checks
  const isSuperAdmin = user && user.roles && user.roles.includes("Global Admin");
  const isResponderOrAbove = userRoles.some((r) =>
    ["Responder", "Admin", "SuperAdmin", "Global Admin"].includes(r)
  );
  const isAdminOrSuperAdmin = userRoles.some((r) =>
    ["Admin", "SuperAdmin", "Global Admin"].includes(r)
  );
  const canChangeState = isSuperAdmin || isResponderOrAbove;
  const canEditTitle = user && (user.id === report.reporterId || isAdminOrSuperAdmin);

  // Local state for comments and evidence
  const [commentBody, setCommentBody] = useState("");
  const [commentVisibility, setCommentVisibility] = useState("public");
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentBody, setEditCommentBody] = useState("");
  const [editCommentVisibility, setEditCommentVisibility] = useState("public");
  const [newEvidence, setNewEvidence] = useState([]);
  const [evidenceUploadMsg, setEvidenceUploadMsg] = useState("");
  const [deletingEvidenceId, setDeletingEvidenceId] = useState(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(report.title || "");
  const [titleError, setTitleError] = useState("");
  const [titleSuccess, setTitleSuccess] = useState("");

  // Allowed state transitions (adminMode can pass a function for more control)
  function getAllowedTransitions(current) {
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
            <form
              onSubmit={e => {
                e.preventDefault();
                setTitleError("");
                setTitleSuccess("");
                if (!titleInput || titleInput.length < 10 || titleInput.length > 70) {
                  setTitleError("Title must be between 10 and 70 characters.");
                  return;
                }
                onTitleEdit(titleInput)
                  .then(() => {
                    setTitleSuccess("Title updated!");
                    setEditingTitle(false);
                  })
                  .catch(err => {
                    setTitleError(err?.message || "Failed to update title.");
                  });
              }}
              className="flex flex-col sm:flex-row gap-2 items-start sm:items-center"
            >
              <input
                type="text"
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                minLength={10}
                maxLength={70}
                required
                className="border px-2 py-1 rounded w-80 max-w-full dark:bg-gray-800 dark:text-gray-100"
                placeholder="Report Title"
                autoFocus
              />
              <Button type="submit" className="bg-blue-600 text-white px-3 py-1 text-sm">Save</Button>
              <Button type="button" onClick={() => { setEditingTitle(false); setTitleInput(report.title || ""); setTitleError(""); }} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 text-sm">Cancel</Button>
            </form>
          ) : (
            <h2 className="text-2xl font-bold break-words">
              {report.title || <span className="italic text-gray-400">(untitled)</span>}
              {canEditTitle && (
                <Button type="button" onClick={() => { setEditingTitle(true); setTitleInput(report.title || ""); setTitleError(""); setTitleSuccess(""); }} className="ml-2 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">Edit</Button>
              )}
            </h2>
          )}
          {titleError && <div className="text-xs text-red-500 dark:text-red-400 mt-1">{titleError}</div>}
          {titleSuccess && <div className="text-xs text-green-500 dark:text-green-400 mt-1">{titleSuccess}</div>}
        </div>
      </div>
      {/* Main report details */}
      <Table>
        <tbody>
          <tr><td className="font-bold">ID</td><td>{report.id}</td></tr>
          <tr><td className="font-bold">Type</td><td>{report.type}</td></tr>
          <tr><td className="font-bold">Description</td><td>{report.description}</td></tr>
          <tr>
            <td className="font-bold">State</td>
            <td>
              {canChangeState ? (
                <>
                  <select
                    value={report.state}
                    onChange={onStateChange}
                    disabled={stateChangeLoading}
                    className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  >
                    <option value={report.state}>{report.state}</option>
                    {getAllowedTransitions(report.state).map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  {stateChangeError && <span className="text-red-500 ml-2">{stateChangeError}</span>}
                  {stateChangeSuccess && <span className="text-green-500 ml-2">{stateChangeSuccess}</span>}
                </>
              ) : (
                report.state
              )}
            </td>
          </tr>
          <tr><td className="font-bold">Reporter</td><td>{report.reporter ? (report.reporter.name || report.reporter.email || 'Anonymous') : 'Anonymous'}</td></tr>
          {/* Admin fields */}
          {adminMode && (
            <>
              <tr>
                <td className="font-bold">Assigned Responder</td>
                <td>
                  <select
                    value={assignmentFields.assignedResponderId || ''}
                    onChange={e => setAssignmentFields(f => ({ ...f, assignedResponderId: e.target.value }))}
                    className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="">(unassigned)</option>
                    {eventUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email || 'Unknown'}</option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr>
                <td className="font-bold">Severity</td>
                <td>
                  <select
                    value={assignmentFields.severity || ''}
                    onChange={e => setAssignmentFields(f => ({ ...f, severity: e.target.value }))}
                    className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="">(none)</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </td>
              </tr>
              <tr>
                <td className="font-bold">Resolution</td>
                <td>
                  <textarea
                    value={assignmentFields.resolution || ''}
                    onChange={e => setAssignmentFields(f => ({ ...f, resolution: e.target.value }))}
                    className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100 min-h-[60px]"
                    placeholder="Enter resolution details (required if resolved/closed)"
                  />
                </td>
              </tr>
              <tr>
                <td colSpan={2}>
                  <div className="flex gap-4 items-center mt-2">
                    <Button onClick={onAssignmentChange} disabled={assignmentLoading} className="bg-blue-600 text-white px-4 py-2 rounded">
                      {assignmentLoading ? 'Saving...' : 'Save Assignment/Severity/Resolution'}
                    </Button>
                    {assignmentError && <span className="text-red-600 dark:text-red-400">{assignmentError}</span>}
                    {assignmentSuccess && <span className="text-green-600 dark:text-green-400">{assignmentSuccess}</span>}
                  </div>
                </td>
              </tr>
            </>
          )}
        </tbody>
      </Table>
      {/* Evidence section */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Evidence Files</h3>
        {(!report || !evidenceFiles) ? (
          <div className="text-gray-500 dark:text-gray-400">No evidence files.</div>
        ) : evidenceFiles.length > 0 ? (
          <ul className="space-y-1">
            {evidenceFiles.map(file => (
              <li key={file.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <a href={`${apiBaseUrl}/evidence/${file.id}/download`} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 underline">{file.filename}</a>
                <span className="text-xs text-gray-500 dark:text-gray-400">{file.uploader ? `${file.uploader.name || file.uploader.email || 'Unknown'}` : 'Unknown'}</span>
                {isResponderOrAbove && (
                  deletingEvidenceId === file.id ? (
                    <>
                      <Button onClick={() => onEvidenceDelete(file)} className="bg-red-600 text-white px-2 py-1 text-xs">Confirm Delete</Button>
                      <Button onClick={() => setDeletingEvidenceId(null)} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 text-xs">Cancel</Button>
                    </>
                  ) : (
                    <Button onClick={() => setDeletingEvidenceId(file.id)} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-2 py-1 text-xs">Delete</Button>
                  )
                )}
              </li>
            ))}
          </ul>
        ) : <div className="text-gray-500 dark:text-gray-400">No evidence files.</div>}
        {(isResponderOrAbove || (user && report && user.id === report.reporterId)) && (
          <form onSubmit={e => { e.preventDefault(); console.log('Evidence files:', newEvidence); onEvidenceUpload(newEvidence); setNewEvidence([]); }} className="mt-4 flex flex-col sm:flex-row gap-2 items-start">
            <label htmlFor="evidence-upload-input" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Evidence Files</label>
            <input
              id="evidence-upload-input"
              type="file"
              multiple
              onChange={e => setNewEvidence(Array.from(e.target.files))}
              className="block border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <Button type="submit" className="bg-blue-600 text-white px-3 py-1 text-sm">Upload Evidence</Button>
            {evidenceUploadMsg && <span className="text-green-600 dark:text-green-400 text-sm ml-2">{evidenceUploadMsg}</span>}
          </form>
        )}
      </div>
      {/* Comments section */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Comments</h3>
        {comments.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400">No comments yet.</div>
        ) : (
          <ul className="space-y-4">
            {comments.map(comment => (
              <li key={comment.id} className="border-b border-gray-200 dark:border-gray-700 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <Avatar user={comment.author} size={28} />
                  <span className="font-semibold">{comment.author?.name || comment.author?.email || 'Unknown'}</span>
                  <span className="text-xs text-gray-500 ml-2">{new Date(comment.createdAt).toLocaleString()}</span>
                  {comment.visibility === 'internal' && <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">Internal</span>}
                </div>
                {editingCommentId === comment.id ? (
                  <div className="flex flex-col gap-2 mt-1">
                    <textarea
                      value={editCommentBody}
                      onChange={e => setEditCommentBody(e.target.value)}
                      className="border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                    />
                    {isResponderOrAbove && (
                      <select
                        value={editCommentVisibility}
                        onChange={e => setEditCommentVisibility(e.target.value)}
                        className="border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value="public">Public</option>
                        <option value="internal">Internal</option>
                      </select>
                    )}
                    <div className="flex gap-2 mt-2">
                      <Button onClick={() => { onCommentEdit(comment, editCommentBody, editCommentVisibility); setEditingCommentId(null); }} className="bg-green-600 text-white px-3 py-1 text-sm">Save</Button>
                      <Button onClick={() => setEditingCommentId(null)} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 text-sm">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1">{comment.body}</div>
                )}
                {/* Edit/Delete controls */}
                {(user && (user.id === comment.author.id || isAdminOrSuperAdmin)) && editingCommentId !== comment.id && (
                  <div className="flex gap-2 mt-1">
                    <Button onClick={() => { setEditingCommentId(comment.id); setEditCommentBody(comment.body); setEditCommentVisibility(comment.visibility); }} className="bg-blue-600 text-white px-2 py-1 text-xs">Edit</Button>
                    <Button onClick={() => onCommentDelete(comment)} className="bg-red-600 text-white px-2 py-1 text-xs">Delete</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {/* Add comment form */}
        {user && (
          <form onSubmit={e => { e.preventDefault(); onCommentSubmit(commentBody, commentVisibility); setCommentBody(""); setCommentVisibility("public"); }} className="mt-4 flex flex-col gap-2">
            <textarea
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              className="border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
              placeholder="Add a comment..."
              required
            />
            {isResponderOrAbove && (
              <select
                value={commentVisibility}
                onChange={e => setCommentVisibility(e.target.value)}
                className="border px-2 py-1 rounded w-40 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="public">Public</option>
                <option value="internal">Internal</option>
              </select>
            )}
            <Button type="submit" className="bg-blue-600 text-white px-3 py-1 text-sm">Add Comment</Button>
          </form>
        )}
      </div>
    </Card>
  );
} 