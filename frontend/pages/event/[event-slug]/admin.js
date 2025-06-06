import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';

export default function EventAdminPage() {
  const router = useRouter();
  const { 'event-slug': eventSlug } = router.query;
  const [event, setEvent] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventUsers, setEventUsers] = useState([]);
  const [editUserId, setEditUserId] = useState(null);
  const [editUserForm, setEditUserForm] = useState({ name: '', email: '', role: '' });
  const [rolesList, setRolesList] = useState(['Admin', 'Responder', 'Reporter']);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState('');
  const [inviteLinks, setInviteLinks] = useState([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [newInvite, setNewInvite] = useState({ maxUses: '', expiresAt: '', note: '' });
  const inviteUrlRef = useRef(null);

  // New state for search and sort
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState('All');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch users for this event (with search/sort/pagination)
  const fetchEventUsers = () => {
    if (!eventSlug) return;
    setLoading(true);
    let url = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/users?sort=${sort}&order=${order}&page=${page}&limit=${limit}`;
    if (debouncedSearch.trim() !== '') url += `&search=${encodeURIComponent(debouncedSearch)}`;
    if (roleFilter && roleFilter !== 'All') url += `&role=${encodeURIComponent(roleFilter)}`;
    fetch(url, { credentials: 'include' })
      .then(res => res.ok ? res.json() : { users: [], total: 0 })
      .then(data => {
        setEventUsers(data.users || []);
        setTotal(data.total || 0);
      })
      .catch(() => {
        setEventUsers([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!eventSlug) return;
    setLoading(true);
    // Fetch event details
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/event/slug/${eventSlug}`)
      .then(res => {
        if (!res.ok) throw new Error('Event not found');
        return res.json();
      })
      .then(data => setEvent(data.event))
      .catch(() => setError('Event not found'));
    // Fetch user session
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/session', {
      credentials: 'include',
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data ? data.user : null))
      .catch(() => setUser(null));
    fetchEventUsers();
    fetchInvites();
    setLoading(false);
  }, [eventSlug]);

  // Refetch users when debouncedSearch/sort/order/page/limit/roleFilter changes
  useEffect(() => {
    fetchEventUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sort, order, page, limit, eventSlug, roleFilter]);

  // Reset to page 1 when search, sort, or limit changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, order, limit]);

  // Reset to page 1 when roleFilter changes
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, sort, order, limit, roleFilter]);

  function hasRole(role) {
    if (!user || !user.roles) return false;
    return user.roles.includes(role);
  }

  const handleEdit = (eu) => {
    setEditUserId(eu.id);
    setEditUserForm({
      name: eu.name || '',
      email: eu.email || '',
      role: Array.isArray(eu.roles) ? eu.roles[0] : (eu.role || ''),
    });
    setEditError('');
    setEditSuccess('');
  };

  const handleEditChange = (field, value) => {
    setEditUserForm(f => ({ ...f, [field]: value }));
  };

  const handleEditCancel = () => {
    setEditUserId(null);
    setEditUserForm({ name: '', email: '', role: '' });
    setEditError('');
    setEditSuccess('');
  };

  const handleEditSave = async () => {
    setEditError('');
    setEditSuccess('');
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/users/${editUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(editUserForm),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error || 'Failed to update user.');
        return;
      }
      setEditSuccess('User updated!');
      setEditUserId(null);
      // Refresh users
      fetchEventUsers();
    } catch (err) {
      setEditError('Network error');
    }
  };

  const handleRemove = async (eu) => {
    if (!window.confirm(`Are you sure you want to remove all roles for ${eu.name || eu.email} from this event?`)) return;
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/users/${eu.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        alert('Failed to remove user from event.');
        return;
      }
      // Refresh users
      fetchEventUsers();
    } catch (err) {
      alert('Network error');
    }
  };

  // Fetch invite links
  const fetchInvites = async () => {
    setInviteLoading(true);
    setInviteError('');
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/invites`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch invites');
      const data = await res.json();
      setInviteLinks(data.invites || []);
    } catch (err) {
      setInviteError('Failed to fetch invite links');
    }
    setInviteLoading(false);
  };

  // Create invite link
  const handleCreateInvite = async (e) => {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInviteLoading(true);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/invites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          maxUses: newInvite.maxUses || undefined,
          expiresAt: newInvite.expiresAt || undefined,
          note: newInvite.note || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to create invite');
      setInviteSuccess('Invite link created!');
      setNewInvite({ maxUses: '', expiresAt: '', note: '' });
      fetchInvites();
    } catch (err) {
      setInviteError('Failed to create invite link');
    }
    setInviteLoading(false);
  };

  // Disable invite link
  const handleDisableInvite = async (inviteId) => {
    if (!window.confirm('Are you sure you want to disable this invite link?')) return;
    setInviteLoading(true);
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/invites/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ disabled: true }),
      });
      if (!res.ok) throw new Error('Failed to disable invite');
      fetchInvites();
    } catch (err) {
      setInviteError('Failed to disable invite link');
    }
    setInviteLoading(false);
  };

  // Copy invite URL
  const handleCopyInviteUrl = (url) => {
    navigator.clipboard.writeText(url);
    alert('Invite link copied to clipboard!');
  };

  // Calculate total pages
  const totalPages = Math.max(1, Math.ceil(total / limit));

  if (error) return <div style={{ padding: 40 }}><h2>{error}</h2></div>;
  if (loading || !event) return <div style={{ padding: 40 }}><h2>Loading event admin page...</h2></div>;

  const isSuperAdmin = hasRole('SuperAdmin');
  const isEventAdmin = hasRole('Admin');

  if (!isSuperAdmin && !isEventAdmin) {
    return <div style={{ padding: 40 }}><h2>you do not have rights to this page</h2></div>;
  }

  return (
    <div style={{ padding: 40 }}>
      <h2>this is the admin page for {event && event.name}</h2>
      <div className="mt-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
          <div className="flex gap-2 items-center">
            <div className="relative">
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="border px-2 py-1 rounded pr-8"
                style={{ minWidth: 180 }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 px-1"
                  title="Clear search"
                  tabIndex={0}
                >
                  ×
                </button>
              )}
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border px-2 py-1 rounded">
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Responder">Responder</option>
              <option value="Reporter">Reporter</option>
            </select>
            <select value={sort} onChange={e => setSort(e.target.value)} className="border px-2 py-1 rounded">
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="role">Sort by Role</option>
            </select>
            <button
              onClick={() => setOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
              className="border px-2 py-1 rounded"
              title="Toggle sort order"
            >
              {order === 'asc' ? '⬆️' : '⬇️'}
            </button>
          </div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Add New User</button>
        </div>
        <table className="min-w-full border border-gray-200">
          <thead>
            <tr>
              <th className="border border-gray-200 p-2">Name</th>
              <th className="border border-gray-200 p-2">Role</th>
              <th className="border border-gray-200 p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {eventUsers.length === 0 ? (
              <tr><td colSpan={3} className="text-center p-4">No users found for this event.</td></tr>
            ) : eventUsers.map((eu, idx) => (
              <tr key={idx}>
                <td className="border border-gray-200 p-2">
                  {editUserId === eu.id ? (
                    <input type="text" value={editUserForm.name} onChange={e => handleEditChange('name', e.target.value)} className="border px-2 py-1 rounded w-full" />
                  ) : (eu.name || eu.email || 'Unknown')}
                </td>
                <td className="border border-gray-200 p-2">
                  {editUserId === eu.id ? (
                    <select value={editUserForm.role} onChange={e => handleEditChange('role', e.target.value)} className="border px-2 py-1 rounded w-full">
                      {rolesList.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  ) : (Array.isArray(eu.roles) ? eu.roles.join(', ') : (eu.role || 'Unknown'))}
                </td>
                <td className="border border-gray-200 p-2">
                  <div className="flex gap-2">
                    {editUserId === eu.id ? (
                      <>
                        <input type="email" value={editUserForm.email} onChange={e => handleEditChange('email', e.target.value)} className="border px-2 py-1 rounded w-full" placeholder="Email" />
                        <button onClick={handleEditSave} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">Save</button>
                        <button onClick={handleEditCancel} className="bg-gray-300 text-gray-800 px-3 py-1 rounded hover:bg-gray-400">Cancel</button>
                        {editError && <span className="text-red-600 ml-2">{editError}</span>}
                        {editSuccess && <span className="text-green-600 ml-2">{editSuccess}</span>}
                      </>
                    ) : (
                      <>
                        <Link href={`/event/${eventSlug}/admin/user/${eu.id}`} className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">View</Link>
                        <Link href={`/event/${eventSlug}/admin/user/${eu.id}/reports`} className="bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700">User's Reports</Link>
                        <button onClick={() => handleEdit(eu)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">Edit</button>
                        <button onClick={() => handleRemove(eu)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Remove</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-2">
          <div className="flex gap-2 items-center">
            <button
              className="border px-2 py-1 rounded disabled:opacity-50"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >Prev</button>
            <span>Page {page} of {totalPages}</span>
            <button
              className="border px-2 py-1 rounded disabled:opacity-50"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >Next</button>
          </div>
          <div className="flex gap-2 items-center">
            <label className="text-sm">Users per page:</label>
            <select value={limit} onChange={e => setLimit(Number(e.target.value))} className="border px-2 py-1 rounded">
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </div>
      <div className="mt-12">
        <h3 className="text-xl font-semibold mb-2">Invite Links</h3>
        <form onSubmit={handleCreateInvite} className="flex flex-wrap gap-2 items-end mb-4">
          <div>
            <label className="block text-sm font-medium">Max Uses
              <input type="number" min="1" value={newInvite.maxUses} onChange={e => setNewInvite(f => ({ ...f, maxUses: e.target.value }))} className="border px-2 py-1 rounded w-24" />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium">Expires At
              <input type="datetime-local" value={newInvite.expiresAt} onChange={e => setNewInvite(f => ({ ...f, expiresAt: e.target.value }))} className="border px-2 py-1 rounded" />
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium">Note
              <input type="text" value={newInvite.note} onChange={e => setNewInvite(f => ({ ...f, note: e.target.value }))} className="border px-2 py-1 rounded w-48" />
            </label>
          </div>
          <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Create Invite</button>
        </form>
        {inviteError && <div className="text-red-600 mb-2">{inviteError}</div>}
        {inviteSuccess && <div className="text-green-600 mb-2">{inviteSuccess}</div>}
        {inviteLoading ? <div>Loading...</div> : (
          <table className="min-w-full border border-gray-200">
            <thead>
              <tr>
                <th className="border border-gray-200 p-2">Invite Link</th>
                <th className="border border-gray-200 p-2">Status</th>
                <th className="border border-gray-200 p-2">Uses</th>
                <th className="border border-gray-200 p-2">Expires</th>
                <th className="border border-gray-200 p-2">Note</th>
                <th className="border border-gray-200 p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inviteLinks.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-4">No invite links found.</td></tr>
              ) : inviteLinks.map(invite => (
                <tr key={invite.id}>
                  <td className="border border-gray-200 p-2">
                    <input type="text" readOnly value={invite.url} className="border px-2 py-1 rounded w-full" onFocus={e => e.target.select()} />
                    <button onClick={() => handleCopyInviteUrl(invite.url)} className="ml-2 bg-gray-200 px-2 py-1 rounded hover:bg-gray-300">Copy</button>
                  </td>
                  <td className="border border-gray-200 p-2">{invite.disabled ? 'Disabled' : 'Active'}</td>
                  <td className="border border-gray-200 p-2">{invite.useCount}{invite.maxUses ? ` / ${invite.maxUses}` : ''}</td>
                  <td className="border border-gray-200 p-2">{invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : '—'}</td>
                  <td className="border border-gray-200 p-2">{invite.note || '—'}</td>
                  <td className="border border-gray-200 p-2">
                    {!invite.disabled && <button onClick={() => handleDisableInvite(invite.id)} className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700">Disable</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
} 