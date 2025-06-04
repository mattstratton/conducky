import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [message, setMessage] = useState('');
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
      {loading ? <p>Loading user info...</p> : user ? (
        <div>
          <p>Logged in as: <b>{user.email}</b> {user.name && <>({user.name})</>}</p>
          <button onClick={handleLogout}>Logout</button>
          <p><Link href="/dashboard">Go to Dashboard</Link></p>
        </div>
      ) : (
        <div>
          <p><Link href="/login">Login</Link> to access more features.</p>
        </div>
      )}
    </div>
  );
} 