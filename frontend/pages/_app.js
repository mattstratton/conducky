import { useEffect, useState } from 'react';
import Link from 'next/link';

function Header() {
  const [user, setUser] = useState(null);
  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/session', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data ? data.user : null))
      .catch(() => setUser(null));
  }, []);

  const handleLogout = async () => {
    await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    window.location.href = '/';
  };

  return (
    <header style={{
      background: '#222', color: '#fff', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.07)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <Link href="/" style={{ color: '#fff', fontWeight: 700, fontSize: 22, textDecoration: 'none', letterSpacing: 1 }}>Conducky</Link>
        {user && user.roles && user.roles.includes('SuperAdmin') && (
          <Link href="/superadmin" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 500 }}>SuperAdmin</Link>
        )}
      </div>
      <div>
        {user ? (
          <>
            <span style={{ marginRight: 16 }}>Logged in as <b>{user.email}</b>{user.name && <> ({user.name})</>}</span>
            <button onClick={handleLogout} style={{ background: '#fff', color: '#222', border: 'none', borderRadius: 4, padding: '6px 16px', cursor: 'pointer', fontWeight: 600 }}>Logout</button>
          </>
        ) : (
          <Link href="/login" style={{ color: '#fff', textDecoration: 'underline', fontWeight: 500 }}>Login</Link>
        )}
      </div>
    </header>
  );
}

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Header />
      <div style={{ minHeight: '100vh', background: '#f7f7fa', paddingBottom: 40 }}>
        <Component {...pageProps} />
      </div>
    </>
  );
}

export default MyApp; 