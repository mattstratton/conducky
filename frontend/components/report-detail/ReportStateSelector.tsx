import React from "react";

interface ReportStateSelectorProps {
  currentState: string;
  allowedTransitions: string[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  loading?: boolean;
  error?: string;
  success?: string;
}

export function ReportStateSelector({
  currentState,
  allowedTransitions,
  onChange,
  loading = false,
  error = "",
  success = "",
}: ReportStateSelectorProps) {
  return (
    <div className="w-full max-w-xs">
      <label htmlFor="report-state" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
      <select
        id="report-state"
        value={currentState}
        onChange={onChange}
        disabled={loading}
        className="px-3 py-2 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full"
      >
        <option value={currentState}>{currentState}</option>
        {allowedTransitions.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      {error && <div className="text-red-500 text-xs mt-1">{error}</div>}
      {success && <div className="text-green-500 text-xs mt-1">{success}</div>}
    </div>
  );
} 