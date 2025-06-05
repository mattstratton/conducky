import { useEffect, useState } from 'react';
import Link from 'next/link';
import '../styles.css';

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
    <header className="sticky top-0 z-20 bg-gray-900 text-white shadow flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-extrabold text-2xl tracking-wide flex items-center gap-2 hover:text-yellow-300 transition">
          <span>Conducky</span> <span role="img" aria-label="duck">🦆</span>
        </Link>
        {user && user.roles && user.roles.includes('SuperAdmin') && (
          <Link href="/superadmin" className="underline font-semibold hover:text-yellow-300 transition">SuperAdmin</Link>
        )}
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm md:text-base">Logged in as <b>{user.email}</b>{user.name && <span className="text-gray-300"> ({user.name})</span>}</span>
            <button onClick={handleLogout} className="ml-2 bg-white text-gray-900 hover:bg-gray-200 font-semibold py-1 px-4 rounded shadow-sm transition">Logout</button>
          </>
        ) : (
          <Link href="/login" className="underline font-semibold hover:text-yellow-300 transition">Login</Link>
        )}
      </div>
    </header>
  );
}

function MyApp({ Component, pageProps }) {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 pb-10">
        <Component {...pageProps} />
      </main>
    </>
  );
}

export default MyApp; 