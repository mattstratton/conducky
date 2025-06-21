import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardIcon } from "@heroicons/react/24/outline";

interface OrganizationInvite {
  id: string;
  url: string;
  role: string;
  disabled: boolean;
  useCount: number;
  maxUses?: number;
  expiresAt?: string;
  note?: string;
}

interface OrganizationInviteForm {
  maxUses: string;
  expiresAt: string;
  note: string;
  role: string;
}

interface OrganizationInviteManagerProps {
  organizationId: string;
  rolesList: string[];
}

export function OrganizationInviteManager({ organizationId, rolesList }: OrganizationInviteManagerProps) {
  const [inviteLinks, setInviteLinks] = useState<OrganizationInvite[]>([]);
  const [newInvite, setNewInvite] = useState<OrganizationInviteForm>({ 
    maxUses: "", 
    expiresAt: "", 
    note: "", 
    role: rolesList[0] || "org_viewer" 
  });
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const fetchInvites = async () => {
    setInviteLoading(true);
    setInviteError("");
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/organizations/${organizationId}/invites`, 
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Failed to fetch invites");
      const data = await res.json();
      setInviteLinks(data.invites || []);
    } catch {
      setInviteError("Failed to fetch invite links");
    }
    setInviteLoading(false);
  };

  useEffect(() => { 
    fetchInvites(); 
  }, [organizationId]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviteLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/organizations/${organizationId}/invites`, 
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            maxUses: newInvite.maxUses || undefined,
            expiresAt: newInvite.expiresAt || undefined,
            note: newInvite.note || undefined,
            role: newInvite.role || "org_viewer",
          }),
        }
      );
      if (!res.ok) throw new Error("Failed to create invite");
      setInviteSuccess("Invite link created!");
      setNewInvite({ 
        maxUses: "", 
        expiresAt: "", 
        note: "", 
        role: rolesList[0] || "org_viewer" 
      });
      fetchInvites();
    } catch {
      setInviteError("Failed to create invite link");
    }
    setInviteLoading(false);
  };

  const handleDisableInvite = async (inviteId: string) => {
    if (!window.confirm("Are you sure you want to disable this invite link?")) return;
    setInviteLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/organizations/${organizationId}/invites/${inviteId}`, 
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ disabled: true }),
        }
      );
      if (!res.ok) throw new Error("Failed to disable invite");
      fetchInvites();
    } catch {
      setInviteError("Failed to disable invite link");
    }
    setInviteLoading(false);
  };

  const handleCopyInviteUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    alert("Invite link copied to clipboard!");
  };

  const formatRoleName = (role: string) => {
    switch (role) {
      case 'org_admin':
        return 'Organization Admin';
      case 'org_viewer':
        return 'Organization Viewer';
      default:
        return role;
    }
  };

  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-2">Invite Links</h3>
      <form onSubmit={handleCreateInvite} className="flex flex-wrap gap-2 mb-4 items-center">
        <Input
          type="number"
          min="1"
          placeholder="Max Uses"
          value={newInvite.maxUses}
          onChange={e => setNewInvite(inv => ({ ...inv, maxUses: e.target.value }))}
          className="w-28"
        />
        <Input
          type="date"
          placeholder="Expires At"
          value={newInvite.expiresAt}
          onChange={e => setNewInvite(inv => ({ ...inv, expiresAt: e.target.value }))}
          className="w-40"
        />
        <Input
          type="text"
          placeholder="Note (optional)"
          value={newInvite.note}
          onChange={e => setNewInvite(inv => ({ ...inv, note: e.target.value }))}
          className="w-40"
        />
        <select
          value={newInvite.role}
          onChange={e => setNewInvite(inv => ({ ...inv, role: e.target.value }))}
          className="border px-2 py-1 rounded dark:bg-gray-800 dark:text-gray-100 sm:px-2 sm:py-1 sm:text-sm"
        >
          {rolesList.map(role => (
            <option key={role} value={role}>{formatRoleName(role)}</option>
          ))}
        </select>
        <Button 
          type="submit" 
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 sm:px-3 sm:py-1.5 sm:text-sm" 
          disabled={inviteLoading}
        >
          Create Invite
        </Button>
      </form>
      {inviteError && <div className="text-red-600 mb-2">{inviteError}</div>}
      {inviteSuccess && <div className="text-green-600 mb-2">{inviteSuccess}</div>}
      {inviteLoading ? (
        <div>Loading...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invite Link</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Note</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inviteLinks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center p-4">No invite links found.</TableCell>
              </TableRow>
            ) : (
              inviteLinks.map(invite => (
                <TableRow key={invite.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        readOnly
                        value={invite.url}
                        className="w-full sm:w-96"
                        onFocus={e => e.target.select()}
                      />
                      <Button 
                        onClick={() => handleCopyInviteUrl(invite.url)} 
                        className="p-0 h-10 w-10 flex items-center justify-center rounded" 
                        title="Copy invite link" 
                        aria-label="Copy invite link"
                      >
                        <ClipboardIcon className="w-5 h-5" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{formatRoleName(invite.role)}</TableCell>
                  <TableCell>{invite.disabled ? "Disabled" : "Active"}</TableCell>
                  <TableCell>{invite.useCount}/{invite.maxUses || "∞"}</TableCell>
                  <TableCell>{invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : "—"}</TableCell>
                  <TableCell>{invite.note || "—"}</TableCell>
                  <TableCell>
                    {!invite.disabled && (
                      <Button 
                        onClick={() => handleDisableInvite(invite.id)} 
                        className="bg-red-600 text-white sm:px-2 sm:py-1 sm:text-sm"
                      >
                        Disable
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
} 