import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LocationEditFormProps {
  initialLocation: string;
  onSave: (location: string) => Promise<void>;
  onCancel: () => void;
}

export function LocationEditForm({ initialLocation, onSave, onCancel }: LocationEditFormProps) {
  const [location, setLocation] = useState(initialLocation || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(location);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Enter location where incident occurred"
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