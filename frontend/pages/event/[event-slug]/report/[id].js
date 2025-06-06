import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { Button, Card, Table } from '../../../../components';

const validStates = [
  'submitted',
  'acknowledged',
  'investigating',
  'resolved',
  'closed',
];

const visibilityOptions = [
  { value: 'public', label: 'Public (visible to all involved)' },
  { value: 'internal', label: 'Internal (responders/admins only)' },
];

export default function ReportDetail({ initialReport, error }) {
  const router = useRouter();
  const { 'event-slug': eventSlug, id } = router.query;
  const [report, setReport] = useState(initialReport);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(error);
  const [user, setUser] = useState(null);
  const [userRoles, setUserRoles] = useState([]);
  const [stateChangeError, setStateChangeError] = useState('');
  const [stateChangeSuccess, setStateChangeSuccess] = useState('');
  const [createdAtLocal, setCreatedAtLocal] = useState('');
  const [updatedAtLocal, setUpdatedAtLocal] = useState('');
  // Comments state
  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentBody, setCommentBody] = useState('');
  const [commentVisibility, setCommentVisibility] = useState('public');
  const [commentError, setCommentError] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  // Add state for editing and deleting comments
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentBody, setEditCommentBody] = useState('');
  const [editCommentVisibility, setEditCommentVisibility] = useState('public');
  const [editError, setEditError] = useState('');
  const [deletingCommentId, setDeletingCommentId] = useState(null);

  // Fetch user info
  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/session', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.user) setUser(data.user);
      });
  }, []);

  // Fetch user roles for this event after user is set
  useEffect(() => {
    if (eventSlug && user) {
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/my-roles`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.roles) setUserRoles(data.roles);
        });
    }
  }, [eventSlug, user]);

  // Fetch comments for this report
  useEffect(() => {
    if (!eventSlug || !id) return;
    setCommentsLoading(true);
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}/comments`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : { comments: [] })
      .then(data => setComments(data.comments || []))
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

  const isSuperAdmin = user && user.roles && user.roles.includes('Global Admin');
  const canChangeState = isSuperAdmin || userRoles.some(r => ['Responder', 'Admin', 'Global Admin'].includes(r));
  const isResponderOrAbove = userRoles.some(r => ['Responder', 'Admin', 'SuperAdmin', 'Global Admin'].includes(r));

  // Helper: check if user is admin or superadmin
  const isAdminOrSuperAdmin = userRoles.some(r => ['Admin', 'SuperAdmin', 'Global Admin'].includes(r));

  const handleStateChange = async (e) => {
    const newState = e.target.value;
    setStateChangeError('');
    setStateChangeSuccess('');
    setLoading(true);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}/state`, {
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
      }
    } catch (err) {
      setStateChangeError('Network error');
    }
    setLoading(false);
  };

  // Handle comment submit
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
        // Refetch comments
        fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}/comments`, { credentials: 'include' })
          .then(res => res.ok ? res.json() : { comments: [] })
          .then(data => setComments(data.comments || []));
      }
    } catch (err) {
      setCommentError('Network error');
    }
    setCommentSubmitting(false);
  };

  // Edit comment handler
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
        // Refetch comments
        fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}/comments`, { credentials: 'include' })
          .then(res => res.ok ? res.json() : { comments: [] })
          .then(data => setComments(data.comments || []));
      }
    } catch (err) {
      setEditError('Network error');
    }
  };
  // Delete comment handler
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
      if (!res.ok) {
        // Optionally show error
      }
      setDeletingCommentId(null);
      // Refetch comments
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${id}/comments`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : { comments: [] })
        .then(data => setComments(data.comments || []));
    } catch (err) {
      setDeletingCommentId(null);
    }
  };

  if (fetchError) {
    return <div>Error: {fetchError}</div>;
  }
  if (!report) {
    return <div>Loading...</div>;
  }

  return (
    <Card className="max-w-2xl mx-auto p-4 sm:p-8 mt-8">
      <h2 className="text-2xl font-bold mb-4">Report Detail</h2>
      {/* Mobile: stacked details */}
      <div className="block sm:hidden">
        <dl className="divide-y divide-gray-200 dark:divide-gray-700">
          <div className="py-2 flex flex-col">
            <dt className="font-bold">ID</dt>
            <dd>{report.id}</dd>
          </div>
          <div className="py-2 flex flex-col">
            <dt className="font-bold">Type</dt>
            <dd>{report.type}</dd>
          </div>
          <div className="py-2 flex flex-col">
            <dt className="font-bold">Description</dt>
            <dd>{report.description}</dd>
          </div>
          <div className="py-2 flex flex-col">
            <dt className="font-bold">State</dt>
            <dd>
              {canChangeState ? (
                <>
                  <select value={report.state} onChange={handleStateChange} disabled={loading} className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full sm:px-2 sm:py-1 sm:text-sm">
                    {validStates.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {stateChangeError && <span className="text-red-500 dark:text-red-400 mt-1 block">{stateChangeError}</span>}
                  {stateChangeSuccess && <span className="text-green-500 dark:text-green-400 mt-1 block">{stateChangeSuccess}</span>}
                </>
              ) : (
                report.state
              )}
            </dd>
          </div>
          <div className="py-2 flex flex-col">
            <dt className="font-bold">Evidence</dt>
            <dd>{report.evidence ? <a href={report.evidence} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 underline">Download</a> : 'None'}</dd>
          </div>
          <div className="py-2 flex flex-col">
            <dt className="font-bold">Created At</dt>
            <dd>{createdAtLocal || report.createdAt}</dd>
          </div>
          <div className="py-2 flex flex-col">
            <dt className="font-bold">Reporter</dt>
            <dd>{report.reporter ? `${report.reporter.name || ''} (${report.reporter.email || 'Anonymous'})` : 'Anonymous'}</dd>
          </div>
        </dl>
      </div>
      {/* Desktop: table */}
      <div className="hidden sm:block">
        <Table>
          <tbody>
            <tr><td className="font-bold"><b>ID</b></td><td>{report.id}</td></tr>
            <tr><td className="font-bold"><b>Type</b></td><td>{report.type}</td></tr>
            <tr><td className="font-bold"><b>Description</b></td><td>{report.description}</td></tr>
            <tr>
              <td className="font-bold"><b>State</b></td>
              <td>
                {canChangeState ? (
                  <>
                    <select value={report.state} onChange={handleStateChange} disabled={loading} className="p-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 sm:px-2 sm:py-1 sm:text-sm">
                      {validStates.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {stateChangeError && <span className="text-red-500 dark:text-red-400 ml-2">{stateChangeError}</span>}
                    {stateChangeSuccess && <span className="text-green-500 dark:text-green-400 ml-2">{stateChangeSuccess}</span>}
                  </>
                ) : (
                  report.state
                )}
              </td>
            </tr>
            <tr><td className="font-bold"><b>Evidence</b></td><td>{report.evidence ? <a href={report.evidence} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400">Download</a> : 'None'}</td></tr>
            <tr><td className="font-bold"><b>Created At</b></td><td>{createdAtLocal || report.createdAt}</td></tr>
            <tr><td className="font-bold"><b>Reporter</b></td><td>{report.reporter ? `${report.reporter.name || ''} (${report.reporter.email || 'Anonymous'})` : 'Anonymous'}</td></tr>
          </tbody>
        </Table>
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
                            {visibilityOptions.map(opt => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
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
                      <div className="text-gray-900 dark:text-gray-100 whitespace-pre-line text-sm">{comment.body}</div>
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
        {/* Add comment form */}
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
                  {visibilityOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
            <Button type="submit" disabled={commentSubmitting} className="mt-2">{commentSubmitting ? 'Posting...' : 'Post Comment'}</Button>
            {commentError && <div className="text-red-500 text-sm mt-1">{commentError}</div>}
          </form>
        )}
      </div>
      <div className="mt-4">
        <Button onClick={() => router.push(`/event/${eventSlug}`)} className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm">Back to Event</Button>
      </div>
    </Card>
  );
}

export async function getServerSideProps(context) {
  const { id, 'event-slug': eventSlug } = context.params;
  let initialReport = null;
  let error = null;
  if (!id || !eventSlug) {
    return { props: { initialReport: null, error: 'Missing report ID or event slug.' } };
  }
  try {
    const fetchUrl = `${process.env.BACKEND_API_URL || 'http://localhost:4000'}/events/slug/${eventSlug}/reports/${id}`;
    const res = await fetch(fetchUrl);
    if (!res.ok) {
      throw new Error(`Failed to fetch report: ${res.status}`);
    }
    const data = await res.json();
    initialReport = data.report;
  } catch (err) {
    error = err.message;
  }
  return { props: { initialReport, error } };
} 