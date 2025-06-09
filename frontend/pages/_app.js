import React from "react";
import { useEffect, useState, useRef, createContext, useContext } from 'react';
import Link from 'next/link';
import '../styles.css';
import { useRouter } from 'next/router';
import { ModalContext } from '../context/ModalContext';
import { Button, Card } from '../components';

// User context for global user state
export const UserContext = createContext({ user: null, setUser: () => {} });

// Dark mode context
export const DarkModeContext = createContext({ darkMode: false, toggleDarkMode: () => {} });

function useDarkMode() {
  const [darkMode, setDarkMode] = useState(false);
  // On mount, check system preference and localStorage
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') setDarkMode(true);
    else if (saved === 'light') setDarkMode(false);
    else {
      // System preference
      setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
  }, []);
  // Apply class to <html>
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);
  // Toggle and persist
  const toggleDarkMode = () => {
    setDarkMode(dm => {
      localStorage.setItem('theme', !dm ? 'dark' : 'light');
      return !dm;
    });
  };
  return { darkMode, toggleDarkMode };
}

function DarkModeToggle() {
  const { darkMode, toggleDarkMode } = useContext(DarkModeContext);
  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-full border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 transition focus:outline-none focus:ring-2 focus:ring-yellow-400"
      title="Toggle dark mode"
      aria-label="Toggle dark mode"
    >
      {darkMode ? '🌙' : '☀️'}
    </button>
  );
}

function SimpleModal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm">
      <Card className="relative max-w-lg w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
        <Button onClick={onClose} className="absolute top-2 right-2 px-4 py-2 sm:px-2 sm:py-0.5 text-2xl sm:text-lg font-bold bg-gray-800 text-white border border-white dark:bg-gray-900 dark:text-white dark:border-gray-600 shadow hover:bg-gray-900 dark:hover:bg-gray-800 focus:ring-2 focus:ring-primary-500">&times;</Button>
        {children}
      </Card>
    </div>
  );
}

