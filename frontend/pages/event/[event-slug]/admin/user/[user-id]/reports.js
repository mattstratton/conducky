import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function UserReportsPage() {
  const router = useRouter();
  const { 'event-slug': eventSlug, 'user-id': userId } = router.query;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventSlug || !userId) return;
    setLoading(true);
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports?userId=${userId}`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : { reports: [] })
      .then(data => setReports(data.reports || []))
      .catch(() => setError('Failed to fetch reports.'))
      .finally(() => setLoading(false));
  }, [eventSlug, userId]);

  if (loading) return <div style={{ padding: 40 }}><h2>Loading reports...</h2></div>;
  if (error) return <div style={{ padding: 40 }}><h2>{error}</h2><Link href={`/event/${eventSlug}/admin/user/${userId}`} className="text-blue-600">Back to User Details</Link></div>;

  return (
    <div style={{ padding: 40 }}>
      <h2>User's Reports</h2>
      {reports.length === 0 ? (
        <div>No reports found for this user in this event.</div>
      ) : (
        <table className="min-w-full border border-gray-200 mt-4">
          <thead>
            <tr>
              <th className="border border-gray-200 p-2">Type</th>
              <th className="border border-gray-200 p-2">Description</th>
              <th className="border border-gray-200 p-2">State</th>
              <th className="border border-gray-200 p-2">Created At</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(report => (
              <tr key={report.id}>
                <td className="border border-gray-200 p-2">{report.type}</td>
                <td className="border border-gray-200 p-2">{report.description}</td>
                <td className="border border-gray-200 p-2">{report.state}</td>
                <td className="border border-gray-200 p-2">{new Date(report.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="mt-6">
        <Link href={`/event/${eventSlug}/admin/user/${userId}`} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Back to User Details</Link>
      </div>
    </div>
  );
} 