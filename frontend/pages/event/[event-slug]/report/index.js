import React, { useEffect, useState, useContext } from "react";
import { useRouter } from "next/router";
import { Card, Table } from "../../../../components";
import { UserContext } from "../../../_app";
import Link from "next/link";

export default function MyReportsPage() {
  const router = useRouter();
  const { "event-slug": eventSlug } = router.query;
  const { user } = useContext(UserContext);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventSlug || !user) return;
    setLoading(true);
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/events/slug/${eventSlug}/reports?userId=${user.id}`,
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
                <th>Type</th>
                <th>State</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-100 dark:hover:bg-gray-800">
                  <td>{report.type}</td>
                  <td>{report.state}</td>
                  <td>{new Date(report.createdAt).toLocaleString()}</td>
                  <td>
                    <Link href={`/event/${eventSlug}/report/${report.id}`} className="text-blue-500 dark:text-blue-400 underline">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </Card>
  );
} 