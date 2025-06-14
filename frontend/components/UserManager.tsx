import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "./ui/card";
import { Table } from "./Table";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface User {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  role?: string;
}

interface EditUserForm {
  name: string;
  email: string;
  role: string;
}

interface UserManagerProps {
  eventSlug: string;
  rolesList: string[];
}

export function UserManager({ eventSlug, rolesList }: UserManagerProps) {
  const [eventUsers, setEventUsers] = useState<User[]>([]);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState<EditUserForm>({ name: "", email: "", role: "" });
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [sort, setSort] = useState("name");
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchEventUsers = () => {
    if (!eventSlug) return;
    let url = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/events/slug/${eventSlug}/users?sort=${sort}&order=${order}&page=${page}&limit=${limit}`;
    if (debouncedSearch.trim() !== "") url += `&search=${encodeURIComponent(debouncedSearch)}`;
    if (roleFilter && roleFilter !== "All") url += `&role=${encodeURIComponent(roleFilter)}`;
    fetch(url, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : { users: [], total: 0 }))
      .then((data) => {
        setEventUsers(data.users || []);
        setTotal(data.total || 0);
      })
      .catch(() => {
        setEventUsers([]);
        setTotal(0);
      });
  };

  useEffect(() => { fetchEventUsers(); }, [debouncedSearch, sort, order, page, limit, eventSlug, roleFilter]);
  useEffect(() => { setPage(1); }, [debouncedSearch, sort, order, limit]);
  useEffect(() => { setPage(1); }, [debouncedSearch, sort, order, limit, roleFilter]);

  const handleEdit = (eu: User) => {
    setEditUserId(eu.id);
    setEditUserForm({
      name: eu.name || "",
      email: eu.email || "",
      role: Array.isArray(eu.roles) ? eu.roles[0] : eu.role || "",
    });
    setEditError("");
    setEditSuccess("");
  };

  const handleEditChange = (field: keyof EditUserForm, value: string) => {
    setEditUserForm((f) => ({ ...f, [field]: value }));
  };

  const handleEditCancel = () => {
    setEditUserId(null);
    setEditUserForm({ name: "", email: "", role: "" });
    setEditError("");
    setEditSuccess("");
  };

  const handleEditSave = async () => {
    setEditError("");
    setEditSuccess("");
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/events/slug/${eventSlug}/users/${editUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(editUserForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error || "Failed to update user.");
        return;
      }
      setEditSuccess("User updated!");
      setEditUserId(null);
      fetchEventUsers();
    } catch {
      setEditError("Network error");
    }
  };

  const handleRemove = async (eu: User) => {
    if (!window.confirm(`Are you sure you want to remove all roles for ${eu.name || eu.email} from this event?`)) return;
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000") + `/events/slug/${eventSlug}/users/${eu.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        alert("Failed to remove user from event.");
        return;
      }
      fetchEventUsers();
    } catch {
      alert("Network error");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="mb-8">
      <h3 className="text-xl font-semibold mb-2">Event Users</h3>
      <div className="flex flex-wrap gap-2 mb-2">
        <Input placeholder="Search users..." value={search} onChange={e => setSearch(e.target.value)} className="w-64" />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border rounded px-2 py-1">
          <option value="All">All Roles</option>
          {rolesList.map(role => <option key={role} value={role}>{role}</option>)}
        </select>
        <select value={sort} onChange={e => setSort(e.target.value)} className="border rounded px-2 py-1">
          <option value="name">Sort by Name</option>
          <option value="email">Sort by Email</option>
          <option value="role">Sort by Role</option>
        </select>
        <Button onClick={() => setOrder(o => o === "asc" ? "desc" : "asc")} className="border px-2 py-1 rounded bg-transparent shadow-none" title="Toggle sort order">{order === "asc" ? "⬆️" : "⬇️"}</Button>
      </div>
      {/* Table view for sm and up */}
      <div className="hidden sm:block">
        <Table>
          <thead>
            <tr>
              <th className="border border-gray-200 dark:border-gray-700 p-2">Name</th>
              <th className="border border-gray-200 dark:border-gray-700 p-2">Role</th>
              <th className="border border-gray-200 dark:border-gray-700 p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {eventUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="text-center p-4">No users found for this event.</td>
              </tr>
            ) : (
              eventUsers.map((eu, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">
                    {editUserId === eu.id ? (
                      <Input type="text" value={editUserForm.name} onChange={e => handleEditChange("name", e.target.value)} />
                    ) : (
                      eu.name || eu.email || "Unknown"
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400">{eu.email}</div>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">
                    {editUserId === eu.id ? (
                      <select value={editUserForm.role} onChange={e => handleEditChange("role", e.target.value)} className="border rounded px-2 py-1 w-full">
                        {rolesList.map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                    ) : Array.isArray(eu.roles) ? (
                      eu.roles.join(", ")
                    ) : (
                      eu.role || "Unknown"
                    )}
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">
                    <div className="flex flex-wrap gap-2">
                      {editUserId === eu.id ? (
                        <>
                          <Input type="email" value={editUserForm.email} onChange={e => handleEditChange("email", e.target.value)} placeholder="Email" />
                          <Button onClick={handleEditSave} className="bg-blue-600 text-white">Save</Button>
                          <Button onClick={handleEditCancel} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Cancel</Button>
                          {editError && <span className="text-red-600 dark:text-red-400 ml-2">{editError}</span>}
                          {editSuccess && <span className="text-green-600 dark:text-green-400 ml-2">{editSuccess}</span>}
                        </>
                      ) : (
                        <>
                          <Link href={`/events/${eventSlug}/team/${eu.id}`}><Button className="bg-blue-600 text-white">View</Button></Link>
                          <Link href={`/events/${eventSlug}/reports?user=${eu.id}`}><Button className="bg-purple-600 text-white">User&apos;s Reports</Button></Link>
                          <Button onClick={() => handleEdit(eu)} className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white">Edit</Button>
                          <Button onClick={() => handleRemove(eu)} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white">Remove</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </div>
      {/* Card view for mobile only */}
      <div className="block sm:hidden">
        <div className="grid grid-cols-1 gap-6 mt-4">
          {eventUsers.length === 0 ? (
            <div className="col-span-full text-center p-4">No users found for this event.</div>
          ) : (
            eventUsers.map((eu, idx) => (
              <Card key={idx} className="flex flex-col gap-2">
                <div className="flex flex-col gap-1 mb-2">
                  <span className="font-semibold text-lg">{editUserId === eu.id ? <Input type="text" value={editUserForm.name} onChange={e => handleEditChange("name", e.target.value)} /> : eu.name || eu.email || "Unknown"}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{eu.email}</span>
                  <span className="text-sm">Role: {editUserId === eu.id ? <select value={editUserForm.role} onChange={e => handleEditChange("role", e.target.value)} className="border rounded px-2 py-1 w-full">{rolesList.map(role => <option key={role} value={role}>{role}</option>)}</select> : Array.isArray(eu.roles) ? eu.roles.join(", ") : eu.role || "Unknown"}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editUserId === eu.id ? (
                    <>
                      <Input type="email" value={editUserForm.email} onChange={e => handleEditChange("email", e.target.value)} placeholder="Email" />
                      <Button onClick={handleEditSave} className="bg-blue-600 text-white">Save</Button>
                      <Button onClick={handleEditCancel} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Cancel</Button>
                      {editError && <span className="text-red-600 dark:text-red-400 ml-2">{editError}</span>}
                      {editSuccess && <span className="text-green-600 dark:text-green-400 ml-2">{editSuccess}</span>}
                    </>
                  ) : (
                    <>
                      <Link href={`/events/${eventSlug}/team/${eu.id}`}><Button className="bg-blue-600 text-white">View</Button></Link>
                      <Link href={`/events/${eventSlug}/reports?user=${eu.id}`}><Button className="bg-purple-600 text-white">User&apos;s Reports</Button></Link>
                      <Button onClick={() => handleEdit(eu)} className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white">Edit</Button>
                      <Button onClick={() => handleRemove(eu)} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white">Remove</Button>
                    </>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-2">
        <div className="flex gap-2 items-center">
          <Button className="sm:px-2 sm:py-1 sm:text-sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Prev</Button>
          <span>Page {page} of {totalPages}</span>
          <Button className="sm:px-2 sm:py-1 sm:text-sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</Button>
        </div>
        <div className="flex gap-2 items-center">
          <label className="text-sm">Users per page:</label>
          <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="border px-2 py-1 rounded dark:bg-gray-800 dark:text-gray-100 sm:px-2 sm:py-1 sm:text-sm">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default UserManager; 