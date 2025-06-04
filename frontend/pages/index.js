import { useEffect, useState } from 'react';

export default function Home() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000')
      .then(res => res.json())
      .then(data => setMessage(data.message))
      .catch(() => setMessage('Could not connect to backend.'));
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 40 }}>
      <h1>Code of Conduct Report Management System</h1>
      <p>Backend says: {message}</p>
    </div>
  );
} 