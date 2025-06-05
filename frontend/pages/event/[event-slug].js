import { useRouter } from 'next/router';
import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { ModalContext } from '../../context/ModalContext';

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
  const { openModal } = useContext(ModalContext);

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
    <div className="font-sans p-4">
      <h1 className="text-2xl font-bold mb-4">Event: {event.name}</h1>
      <p className="text-sm font-medium text-gray-500"><b>Slug:</b> {event.slug}</p>
      <Link href="/">← Back to Events</Link>
      <hr className="my-4" />
      {/* Submit Report Button */}
      <div className="mb-6 flex justify-start">
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded shadow-sm font-semibold transition-colors"
          onClick={() => openModal(event.slug, event.name)}
        >
          Submit Report
        </button>
      </div>
      <hr className="my-4" />
      {/* Show reports for all roles, but filter for regular users */}
      <div>
        <h2 className="text-xl font-bold mb-4">{(isResponder || isAdmin || isSuperAdmin) ? 'All Reports' : 'Your Reports'}</h2>
        {reports.length === 0 ? <p>No reports yet.</p> : (
          <ul className="list-disc pl-8">
            {(isResponder || isAdmin || isSuperAdmin
              ? reports
              : reports.filter(r => r.reporter && user && r.reporter.id === user.id)
            ).map(report => (
              <li key={report.id} className="mb-4">
                <b>{report.type}</b>: {report.description} (state: {canChangeState ? (
                  <>
                    <select
                      value={report.state}
                      onChange={e => handleStateChange(report.id, e.target.value)}
                      disabled={stateChange[report.id]?.loading}
                      className="mr-4"
                    >
                      {validStates.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {stateChange[report.id]?.error && <span className="text-red-500 ml-4">{stateChange[report.id].error}</span>}
                    {stateChange[report.id]?.success && <span className="text-green-500 ml-4">{stateChange[report.id].success}</span>}
                  </>
                ) : report.state})
                {report.reporter && <span className="text-sm text-gray-500"> — by {report.reporter.email || 'anonymous'}</span>}
                {' '}<Link href={`/event/${event.slug}/report/${report.id}`} className="text-blue-500">View Details</Link>
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
    <div className="bg-white rounded-lg shadow-md p-6 max-w-xl mx-auto border border-gray-100">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Submit a Report</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="report-type">Type</label>
          <select
            id="report-type"
            value={type}
            onChange={e => setType(e.target.value)}
            required
            className="mt-1 block w-64 max-w-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          >
            <option value="">Select type</option>
            {reportTypes.map(rt => (
              <option key={rt.value} value={rt.value}>{rt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="report-description">Description</label>
          <textarea
            id="report-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            className="mt-1 block w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 min-h-[80px]"
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded shadow-sm font-medium transition-colors disabled:opacity-60"
        >
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
        {message && <p className="mt-2 text-sm text-gray-500">{message}</p>}
      </form>
    </div>
  );
} 