import { useRouter } from 'next/router';
import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { ModalContext } from '../../context/ModalContext';
import { Button, Input, Card, Table } from '../../components';

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
    <div className="font-sans p-4 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Card className="mb-6 max-w-4xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-4">Event: {event.name}</h1>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-300"><b>Slug:</b> {event.slug}</p>
        <Link href="/" className="text-blue-700 dark:text-blue-400 hover:underline">← Back to Events</Link>
        <hr className="my-4 border-gray-200 dark:border-gray-700" />
        {/* Submit Report Button */}
        <div className="mb-6 flex justify-start">
          <Button
            onClick={() => openModal(event.slug, event.name)}
            className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm"
          >
            Submit Report
          </Button>
        </div>
        <hr className="my-4 border-gray-200 dark:border-gray-700" />
        {/* Show reports for all roles, but filter for regular users */}
        <div>
          <h2 className="text-xl font-bold mb-4">{(isResponder || isAdmin || isSuperAdmin) ? 'All Reports' : 'Your Reports'}</h2>
          {/* Card view for mobile */}
          <div className="block sm:hidden">
            {reports.length === 0 ? <p className="text-gray-500 dark:text-gray-400">No reports yet.</p> : (
              <div className="grid grid-cols-1 gap-4">
                {(isResponder || isAdmin || isSuperAdmin
                  ? reports
                  : reports.filter(r => r.reporter && user && r.reporter.id === user.id)
                ).map(report => (
                  <Card key={report.id} className="flex flex-col gap-2 p-4">
                    <div className="font-semibold text-lg">{report.type}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">{report.description}</div>
                    <div className="flex flex-col gap-1 text-sm">
                      <span>State: {canChangeState ? (
                        <>
                          <select
                            value={report.state}
                            onChange={e => handleStateChange(report.id, e.target.value)}
                            disabled={stateChange[report.id]?.loading}
                            className="mr-2 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 sm:px-2 sm:py-1 sm:text-sm"
                          >
                            {validStates.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {stateChange[report.id]?.error && <span className="text-red-500 dark:text-red-400 ml-2">{stateChange[report.id].error}</span>}
                          {stateChange[report.id]?.success && <span className="text-green-500 dark:text-green-400 ml-2">{stateChange[report.id].success}</span>}
                        </>
                      ) : report.state}</span>
                      {report.reporter && <span className="text-xs text-gray-500 dark:text-gray-400">by {report.reporter.email || 'anonymous'}</span>}
                    </div>
                    <div className="mt-2">
                      <Link href={`/event/${event.slug}/report/${report.id}`} className="text-blue-500 dark:text-blue-400 underline">View Details</Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          {/* List view for desktop */}
          <div className="hidden sm:block">
            {reports.length === 0 ? <p className="text-gray-500 dark:text-gray-400">No reports yet.</p> : (
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
                          className="mr-4 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 sm:px-2 sm:py-1 sm:text-sm"
                        >
                          {validStates.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        {stateChange[report.id]?.error && <span className="text-red-500 dark:text-red-400 ml-4">{stateChange[report.id].error}</span>}
                        {stateChange[report.id]?.success && <span className="text-green-500 dark:text-green-400 ml-4">{stateChange[report.id].success}</span>}
                      </>
                    ) : report.state})
                    {report.reporter && <span className="text-sm text-gray-500 dark:text-gray-400"> — by {report.reporter.email || 'anonymous'}</span>}
                    {' '}<Link href={`/event/${event.slug}/report/${report.id}`} className="text-blue-500 dark:text-blue-400">View Details</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Card>
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
    <Card className="max-w-xl mx-auto mt-8">
      <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Submit a Report</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1" htmlFor="report-type">Type</label>
          <select
            id="report-type"
            value={type}
            onChange={e => setType(e.target.value)}
            required
            className="mt-1 block w-64 max-w-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Select type</option>
            {reportTypes.map(rt => (
              <option key={rt.value} value={rt.value}>{rt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1" htmlFor="report-description">Description</label>
          <textarea
            id="report-description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            required
            className="mt-1 block w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 min-h-[80px]"
          />
        </div>
        <Button
          type="submit"
          disabled={submitting}
          className="mt-2"
        >
          {submitting ? 'Submitting...' : 'Submit Report'}
        </Button>
        {message && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>}
      </form>
    </Card>
  );
} 