import React, { useState } from 'react';
import { Button } from '@/components/ui/button';

interface User { id: string; name?: string; email?: string }

interface IncidentActionsProps {
  state: string;
  isResponderOrAbove: boolean;
  eventUsers: User[];
  onReopen: (notes: string, assignedToUserId?: string) => Promise<{ success: boolean; error?: string }>;
}

const IncidentActions: React.FC<IncidentActionsProps> = ({ state, isResponderOrAbove, eventUsers, onReopen }) => {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [assignee, setAssignee] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReopen = isResponderOrAbove && (state === 'resolved' || state === 'closed');

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await onReopen(notes.trim(), assignee || undefined);
    if (!result.success) {
      setError(result.error || 'Failed to reopen');
    } else {
      setOpen(false);
      setNotes('');
      setAssignee('');
    }
    setSubmitting(false);
  };

  if (!canReopen) return null;

  return (
    <div className="mt-4">
      <Button variant="default" onClick={() => setOpen(true)}>Reopen Incident</Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background text-foreground w-full max-w-md rounded-md shadow p-4">
            <h2 className="text-lg font-semibold mb-2">Reopen Incident</h2>
            <p className="text-sm text-muted-foreground mb-3">Provide a note explaining why this incident is being reopened. Optionally assign to a responder to move directly to Investigating; otherwise it will be set to Acknowledged.</p>
            <label className="block text-sm font-medium mb-1" htmlFor="reopen-notes">Notes</label>
            <textarea id="reopen-notes" className="w-full border rounded px-2 py-1 mb-2 bg-background text-foreground min-h-[80px]" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add context for reopening..." />
            <label className="block text-sm font-medium mb-1" htmlFor="reopen-assignee">Assign to (optional)</label>
            <select id="reopen-assignee" className="w-full border rounded px-2 py-1 mb-3 bg-background text-foreground" value={assignee} onChange={e => setAssignee(e.target.value)}>
              <option value="">(unassigned)</option>
              {eventUsers.map(u => (
                <option key={u.id} value={u.id}>{u.name || u.email || 'Unknown'}</option>
              ))}
            </select>
            {error && <div className="text-sm text-red-600 mb-2" role="alert">{error}</div>}
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => { setOpen(false); setError(null); }} disabled={submitting}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting || notes.trim().length === 0}>{submitting ? 'Reopening...' : 'Reopen'}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IncidentActions;
