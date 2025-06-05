import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const validStates = [
  'submitted',
  'acknowledged',
  'investigating',
  'resolved',
  'closed',
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
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/users`, { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.users && user) {
            const u = data.users.find(u => u.id === user.id);
            setUserRoles(u ? u.roles : []);
          }
        });
    }
  }, [eventSlug, user]);

  useEffect(() => {
    if (report && report.createdAt) {
      setCreatedAtLocal(new Date(report.createdAt).toLocaleString());
    }
    if (report && report.updatedAt) {
      setUpdatedAtLocal(new Date(report.updatedAt).toLocaleString());
    }
  }, [report && report.createdAt, report && report.updatedAt]);

  const isSuperAdmin = user && user.roles && user.roles.includes('SuperAdmin');
  const canChangeState = isSuperAdmin || userRoles.some(r => ['Responder', 'Admin', 'SuperAdmin'].includes(r));

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

  if (fetchError) {
    return <div>Error: {fetchError}</div>;
  }
  if (!report) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '2rem auto', padding: '2rem', border: '1px solid #ccc', borderRadius: 8 }}>
      <h2>Report Detail</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          <tr><td><b>ID</b></td><td>{report.id}</td></tr>
          <tr><td><b>Type</b></td><td>{report.type}</td></tr>
          <tr><td><b>Description</b></td><td>{report.description}</td></tr>
          <tr>
            <td><b>State</b></td>
            <td>
              {canChangeState ? (
                <>
                  <select value={report.state} onChange={handleStateChange} disabled={loading}>
                    {validStates.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  {stateChangeError && <span style={{ color: 'red', marginLeft: 8 }}>{stateChangeError}</span>}
                  {stateChangeSuccess && <span style={{ color: 'green', marginLeft: 8 }}>{stateChangeSuccess}</span>}
                </>
              ) : (
                report.state
              )}
            </td>
          </tr>
          <tr><td><b>Evidence</b></td><td>{report.evidence ? <a href={report.evidence} target="_blank" rel="noopener noreferrer">Download</a> : 'None'}</td></tr>
          <tr><td><b>Created At</b></td><td>{createdAtLocal || report.createdAt}</td></tr>
          <tr><td><b>Reporter</b></td><td>{report.reporter ? `${report.reporter.name || ''} (${report.reporter.email || 'Anonymous'})` : 'Anonymous'}</td></tr>
        </tbody>
      </table>
      <div style={{ marginTop: 24 }}>
        <button onClick={() => router.push(`/event/${eventSlug}`)}>Back to Event</button>
      </div>
    </div>
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