import { useEffect, useState, useContext } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { UserContext } from './_app';

export default function Home() {
  const [firstUserNeeded, setFirstUserNeeded] = useState(false);
  const [firstUserForm, setFirstUserForm] = useState({ email: '', password: '', name: '' });
  const [firstUserError, setFirstUserError] = useState('');
  const [firstUserSuccess, setFirstUserSuccess] = useState('');
  const { user, setUser } = useContext(UserContext);
  const router = useRouter();

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/', {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.firstUserNeeded) {
          setFirstUserNeeded(true);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    // If user is logged in and is a superuser, redirect to /admin
    if (user && user.roles && user.roles.includes('SuperAdmin')) {
      router.replace('/admin');
    }
  }, [user, router]);

  if (firstUserNeeded) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md">
          <h1 className="text-2xl font-bold mb-4 text-center">Welcome! Set Up Your First User</h1>
          <p className="mb-4 text-gray-700">No users exist yet. Create the first user (will be Global Admin):</p>
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
            setFirstUserSuccess('First user created and set as Global Admin! You can now log in.');
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <div className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4 w-full max-w-md text-center">
        <h1 className="text-3xl font-bold mb-4">Hello!</h1>
        <p className="mb-6 text-gray-700">This is a self-hosted installation of Conducky, your free and open source code of conduct report management system.</p>
        <p className="mb-6 text-gray-700">If you're looking to configure this installation, please head over here:</p>
        <Link href="/admin" className="text-blue-700 hover:underline font-semibold">Configure this installation</Link>
        <p className="mt-8 text-xs text-gray-400">powered by Conducky</p>
      </div>
    </div>
  );
} 