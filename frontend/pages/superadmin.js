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
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch events');
      })
      .then(data => {
        setEvents(data.events || []);
      })
      .catch(() => {
        setError('Could not load events');
      });
  }, [user]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!name || !slug) {
      setError('Name and slug are required.');
      return;
    }
    try {
      const res = await fetch(API_URL + '/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, slug }),
      });
      if (res.ok) {
        setName('');
        setSlug('');
        setSuccess('Event created!');
        // Refresh events
        const data = await res.json();
        setEvents([data.event, ...events]);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create event');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleView = async (eventId) => {
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/events/${eventId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setViewEvent(data.event);
      } else {
        setError('Failed to fetch event details');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleEdit = (event) => {
    setEditEventId(event.id);
    setEditName(event.name);
    setEditSlug(event.slug);
    setError('');
    setSuccess('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/events/${editEventId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: editName, slug: editSlug }),
      });
      if (res.ok) {
        setSuccess('Event updated!');
        // Update event in list
        setEvents(events.map(ev => ev.id === editEventId ? { ...ev, name: editName, slug: editSlug } : ev));
        setEditEventId(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update event');
      }
    } catch (err) {
      setError('Network error');
    }
  };

  const handleDelete = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This cannot be undone.')) return;
    setDeleteLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch(`${API_URL}/events/${eventId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (res.ok) {
        setSuccess('Event deleted!');
        setEvents(events.filter(ev => ev.id !== eventId));
        if (viewEvent && viewEvent.id === eventId) setViewEvent(null);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete event');
      }
    } catch (err) {
      setError('Network error');
    }
    setDeleteLoading(false);
  };

  if (loading) return <div style={{ fontFamily: 'sans-serif', padding: 40 }}><p>Loading...</p></div>;
  if (!user) return null;
  if (!user.roles || !user.roles.includes('SuperAdmin')) {
    return (
      <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
        <h1>Super Admin</h1>
        <p style={{ color: 'red' }}>You do not have permission to view this page.</p>
        <p><Link href="/dashboard">Go to Dashboard</Link></p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>Super Admin: Event Management</h1>
      <p><Link href="/">Home</Link> | <Link href="/dashboard">Dashboard</Link></p>
      <h2>Create New Event</h2>
      <form onSubmit={handleCreateEvent} style={{ maxWidth: 400, marginBottom: 32 }}>
        <div style={{ marginBottom: 12 }}>
          <label>Name<br />
            <input type="text" value={name} onChange={e => setName(e.target.value)} required style={{ width: '100%' }} />
          </label>
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Slug<br />
            <input type="text" value={slug} onChange={e => setSlug(e.target.value)} required style={{ width: '100%' }} />
          </label>
        </div>
        {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
        {success && <div style={{ color: 'green', marginBottom: 12 }}>{success}</div>}
        <button type="submit">Create Event</button>
      </form>
      <h2>All Events</h2>
      {events.length === 0 ? <p>No events found.</p> : (
        <table border="1" cellPadding="8" style={{ borderCollapse: 'collapse', marginTop: 20 }}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Slug</th>
              <th>Created At</th>
              <th>Updated At</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {events.map(ev => (
              <tr key={ev.id}>
                <td>{editEventId === ev.id ? (
                  <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%' }} />
                ) : ev.name}</td>
                <td>{editEventId === ev.id ? (
                  <input type="text" value={editSlug} onChange={e => setEditSlug(e.target.value)} style={{ width: '100%' }} />
                ) : ev.slug}</td>
                <td>{ev.createdAt ? new Date(ev.createdAt).toLocaleString() : ''}</td>
                <td>{ev.updatedAt ? new Date(ev.updatedAt).toLocaleString() : ''}</td>
                <td>
                  {editEventId === ev.id ? (
                    <>
                      <button onClick={handleEditSubmit} style={{ marginRight: 8 }}>Save</button>
                      <button onClick={() => setEditEventId(null)}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => handleView(ev.id)} style={{ marginRight: 8 }}>View</button>
                      <button onClick={() => handleEdit(ev)} style={{ marginRight: 8 }}>Edit</button>
                      <button onClick={() => handleDelete(ev.id)} disabled={deleteLoading}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {viewEvent && (
        <div style={{ marginTop: 32, border: '1px solid #ccc', padding: 20, maxWidth: 500 }}>
          <h3>Event Details</h3>
          <p><b>Name:</b> {viewEvent.name}</p>
          <p><b>Slug:</b> {viewEvent.slug}</p>
          <p><b>Created At:</b> {viewEvent.createdAt ? new Date(viewEvent.createdAt).toLocaleString() : ''}</p>
          <p><b>Updated At:</b> {viewEvent.updatedAt ? new Date(viewEvent.updatedAt).toLocaleString() : ''}</p>
          <button onClick={() => setViewEvent(null)}>Close</button>
        </div>
      )}
    </div>
  );
} 