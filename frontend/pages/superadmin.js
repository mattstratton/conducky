import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function SuperAdmin() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewEvent, setViewEvent] = useState(null);
  const [editEventId, setEditEventId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const router = useRouter();
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    // Fetch user info
    fetch(API_URL + '/session', { credentials: 'include' })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Not authenticated');
      })
      .then(data => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
        router.push('/login');
      });
  }, [router]);

  useEffect(() => {
    if (!user || !user.roles || !user.roles.includes('SuperAdmin')) return;
    fetch(API_URL + '/events', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .catch(() => setEvents([]));
  }, [user]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const res = await fetch(API_URL + '/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to create event.');
      return;
    }
    setSuccess('Event created!');
    setName('');
    setSlug('');
    // Refresh events list
    fetch(API_URL + '/events', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .catch(() => setEvents([]));
  };

  const handleView = (id) => {
    const ev = events.find(e => e.id === id);
    setViewEvent(ev);
  };

  const handleEdit = (ev) => {
    setEditEventId(ev.id);
    setEditName(ev.name);
    setEditSlug(ev.slug);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const res = await fetch(API_URL + '/events/' + editEventId, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName, slug: editSlug }),
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to update event.');
      return;
    }
    setSuccess('Event updated!');
    setEditEventId(null);
    // Refresh events list
    fetch(API_URL + '/events', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .catch(() => setEvents([]));
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    setError('');
    setSuccess('');
    const res = await fetch(API_URL + '/events/' + id, {
      method: 'DELETE',
      credentials: 'include',
    });
    setDeleteLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to delete event.');
      return;
    }
    setSuccess('Event deleted!');
    // Refresh events list
    fetch(API_URL + '/events', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .catch(() => setEvents([]));
  };

  if (loading) return <div className="p-4"><p>Loading...</p></div>;
  if (!user) return null;
  if (!user.roles || !user.roles.includes('SuperAdmin')) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-2">Super Admin</h1>
        <p className="text-red-500 mb-2">You do not have permission to view this page.</p>
        <p><Link href="/dashboard" className="text-blue-700 hover:underline">Go to Dashboard</Link></p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Super Admin: Event Management</h1>
        <div className="mb-4 flex gap-4 text-sm text-gray-600">
          <Link href="/" className="hover:underline">Home</Link> |
          <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        </div>
        <div className="bg-white rounded shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
          <form onSubmit={handleCreateEvent} className="space-y-4 max-w-md">
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Name
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
              </label>
            </div>
            <div>
              <label className="block text-gray-700 text-sm font-bold mb-2">Slug
                <input type="text" value={slug} onChange={e => setSlug(e.target.value)} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
              </label>
            </div>
            {error && <div className="text-red-600 text-sm font-semibold">{error}</div>}
            {success && <div className="text-green-600 text-sm font-semibold">{success}</div>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Create Event</button>
          </form>
        </div>
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-xl font-semibold mb-4">All Events</h2>
          {events.length === 0 ? <p className="text-gray-500">No events found.</p> : (
            <div className="overflow-x-auto">
              <table className="min-w-full border border-gray-200">
                <thead>
                  <tr>
                    <th className="border border-gray-200 p-2">Name</th>
                    <th className="border border-gray-200 p-2">Slug</th>
                    <th className="border border-gray-200 p-2">Created At</th>
                    <th className="border border-gray-200 p-2">Updated At</th>
                    <th className="border border-gray-200 p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => (
                    <tr key={ev.id}>
                      <td className="border border-gray-200 p-2">{editEventId === ev.id ? (
                        <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full" />
                      ) : ev.name}</td>
                      <td className="border border-gray-200 p-2">{editEventId === ev.id ? (
                        <input type="text" value={editSlug} onChange={e => setEditSlug(e.target.value)} className="w-full" />
                      ) : ev.slug}</td>
                      <td className="border border-gray-200 p-2">{ev.createdAt ? new Date(ev.createdAt).toLocaleString() : ''}</td>
                      <td className="border border-gray-200 p-2">{ev.updatedAt ? new Date(ev.updatedAt).toLocaleString() : ''}</td>
                      <td className="border border-gray-200 p-2">
                        {editEventId === ev.id ? (
                          <>
                            <button onClick={handleEditSubmit} className="mr-2 text-blue-700 hover:underline">Save</button>
                            <button onClick={() => setEditEventId(null)} className="text-gray-600 hover:underline">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleView(ev.id)} className="mr-2 text-blue-700 hover:underline">View</button>
                            <button onClick={() => handleEdit(ev)} className="mr-2 text-yellow-700 hover:underline">Edit</button>
                            <button onClick={() => handleDelete(ev.id)} disabled={deleteLoading} className="text-red-700 hover:underline">Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {viewEvent && (
            <div className="mt-6 border border-gray-200 p-4 max-w-md rounded bg-gray-50">
              <h3 className="text-lg font-semibold mb-2">Event Details</h3>
              <p><b>Name:</b> {viewEvent.name}</p>
              <p><b>Slug:</b> {viewEvent.slug}</p>
              <p><b>Created At:</b> {viewEvent.createdAt ? new Date(viewEvent.createdAt).toLocaleString() : ''}</p>
              <p><b>Updated At:</b> {viewEvent.updatedAt ? new Date(viewEvent.updatedAt).toLocaleString() : ''}</p>
              <button onClick={() => setViewEvent(null)} className="mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded">Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 