import { useState, useEffect, useContext } from 'react';
import { useRouter } from 'next/router';
import { UserContext } from './_app';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const [nextUrl, setNextUrl] = useState('/');
  const { setUser } = useContext(UserContext);

  useEffect(() => {
    // Prefer ?next=... in query, else use document.referrer if it's from the same origin
    if (router.query.next) {
      setNextUrl(router.query.next);
    } else if (typeof document !== 'undefined' && document.referrer && document.referrer.startsWith(window.location.origin)) {
      const refPath = document.referrer.replace(window.location.origin, '');
      setNextUrl(refPath || '/');
    }
  }, [router.query.next]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        // Fetch user info and update context
        const sessionRes = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/session', { credentials: 'include' });
        if (sessionRes.ok) {
          const data = await sessionRes.json();
          setUser(data.user);
        }
        router.push(nextUrl);
      } else {
        let errMsg = 'Login failed';
        try {
          const data = await res.json();
          errMsg = data.error || data.message || errMsg;
        } catch {
          // If not JSON, keep default
        }
        setError(errMsg);
      }
    } catch (err) {
      setError('Network error');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Email
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
            </label>
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">Password
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
            </label>
          </div>
          {error && <div className="text-red-600 text-sm font-semibold">{error}</div>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline">Login</button>
        </form>
      </div>
    </div>
  );
} 