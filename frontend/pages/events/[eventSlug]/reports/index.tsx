import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/router";
import { Card } from "../../../../components/ui/card";
import { Table } from "../../../../components/Table";
import { UserContext } from "../../../_app";
import Link from "next/link";

interface Report {
  id: string;
  title: string;
  type: string;
  state: string;
  createdAt: string;
}

// Define UserContext type
interface UserContextType {
  user: {
    id: string;
    email?: string;
    name?: string;
  } | null;
}

export default function MyReportsPage() {
  const router = useRouter();
  const { eventSlug } = router.query;
  const { user } = useContext(UserContext) as UserContextType;
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!eventSlug || !user) return;
    setLoading(true);
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/api/events/slug/${eventSlug}/reports?userId=${user.id}`,
      { credentials: "include" }
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => setReports(data.reports || []))
      .catch(() => setError("Failed to load your reports."))
      .finally(() => setLoading(false));
  }, [eventSlug, user]);

  if (!user) {
    return (
      <Card className="max-w-3xl mx-auto p-4 sm:p-8 mt-8">
        <h2 className="text-2xl font-bold mb-6">My Reports</h2>
        <div className="text-gray-500 dark:text-gray-400">You must be logged in to view your reports.</div>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto p-4 sm:p-8 mt-8">
      <h2 className="text-2xl font-bold mb-6">My Reports</h2>
      {loading ? (
        <div className="text-gray-500 dark:text-gray-400">Loading your reports...</div>
      ) : error ? (
        <div className="text-red-500 dark:text-red-400">{error}</div>
      ) : reports.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400">You have not submitted any reports for this event.</div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <th>Title</th>
                <th>Type</th>
                <th>State</th>
                <th>Created At</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                  <td>
                    <Link href={`/events/${eventSlug}/reports/${report.id}`} className="text-blue-500 dark:text-blue-400 underline">
                      {report.title || <span className="italic text-gray-400">(untitled)</span>}
                    </Link>
                  </td>
                  <td>{report.type}</td>
                  <td>{report.state}</td>
                  <td>{new Date(report.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
} 