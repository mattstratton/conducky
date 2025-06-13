import React from "react";
import { Button } from "@/components/ui/button";

interface EvidenceSectionProps {
  evidenceFiles: any[];
  apiBaseUrl: string;
  user: any;
  report: any;
  isResponderOrAbove: boolean;
  deletingEvidenceId: string | null;
  setDeletingEvidenceId: (id: string | null) => void;
  onEvidenceDelete?: (file: any) => void;
  onEvidenceUpload?: (files: File[]) => void;
  evidenceUploadMsg?: string;
  newEvidence: File[];
  setNewEvidence: (files: File[]) => void;
}

export function EvidenceSection({
  evidenceFiles,
  apiBaseUrl,
  user,
  report,
  isResponderOrAbove,
  deletingEvidenceId,
  setDeletingEvidenceId,
  onEvidenceDelete,
  onEvidenceUpload,
  evidenceUploadMsg = "",
  newEvidence,
  setNewEvidence,
}: EvidenceSectionProps) {
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-2">Evidence Files</h3>
      {(!report || !evidenceFiles) ? (
        <div className="text-gray-500 dark:text-gray-400">No evidence files.</div>
      ) : evidenceFiles.length > 0 ? (
        <ul className="space-y-1">
          {evidenceFiles.map((file: any) => (
            <li key={file.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <a href={`${apiBaseUrl}/evidence/${file.id}/download`} target="_blank" rel="noopener noreferrer" className="text-blue-500 dark:text-blue-400 underline">{file.filename}</a>
              <span className="text-xs text-gray-500 dark:text-gray-400">{file.uploader ? `${file.uploader.name || file.uploader.email || 'Unknown'}` : 'Unknown'}</span>
              {isResponderOrAbove && (
                deletingEvidenceId === file.id ? (
                  <>
                    <Button onClick={() => onEvidenceDelete && onEvidenceDelete(file)} className="bg-red-600 text-white px-2 py-1 text-xs">Confirm Delete</Button>
                    <Button onClick={() => setDeletingEvidenceId(null)} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 text-xs">Cancel</Button>
                  </>
                ) : (
                  <Button onClick={() => setDeletingEvidenceId(file.id)} className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white px-2 py-1 text-xs">Delete</Button>
                )
              )}
            </li>
          ))}
        </ul>
      ) : <div className="text-gray-500 dark:text-gray-400">No evidence files.</div>}
      {((isResponderOrAbove || (user && report && user.id === report.reporterId)) && onEvidenceUpload) && (
        <form onSubmit={e => { e.preventDefault(); onEvidenceUpload(newEvidence); setNewEvidence([]); }} className="mt-4 flex flex-col sm:flex-row gap-2 items-start">
          <label htmlFor="evidence-upload-input" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Evidence Files</label>
          <input
            id="evidence-upload-input"
            type="file"
            multiple
            onChange={e => setNewEvidence(Array.from(e.target.files || []))}
            className="block border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <Button type="submit" className="bg-blue-600 text-white px-3 py-1 text-sm">Upload Evidence</Button>
          {evidenceUploadMsg && <span className="text-green-600 dark:text-green-400 text-sm ml-2">{evidenceUploadMsg}</span>}
        </form>
      )}
    </div>
  );
} 