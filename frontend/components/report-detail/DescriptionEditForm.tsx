import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface DescriptionEditFormProps {
  initialDescription: string;
  onSave: (description: string) => Promise<void>;
  onCancel: () => void;
}

export function DescriptionEditForm({ initialDescription, onSave, onCancel }: DescriptionEditFormProps) {
  const [description, setDescription] = useState(initialDescription || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(description);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Describe what happened..."
        rows={6}
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