function ReportForm({ eventSlug, eventName, onSuccess }) {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [incidentAt, setIncidentAt] = useState('');
  const [parties, setParties] = useState('');
  const [evidence, setEvidence] = useState([]);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const reportTypes = [
    { value: 'harassment', label: 'Harassment' },
    { value: 'safety', label: 'Safety' },
    { value: 'other', label: 'Other' },
  ];
  const handleSubmit = async e => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    const formData = new FormData();
    formData.append('type', type);
    formData.append('description', description);
    if (incidentAt) formData.append('incidentAt', new Date(incidentAt).toISOString());
    if (parties) formData.append('parties', parties);
    if (evidence && evidence.length > 0) {
      for (let i = 0; i < evidence.length; i++) {
        formData.append('evidence', evidence[i]);
      }
    }
    const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (res.ok) {
      setMessage('Report submitted!');
      setType('');
      setDescription('');
      setIncidentAt('');
      setParties('');
      setEvidence([]);
      if (onSuccess) onSuccess();
    } else {
      setMessage('Failed to submit report.');
    }
    setSubmitting(false);
  };
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="report-type">Type</label>
        <select
          id="report-type"
          value={type}
          onChange={e => setType(e.target.value)}
          required
          className="mt-1 block w-64 max-w-xs rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="">Select type</option>
          {reportTypes.map(rt => (
            <option key={rt.value} value={rt.value}>{rt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="report-description">Description</label>
        <textarea
          id="report-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          required
          className="mt-1 block w-full rounded border-gray-300 focus:border-blue-500 focus:ring-blue-500 min-h-[80px]"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="incident-at">Date/Time of Incident (optional)</label>
        <input
          id="incident-at"
          type="datetime-local"
          value={incidentAt}
          onChange={e => setIncidentAt(e.target.value)}
          className="mt-1 block w-64 max-w-xs rounded border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
        <span className="text-xs text-gray-500">If known, please provide when the incident occurred.</span>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="parties">Involved Parties (optional)</label>
        <input
          id="parties"
          type="text"
          value={parties}
          onChange={e => setParties(e.target.value)}
          className="mt-1 block w-full rounded border border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          placeholder="List names, emails, or descriptions (comma-separated or freeform)"
        />
        <span className="text-xs text-gray-500">List anyone involved, if known. Separate multiple names with commas.</span>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="report-evidence">Evidence (optional)</label>
        <input
          id="report-evidence"
          type="file"
          multiple
          onChange={e => setEvidence(Array.from(e.target.files))}
          className="mt-1 block w-full"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded shadow-sm font-medium transition-colors disabled:opacity-60"
      >
        {submitting ? 'Submitting...' : 'Submit Report'}
      </button>
      {message && <p className="mt-2 text-sm text-gray-500">{message}</p>}
    </form>
  );
}

function MyEventsDropdown() {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const dropdownRef = useRef();
  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/users/me/events', { credentials: 'include' })
      .then(res => res.ok ? res.json() : { events: [] })
      .then(data => setEvents(data.events || []));
  }, []);
  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);
  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setOpen(o => !o)} className="px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white font-semibold focus:outline-none focus:ring-2 focus:ring-yellow-400">
        My Events <svg className="inline w-4 h-4 ml-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded shadow-lg z-50">
          <div className="p-2 text-gray-700 dark:text-gray-100 font-semibold border-b border-gray-200 dark:border-gray-700">My Events</div>
          {events.length === 0 ? (
            <div className="p-3 text-gray-500 text-sm">No events found.</div>
          ) : (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {events.map(ev => (
                <li key={ev.id}>
                  <Link href={`/event/${ev.slug}`} className="block px-4 py-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{ev.name}</span> <span className="text-xs text-gray-500">({ev.roles.join(', ')})</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Header() {
  const { user, setUser } = useContext(UserContext);
  const router = useRouter();
  const path = router.asPath;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Extract event slug if on event page
  const eventSlugMatch = path.match(/^\/event\/([^\/]+)/);
  const eventSlug = eventSlugMatch ? eventSlugMatch[1] : null;

  useEffect(() => {
    fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/session', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data ? data.user : null))
      .catch(() => setUser(null));
    // Only run on mount
    // eslint-disable-next-line
  }, []);

  const handleLogout = async () => {
    await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + '/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    window.location.href = '/';
  };

  // Navigation links (role-based)
  const navLinks = [
    { href: '/', label: 'Home', icon: (
      <svg className="w-5 h-5 mr-1.5 inline-block align-text-bottom" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l9-9 9 9M4 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-6 0h6" /></svg>
    ), show: true },
    { href: '/admin', label: 'Global Admin', icon: (
      <svg className="w-5 h-5 mr-1.5 inline-block align-text-bottom" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
    ), show: user && user.roles && user.roles.includes('SuperAdmin') },
  ];

  return (
    <header className="sticky top-0 z-20 bg-gray-900 text-white shadow flex items-center justify-between px-4 py-3 md:px-6 md:py-4">
      {/* Left: Brand & Hamburger */}
      <div className="flex items-center gap-4">
        <Link href="/" className="font-extrabold text-2xl tracking-wide flex items-center gap-2 hover:text-yellow-300 transition">
          <span>Conducky</span> <span role="img" aria-label="duck">🦆</span>
        </Link>
        {/* Hamburger for mobile */}
        <button
          className="md:hidden ml-2 p-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400"
          onClick={() => setMobileMenuOpen(o => !o)}
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d={mobileMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
          </svg>
        </button>
      </div>
      {/* Center: Desktop Nav */}
      <nav className="hidden md:flex items-center gap-6 flex-1 justify-center">
        {navLinks.filter(l => l.show).map(l => (
          <Link key={l.href} href={l.href} className="font-semibold hover:text-yellow-300 transition px-3 py-2 rounded flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-400">
            {l.icon}{l.label}
          </Link>
        ))}
        {eventSlug && <SubmitReportNavButton />}
      </nav>
      {/* Right: Actions */}
      <div className="hidden md:flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm md:text-base">Logged in as <b>{user.email}</b>{user.name && <span className="text-gray-300"> ({user.name})</span>}</span>
            <MyEventsDropdown />
            <Button onClick={handleLogout} className="ml-2">Logout</Button>
          </>
        ) : (
          <Link href="/login" className="underline font-semibold hover:text-yellow-300 transition">Login</Link>
        )}
        <DarkModeToggle />
      </div>
      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-60 md:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}
      {/* Mobile Menu Drawer */}
      <div className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 text-white shadow-lg transform transition-transform duration-200 md:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <span className="font-extrabold text-xl tracking-wide flex items-center gap-2">
            Conducky <span role="img" aria-label="duck">🦆</span>
          </span>
          <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded focus:outline-none focus:ring-2 focus:ring-yellow-400" aria-label="Close menu">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-col gap-2 px-4 py-4">
          {navLinks.filter(l => l.show).map(l => (
            <Link key={l.href} href={l.href} className="py-3 px-3 rounded hover:bg-gray-800 font-semibold flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-400" onClick={() => setMobileMenuOpen(false)}>
              {l.icon}{l.label}
            </Link>
          ))}
          {eventSlug && <div className="py-2"><SubmitReportNavButton /></div>}
        </nav>
        <div className="px-4 py-2 border-t border-gray-800 flex flex-col gap-2">
          {user ? (
            <>
              <span className="text-sm">Logged in as <b>{user.email}</b>{user.name && <span className="text-gray-300"> ({user.name})</span>}</span>
              <MyEventsDropdown />
              <Button onClick={handleLogout} className="mt-2">Logout</Button>
            </>
          ) : (
            <Link href="/login" className="underline font-semibold hover:text-yellow-300 transition py-2" onClick={() => setMobileMenuOpen(false)}>Login</Link>
          )}
          <DarkModeToggle />
        </div>
      </div>
    </header>
  );
}

function SubmitReportNavButton() {
  const { openModal } = useContext(ModalContext);
  const { user } = useContext(UserContext);
  const router = useRouter();
  const path = router.asPath;
  const eventSlugMatch = path.match(/^\/event\/([^\/]+)/);
  const eventSlug = eventSlugMatch ? eventSlugMatch[1] : null;
  if (!user) return null;
  return (
    <Button
      onClick={() => openModal(eventSlug)}
      className="ml-4"
    >
      Submit Report
    </Button>
  );
}

function MyApp({ Component, pageProps }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventSlugForModal, setEventSlugForModal] = useState(null);
  const [user, setUser] = useState(null);
  // Fetch event name when modal opens
  useEffect(() => {
    if (modalOpen && eventSlugForModal) {
      fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/event/slug/${eventSlugForModal}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => setEventName(data && data.event ? data.event.name : eventSlugForModal))
        .catch(() => setEventName(eventSlugForModal));
    }
  }, [modalOpen, eventSlugForModal]);
  const openModal = (slug, name) => {
    setEventSlugForModal(slug);
    setEventName(name || '');
    setModalOpen(true);
  };
  const darkModeValue = useDarkMode();
  return (
    <UserContext.Provider value={{ user, setUser }}>
      <DarkModeContext.Provider value={darkModeValue}>
        <ModalContext.Provider value={{ openModal }}>
          <Header />
          <SimpleModal open={modalOpen} onClose={() => setModalOpen(false)}>
            <div className="text-gray-800">
              <h2 className="text-xl font-bold mb-4">Submit a Report</h2>
              {eventSlugForModal && (
                <div className="text-sm mb-2 text-gray-500">For event: <b>{eventName || eventSlugForModal}</b></div>
              )}
              {eventSlugForModal ? (
                <ReportForm eventSlug={eventSlugForModal} eventName={eventName} onSuccess={() => setModalOpen(false)} />
              ) : <div className="text-gray-500">No event selected.</div>}
            </div>
          </SimpleModal>
          <main className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-10">
            <Component {...pageProps} />
          </main>
          <footer className="w-full mt-8 flex flex-col items-center justify-center px-4 py-6 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-6 items-center justify-center">
              <span>© {new Date().getFullYear()} Conducky</span>
              <span>v1.0.0</span>
              <a href="https://github.com/mattstratton/conducky" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">GitHub</a>
            </div>
          </footer>
        </ModalContext.Provider>
      </DarkModeContext.Provider>
    </UserContext.Provider>
  );
}

export default MyApp; 