import React, { useState } from "react";
import { Card } from "../ui/card";

interface InviteInfo {
  invite: {
    code: string;
    note?: string;
    expiresAt?: string;
    useCount?: number;
    maxUses?: number;
    disabled?: boolean;
  };
  event?: {
    name?: string;
    slug?: string;
  };
}

/**
 * JoinEventWidget allows a logged-in user to join an event using an invite code or link.
 * Shows validation, error, and success states. On success, suggests refreshing the dashboard.
 * TODO: After joining, auto-link to the event dashboard (needs event slug from backend response).
 */
export function JoinEventWidget({ onJoin }: { onJoin?: () => void }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [eventSlug, setEventSlug] = useState<string | null>(null);

  // Extract invite code from input (code or full URL)
  function extractCode(val: string): string | null {
    const trimmed = val.trim();
    if (/^[a-zA-Z0-9]{6,}$/.test(trimmed)) return trimmed;
    const match = trimmed.match(/invite\/(\w{6,})/);
    return match ? match[1] : null;
  }

  async function handleCheckInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setInviteInfo(null);
    const code = extractCode(input);
    if (!code) {
      setError("Please enter a valid invite code or link.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/invites/${code}`);
      if (!res.ok) throw new Error("Invite not found or invalid.");
      const data = await res.json();
      setInviteInfo(data);
    } catch {
      setError("Invite not found or invalid.");
    }
    setLoading(false);
  }

  async function handleJoin() {
    if (!inviteInfo?.invite?.code) return;
    setLoading(true);
    setError("");
    setSuccess("");
    setEventSlug(null);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/invites/${inviteInfo.invite.code}/redeem`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to join event");
      }
      setSuccess("You have joined the event!");
      setEventSlug(data.eventSlug || null);
      setInviteInfo(null);
      setInput("");
      if (onJoin) onJoin();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join event");
    }
    setLoading(false);
  }

  return (
    <Card className="w-full max-w-md p-4 sm:p-6 mb-6">
      <h2 className="text-xl font-bold mb-2 text-center">Join an Event</h2>
      <form onSubmit={handleCheckInvite} className="flex flex-col gap-2 mb-2">
        <input
          type="text"
          className="border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-400"
          placeholder="Paste invite code or link"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          className="bg-blue-700 text-white rounded px-4 py-2 font-semibold hover:bg-blue-800 transition disabled:opacity-50"
          disabled={loading || !input.trim()}
        >
          {loading ? "Checking..." : "Check Invite"}
        </button>
      </form>
      {error && <div className="text-red-600 text-sm mb-2">{error}</div>}
      {inviteInfo && (
        <div className="mb-2 text-sm text-gray-700 dark:text-gray-200">
          <div><b>Event:</b> {inviteInfo.event?.name || "Unknown"}</div>
          <div><b>Role:</b> Reporter</div>
          <div><b>Note:</b> {inviteInfo.invite?.note || "—"}</div>
          <div><b>Expires:</b> {inviteInfo.invite?.expiresAt ? new Date(inviteInfo.invite.expiresAt).toLocaleString() : "—"}</div>
          <div><b>Uses:</b> {inviteInfo.invite?.useCount}{inviteInfo.invite?.maxUses ? ` / ${inviteInfo.invite.maxUses}` : ""}</div>
          <div><b>Status:</b> {inviteInfo.invite?.disabled ? "Disabled" : "Active"}</div>
          <button
            type="button"
            onClick={handleJoin}
            className="mt-2 bg-green-700 text-white rounded px-4 py-2 font-semibold hover:bg-green-800 transition disabled:opacity-50"
            disabled={loading || inviteInfo.invite?.disabled}
          >
            {loading ? "Joining..." : "Join Event"}
          </button>
        </div>
      )}
      {success && (
        <div className="text-green-700 font-semibold mt-2">
          {success}
          {eventSlug && (
            <div className="mt-4">
              <a href={`/events/${eventSlug}/dashboard`} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Go to Event</a>
            </div>
          )}
        </div>
      )}
    </Card>
  );
} 