import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button, Card } from '../../../../../components';

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

  if (loading) return <div className="p-10"><h2>Loading user details...</h2></div>;
  if (error) return <div className="p-10"><h2>{error}</h2><Link href={`/event/${eventSlug}/admin`} className="text-blue-600 dark:text-blue-400 hover:underline">Back to User List</Link></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-200 flex items-center justify-center p-8">
      <Card className="max-w-lg w-full">
        <h2 className="text-2xl font-bold mb-6">User Details</h2>
        <div className="mb-4">
          <strong>Name:</strong> {user.name || user.email}<br />
          <strong>Email:</strong> {user.email}<br />
          <strong>Roles for this event:</strong> {Array.isArray(user.roles) ? user.roles.join(', ') : user.role || '—'}
        </div>
        {/* Placeholder for future: user reports, activity, etc. */}
        <div className="flex gap-4 mt-6">
          <Link href={`/event/${eventSlug}/admin/user/${userId}/reports`}><Button className="bg-purple-600 text-white">View User's Reports</Button></Link>
          <Link href={`/event/${eventSlug}/admin`}><Button className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200">Back to User List</Button></Link>
        </div>
      </Card>
    </div>
  );
} 