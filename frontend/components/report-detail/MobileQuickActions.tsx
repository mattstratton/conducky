import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  MessageSquare, 
  Upload, 
  Share, 
  ChevronDown,
  Plus,
  Edit
} from "lucide-react";

interface MobileQuickActionsProps {
  canAddComment?: boolean;
  canUploadEvidence?: boolean;
  canEditReport?: boolean;
  onAddComment?: () => void;
  onUploadEvidence?: () => void;
  onEditReport?: () => void;
  onShare?: () => void;
  className?: string;
}

export function MobileQuickActions({
  canAddComment = false,
  canUploadEvidence = false,
  canEditReport = false,
  onAddComment,
  onUploadEvidence,
  onEditReport,
  onShare,
  className = ""
}: MobileQuickActionsProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const actions = [
    {
      id: 'comment',
      label: 'Add Comment',
      icon: MessageSquare,
      onClick: onAddComment,
      show: canAddComment
    },
    {
      id: 'evidence',
      label: 'Upload Evidence',
      icon: Upload,
      onClick: onUploadEvidence,
      show: canUploadEvidence
    },
    {
      id: 'edit',
      label: 'Edit Report',
      icon: Edit,
      onClick: onEditReport,
      show: canEditReport
    },
    {
      id: 'share',
      label: 'Share',
      icon: Share,
      onClick: onShare,
      show: true
    }
  ].filter(action => action.show);

  const handleActionClick = (action: typeof actions[0]) => {
    action.onClick?.();
    setIsExpanded(false);
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 lg:hidden ${className}`}>
      {/* Expanded actions */}
      {isExpanded && (
        <div className="mb-2 space-y-2">
          {actions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <Button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className="w-12 h-12 rounded-full shadow-lg bg-background border border-border hover:bg-muted"
                variant="outline"
                size="sm"
                style={{
                  transform: `translateY(${(actions.length - index - 1) * -60}px)`,
                  transition: 'transform 0.2s ease-out'
                }}
                aria-label={action.label}
              >
                <IconComponent className="h-5 w-5" />
              </Button>
            );
          })}
        </div>
      )}

      {/* Main action button */}
      <Button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-14 h-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        size="sm"
        aria-label={isExpanded ? "Close quick actions" : "Open quick actions"}
      >
        {isExpanded ? (
          <ChevronDown className="h-6 w-6" />
        ) : (
          <Plus className="h-6 w-6" />
        )}
      </Button>

      {/* Backdrop to close when clicking outside */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-[-1] bg-transparent"
          onClick={() => setIsExpanded(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
} 