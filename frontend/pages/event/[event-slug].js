import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const validStates = [
  'submitted',
  'acknowledged',
  'investigating',
  'resolved',
  'closed',
];

export default function EventDashboard() {
  const router = useRouter();
  const { 'event-slug': eventSlug } = router.query;
  const [event, setEvent] = useState(null);
  const [reports, setReports] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stateChange, setStateChange] = useState({}); // { [reportId]: { loading, error, success } }

  // Fetch event details and user session
  useEffect(() => {
    if (!eventSlug) return;
    setLoading(true);
    // Fetch event details
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/event/slug/${eventSlug}`)
      .then(res => {
        if (!res.ok) throw new Error('Event not found');
        return res.json();
      })
      .then(data => setEvent(data.event))
      .catch(() => setError('Event not found'));
    // Fetch user session
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/session', {
      credentials: 'include',
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data ? data.user : null))
      .catch(() => setUser(null));
  }, [eventSlug]);

  // Fetch reports for this event
  useEffect(() => {
    if (!eventSlug) return;
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports`)
      .then(res => res.json())
      .then(data => setReports(data.reports || []))
      .catch(() => setReports([]));
    setLoading(false);
  }, [eventSlug, stateChange]); // refetch on state change

  // Helper: check user role for this event
  function hasRole(role) {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  }

  if (error) return <div style={{ padding: 40 }}><h2>{error}</h2></div>;
  if (loading || !event) return <div style={{ padding: 40 }}><h2>Loading event...</h2></div>;

  // Determine what to show based on user role
  const isSuperAdmin = hasRole('SuperAdmin');
  const isAdmin = hasRole('Admin');
  const isResponder = hasRole('Responder');
  const isRegularUser = user && !isSuperAdmin && !isAdmin && !isResponder;
  const isAnonymous = !user;
  const canChangeState = isResponder || isAdmin || isSuperAdmin;

  // Handler for inline state change
  const handleStateChange = async (reportId, newState) => {
    setStateChange(prev => ({ ...prev, [reportId]: { loading: true, error: '', success: '' } }));
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports/${reportId}/state`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ state: newState }),
      });
      if (!res.ok) {
        const data = await res.json();
        setStateChange(prev => ({ ...prev, [reportId]: { loading: false, error: data.error || 'Failed to change state', success: '' } }));
      } else {
        setStateChange(prev => ({ ...prev, [reportId]: { loading: false, error: '', success: 'State updated!' } }));
      }
    } catch (err) {
      setStateChange(prev => ({ ...prev, [reportId]: { loading: false, error: 'Network error', success: '' } }));
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>Event: {event.name}</h1>
      <p><b>Slug:</b> {event.slug}</p>
      <Link href="/">← Back to Events</Link>
      <hr />
      {/* Show report creation form for all roles */}
      <div>
        <h2>Submit a Report</h2>
        <ReportForm eventSlug={event.slug} />
      </div>
      <hr />
      {/* Show reports for all roles, but filter for regular users */}
      <div>
        <h2>{(isResponder || isAdmin || isSuperAdmin) ? 'All Reports' : 'Your Reports'}</h2>
        {reports.length === 0 ? <p>No reports yet.</p> : (
          <ul>
            {(isResponder || isAdmin || isSuperAdmin
              ? reports
              : reports.filter(r => r.reporter && user && r.reporter.id === user.id)
            ).map(report => (
              <li key={report.id} style={{ marginBottom: 12 }}>
                <b>{report.type}</b>: {report.description} (state: {canChangeState ? (
                  <>
                    <select
                      value={report.state}
                      onChange={e => handleStateChange(report.id, e.target.value)}
                      disabled={stateChange[report.id]?.loading}
                      style={{ marginLeft: 8, marginRight: 8 }}
                    >
                      {validStates.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {stateChange[report.id]?.error && <span style={{ color: 'red', marginLeft: 8 }}>{stateChange[report.id].error}</span>}
                    {stateChange[report.id]?.success && <span style={{ color: 'green', marginLeft: 8 }}>{stateChange[report.id].success}</span>}
                  </>
                ) : report.state})
                {report.reporter && <span> — by {report.reporter.email || 'anonymous'}</span>}
                {' '}<Link href={`/event/${event.slug}/report/${report.id}`}>View Details</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// Simple report submission form
function ReportForm({ eventSlug }) {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Report types from schema
  const reportTypes = [
    { value: 'harassment', label: 'Harassment' },
    { value: 'safety', label: 'Safety' },
    { value: 'other', label: 'Other' },
  ];

  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    const formData = new FormData();
    formData.append('type', type);
    formData.append('description', description);
    // TODO: Add evidence upload if needed
    const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (res.ok) {
      setMessage('Report submitted!');
      setType('');
      setDescription('');
    } else {
      setMessage('Failed to submit report.');
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 20, marginBottom: 20 }}>
      <div>
        <label>Type:<br />
          <select value={type} onChange={e => setType(e.target.value)} required>
            <option value="">Select type</option>
            {reportTypes.map(rt => (
              <option key={rt.value} value={rt.value}>{rt.label}</option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label>Description:<br />
          <textarea value={description} onChange={e => setDescription(e.target.value)} required />
        </label>
      </div>
      <button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Report'}</button>
      {message && <p>{message}</p>}
    </form>
  );
} 