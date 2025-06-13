import React, { useEffect, useState, useContext } from "react";
import { UserContext } from "../pages/_app";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface TeamMember {
  id: string;
  name?: string;
  email?: string;
  avatarUrl?: string;
}

export interface CoCTeamListProps {
  eventSlug: string;
  showTitle?: boolean;
}

export const CoCTeamList: React.FC<CoCTeamListProps> = ({ eventSlug, showTitle = true }) => {
  const { user } = useContext(UserContext);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!eventSlug || !user) return;
    setLoading(true);
    setError("");
    fetch(
      (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
        `/events/slug/${eventSlug}/users?role=Responder`,
      { credentials: "include" },
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(res)))
      .then((data) => {
        fetch(
          (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") +
            `/events/slug/${eventSlug}/users?role=Admin`,
          { credentials: "include" },
        )
          .then((res2) => (res2.ok ? res2.json() : Promise.reject(res2)))
          .then((data2) => {
            const all = [...(data.users || []), ...(data2.users || [])];
            const deduped = Object.values(
              all
                .filter((u) => u && u.id)
                .reduce((acc: { [id: string]: TeamMember }, u: TeamMember) => {
                  acc[u.id] = u;
                  return acc;
                }, {} as { [id: string]: TeamMember })
            ) as TeamMember[];
            setTeam(deduped);
            setLoading(false);
          })
          .catch(() => {
            setError("Failed to load Code of Conduct Team.");
            setLoading(false);
          });
      })
      .catch(() => {
        setError("Failed to load Code of Conduct Team.");
        setLoading(false);
      });
  }, [eventSlug, user]);

  if (!user) return null;

  return (
    <div className="mt-6">
      {showTitle && (
        <h3 className="text-lg font-semibold mb-2">Code of Conduct Team</h3>
      )}
      {loading ? (
        <div className="text-gray-500">Loading team...</div>
      ) : error ? (
        <div className="text-red-500">{error}</div>
      ) : team.length === 0 ? (
        <div className="text-gray-500 italic">
          No responders or admins assigned to this event.
        </div>
      ) : (
        <ul className="list-disc pl-6">
          {team.map((member) => (
            <li key={member.id} className="mb-1 flex items-center">
              {(() => {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                let avatarSrc: string | undefined = undefined;
                if (member.avatarUrl) {
                  avatarSrc = member.avatarUrl.startsWith("/")
                    ? apiUrl + member.avatarUrl
                    : member.avatarUrl;
                }
                return (
                  <Avatar className="mr-2" style={{ width: 32, height: 32 }}>
                    <AvatarImage src={avatarSrc} alt={member.name || member.email || "User avatar"} />
                    <AvatarFallback>
                      {member.name
                        ? member.name.split(" ").map(n => n[0]).join("").toUpperCase()
                        : member.email
                          ? member.email[0].toUpperCase()
                          : "U"}
                    </AvatarFallback>
                  </Avatar>
                );
              })()}
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
}; 