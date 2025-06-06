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

  const isSuperAdmin = user && user.roles && user.roles.includes('Global Admin');
  const canChangeState = isSuperAdmin || userRoles.some(r => ['Responder', 'Admin', 'Global Admin'].includes(r));

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