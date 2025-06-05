import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ModalContext } from '../context/ModalContext';

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
    <div className="font-sans p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p><Link href="/">Home</Link></p>
      {error && <p className="text-red-500">{error}</p>}
      {events.length > 0 && (
        <div className="mb-4">
          <label>
            Select Event:{' '}
            <select value={selectedEventSlug} onChange={e => setSelectedEventSlug(e.target.value)}>
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
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded shadow-sm font-semibold transition-colors disabled:opacity-60"
          disabled={!selectedEventSlug}
          onClick={() => {
            const selectedEvent = events.find(ev => ev.slug === selectedEventSlug);
            openModal(selectedEventSlug, selectedEvent ? selectedEvent.name : '');
          }}
        >
          Submit Report
        </button>
      </div>
      {/* Reports Table */}
      {selectedEventSlug && !loading ? (
        <table className="border-collapse border border-gray-200">
          <thead>
            <tr>
              <th className="border border-gray-200 p-2">Type</th>
              <th className="border border-gray-200 p-2">Description</th>
              <th className="border border-gray-200 p-2">State</th>
              <th className="border border-gray-200 p-2">Created At</th>
              <th className="border border-gray-200 p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr><td colSpan={5}>No reports found.</td></tr>
            ) : reports.map(r => (
              <tr key={r.id}>
                <td className="border border-gray-200 p-2">{r.type}</td>
                <td className="border border-gray-200 p-2">{r.description}</td>
                <td className="border border-gray-200 p-2">{r.state}</td>
                <td className="border border-gray-200 p-2">{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</td>
                <td className="border border-gray-200 p-2">
                  <Link href={`/event/${selectedEventSlug}/report/${r.id}`} className="text-blue-700 hover:underline">View Report</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
} 