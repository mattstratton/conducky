import React from "react";
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { Button, Input, Card, Table } from '../../../components';
import { ClipboardIcon, PencilIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';

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
  const [newInvite, setNewInvite] = useState({ maxUses: '', expiresAt: '', note: '', role: 'Reporter' });
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
  const [metaForm, setMetaForm] = useState({
    name: '',
    logo: '',
    startDate: '',
    endDate: '',
    website: '',
    description: '',
    codeOfConduct: '',
  });
  const [metaEditError, setMetaEditError] = useState('');
  const [metaEditSuccess, setMetaEditSuccess] = useState('');
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  // Logo upload state
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUploadLoading, setLogoUploadLoading] = useState(false);
  const [logoExists, setLogoExists] = useState(false);

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
      .catch(() => setError('Event not found'))
      .finally(() => setLoading(false));
    // Fetch user session
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/session', {
      credentials: 'include',
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data ? data.user : null))
      .catch(() => setUser(null));
    fetchEventUsers();
    fetchInvites();
    // Check if logo exists
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/logo`, { method: 'HEAD' })
      .then(res => setLogoExists(res.ok))
      .catch(() => setLogoExists(false));
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

  useEffect(() => {
    if (!eventSlug) return;
    // Check if logo exists
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/logo`, { method: 'HEAD' })
      .then(res => setLogoExists(res.ok))
      .catch(() => setLogoExists(false));
  }, [eventSlug, logoPreview]);

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
    setLogoFile(null);
    setLogoPreview(null);
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
          role: newInvite.role || 'Reporter',
        }),
      });
      if (!res.ok) throw new Error('Failed to create invite');
      setInviteSuccess('Invite link created!');
      setNewInvite({ maxUses: '', expiresAt: '', note: '', role: 'Reporter' });
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

  // Place after all hooks, before return
  const handleMetaChange = (field, value) => {
    setMetaForm(f => ({ ...f, [field]: value }));
  };

  const handleMetaSave = async () => {
    setMetaEditError('');
    setMetaEditSuccess('');
    let patchBody = {};
    if (editingField) {
      patchBody[editingField] = editValue;
    }
    // Special case: logo file upload
    if (editingField === 'logo' && logoFile) {
      setLogoUploadLoading(true);
      const formData = new FormData();
      formData.append('logo', logoFile);
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/logo`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMetaEditError(data.error || 'Failed to upload logo.');
          setLogoUploadLoading(false);
          return;
        }
        setMetaEditSuccess('Logo uploaded!');
        const data = await res.json();
        setEvent(data.event);
        setEditingField(null);
        setLogoUploadLoading(false);
        return;
      } catch (err) {
        setMetaEditError('Network error');
        setLogoUploadLoading(false);
        return;
      }
    }
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}` , {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patchBody),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMetaEditError(data.error || 'Failed to update event metadata.');
        return;
      }
      setMetaEditSuccess('Event metadata updated!');
      const data = await res.json();
      setEvent(data.event);
      setEditingField(null);
    } catch (err) {
      setMetaEditError('Network error');
    }
  };

  // Handler to start editing
  const startEdit = (field, value) => {
    setEditingField(field);
    setEditValue(value);
    if (field === 'logo') {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  // Handler to save event name
  const saveEdit = async () => {
    setMetaEditError('');
    setMetaEditSuccess('');
    let patchBody = {};
    if (editingField) {
      patchBody[editingField] = editValue;
    }
    // Special case: logo file upload
    if (editingField === 'logo' && logoFile) {
      setLogoUploadLoading(true);
      const formData = new FormData();
      formData.append('logo', logoFile);
      try {
        const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/logo`, {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setMetaEditError(data.error || 'Failed to upload logo.');
          setLogoUploadLoading(false);
          return;
        }
        setMetaEditSuccess('Logo uploaded!');
        const data = await res.json();
        setEvent(data.event);
        setEditingField(null);
        setLogoUploadLoading(false);
        return;
      } catch (err) {
        setMetaEditError('Network error');
        setLogoUploadLoading(false);
        return;
      }
    }
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}` , {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patchBody),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMetaEditError(data.error || 'Failed to update event metadata.');
        return;
      }
      setMetaEditSuccess('Event metadata updated!');
      const data = await res.json();
      setEvent(data.event);
      setEditingField(null);
    } catch (err) {
      setMetaEditError('Network error');
    }
  };

  // Handler to cancel editing
  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
    setLogoFile(null);
    setLogoPreview(null);
  };

  // Handle logo file selection
  const handleLogoFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    } else {
      setLogoFile(null);
      setLogoPreview(null);
    }
  };

  if (error) return <div style={{ padding: 40 }}><h2>{error}</h2></div>;
  if (loading || !event) return <div style={{ padding: 40 }}><h2>Loading event admin page...</h2></div>;

  const isSuperAdmin = hasRole('SuperAdmin');
  const isEventAdmin = hasRole('Admin');

  if (!isSuperAdmin && !isEventAdmin) {
    return <div style={{ padding: 40 }}><h2>you do not have rights to this page</h2></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200 p-4 sm:p-8">
      <Card className="w-full max-w-full sm:max-w-4xl lg:max-w-5xl mx-auto mb-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          Admin for
          {editingField === 'name' ? (
            <>
              <input
                type="text"
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                className="ml-2 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xl font-bold"
                style={{ minWidth: 120 }}
              />
              <button type="button" onClick={saveEdit} className="ml-2 text-green-600" aria-label="Save event name"><CheckIcon className="h-5 w-5" /></button>
              <button type="button" onClick={cancelEdit} className="ml-1 text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></button>
            </>
          ) : (
            <>
              <span className="ml-2">{event && event.name}</span>
              <button type="button" onClick={() => startEdit('name', event?.name || '')} className="ml-2 text-blue-600" aria-label="Edit event name"><PencilIcon className="h-5 w-5" /></button>
            </>
          )}
        </h2>
        <div className="space-y-4">
          {/* Logo URL */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Logo:</span>
            {(() => {
              const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
              let logoSrc = logoPreview || (logoExists ? `${backendBaseUrl}/events/slug/${eventSlug}/logo` : null);
              return logoSrc ? (
                <img src={logoSrc} alt="Event Logo" className="w-16 h-16 object-contain rounded bg-white border border-gray-200 dark:border-gray-700" />
              ) : null;
            })()}
            {editingField === 'logo' ? (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-200">Upload Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  className="block w-full text-xs text-gray-700 dark:text-gray-200"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">or</span>
                <input
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full text-xs"
                  placeholder="Logo URL"
                  disabled={!!logoFile}
                />
                <div className="flex gap-1 mt-2">
                  <button type="button" onClick={saveEdit} className="text-green-600" aria-label="Save logo" disabled={logoUploadLoading}><CheckIcon className="h-5 w-5" /></button>
                  <button type="button" onClick={cancelEdit} className="text-gray-500" aria-label="Cancel edit" disabled={logoUploadLoading}><XMarkIcon className="h-5 w-5" /></button>
                </div>
                {logoUploadLoading && <span className="text-xs text-gray-500 mt-1">Uploading...</span>}
              </div>
            ) : (
              <>
                <span className="ml-2 text-gray-700 dark:text-gray-200">{event?.logo || <span className="italic text-gray-400">(none)</span>}</span>
                <button type="button" onClick={() => startEdit('logo', event?.logo || '')} className="ml-2 text-blue-600" aria-label="Edit logo"><PencilIcon className="h-5 w-5" /></button>
              </>
            )}
          </div>
          {/* Start Date */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Start Date:</span>
            {editingField === 'startDate' ? (
              <>
                <input
                  type="date"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <button type="button" onClick={saveEdit} className="ml-2 text-green-600" aria-label="Save start date"><CheckIcon className="h-5 w-5" /></button>
                <button type="button" onClick={cancelEdit} className="ml-1 text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></button>
              </>
            ) : (
              <>
                <span className="ml-2 text-gray-700 dark:text-gray-200">{event?.startDate ? new Date(event.startDate).toLocaleDateString() : <span className="italic text-gray-400">(none)</span>}</span>
                <button type="button" onClick={() => startEdit('startDate', event?.startDate ? event.startDate.slice(0, 10) : '')} className="ml-2 text-blue-600" aria-label="Edit start date"><PencilIcon className="h-5 w-5" /></button>
              </>
            )}
          </div>
          {/* End Date */}
          <div className="flex items-center gap-2">
            <span className="font-medium">End Date:</span>
            {editingField === 'endDate' ? (
              <>
                <input
                  type="date"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
                <button type="button" onClick={saveEdit} className="ml-2 text-green-600" aria-label="Save end date"><CheckIcon className="h-5 w-5" /></button>
                <button type="button" onClick={cancelEdit} className="ml-1 text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></button>
              </>
            ) : (
              <>
                <span className="ml-2 text-gray-700 dark:text-gray-200">{event?.endDate ? new Date(event.endDate).toLocaleDateString() : <span className="italic text-gray-400">(none)</span>}</span>
                <button type="button" onClick={() => startEdit('endDate', event?.endDate ? event.endDate.slice(0, 10) : '')} className="ml-2 text-blue-600" aria-label="Edit end date"><PencilIcon className="h-5 w-5" /></button>
              </>
            )}
          </div>
          {/* Website */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Website:</span>
            {editingField === 'website' ? (
              <>
                <input
                  type="text"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  style={{ minWidth: 180 }}
                />
                <button type="button" onClick={saveEdit} className="ml-2 text-green-600" aria-label="Save website"><CheckIcon className="h-5 w-5" /></button>
                <button type="button" onClick={cancelEdit} className="ml-1 text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></button>
              </>
            ) : (
              <>
                <span className="ml-2 text-gray-700 dark:text-gray-200">{event?.website || <span className="italic text-gray-400">(none)</span>}</span>
                <button type="button" onClick={() => startEdit('website', event?.website || '')} className="ml-2 text-blue-600" aria-label="Edit website"><PencilIcon className="h-5 w-5" /></button>
              </>
            )}
          </div>
          {/* Description */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Description:</span>
            {editingField === 'description' ? (
              <>
                <textarea
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full min-h-[60px]"
                  style={{ minWidth: 180 }}
                />
                <button type="button" onClick={saveEdit} className="ml-2 text-green-600" aria-label="Save description"><CheckIcon className="h-5 w-5" /></button>
                <button type="button" onClick={cancelEdit} className="ml-1 text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></button>
              </>
            ) : (
              <>
                <span className="ml-2 text-gray-700 dark:text-gray-200">{event?.description || <span className="italic text-gray-400">(none)</span>}</span>
                <button type="button" onClick={() => startEdit('description', event?.description || '')} className="ml-2 text-blue-600" aria-label="Edit description"><PencilIcon className="h-5 w-5" /></button>
              </>
            )}
          </div>
          {/* Code of Conduct (Markdown) */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Code of Conduct:</span>
            {editingField === 'codeOfConduct' ? (
              <>
                <textarea
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full min-h-[100px] font-mono"
                  style={{ minWidth: 180 }}
                  placeholder="Enter code of conduct in markdown..."
                />
                <button type="button" onClick={saveEdit} className="ml-2 text-green-600" aria-label="Save code of conduct"><CheckIcon className="h-5 w-5" /></button>
                <button type="button" onClick={cancelEdit} className="ml-1 text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></button>
              </>
            ) : (
              <>
                <span className="ml-2 text-gray-700 dark:text-gray-200 whitespace-pre-line">{event?.codeOfConduct || <span className="italic text-gray-400">(none)</span>}</span>
                <button type="button" onClick={() => startEdit('codeOfConduct', event?.codeOfConduct || '')} className="ml-2 text-blue-600" aria-label="Edit code of conduct"><PencilIcon className="h-5 w-5" /></button>
              </>
            )}
          </div>
          {/* Contact Email */}
          <div className="flex items-center gap-2">
            <span className="font-medium">Contact Email:</span>
            {editingField === 'contactEmail' ? (
              <>
                <input
                  type="email"
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  placeholder="contact@example.com"
                  style={{ minWidth: 180 }}
                />
                <button type="button" onClick={saveEdit} className="ml-2 text-green-600" aria-label="Save contact email"><CheckIcon className="h-5 w-5" /></button>
                <button type="button" onClick={cancelEdit} className="ml-1 text-gray-500" aria-label="Cancel edit"><XMarkIcon className="h-5 w-5" /></button>
              </>
            ) : (
              <>
                <span>{event.contactEmail ? event.contactEmail : <span className="italic text-gray-400">(none)</span>}</span>
                <button type="button" onClick={() => startEdit('contactEmail', event.contactEmail || '')} className="ml-2 text-blue-600" aria-label="Edit contact email"><PencilIcon className="h-5 w-5" /></button>
              </>
            )}
          </div>
          {/* Success/Error messages */}
          {(metaEditSuccess || metaEditError) && (
            <div className="mt-2">
              {metaEditSuccess && <span className="text-green-600 dark:text-green-400">{metaEditSuccess}</span>}
              {metaEditError && <span className="text-red-600 dark:text-red-400 ml-4">{metaEditError}</span>}
            </div>
          )}
        </div>
      </Card>
      <Card className="w-full max-w-full sm:max-w-4xl lg:max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6">Admin for {event && event.name}</h2>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-8 min-w-[180px]"
              />
              {search && (
                <Button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-800 px-1 bg-transparent shadow-none sm:px-2 sm:py-1 sm:text-sm"
                  title="Clear search"
                  tabIndex={0}
                >
                  ×
                </Button>
              )}
            </div>
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="border px-2 py-1 rounded dark:bg-gray-800 dark:text-gray-100 sm:px-2 sm:py-1 sm:text-sm">
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Responder">Responder</option>
              <option value="Reporter">Reporter</option>
            </select>
            <select value={sort} onChange={e => setSort(e.target.value)} className="border px-2 py-1 rounded dark:bg-gray-800 dark:text-gray-100 sm:px-2 sm:py-1 sm:text-sm">
              <option value="name">Sort by Name</option>
              <option value="email">Sort by Email</option>
              <option value="role">Sort by Role</option>
            </select>
            <Button
              onClick={() => setOrder(o => (o === 'asc' ? 'desc' : 'asc'))}
              className="border px-2 py-1 rounded bg-transparent shadow-none sm:px-2 sm:py-1 sm:text-sm"
              title="Toggle sort order"
            >
              {order === 'asc' ? '⬆️' : '⬇️'}
            </Button>
          </div>
          <Button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 sm:px-3 sm:py-1.5 sm:text-sm">Add New User</Button>
        </div>
        {/* Responsive User List: Table for desktop, Cards for mobile */}
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
                <tr><td colSpan={3} className="text-center p-4">No users found for this event.</td></tr>
              ) : eventUsers.map((eu, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">
                    {editUserId === eu.id ? (
                      <Input type="text" value={editUserForm.name} onChange={e => handleEditChange('name', e.target.value)} />
                    ) : (eu.name || eu.email || 'Unknown')}
                    <div className="text-xs text-gray-500 dark:text-gray-400">{eu.email}</div>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">
                    {editUserId === eu.id ? (
                      <select value={editUserForm.role} onChange={e => handleEditChange('role', e.target.value)} className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100">
                        {rolesList.map(role => <option key={role} value={role}>{role}</option>)}
                      </select>
                    ) : (Array.isArray(eu.roles) ? eu.roles.join(', ') : (eu.role || 'Unknown'))}
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">
                    <div className="flex flex-wrap gap-2">
                      {editUserId === eu.id ? (
                        <>
                          <Input type="email" value={editUserForm.email} onChange={e => handleEditChange('email', e.target.value)} placeholder="Email" />
                          <Button onClick={handleEditSave} className="bg-blue-600 text-white sm:px-3 sm:py-1.5 sm:text-sm">Save</Button>
                          <Button onClick={handleEditCancel} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 sm:px-3 sm:py-1.5 sm:text-sm">Cancel</Button>
                          {editError && <span className="text-red-600 dark:text-red-400 ml-2 sm:ml-3">{editError}</span>}
                          {editSuccess && <span className="text-green-600 dark:text-green-400 ml-2 sm:ml-3">{editSuccess}</span>}
                        </>
                      ) : (
                        <>
                          <Link href={`/event/${eventSlug}/admin/user/${eu.id}`}><Button className="bg-blue-600 text-white sm:px-3 sm:py-1.5 sm:text-sm">View</Button></Link>
                          <Link href={`/event/${eventSlug}/admin/user/${eu.id}/reports`}><Button className="bg-purple-600 text-white sm:px-3 sm:py-1.5 sm:text-sm">User's Reports</Button></Link>
                          <Button onClick={() => handleEdit(eu)} className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white sm:px-3 sm:py-1.5 sm:text-sm">Edit</Button>
                          <Button onClick={() => handleRemove(eu)} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white sm:px-3 sm:py-1.5 sm:text-sm">Remove</Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        {/* Card view for mobile only */}
        <div className="block sm:hidden">
          <div className="grid grid-cols-1 gap-6 mt-4">
            {eventUsers.length === 0 ? (
              <div className="col-span-full text-center p-4">No users found for this event.</div>
            ) : eventUsers.map((eu, idx) => (
              <Card key={idx} className="flex flex-col gap-2">
                <div className="flex flex-col gap-1 mb-2">
                  <span className="font-semibold text-lg">{editUserId === eu.id ? (
                    <Input type="text" value={editUserForm.name} onChange={e => handleEditChange('name', e.target.value)} />
                  ) : (eu.name || eu.email || 'Unknown')}</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{eu.email}</span>
                  <span className="text-sm">Role: {editUserId === eu.id ? (
                    <select value={editUserForm.role} onChange={e => handleEditChange('role', e.target.value)} className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100">
                      {rolesList.map(role => <option key={role} value={role}>{role}</option>)}
                    </select>
                  ) : (Array.isArray(eu.roles) ? eu.roles.join(', ') : (eu.role || 'Unknown'))}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {editUserId === eu.id ? (
                    <>
                      <Input type="email" value={editUserForm.email} onChange={e => handleEditChange('email', e.target.value)} placeholder="Email" />
                      <Button onClick={handleEditSave} className="bg-blue-600 text-white sm:px-3 sm:py-1.5 sm:text-sm">Save</Button>
                      <Button onClick={handleEditCancel} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 sm:px-3 sm:py-1.5 sm:text-sm">Cancel</Button>
                      {editError && <span className="text-red-600 dark:text-red-400 ml-2 sm:ml-3">{editError}</span>}
                      {editSuccess && <span className="text-green-600 dark:text-green-400 ml-2 sm:ml-3">{editSuccess}</span>}
                    </>
                  ) : (
                    <>
                      <Link href={`/event/${eventSlug}/admin/user/${eu.id}`}><Button className="bg-blue-600 text-white sm:px-3 sm:py-1.5 sm:text-sm">View</Button></Link>
                      <Link href={`/event/${eventSlug}/admin/user/${eu.id}/reports`}><Button className="bg-purple-600 text-white sm:px-3 sm:py-1.5 sm:text-sm">User's Reports</Button></Link>
                      <Button onClick={() => handleEdit(eu)} className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white sm:px-3 sm:py-1.5 sm:text-sm">Edit</Button>
                      <Button onClick={() => handleRemove(eu)} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white sm:px-3 sm:py-1.5 sm:text-sm">Remove</Button>
                    </>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-4 gap-2">
          <div className="flex gap-2 items-center">
            <Button
              className="sm:px-2 sm:py-1 sm:text-sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >Prev</Button>
            <span>Page {page} of {totalPages}</span>
            <Button
              className="sm:px-2 sm:py-1 sm:text-sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >Next</Button>
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
      </Card>
      <Card className="w-full max-w-full sm:max-w-4xl lg:max-w-5xl mx-auto mt-12">
        <h3 className="text-xl font-semibold mb-2">Invite Links</h3>
        <form onSubmit={handleCreateInvite} className="flex flex-col sm:flex-row gap-2 items-center mb-4">
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
            {rolesList.map(role => <option key={role} value={role}>{role}</option>)}
          </select>
          <Button type="submit" className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 sm:px-3 sm:py-1.5 sm:text-sm" disabled={inviteLoading}>Create Invite</Button>
        </form>
        {inviteError && <div className="text-red-600 mb-2">{inviteError}</div>}
        {inviteSuccess && <div className="text-green-600 mb-2">{inviteSuccess}</div>}
        {inviteLoading ? <div>Loading...</div> : (
          <Table>
            <thead>
              <tr>
                <th className="border border-gray-200 dark:border-gray-700 p-2">Invite Link</th>
                <th className="border border-gray-200 dark:border-gray-700 p-2">Role</th>
                <th className="border border-gray-200 dark:border-gray-700 p-2">Status</th>
                <th className="border border-gray-200 dark:border-gray-700 p-2">Uses</th>
                <th className="border border-gray-200 dark:border-gray-700 p-2">Expires</th>
                <th className="border border-gray-200 dark:border-gray-700 p-2">Note</th>
                <th className="border border-gray-200 dark:border-gray-700 p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {inviteLinks.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-4">No invite links found.</td></tr>
              ) : inviteLinks.map(invite => (
                <tr key={invite.id}>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">
                    <div className="flex items-center gap-2">
                      <Input type="text" readOnly value={invite.url} className="w-full sm:w-96" onFocus={e => e.target.select()} />
                      <Button
                        noDefaultStyle
                        onClick={() => handleCopyInviteUrl(invite.url)}
                        className="bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 dark:bg-blue-500 dark:text-white dark:hover:bg-blue-400 dark:active:bg-blue-600 p-0 h-10 w-10 flex items-center justify-center rounded"
                        title="Copy invite link"
                        aria-label="Copy invite link"
                      >
                        <ClipboardIcon className="w-5 h-5" />
                      </Button>
                    </div>
                  </td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">{invite.role?.name || invite.role || '—'}</td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">{invite.disabled ? 'Disabled' : 'Active'}</td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">{invite.uses}/{invite.maxUses || '∞'}</td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">{invite.expiresAt ? new Date(invite.expiresAt).toLocaleString() : '—'}</td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">{invite.note || '—'}</td>
                  <td className="border border-gray-200 dark:border-gray-700 p-2">
                    {!invite.disabled && <Button onClick={() => handleDisableInvite(invite.id)} className="bg-red-600 text-white sm:px-2 sm:py-1 sm:text-sm">Disable</Button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
} 