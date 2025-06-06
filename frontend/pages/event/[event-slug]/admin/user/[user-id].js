import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function UserDetailsPage() {
  const router = useRouter();
  const { 'event-slug': eventSlug, 'user-id': userId } = router.query;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!eventSlug || !userId) return;
    setLoading(true);
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/users`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : { users: [] })
      .then(data => {
        const found = (data.users || []).find(u => String(u.id) === String(userId));
        if (!found) {
          setError('User not found for this event.');
        } else {
          setUser(found);
        }
      })
      .catch(() => setError('Failed to fetch user details.'))
      .finally(() => setLoading(false));
  }, [eventSlug, userId]);

  if (loading) return <div style={{ padding: 40 }}><h2>Loading user details...</h2></div>;
  if (error) return <div style={{ padding: 40 }}><h2>{error}</h2><Link href={`/event/${eventSlug}/admin`} className="text-blue-600">Back to User List</Link></div>;
  if (!user) return null;

  return (
    <div style={{ padding: 40 }}>
      <h2>User Details</h2>
      <div className="mb-4">
        <strong>Name:</strong> {user.name || user.email}<br />
        <strong>Email:</strong> {user.email}<br />
        <strong>Roles for this event:</strong> {Array.isArray(user.roles) ? user.roles.join(', ') : user.role || '—'}
      </div>
      {/* Placeholder for future: user reports, activity, etc. */}
      <Link href={`/event/${eventSlug}/admin/user/${userId}/reports`} className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 mr-4">View User's Reports</Link>
      <Link href={`/event/${eventSlug}/admin`} className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Back to User List</Link>
    </div>
  );
} 