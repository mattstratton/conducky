import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

interface AssignmentSectionProps {
  assignmentFields: {
    assignedResponderId?: string;
    severity?: string;
    resolution?: string;
    [key: string]: any;
  };
  setAssignmentFields: (f: any) => void;
  eventUsers: any[];
  loading?: boolean;
  error?: string;
  success?: string;
  onSave: () => void;
}

export function AssignmentSection({
  assignmentFields,
  setAssignmentFields,
  eventUsers,
  loading = false,
  error = "",
  success = "",
  onSave,
}: AssignmentSectionProps) {
  const [editingField, setEditingField] = useState<null | "assignedResponderId" | "severity" | "resolution">(
    null
  );
  const [localFields, setLocalFields] = useState(assignmentFields);

  // When entering edit mode, copy current values
  function startEdit(field: "assignedResponderId" | "severity" | "resolution") {
    setEditingField(field);
    setLocalFields(assignmentFields);
  }

  function handleFieldChange(field: string, value: string) {
    setLocalFields((f: any) => ({ ...f, [field]: value }));
  }

  function handleSave() {
    setAssignmentFields((f: any) => ({ ...f, ...localFields }));
    setEditingField(null);
    onSave();
  }

  function handleCancel() {
    setEditingField(null);
    setLocalFields(assignmentFields);
  }

  return (
    <div className="space-y-4">
      {/* Assigned Responder */}
      <div className="mb-2">
        <label htmlFor="assigned-responder" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Assigned Responder</label>
        <div>
          {editingField === "assignedResponderId" ? (
            <div className="flex items-center gap-2">
              <select
                id="assigned-responder"
                value={localFields.assignedResponderId || ''}
                onChange={e => handleFieldChange("assignedResponderId", e.target.value)}
                className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100"
                disabled={loading}
              >
                <option value="">(unassigned)</option>
                {eventUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>{u.name || u.email || 'Unknown'}</option>
                ))}
              </select>
              <Button type="button" onClick={handleSave} disabled={loading} className="bg-blue-600 text-white px-2 py-1 text-xs">Save</Button>
              <Button type="button" onClick={handleCancel} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 text-xs">Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>
                {assignmentFields.assignedResponderId
                  ? eventUsers.find((u: any) => u.id === assignmentFields.assignedResponderId)?.name ||
                    eventUsers.find((u: any) => u.id === assignmentFields.assignedResponderId)?.email ||
                    'Unknown'
                  : '(unassigned)'}
              </span>
              <button type="button" onClick={() => startEdit("assignedResponderId")}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Edit assigned responder">
                <Pencil size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Severity */}
      <div className="mb-2">
        <label htmlFor="severity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Severity</label>
        <div>
          {editingField === "severity" ? (
            <div className="flex items-center gap-2">
              <select
                id="severity"
                value={localFields.severity || ''}
                onChange={e => handleFieldChange("severity", e.target.value)}
                className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100"
                disabled={loading}
              >
                <option value="">(none)</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <Button type="button" onClick={handleSave} disabled={loading} className="bg-blue-600 text-white px-2 py-1 text-xs">Save</Button>
              <Button type="button" onClick={handleCancel} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 text-xs">Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{assignmentFields.severity || '(none)'}</span>
              <button type="button" onClick={() => startEdit("severity")}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Edit severity">
                <Pencil size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Resolution */}
      <div className="mb-2">
        <label htmlFor="resolution" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Resolution</label>
        <div>
          {editingField === "resolution" ? (
            <div className="flex items-center gap-2">
              <textarea
                id="resolution"
                value={localFields.resolution || ''}
                onChange={e => handleFieldChange("resolution", e.target.value)}
                className="border px-2 py-1 rounded w-full dark:bg-gray-800 dark:text-gray-100 min-h-[60px]"
                placeholder="Enter resolution details (required if resolved/closed)"
                disabled={loading}
              />
              <Button type="button" onClick={handleSave} disabled={loading} className="bg-blue-600 text-white px-2 py-1 text-xs">Save</Button>
              <Button type="button" onClick={handleCancel} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 text-xs">Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span>{assignmentFields.resolution || <span className="italic text-gray-400">(none)</span>}</span>
              <button type="button" onClick={() => startEdit("resolution")}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" aria-label="Edit resolution">
                <Pencil size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Feedback */}
      {(error || success) && (
        <div className="flex gap-4 items-center mt-2">
          {error && <span className="text-red-600 dark:text-red-400">{error}</span>}
          {success && <span className="text-green-600 dark:text-green-400">{success}</span>}
        </div>
      )}
    </div>
  );
} 