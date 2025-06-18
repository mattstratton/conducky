import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface IncidentDateEditFormProps {
  initialIncidentAt: string | null;
  onSave: (incidentAt: string | null) => Promise<void>;
  onCancel: () => void;
}

export function IncidentDateEditForm({ initialIncidentAt, onSave, onCancel }: IncidentDateEditFormProps) {
  // Convert ISO string to datetime-local format
  const formatForInput = (dateString: string | null) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
    } catch {
      return "";
    }
  };

  const [incidentAt, setIncidentAt] = useState(formatForInput(initialIncidentAt));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Convert back to ISO string or null
      const valueToSave = incidentAt ? new Date(incidentAt).toISOString() : null;
      await onSave(valueToSave);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        type="datetime-local"
        value={incidentAt}
        onChange={(e) => setIncidentAt(e.target.value)}
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