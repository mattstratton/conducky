import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);

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
    fetch(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
      .then(res => res.json())
      .then(data => setMessage(data.message))
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

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>Code of Conduct Report Management System</h1>
      <p>Backend says: {message}</p>
      <h2>Events</h2>
      {events.length === 0 ? <p>No events found.</p> : (
        <ul>
          {events.map(event => (
            <li key={event.id}>
              <Link href={`/event/${event.slug}`}>{event.name} ({event.slug})</Link>
            </li>
          ))}
        </ul>
      )}
      {loading ? <p>Loading user info...</p> : user ? (
        <div>
          <p>Logged in as: <b>{user.email}</b> {user.name && <>({user.name})</>}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <div>
          <p><Link href="/login">Login</Link> to access more features.</p>
        </div>
      )}
    </div>
  );
} 