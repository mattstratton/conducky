import React, { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface ContactPreferenceEditFormProps {
  initialContactPreference: string;
  onSave: (contactPreference: string) => Promise<void>;
  onCancel: () => void;
}

export function ContactPreferenceEditForm({ initialContactPreference, onSave, onCancel }: ContactPreferenceEditFormProps) {
  const [contactPreference, setContactPreference] = useState(initialContactPreference || "email");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(contactPreference);
    } finally {
      setSaving(false);
    }
  };



  return (
    <div className="flex flex-col gap-2">
      <Select value={contactPreference} onValueChange={setContactPreference} disabled={saving}>
        <SelectTrigger>
          <SelectValue placeholder="Select contact preference" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="email">Email</SelectItem>
          <SelectItem value="phone">Phone</SelectItem>
          <SelectItem value="in_person">In Person</SelectItem>
          <SelectItem value="no_contact">No Contact Preferred</SelectItem>
        </SelectContent>
      </Select>
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