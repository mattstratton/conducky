import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Image, Download, Trash2, Upload } from "lucide-react";

interface EvidenceSectionProps {
  evidenceFiles: any[];
  apiBaseUrl: string;
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
  const [viewMode, setViewMode] = useState<'list' | 'gallery'>('gallery');
  
  const getFileIcon = (mimetype?: string) => {
    if (mimetype && mimetype.startsWith('image/')) {
      return Image;
    }
    return FileText;
  };

  const getFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };



  const EvidenceCard = ({ file }: { file: any }) => {
    const FileIcon = getFileIcon(file.mimetype);
    
    return (
      <div className="border border-border rounded-lg p-3 space-y-3 bg-background">
        {/* File Icon */}
        <div className="flex items-center justify-center h-20 bg-muted rounded-lg">
          <FileIcon className="h-8 w-8 text-muted-foreground" />
        </div>
        
        {/* File Info */}
        <div className="space-y-1">
          <div className="text-sm font-medium truncate" title={file.filename}>
            {file.filename}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <div>{getFileSize(file.size)}</div>
            {file.uploader && (
              <div className="truncate">
                By: {file.uploader.name || file.uploader.email || 'Unknown'}
              </div>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9"
            asChild
          >
            <a 
              href={`${apiBaseUrl}/api/evidence/${file.id}/download`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 no-underline"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </a>
          </Button>
          
          {isResponderOrAbove && (
            deletingEvidenceId === file.id ? (
              <div className="flex gap-1">
                <Button 
                  variant="destructive" 
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => onEvidenceDelete && onEvidenceDelete(file)}
                >
                  Confirm
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9 px-3"
                  onClick={() => setDeletingEvidenceId(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-3"
                onClick={() => setDeletingEvidenceId(file.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </div>
    );
  };

  const EvidenceListItem = ({ file }: { file: any }) => {
    const FileIcon = getFileIcon(file.mimetype);
    
    return (
      <div className="flex items-center gap-3 p-3 border border-border rounded-lg bg-background">
        <div className="flex-shrink-0">
          <FileIcon className="h-6 w-6 text-muted-foreground" />
        </div>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="text-sm font-medium truncate">
            {file.filename}
          </div>
          <div className="text-xs text-muted-foreground">
            {getFileSize(file.size)}
            {file.uploader && (
              <span className="ml-2">
                by {file.uploader.name || file.uploader.email || 'Unknown'}
              </span>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a 
              href={`${apiBaseUrl}/api/evidence/${file.id}/download`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2 no-underline"
            >
              <Download className="h-4 w-4" />
            </a>
          </Button>
          
          {isResponderOrAbove && (
            deletingEvidenceId === file.id ? (
              <div className="flex gap-1">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => onEvidenceDelete && onEvidenceDelete(file)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setDeletingEvidenceId(null)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingEvidenceId(file.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* View Toggle (mobile only) */}
      {evidenceFiles.length > 0 && (
        <div className="flex items-center justify-between sm:hidden">
          <div className="text-sm text-muted-foreground">
            {evidenceFiles.length} file{evidenceFiles.length !== 1 ? 's' : ''}
          </div>
          <div className="flex rounded-md border">
            <button
              onClick={() => setViewMode('gallery')}
              className={`px-3 py-1 text-sm rounded-l-md ${
                viewMode === 'gallery' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-background hover:bg-muted'
              }`}
            >
              Gallery
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 text-sm rounded-r-md ${
                viewMode === 'list' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-background hover:bg-muted'
              }`}
            >
              List
            </button>
          </div>
        </div>
      )}

      {/* Evidence Display */}
      {(!report || !evidenceFiles) ? (
        <div className="text-muted-foreground text-center py-8">
          No evidence files.
        </div>
      ) : evidenceFiles.length > 0 ? (
        <div className={
          viewMode === 'gallery' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" 
            : "space-y-3"
        }>
          {evidenceFiles.map((file: any) => (
            <div key={file.id}>
              {viewMode === 'gallery' ? (
                <EvidenceCard file={file} />
              ) : (
                <EvidenceListItem file={file} />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground text-center py-8">
          No evidence files.
        </div>
      )}
      
      {/* Upload Section */}
      {report && (
        <div className="border-t border-border pt-4 space-y-3">
          <form 
            onSubmit={e => { 
              e.preventDefault(); 
              onEvidenceUpload?.(newEvidence); 
              setNewEvidence([]); 
            }} 
            className="space-y-3"
          >
            <div className="space-y-2">
              <label 
                htmlFor="evidence-upload-input" 
                className="block text-sm font-medium"
              >
                Add Evidence Files
              </label>
              <input
                id="evidence-upload-input"
                type="file"
                multiple
                onChange={e => setNewEvidence(Array.from(e.target.files || []))}
                className="block w-full text-sm border border-border rounded-lg px-3 py-2 bg-background file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
            </div>
            
            {newEvidence.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">
                  Selected files ({newEvidence.length}):
                </div>
                <div className="space-y-1">
                  {newEvidence.map((file, index) => (
                    <div key={index} className="text-sm bg-muted px-2 py-1 rounded">
                      {file.name} ({getFileSize(file.size)})
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3">
              <Button 
                type="submit" 
                disabled={newEvidence.length === 0}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Upload Evidence
              </Button>
              
              {evidenceUploadMsg && (
                <span className="text-sm text-green-600 dark:text-green-400">
                  {evidenceUploadMsg}
                </span>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
} 