import React, { useState } from "react";
import Link from "next/link";
import { Card } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

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
    const match = trimmed.match(/invite\/([a-zA-Z0-9]{6,})/);
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
    <Card className="w-full h-fit p-6">
      <h2 className="text-xl font-bold mb-4 text-center text-foreground">Join an Event</h2>
      <form onSubmit={handleCheckInvite} className="space-y-3 mb-4">
        <Input
          type="text"
          placeholder="Paste invite code or link"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <Button
          type="submit"
          className="w-full"
          disabled={loading || !input.trim()}
        >
          {loading ? "Checking..." : "Check Invite"}
        </Button>
      </form>
      
      {error && (
        <div className="text-destructive text-sm mb-4 p-3 bg-destructive/10 rounded-md">
          {error}
        </div>
      )}
      
      {inviteInfo && (
        <div className="mb-4 p-4 bg-muted rounded-md">
          <div className="space-y-2 text-sm">
            <div><span className="font-medium">Event:</span> {inviteInfo.event?.name || "Unknown"}</div>
            <div><span className="font-medium">Role:</span> Reporter</div>
            <div><span className="font-medium">Note:</span> {inviteInfo.invite?.note || "—"}</div>
            <div><span className="font-medium">Expires:</span> {inviteInfo.invite?.expiresAt ? new Date(inviteInfo.invite.expiresAt).toLocaleString() : "—"}</div>
            <div><span className="font-medium">Uses:</span> {inviteInfo.invite?.useCount}{inviteInfo.invite?.maxUses ? ` / ${inviteInfo.invite.maxUses}` : ""}</div>
            <div><span className="font-medium">Status:</span> {inviteInfo.invite?.disabled ? "Disabled" : "Active"}</div>
          </div>
          <Button
            onClick={handleJoin}
            className="w-full mt-4"
            disabled={loading || inviteInfo.invite?.disabled}
            variant="default"
          >
            {loading ? "Joining..." : "Join Event"}
          </Button>
        </div>
      )}
      
      {success && (
        <div className="text-green-700 dark:text-green-400 font-semibold p-3 bg-green-100 dark:bg-green-900/20 rounded-md">
          {success}
          {eventSlug && (
            <div className="mt-3">
              <Button asChild className="w-full">
                <Link href={`/events/${eventSlug}/dashboard`}>Go to Event</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
} 