import React from "react";
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from "../../../../components/ui/card";
import { Table } from '../../../../components/Table';

interface User {
  id: string;
  name?: string;
  email?: string;
}

interface EvidenceFile {
  id: string;
  filename: string;
}

interface Report {
  id: string;
  title: string;
  type: string;
  state: string;
  createdAt: string;
  reporter: User | null;
  assignedResponder: User | null;
  severity: string | null;
  evidenceFiles: EvidenceFile[];
}

export default function AdminReportsList() {
  const router = useRouter();
  const { 'event-slug': eventSlug } = router.query;
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!eventSlug) return;
    setLoading(true);
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports`, {
      credentials: 'include',
    })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => setReports(data.reports || []))
      .catch(() => setError('Failed to load reports.'))
      .finally(() => setLoading(false));
  }, [eventSlug]);

  return (
    <Card className="max-w-6xl mx-auto p-4 sm:p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6">Admin/Responder: Reports for Event</h2>
      {loading ? (
        <div className="text-gray-500 dark:text-gray-400">Loading reports...</div>
      ) : error ? (
        <div className="text-red-500 dark:text-red-400">{error}</div>
      ) : reports.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400">No reports found for this event.</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>State</th>
                <th>Created At</th>
                <th>Reporter</th>
                <th>Assigned Responder(s)</th>
                <th>Severity</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {reports.map(report => (
                <tr key={report.id} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                  <td>
                    <Link href={`/event/${eventSlug}/report/${report.id}`} className="text-blue-500 dark:text-blue-400 underline">
                      {report.title || <span className="italic text-gray-400">(untitled)</span>}
                    </Link>
                  </td>
                  <td>{report.type}</td>
                  <td>{report.state}</td>
                  <td>{new Date(report.createdAt).toLocaleString()}</td>
                  <td>{report.reporter ? (report.reporter.name || report.reporter.email || 'Anonymous') : 'Anonymous'}</td>
                  <td>{report.assignedResponder ? (report.assignedResponder.name || report.assignedResponder.email || 'Unknown') : <span className="text-gray-400 italic">(unassigned)</span>}</td>
                  <td>{report.severity ? report.severity.charAt(0).toUpperCase() + report.severity.slice(1) : <span className="text-gray-400 italic">(none)</span>}</td>
                  <td>{report.evidenceFiles ? report.evidenceFiles.length : 0}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
      {/* Placeholder for future filters/search/assignment controls */}
    </Card>
  );
} 