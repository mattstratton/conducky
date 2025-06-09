import React, { useEffect, useState } from "react";

export default function CoCTeamList({ eventSlug, showTitle = true }) {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventSlug) return;
    setLoading(true);
    setError("");
    fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/events/slug/${eventSlug}/users?role=Responder`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/events/slug/${eventSlug}/users?role=Admin`, { credentials: 'include' })
          .then(res2 => res2.ok ? res2.json() : Promise.reject(res2))
          .then(data2 => {
            const all = [...(data.users || []), ...(data2.users || [])];
            const deduped = Object.values(all.reduce((acc, u) => {
              acc[u.id] = u;
              return acc;
            }, {}));
            setTeam(deduped);
            setLoading(false);
          })
          .catch(() => {
            setError('Failed to load Code of Conduct Team.');
            setLoading(false);
          });
      })
      .catch(() => {
        setError('Failed to load Code of Conduct Team.');
        setLoading(false);
      });
  }, [eventSlug]);

  return (
    <div className="mt-6">
      {showTitle && <h3 className="text-lg font-semibold mb-2">Code of Conduct Team</h3>}
      {loading ? (
        <div className="text-gray-500">Loading team...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : team.length === 0 ? (
        <div className="text-gray-500 italic">No responders or admins assigned to this event.</div>
      ) : (
        <ul className="list-disc pl-6">
          {team.map(member => (
            <li key={member.id} className="mb-1">
              <span className="font-medium">{member.name || member.email}</span>
              {member.name && member.email && (
                <span className="text-gray-500 ml-2">({member.email})</span>
              )}
              {!member.name && member.email && (
                <span className="text-gray-500 ml-2">{member.email}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 