import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface PartiesEditFormProps {
  initialParties: string | null;
  onSave: (parties: string | null) => Promise<void>;
  onCancel: () => void;
}

export function PartiesEditForm({ initialParties, onSave, onCancel }: PartiesEditFormProps) {
  const [parties, setParties] = useState(initialParties || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const valueToSave = parties.trim() || null;
      await onSave(valueToSave);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={parties}
        onChange={(e) => setParties(e.target.value)}
        placeholder="List parties involved (comma-separated or freeform)"
        rows={3}
        disabled={saving}
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
} 