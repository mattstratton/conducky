import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [firstUserNeeded, setFirstUserNeeded] = useState(false);
  const [firstUserForm, setFirstUserForm] = useState({ email: '', password: '', name: '' });
  const [firstUserError, setFirstUserError] = useState('');
  const [firstUserSuccess, setFirstUserSuccess] = useState('');
  const [newEvent, setNewEvent] = useState({ name: '', slug: '' });
  const [eventError, setEventError] = useState('');
  const [eventSuccess, setEventSuccess] = useState('');

  const isSuperAdmin = user && user.roles && user.roles.includes('SuperAdmin');

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/session', {
      credentials: 'include',
    })
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
      });
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.firstUserNeeded) {
          setFirstUserNeeded(true);
        } else {
          setMessage(data.message);
        }
      })
      .catch(() => setMessage('Could not connect to backend.'));
    // Fetch all events (public)
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/events', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .catch(() => setEvents([]));
  }, []);

  const handleLogout = async () => {
    await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setEventError('');
    setEventSuccess('');
    const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEvent),
      credentials: 'include',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setEventError(data.error || 'Failed to create event.');
      return;
    }
    setEventSuccess('Event created!');
    setNewEvent({ name: '', slug: '' });
    // Refresh events list
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/events', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => setEvents(data.events || []))
      .catch(() => setEvents([]));
  };

  if (firstUserNeeded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Welcome! Set Up Your First User</h1>
          <p className="mb-4 text-gray-700">No users exist yet. Create the first user (will be SuperAdmin):</p>
          <form onSubmit={async e => {
            e.preventDefault();
            setFirstUserError('');
            setFirstUserSuccess('');
            // Register the user
            const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/register', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(firstUserForm),
              credentials: 'include',
            });
            if (!res.ok) {
              const data = await res.json();
              setFirstUserError(data.error || 'Failed to create user.');
              return;
            }
            setFirstUserSuccess('First user created and set as SuperAdmin! You can now log in.');
            setFirstUserNeeded(false);
          }}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Email
                <input type="email" required value={firstUserForm.email} onChange={e => setFirstUserForm(f => ({ ...f, email: e.target.value }))} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
              </label>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Name
                <input type="text" value={firstUserForm.name} onChange={e => setFirstUserForm(f => ({ ...f, name: e.target.value }))} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
              </label>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Password
                <input type="password" required value={firstUserForm.password} onChange={e => setFirstUserForm(f => ({ ...f, password: e.target.value }))} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
              </label>
            </div>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full">Create First User</button>
          </form>
          {firstUserError && <p className="text-red-600 mt-2">{firstUserError}</p>}
          {firstUserSuccess && <p className="text-green-600 mt-2">{firstUserSuccess}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Code of Conduct Report Management System</h1>
        <p className="mb-6 text-gray-600">Backend says: {message}</p>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
          <h2 className="text-xl font-semibold">Events</h2>
          {isSuperAdmin && (
            <form onSubmit={handleCreateEvent} className="flex flex-col md:flex-row md:items-end gap-2 md:gap-4 bg-white p-4 rounded shadow">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-1">Name
                  <input type="text" required value={newEvent.name} onChange={e => setNewEvent(f => ({ ...f, name: e.target.value }))} className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                </label>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-1">Slug
                  <input type="text" required value={newEvent.slug} onChange={e => setNewEvent(f => ({ ...f, slug: e.target.value }))} className="shadow appearance-none border rounded w-full py-1 px-2 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                </label>
              </div>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Create Event</button>
              {eventError && <span className="text-red-600 ml-2">{eventError}</span>}
              {eventSuccess && <span className="text-green-600 ml-2">{eventSuccess}</span>}
            </form>
          )}
        </div>
        {events.length === 0 ? <p className="text-gray-500">No events found.</p> : (
          <ul className="divide-y divide-gray-200 bg-white rounded shadow">
            {events.map(event => (
              <li key={event.id} className="p-4 hover:bg-gray-50 transition">
                <Link href={`/event/${event.slug}`} className="text-blue-700 hover:underline font-medium">{event.name} <span className="text-gray-500">({event.slug})</span></Link>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-8">
          {loading ? <p className="text-gray-500">Loading user info...</p> : user ? (
            <div className="flex items-center gap-4">
              <p className="text-gray-700">Logged in as: <b>{user.email}</b> {user.name && <span className="text-gray-500">({user.name})</span>}</p>
              <button onClick={handleLogout} className="ml-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded">Logout</button>
            </div>
          ) : (
            <div>
              <p className="text-gray-700"><Link href="/login" className="text-blue-700 hover:underline">Login</Link> to access more features.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 