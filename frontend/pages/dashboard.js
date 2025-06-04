import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    fetch('/api/session', {
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
    fetch('/api/events', {
      credentials: 'include',
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch events');
      })
      .then(data => {
        setEvents(data.events || []);
        if (data.events && data.events.length > 0) {
          setSelectedEventId(data.events[0].id);
        }
      })
      .catch(() => {
        setError('Could not load events');
      });
  }, [user]);

  useEffect(() => {
    if (!user || !selectedEventId) return;
    setLoading(true);
    fetch(`/api/events/${selectedEventId}/reports`, {
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
  }, [user, selectedEventId]);

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
      const res = await fetch(`/api/events/${selectedEventId}/reports`, {
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
        fetchReports(selectedEventId);
      } else {
        const data = await res.json();
        setSubmitError(data.error || 'Failed to submit report');
      }
    } catch (err) {
      setSubmitError('Network error');
    }
  };

  const fetchReports = (eventId) => {
    setLoading(true);
    fetch(`/api/events/${eventId}/reports`, {
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
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>Dashboard</h1>
      <p><Link href="/">Home</Link></p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {events.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <label>
            Select Event:{' '}
            <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}>
              {events.map(ev => (
                <option key={ev.id} value={ev.id}>{ev.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* Report Submission Form */}
      {selectedEventId && (
        <form onSubmit={handleReportSubmit} style={{ marginBottom: 32, maxWidth: 400 }}>
          <h2>Submit a Report</h2>
          <div style={{ marginBottom: 12 }}>
            <label>Type<br />
              <select value={type} onChange={e => setType(e.target.value)} required style={{ width: '100%' }}>
                <option value="">Select type</option>
                <option value="harassment">Harassment</option>
                <option value="safety">Safety</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Description<br />
              <textarea value={description} onChange={e => setDescription(e.target.value)} required style={{ width: '100%' }} />
            </label>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label>Evidence (optional)<br />
              <input type="file" onChange={e => setEvidence(e.target.files[0])} />
            </label>
          </div>
          {submitError && <div style={{ color: 'red', marginBottom: 12 }}>{submitError}</div>}
          {submitSuccess && <div style={{ color: 'green', marginBottom: 12 }}>{submitSuccess}</div>}
          <button type="submit">Submit Report</button>
        </form>
      )}

      {loading ? <p>Loading reports...</p> : (
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', marginTop: 20 }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Description</th>
              <th>State</th>
              <th>Created At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr><td colSpan={4}>No reports found.</td></tr>
            ) : reports.map(r => (
              <tr key={r.id}>
                <td>{r.type}</td>
                <td>{r.description}</td>
                <td>{r.state}</td>
                <td>{r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}</td>
                <td>
                  <a href={`/dashboard/report/${r.id}?eventId=${selectedEventId}`}>View</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
} 