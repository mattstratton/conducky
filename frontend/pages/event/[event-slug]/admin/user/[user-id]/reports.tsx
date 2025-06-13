import React from "react";
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import Card from '../../../../../../components/Card';
import { Table } from '../../../../../../components/Table';

interface Report {
  id: string;
  title?: string;
  type: string;
  state: string;
  createdAt: string;
}

export default function UserReportsPage() {
  const router = useRouter();
  const { 'event-slug': eventSlug, 'user-id': userId } = router.query as { 'event-slug'?: string, 'user-id'?: string };
  const [reports, setReports] = useState<Report[]>([]);
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

  if (loading) return <div className="p-10"><h2>Loading reports...</h2></div>;
  if (error) return <div className="p-10"><h2>{error}</h2><Link href={`/event/${eventSlug}/admin/user/${userId}`} className="text-blue-600 dark:text-blue-400 hover:underline">Back to User Details</Link></div>;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200 flex items-center justify-center p-8">
      <Card className="max-w-3xl w-full">
        <h2 className="text-2xl font-bold mb-6">User's Reports</h2>
        {reports.length === 0 ? (
          <div>No reports found for this user in this event.</div>
        ) : (
          <Table className="mt-4">
            <thead>
              <tr>
                <th className="border border-gray-200 dark:border-gray-700 p-2">Title</th>
                <th className="border border-gray-200 dark:border-gray-700 p-2">Type</th>
                <th className="border border-gray-200 dark:border-gray-700 p-2">State</th>
                <th className="border border-gray-200 dark:border-gray-700 p-2">Created At</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id}>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">
                    <Link href={`/event/${eventSlug}/report/${report.id}`} className="text-blue-500 dark:text-blue-400 underline">
                      {report.title || <span className="italic text-gray-400">(untitled)</span>}
                    </Link>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">{report.type}</td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">{report.state}</td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">{new Date(report.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        <div className="mt-6">
          <Link href={`/event/${eventSlug}/admin/user/${userId}`}><Button className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200">Back to User Details</Button></Link>
        </div>
      </Card>
    </div>
  );
} 