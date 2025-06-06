import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ModalContext } from '../context/ModalContext';
import { Button, Input, Card, Table } from '../components';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventSlug, setSelectedEventSlug] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const router = useRouter();
  const { openModal } = useContext(ModalContext);

  useEffect(() => {
    // Check authentication
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/session', {
      credentials: 'include',
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        setUser(data.user);
      })
      .catch(() => {
        setUser(null);
        router.push('/login');
      });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    // Fetch all events
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/events', {
      credentials: 'include',
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch events');
      })
      .then(data => {
        setEvents(data.events || []);
      })
      .catch(() => {
        setError('Could not load events');
      });
  }, [user]);

  useEffect(() => {
    if (!user || !selectedEventSlug) return;
    setLoading(true);
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${selectedEventSlug}/reports`, {
      credentials: 'include',
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch reports');
      })
      .then(data => {
        setReports(data.reports || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load reports');
        setLoading(false);
      });
  }, [user, selectedEventSlug]);

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setSubmitSuccess('');
    if (!type || !description) {
      setSubmitError('Type and description are required.');
      return;
    }
    const formData = new FormData();
    formData.append('type', type);
    formData.append('description', description);
    if (evidence) formData.append('evidence', evidence);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${selectedEventSlug}/reports`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (res.ok) {
        setType('');
        setDescription('');
        setEvidence(null);
        setSubmitSuccess('Report submitted!');
        // Refresh reports
        fetchReports(selectedEventSlug);
      } else {
        const data = await res.json();
        setSubmitError(data.error || 'Failed to submit report');
      }
    } catch (err) {
      setSubmitError('Network error');
    }
  };

  const fetchReports = (eventSlug) => {
    setLoading(true);
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports`, {
      credentials: 'include',
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch reports');
      })
      .then(data => {
        setReports(data.reports || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load reports');
        setLoading(false);
      });
  };

  return (
    <div className="font-sans p-4 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Card className="mb-6 max-w-4xl mx-auto p-4 sm:p-8">
        <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
        <p><Link href="/">Home</Link></p>
        {error && <p className="text-red-500 dark:text-red-400">{error}</p>}
        {events.length > 0 && (
          <div className="mb-4">
            <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-1">
              Select Event:
              <select value={selectedEventSlug} onChange={e => setSelectedEventSlug(e.target.value)} className="ml-2 px-4 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 sm:px-3 sm:py-1.5 sm:text-sm">
                <option value="">-- Select an event --</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.slug}>{ev.name}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        {/* Submit Report Button */}
        <div className="mb-6 flex justify-start">
          <Button
            disabled={!selectedEventSlug}
            onClick={() => {
              const selectedEvent = events.find(ev => ev.slug === selectedEventSlug);
              openModal(selectedEventSlug, selectedEvent ? selectedEvent.name : '');
            }}
            className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm"
          >
            Submit Report
          </Button>
        </div>
        {/* Reports Table or Cards */}
        {selectedEventSlug && !loading ? (
          <>
            {/* Card view for mobile */}
            <div className="block sm:hidden">
              {reports.length === 0 ? (
                <div className="text-center py-4">No reports found.</div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {reports.map(r => (
                    <Card key={r.id} className="flex flex-col gap-2 p-4">
                      <div className="font-semibold text-lg">{r.type}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mb-2">{r.description}</div>
                      <div className="flex flex-col gap-1 text-sm">
                        <span>State: {r.state}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">Created: {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</span>
                      </div>
                      <div className="mt-2">
                        <Link href={`/event/${selectedEventSlug}/report/${r.id}`} className="text-blue-500 dark:text-blue-400 underline">View Report</Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            {/* Table view for desktop */}
            <div className="hidden sm:block">
              <Table>
                <thead>
                  <tr>
                    <th className="border border-gray-200 dark:border-gray-700 p-2">Type</th>
                    <th className="border border-gray-200 dark:border-gray-700 p-2">Description</th>
                    <th className="border border-gray-200 dark:border-gray-700 p-2">State</th>
                    <th className="border border-gray-200 dark:border-gray-700 p-2">Created At</th>
                    <th className="border border-gray-200 dark:border-gray-700 p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-4">No reports found.</td></tr>
                  ) : reports.map(r => (
                    <tr key={r.id}>
                      <td className="border border-gray-200 dark:border-gray-700 p-2">{r.type}</td>
                      <td className="border border-gray-200 dark:border-gray-700 p-2">{r.description}</td>
                      <td className="border border-gray-200 dark:border-gray-700 p-2">{r.state}</td>
                      <td className="border border-gray-200 dark:border-gray-700 p-2">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</td>
                      <td className="border border-gray-200 dark:border-gray-700 p-2">
                        <Link href={`/event/${selectedEventSlug}/report/${r.id}`} className="text-blue-700 dark:text-blue-400 hover:underline">View Report</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        ) : null}
      </Card>
    </div>
  );
} 