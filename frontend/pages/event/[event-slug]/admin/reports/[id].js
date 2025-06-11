import React from "react";
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, Table, Button, Input } from '../../../../../components';
import ReactMarkdown from 'react-markdown';

export default function AdminReportDetail() {
  const router = useRouter();
  const { 'event-slug': eventSlug, id } = router.query;
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventUsers, setEventUsers] = useState([]);
  const [assignmentLoading, setAssignmentLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState('');
  const [assignmentSuccess, setAssignmentSuccess] = useState('');
  const [assignedResponderId, setAssignedResponderId] = useState('');
  const [severity, setSeverity] = useState('');
  const [resolution, setResolution] = useState('');
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [commentVisibility, setCommentVisibility] = useState('public');
  const [commentError, setCommentError] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [editCommentVisibility, setEditCommentVisibility] = useState('public');
  const [editError, setEditError] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [evidenceUploadMsg, setEvidenceUploadMsg] = useState('');
  const [newEvidence, setNewEvidence] = useState([]);
  const [evidenceError, setEvidenceError] = useState('');
  const [deletingEvidenceId, setDeletingEvidenceId] = useState(null);
  const [stateChangeLoading, setStateChangeLoading] = useState(false);
  const [stateChangeError, setStateChangeError] = useState('');
  const [stateChangeSuccess, setStateChangeSuccess] = useState('');
  const [selectedState, setSelectedState] = useState('');

  const validStates = [
    'submitted',
    'acknowledged',
    'investigating',
    'resolved',
    'closed',
  ];

  // Allowed transitions based on current state
  function getAllowedTransitions(current) {
    switch (current) {
      case 'submitted': return ['acknowledged', 'investigating', 'resolved', 'closed'];
      case 'acknowledged': return ['investigating', 'resolved', 'closed'];
      case 'investigating': return ['resolved', 'closed'];
      case 'resolved': return ['closed'];
      case 'closed': return [];
      default: return [];
    }
  }

  useEffect(() => {
    if (!eventSlug || !id) return;
    setLoading(true);
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setReport(data.report))
      .catch(() => setError('Failed to load report.'))
      .finally(() => setLoading(false));
  }, [eventSlug, id]);

  useEffect(() => {
    if (!eventSlug) return;
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
  }, [eventSlug]);

  useEffect(() => {
    if (report) {
      setAssignedResponderId(report.assignedResponderId || '');
      setSeverity(report.severity || '');
      setResolution(report.resolution || '');
      setSelectedState(report.state || '');
    }
  }, [report]);

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/session', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.user) setUser(data.user);
      });
  }, []);

  useEffect(() => {
    if (eventSlug && user) {
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/my-roles`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.roles) setUserRoles(data.roles);
        });
    }
  }, [eventSlug, user]);

  useEffect(() => {
    if (!eventSlug || !id) return;
    setCommentsLoading(true);
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}/comments`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : { comments: [] })
      .then(data => setComments(data.comments || []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [eventSlug, id]);

  const handleUpdateMeta = async (e) => {
    e.preventDefault();
    setAssignmentLoading(true);
    setAssignmentError('');
    setAssignmentSuccess('');
    if ((selectedState === 'resolved' || selectedState === 'closed') && !resolution.trim()) {
      setAssignmentError('Resolution is required when report is resolved or closed.');
      setAssignmentLoading(false);
      return;
    }
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          assignedResponderId: assignedResponderId || null,
          severity: severity || null,
          resolution: resolution || null,
          state: selectedState || null,
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

  const isResponderOrAbove = userRoles.some(r => ['Responder', 'Admin', 'SuperAdmin', 'Global Admin'].includes(r));
  const isAdminOrSuperAdmin = userRoles.some(r => ['Admin', 'SuperAdmin', 'Global Admin'].includes(r));

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    setCommentError('');
    setCommentSubmitting(true);
    if (!commentBody.trim()) {
      setCommentError('Comment cannot be empty.');
      setCommentSubmitting(false);
      return;
    }
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: commentBody, visibility: commentVisibility }),
      });
      if (!res.ok) {
        const data = await res.json();
        setCommentError(data.error || 'Failed to add comment.');
      } else {
        setCommentBody('');
        setCommentVisibility('public');
        fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}/comments`, { credentials: 'include' })
          .then(res => res.ok ? res.json() : { comments: [] })
          .then(data => setComments(data.comments || []));
      }
    } catch (err) {
      setCommentError('Network error');
    }
    setCommentSubmitting(false);
  };

  const handleEditClick = (comment) => {
    setEditingCommentId(comment.id);
    setEditCommentBody(comment.body);
    setEditCommentVisibility(comment.visibility);
    setEditError('');
  };
  const handleEditCancel = () => {
    setEditingCommentId(null);
    setEditCommentBody('');
    setEditCommentVisibility('public');
    setEditError('');
  };
  const handleEditSave = async (comment) => {
    setEditError('');
    if (!editCommentBody.trim()) {
      setEditError('Comment cannot be empty.');
      return;
    }
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}/comments/${comment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ body: editCommentBody, visibility: editCommentVisibility }),
      });
      if (!res.ok) {
        const data = await res.json();
        setEditError(data.error || 'Failed to update comment.');
      } else {
        setEditingCommentId(null);
        setEditCommentBody('');
        setEditCommentVisibility('public');
        fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}/comments`, { credentials: 'include' })
          .then(res => res.ok ? res.json() : { comments: [] })
          .then(data => setComments(data.comments || []));
      }
    } catch (err) {
      setEditError('Network error');
    }
  };
  const handleDeleteClick = (comment) => {
    setDeletingCommentId(comment.id);
  };
  const handleDeleteCancel = () => {
    setDeletingCommentId(null);
  };
  const handleDeleteConfirm = async (comment) => {
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}/comments/${comment.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      setDeletingCommentId(null);
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}/comments`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : { comments: [] })
        .then(data => setComments(data.comments || []));
    } catch (err) {
      setDeletingCommentId(null);
    }
  };

  const refreshReport = () => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}`)
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setReport(data.report))
      .catch(() => setError('Failed to load report.'));
  };

  const handleEvidenceUpload = async (e) => {
    e.preventDefault();
    setEvidenceUploading(true);
    setEvidenceUploadMsg('');
    setEvidenceError('');
    if (!newEvidence.length) {
      setEvidenceError('Please select at least one file.');
      setEvidenceUploading(false);
      return;
    }
    const formData = new FormData();
    for (let i = 0; i < newEvidence.length; i++) {
      formData.append('evidence', newEvidence[i]);
    }
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/reports/${report.id}/evidence`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (res.ok) {
        setEvidenceUploadMsg('Evidence uploaded!');
        setNewEvidence([]);
        refreshReport();
      } else {
        setEvidenceError('Failed to upload evidence.');
      }
    } catch (err) {
      setEvidenceError('Network error');
    }
    setEvidenceUploading(false);
  };

  const handleDeleteEvidence = async (file) => {
    setDeletingEvidenceId(file.id);
    setEvidenceError('');
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/evidence/${file.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        refreshReport();
      } else {
        setEvidenceError('Failed to delete evidence.');
      }
    } catch (err) {
      setEvidenceError('Network error');
    }
    setDeletingEvidenceId(null);
  };

  const handleStateChange = async (e) => {
    const newState = e.target.value;
    setSelectedState(newState);
    setStateChangeError('');
    setStateChangeSuccess('');
    setStateChangeLoading(true);
    if ((newState === 'resolved' || newState === 'closed') && !resolution.trim()) {
      setStateChangeError('Resolution is required when resolving or closing a report.');
      setStateChangeLoading(false);
      return;
    }
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ state: newState }),
      });
      if (!res.ok) {
        const data = await res.json();
        setStateChangeError(data.error || 'Failed to change state');
      } else {
        const data = await res.json();
        setReport(data.report);
        setStateChangeSuccess('State updated!');
        refreshReport();
      }
    } catch (err) {
      setStateChangeError('Network error');
    }
    setStateChangeLoading(false);
  };

  if (loading) return <Card className="max-w-3xl mx-auto p-4 sm:p-8 mt-8">Loading...</Card>;
  if (error) return <Card className="max-w-3xl mx-auto p-4 sm:p-8 mt-8 text-red-500 dark:text-red-400">{error}</Card>;
  if (!report) return null;

  return (
    <Card className="max-w-3xl mx-auto p-4 sm:p-8 mt-8">
      <h2 className="text-2xl font-bold mb-4">Admin/Responder: Report Detail</h2>
      <div className="mb-4">
        <Link href={`/event/${eventSlug}/admin/reports`} className="text-blue-500 dark:text-blue-400 underline">← Back to Reports List</Link>
      </div>
      <form onSubmit={handleUpdateMeta} className="mb-6">
        <Table>
          <tbody>
            <tr><td className="font-bold">ID</td><td>{report.id}</td></tr>
            <tr><td className="font-bold">Type</td><td>{report.type}</td></tr>
            <tr><td className="font-bold">Description</td><td>{report.description}</td></tr>
            <tr>
              <td className="font-bold">State</td>
              <td>
                {isResponderOrAbove ? (
                  <select
                    value={selectedState}
                    onChange={e => {
                      setSelectedState(e.target.value);
                      setStateChangeError('');
                      setStateChangeSuccess('');
                    }}
                    className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100"
                    disabled={stateChangeLoading}
                  >
                    <option value={report.state}>{report.state.charAt(0).toUpperCase() + report.state.slice(1)}</option>
                    {getAllowedTransitions(report.state).map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                ) : (
                  report.state
                )}
                {stateChangeError && <div className="text-red-600 dark:text-red-400 text-sm mt-1">{stateChangeError}</div>}
                {stateChangeSuccess && <div className="text-green-600 dark:text-green-400 text-sm mt-1">{stateChangeSuccess}</div>}
              </td>
            </tr>
            <tr><td className="font-bold">Reporter</td><td>{report.reporter ? (report.reporter.name || report.reporter.email || 'Anonymous') : 'Anonymous'}</td></tr>
            <tr>
              <td className="font-bold">Assigned Responder</td>
              <td>
                <select
                  value={assignedResponderId}
                  onChange={e => setAssignedResponderId(e.target.value)}
                  className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100"
                  disabled={assignmentLoading}
                >
                  <option value="">(unassigned)</option>
                  {eventUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email || 'Unknown'} ({(u.roles || []).join(', ')})</option>
                  ))}
                </select>
              </td>
            </tr>
            <tr>
              <td className="font-bold">Severity</td>
              <td>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value)}
                  className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100"
                  disabled={assignmentLoading}
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
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100 min-h-[60px]"
                  disabled={assignmentLoading ? true : false}
                  placeholder="Enter resolution details (required if resolved/closed)"
                  required={selectedState === 'resolved' || selectedState === 'closed'}
                />
              </td>
            </tr>
            <tr><td className="font-bold">Incident Date</td><td>{report.incidentAt ? new Date(report.incidentAt).toLocaleString() : <span className="italic text-gray-400">(none)</span>}</td></tr>
            <tr><td className="font-bold">Parties Involved</td><td>{report.parties || <span className="italic text-gray-400">(none)</span>}</td></tr>
            <tr><td className="font-bold">Created At</td><td>{new Date(report.createdAt).toLocaleString()}</td></tr>
            <tr><td className="font-bold">Updated At</td><td>{new Date(report.updatedAt).toLocaleString()}</td></tr>
          </tbody>
        </Table>
        <div className="flex gap-4 mt-4 items-center">
          <Button type="submit" disabled={assignmentLoading} className="bg-blue-600 text-white px-4 py-2 rounded">
            {assignmentLoading ? 'Saving...' : 'Save Assignment/Severity/Resolution'}
          </Button>
          {assignmentError && <span className="text-red-600 dark:text-red-400">{assignmentError}</span>}
          {assignmentSuccess && <span className="text-green-600 dark:text-green-400">{assignmentSuccess}</span>}
        </div>
      </form>
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">Evidence Files</h3>
        {(!report || !report.evidenceFiles) ? (
          <div className="text-gray-500 dark:text-gray-400">No evidence files.</div>
        ) : report.evidenceFiles.length > 0 ? (
          <ul className="space-y-1">
            {report.evidenceFiles.map(file => (
              <li key={file.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/evidence/${file.id}/download`} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 underline">{file.filename}</a>
                <span className="text-xs text-gray-500 dark:text-gray-400">{file.uploader ? `${file.uploader.name || file.uploader.email || 'Unknown'}` : 'Unknown'} • {new Date(file.createdAt).toLocaleString()}</span>
                {isResponderOrAbove && (
                  deletingEvidenceId === file.id ? (
                    <>
                      <Button onClick={() => handleDeleteEvidence(file)} className="bg-red-600 text-white px-2 py-1 text-xs">Confirm Delete</Button>
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
        {isResponderOrAbove && (
          <form onSubmit={handleEvidenceUpload} className="mt-4 flex flex-col sm:flex-row gap-2 items-start">
            <input
              type="file"
              multiple
              onChange={e => setNewEvidence(Array.from(e.target.files))}
              className="block border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              disabled={evidenceUploading}
            />
            <Button type="submit" disabled={evidenceUploading} className="bg-blue-600 text-white px-3 py-1 text-sm">{evidenceUploading ? 'Uploading...' : 'Upload Evidence'}</Button>
            {evidenceUploadMsg && <span className="text-green-600 dark:text-green-400 text-sm ml-2">{evidenceUploadMsg}</span>}
            {evidenceError && <span className="text-red-600 dark:text-red-400 text-sm ml-2">{evidenceError}</span>}
          </form>
        )}
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-2">Comments</h3>
        {commentsLoading ? (
          <div className="text-gray-500 dark:text-gray-400">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-gray-500 dark:text-gray-400">No comments yet.</div>
        ) : (
          <ul className="space-y-4">
            {comments.map(comment => {
              const isAuthor = user && comment.author && user.id === comment.author.id;
              const canEdit = isAuthor;
              const canDelete = isAuthor || isAdminOrSuperAdmin;
              return (
                <li key={comment.id} className="border border-gray-200 dark:border-gray-700 rounded p-3 bg-gray-50 dark:bg-gray-900">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-gray-800 dark:text-gray-100">{comment.author?.name || comment.author?.email || 'Anonymous'}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(comment.createdAt).toLocaleString()}</span>
                    {comment.visibility === 'internal' && (
                      <span className="ml-2 px-2 py-0.5 rounded bg-yellow-200 dark:bg-yellow-700 text-yellow-900 dark:text-yellow-100 text-xs font-semibold">Internal</span>
                    )}
                  </div>
                  {editingCommentId === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editCommentBody}
                        onChange={e => setEditCommentBody(e.target.value)}
                        className="block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[60px]"
                        required
                      />
                      {isResponderOrAbove && (
                        <div>
                          <label htmlFor="edit-comment-visibility" className="text-xs font-medium text-gray-600 dark:text-gray-300 mr-2">Visibility:</label>
                          <select
                            id="edit-comment-visibility"
                            value={editCommentVisibility}
                            onChange={e => setEditCommentVisibility(e.target.value)}
                            className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs px-2 py-1"
                          >
                            <option value="public">Public (visible to all involved)</option>
                            <option value="internal">Internal (responders/admins only)</option>
                          </select>
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <Button onClick={() => handleEditSave(comment)} className="bg-green-600 text-white px-3 py-1 text-sm">Save</Button>
                        <Button onClick={handleEditCancel} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 text-sm">Cancel</Button>
                        {editError && <span className="text-red-500 text-xs ml-2">{editError}</span>}
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="text-gray-900 dark:text-gray-100 whitespace-pre-line text-sm">
                        <ReactMarkdown>{comment.body}</ReactMarkdown>
                      </div>
                      <div className="flex gap-2 mt-2">
                        {canEdit && <Button onClick={() => handleEditClick(comment)} className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-2 py-1 text-xs">Edit</Button>}
                        {canDelete && (
                          deletingCommentId === comment.id ? (
                            <>
                              <Button onClick={() => handleDeleteConfirm(comment)} className="bg-red-600 text-white px-2 py-1 text-xs">Confirm Delete</Button>
                              <Button onClick={handleDeleteCancel} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 text-xs">Cancel</Button>
                            </>
                          ) : (
                            <Button onClick={() => handleDeleteClick(comment)} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-2 py-1 text-xs">Delete</Button>
                          )
                        )}
                      </div>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {user && (
          <form onSubmit={handleCommentSubmit} className="mt-6 space-y-2">
            <label htmlFor="comment-body" className="block text-sm font-medium text-gray-700 dark:text-gray-200">Add a Comment</label>
            <textarea
              id="comment-body"
              value={commentBody}
              onChange={e => setCommentBody(e.target.value)}
              className="block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[60px]"
              placeholder="Write your comment..."
              required
              disabled={commentSubmitting}
            />
            {isResponderOrAbove && (
              <div className="mt-1">
                <label htmlFor="comment-visibility" className="text-xs font-medium text-gray-600 dark:text-gray-300 mr-2">Visibility:</label>
                <select
                  id="comment-visibility"
                  value={commentVisibility}
                  onChange={e => setCommentVisibility(e.target.value)}
                  className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs px-2 py-1"
                  disabled={commentSubmitting}
                >
                  <option value="public">Public (visible to all involved)</option>
                  <option value="internal">Internal (responders/admins only)</option>
                </select>
              </div>
            )}
            <Button type="submit" disabled={commentSubmitting} className="mt-2">{commentSubmitting ? 'Posting...' : 'Post Comment'}</Button>
            {commentError && <div className="text-red-500 text-sm mt-1">{commentError}</div>}
          </form>
        )}
      </div>
      {/* TODO: Audit log/history, notifications, etc. */}
    </Card>
  );
} 