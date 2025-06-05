import { useEffect, useState, useRef, createContext, useContext } from 'react';
import Link from 'next/link';
import '../styles.css';
import { useRouter } from 'next/router';
import { ModalContext } from '../context/ModalContext';

function SimpleModal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-lg w-full relative">
        <button onClick={onClose} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold">&times;</button>
        {children}
      </div>
    </div>
  );
}

function ReportForm({ eventSlug, eventName, onSuccess }) {
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [evidence, setEvidence] = useState(null);
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
    if (evidence) formData.append('evidence', evidence);
    const res = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') + `/events/slug/${eventSlug}/reports`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (res.ok) {
      setMessage('Report submitted!');
      setType('');
      setDescription('');
      setEvidence(null);
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
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="report-evidence">Evidence (optional)</label>
        <input
          id="report-evidence"
          type="file"
          onChange={e => setEvidence(e.target.files[0])}
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

function Header() {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const path = router.asPath;
  // Extract event slug if on event page
  const eventSlugMatch = path.match(/^\/event\/([^\/]+)/);
  const eventSlug = eventSlugMatch ? eventSlugMatch[1] : null;

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

  // Remove modal state and rendering from Header
  return (
    <header className="sticky top-0 z-20 bg-gray-900 text-white shadow flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-extrabold text-2xl tracking-wide flex items-center gap-2 hover:text-yellow-300 transition">
          <span>Conducky</span> <span role="img" aria-label="duck">🦆</span>
        </Link>
        {user && user.roles && user.roles.includes('SuperAdmin') && (
          <Link href="/superadmin" className="underline font-semibold hover:text-yellow-300 transition">SuperAdmin</Link>
        )}
        {/* Show Submit Report button only on event page */}
        {eventSlug && (
          <SubmitReportNavButton />
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

function SubmitReportNavButton() {
  const { openModal } = useContext(ModalContext);
  const router = useRouter();
  const path = router.asPath;
  const eventSlugMatch = path.match(/^\/event\/([^\/]+)/);
  const eventSlug = eventSlugMatch ? eventSlugMatch[1] : null;
  // We'll fetch the event name in the modal itself
  return (
    <button
      onClick={() => openModal(eventSlug)}
      className="ml-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow-sm font-semibold transition-colors"
    >
      Submit Report
    </button>
  );
}

function MyApp({ Component, pageProps }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventSlugForModal, setEventSlugForModal] = useState(null);
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
  return (
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
      <main className="min-h-screen bg-gray-50 pb-10">
        <Component {...pageProps} />
      </main>
    </ModalContext.Provider>
  );
}

export default MyApp; 