import React from 'react';
import { Card } from "../components/ui/card";
import Input from '../components/Input';
import { Table } from '../components/Table';
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogCancel } from "@/components/ui/alert-dialog";

// Define event interface based on how it's used in the component
interface Event {
  id: string;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
}

// Define user interface based on how it's used in the component
interface User {
  id: string;
  roles?: string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// Define API response interfaces
interface ApiResponse {
  error?: string;
  message?: string;
}

interface SessionResponse extends ApiResponse {
  user: User;
}

interface EventsResponse extends ApiResponse {
  events: Event[];
}

export default function GlobalAdmin() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewEvent, setViewEvent] = useState<Event | null>(null);
  const [editEventId, setEditEventId] = useState<string | null>(null);
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
      .then((data: SessionResponse) => {
        setUser(data.user);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
        // Redirect to login with ?next=... if not authenticated
        const next = encodeURIComponent(router.asPath);
        router.replace(`/login?next=${next}`);
      });
  }, [router, API_URL]);

  useEffect(() => {
    if (!user || !user.roles || !user.roles.includes('SuperAdmin')) return;
    fetch(API_URL + '/events', { credentials: 'include' })
      .then(res => res.json())
      .then((data: EventsResponse) => setEvents(data.events || []))
      .catch(() => setEvents([]));
  }, [user, API_URL]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const res = await fetch(API_URL + '/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
      credentials: 'include',
    });
    if (!res.ok) {
      const data: ApiResponse = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to create event.');
      return;
    }
    setSuccess('Event created!');
    setName('');
    setSlug('');
    // Refresh events list
    fetch(API_URL + '/events', { credentials: 'include' })
      .then(res => res.json())
      .then((data: EventsResponse) => setEvents(data.events || []))
      .catch(() => setEvents([]));
  };

  const handleView = (id: string) => {
    const ev = events.find(e => e.id === id);
    if (ev) setViewEvent(ev);
  };

  const handleEdit = (ev: Event) => {
    setEditEventId(ev.id);
    setEditName(ev.name);
    setEditSlug(ev.slug);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const res = await fetch(API_URL + '/events/slug/' + editSlug, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName }),
      credentials: 'include',
    });
    if (!res.ok) {
      const data: ApiResponse = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to update event.');
      return;
    }
    setSuccess('Event updated!');
    setEditEventId(null);
    // Refresh events list
    fetch(API_URL + '/events', { credentials: 'include' })
      .then(res => res.json())
      .then((data: EventsResponse) => setEvents(data.events || []))
      .catch(() => setEvents([]));
  };

  const handleDelete = async (id: string) => {
    setDeleteLoading(true);
    setError('');
    setSuccess('');
    const res = await fetch(API_URL + '/events/' + id, {
      method: 'DELETE',
      credentials: 'include',
    });
    setDeleteLoading(false);
    if (!res.ok) {
      const data: ApiResponse = await res.json().catch(() => ({}));
      setError(data.error || 'Failed to delete event.');
      return;
    }
    setSuccess('Event deleted!');
    // Refresh events list
    fetch(API_URL + '/events', { credentials: 'include' })
      .then(res => res.json())
      .then((data: EventsResponse) => setEvents(data.events || []))
      .catch(() => setEvents([]));
  };

  if (loading) return <div className="p-4"><p>Loading...</p></div>;
  if (!user) return <LoginForm />;
  if (!user.roles || !user.roles.includes('SuperAdmin')) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-2">Global Admin</h1>
        <p className="text-red-500 mb-2">You do not have rights to this page.</p>
        <p><Link href="/dashboard" className="text-blue-700 hover:underline">Go to Dashboard</Link></p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4 transition-colors duration-200">
      <Card className="w-full max-w-full sm:max-w-4xl lg:max-w-5xl mx-auto mb-8 p-4 sm:p-8">
        <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
        <form onSubmit={handleCreateEvent} className="space-y-4 max-w-md">
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">Name</label>
            <Input type="text" value={name} onChange={e => setName(e.target.value)} required className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm" />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">Slug</label>
            <Input type="text" value={slug} onChange={e => setSlug(e.target.value)} required className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm" />
          </div>
          {error && <div className="text-red-600 dark:text-red-400 text-sm font-semibold">{error}</div>}
          {success && <div className="text-green-600 dark:text-green-400 text-sm font-semibold">{success}</div>}
          <Button type="submit" className="w-full bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm">Create Event</Button>
        </form>
      </Card>
      <Card className="w-full max-w-full sm:max-w-4xl lg:max-w-5xl mx-auto p-4 sm:p-8">
        <h2 className="text-xl font-semibold mb-4">All Events</h2>
        {events.length === 0 ? <p className="text-gray-500 dark:text-gray-400">No events found.</p> : (
          <>
            {/* Card view for mobile */}
            <div className="block sm:hidden">
              <div className="grid grid-cols-1 gap-4">
                {events.map(ev => (
                  <Card key={ev.id} className="flex flex-col gap-2 p-4">
                    <div className="font-semibold text-lg">{editEventId === ev.id ? (
                      <Input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm" />
                    ) : (
                      <Link href={`/event/${ev.slug}`} className="text-blue-700 dark:text-blue-400 hover:underline font-medium">{ev.name}</Link>
                    )}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">Slug: {editEventId === ev.id ? (
                      <Input type="text" value={editSlug} onChange={e => setEditSlug(e.target.value)} className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm" disabled />
                    ) : ev.slug}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Created: {ev.createdAt ? new Date(ev.createdAt).toLocaleString() : ''}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">Updated: {ev.updatedAt ? new Date(ev.updatedAt).toLocaleString() : ''}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {editEventId === ev.id ? (
                        <>
                          <Button onClick={handleEditSubmit} className="bg-blue-600 text-white px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm">Save</Button>
                          <Button onClick={() => setEditEventId(null)} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm">Cancel</Button>
                        </>
                      ) : (
                        <>
                          <Button onClick={() => handleEdit(ev)} className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm">Edit</Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm" disabled={deleteLoading}>Delete</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure you want to delete this event?</AlertDialogTitle>
                                <p className="text-sm text-gray-500">This action cannot be undone.</p>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <Button onClick={() => handleDelete(ev.id)} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white" disabled={deleteLoading}>Confirm Delete</Button>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button onClick={() => handleView(ev.id)} className="bg-blue-600 text-white px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm">View</Button>
                          <Link href={`/event/${ev.slug}/admin`} className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm w-full inline-block text-center">Admin</Link>
                        </>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
            {/* Table view for desktop */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <th className="border border-gray-200 dark:border-gray-700 p-2">Name</th>
                    <th className="border border-gray-200 dark:border-gray-700 p-2">Slug</th>
                    <th className="border border-gray-200 dark:border-gray-700 p-2">Created At</th>
                    <th className="border border-gray-200 dark:border-gray-700 p-2">Updated At</th>
                    <th className="border border-gray-200 dark:border-gray-700 p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map(ev => (
                    <tr key={ev.id}>
                      <td className="border border-gray-200 dark:border-gray-700 p-2">{editEventId === ev.id ? (
                        <Input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm" />
                      ) : (
                        <Link href={`/event/${ev.slug}`} className="text-blue-700 dark:text-blue-400 hover:underline font-medium">{ev.name}</Link>
                      )}</td>
                      <td className="border border-gray-200 dark:border-gray-700 p-2">{editEventId === ev.id ? (
                        <Input type="text" value={editSlug} onChange={e => setEditSlug(e.target.value)} className="px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm" disabled />
                      ) : ev.slug}</td>
                      <td className="border border-gray-200 dark:border-gray-700 p-2">{ev.createdAt ? new Date(ev.createdAt).toLocaleString() : ''}</td>
                      <td className="border border-gray-200 dark:border-gray-700 p-2">{ev.updatedAt ? new Date(ev.updatedAt).toLocaleString() : ''}</td>
                      <td className="border border-gray-200 dark:border-gray-700 p-2">
                        {editEventId === ev.id ? (
                          <div className="flex gap-2">
                            <Button onClick={handleEditSubmit} className="bg-blue-600 text-white px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm">Save</Button>
                            <Button onClick={() => setEditEventId(null)} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm">Cancel</Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button onClick={() => handleEdit(ev)} className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-700 text-white px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm">Edit</Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm" disabled={deleteLoading}>Delete</Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you sure you want to delete this event?</AlertDialogTitle>
                                  <p className="text-sm text-gray-500">This action cannot be undone.</p>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <Button onClick={() => handleDelete(ev.id)} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white" disabled={deleteLoading}>Confirm Delete</Button>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                            <Button onClick={() => handleView(ev.id)} className="bg-blue-600 text-white px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm">View</Button>
                            <Link href={`/event/${ev.slug}/admin`} className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 text-white px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm inline-block text-center">Admin</Link>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </>
        )}
      </Card>
      {viewEvent && (
        <Card className="mt-6 border border-gray-200 dark:border-gray-700 max-w-md bg-gray-50 dark:bg-gray-800 p-4 sm:p-8">
          <h3 className="text-lg font-semibold mb-2">Event Details</h3>
          <p><b>Name:</b> {viewEvent.name}</p>
          <p><b>Slug:</b> {viewEvent.slug}</p>
          <p><b>Created At:</b> {viewEvent.createdAt ? new Date(viewEvent.createdAt).toLocaleString() : ''}</p>
          <p><b>Updated At:</b> {viewEvent.updatedAt ? new Date(viewEvent.updatedAt).toLocaleString() : ''}</p>
          <Button onClick={() => setViewEvent(null)} className="mt-2 bg-blue-600 text-white hover:bg-blue-700 font-semibold px-4 py-2 sm:px-3 sm:py-1.5 sm:text-sm">Close</Button>
        </Card>
      )}
    </div>
  );
}

// Helper: LoginForm component
function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.reload();
      } else {
        let errMsg = 'Login failed';
        try {
          const data = await res.json();
          errMsg = data.error || data.message || errMsg;
        } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
          // Ignore JSON parse errors
        }
        setError(errMsg);
      }
    } catch (_) { // eslint-disable-line @typescript-eslint/no-unused-vars
      setError('Network error');
    }
  };
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-200">
      <Card className="w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">Email</label>
            <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">Password</label>
            <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          {error && <div className="text-red-600 dark:text-red-400 text-sm font-semibold">{error}</div>}
          <Button type="submit" className="w-full">Login</Button>
        </form>
      </Card>
    </div>
  );
} 