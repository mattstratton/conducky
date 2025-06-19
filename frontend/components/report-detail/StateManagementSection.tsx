import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button as AlertDialogAction } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertTriangle, CheckCircle, Clock, XCircle, Eye, FileText, User } from "lucide-react";

interface StateManagementSectionProps {
  currentState: string;
  allowedTransitions: string[];
  onStateChange: (newState: string, notes?: string, assignedTo?: string) => void;
  loading?: boolean;
  error?: string;
  success?: string;
  canChangeState?: boolean;
  eventUsers?: Array<{
    id: string;
    name?: string;
    email?: string;
    roles?: string[];
  }>;
  assignedResponderId?: string;
  stateHistory?: Array<{
    id: string;
    fromState: string;
    toState: string;
    changedBy: string;
    changedAt: string;
    notes?: string;
  }>;
}

const STATE_CONFIGS = {
  submitted: {
    label: "Submitted",
    icon: FileText,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    description: "Report has been submitted and is awaiting review"
  },
  acknowledged: {
    label: "Acknowledged",
    icon: Eye,
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    description: "Report has been acknowledged by the team"
  },
  investigating: {
    label: "Investigating",
    icon: Clock,
    color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
    description: "Report is actively being investigated"
  },
  resolved: {
    label: "Resolved",
    icon: CheckCircle,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    description: "Report has been resolved"
  },
  closed: {
    label: "Closed",
    icon: XCircle,
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    description: "Report is closed and no further action needed"
  }
};

const STATE_ORDER = ["submitted", "acknowledged", "investigating", "resolved", "closed"];

interface TransitionRequirement {
  requiresAssignment?: boolean;
  requiresNotes: boolean;
  message: string;
}

const TRANSITION_REQUIREMENTS: Record<string, TransitionRequirement> = {
  acknowledged: {
    requiresNotes: false,
    message: "Acknowledge this report and optionally add notes about the next steps"
  },
  investigating: {
    requiresAssignment: true,
    requiresNotes: true,
    message: "Investigation requires assignment to a responder and investigation notes"
  },
  resolved: {
    requiresNotes: true,
    message: "Resolution requires notes explaining the outcome"
  },
  closed: {
    requiresNotes: false,
    message: "Closing will finalize this report"
  }
};

export function StateManagementSection({
  currentState,
  allowedTransitions,
  onStateChange,
  loading = false,
  error = "",
  success = "",
  canChangeState = false,
  eventUsers = [],
  assignedResponderId = "",
  stateHistory = []
}: StateManagementSectionProps) {
  const [selectedTransition, setSelectedTransition] = useState<string>("");
  const [transitionNotes, setTransitionNotes] = useState<string>("");
  const [selectedAssignee, setSelectedAssignee] = useState<string>(assignedResponderId);
  const [showDialog, setShowDialog] = useState<boolean>(false);

  const handleTransitionClick = (newState: string) => {
    setSelectedTransition(newState);
    setTransitionNotes("");
    setSelectedAssignee(assignedResponderId);
    setShowDialog(true);
  };

  const handleConfirmTransition = () => {
    const requirements = TRANSITION_REQUIREMENTS[selectedTransition as keyof typeof TRANSITION_REQUIREMENTS];
    
    if (requirements?.requiresNotes && !transitionNotes.trim()) {
      return; // Form validation will show error
    }
    
    if (requirements?.requiresAssignment && !selectedAssignee) {
      return; // Form validation will show error
    }

    onStateChange(selectedTransition, transitionNotes, selectedAssignee);
    setShowDialog(false);
    setSelectedTransition("");
    setTransitionNotes("");
  };

  const getStateConfig = (state: string) => STATE_CONFIGS[state as keyof typeof STATE_CONFIGS];
  const currentStateConfig = getStateConfig(currentState);
  const CurrentStateIcon = currentStateConfig?.icon || FileText;

  const getStatePosition = (state: string) => STATE_ORDER.indexOf(state);
  const currentPosition = getStatePosition(currentState);

  const requirements = selectedTransition ? TRANSITION_REQUIREMENTS[selectedTransition as keyof typeof TRANSITION_REQUIREMENTS] : null;

  return (
    <div className="space-y-6">
      {/* Current State Display */}
      <div className="flex items-center gap-3">
        <CurrentStateIcon className="h-5 w-5" />
        <div>
          <h3 className="font-semibold">Report Status</h3>
          <Badge className={currentStateConfig?.color}>
            {currentStateConfig?.label || currentState}
          </Badge>
          <p className="text-sm text-muted-foreground mt-1">
            {currentStateConfig?.description}
          </p>
        </div>
      </div>

      {/* Visual Workflow Progress */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">Progress Timeline</h4>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STATE_ORDER.map((state, index) => {
            const config = getStateConfig(state);
            const StateIcon = config?.icon || FileText;
            const isActive = state === currentState;
            const isCompleted = getStatePosition(state) < currentPosition;
            const isPossible = allowedTransitions.includes(state);
            
            return (
              <React.Fragment key={state}>
                <div className="flex flex-col items-center min-w-[80px]">
                  <div className={`
                    w-10 h-10 rounded-full border-2 flex items-center justify-center
                    ${isActive 
                      ? 'border-primary bg-primary text-primary-foreground' 
                      : isCompleted 
                        ? 'border-green-500 bg-green-500 text-white'
                        : isPossible && canChangeState
                          ? 'border-orange-400 bg-orange-50 text-orange-600 hover:bg-orange-100 cursor-pointer'
                          : 'border-gray-300 bg-gray-50 text-gray-400'
                    }
                  `}
                  onClick={() => isPossible && canChangeState && handleTransitionClick(state)}
                  title={isPossible && canChangeState ? `Transition to ${config?.label}` : undefined}
                  >
                    <StateIcon className="h-5 w-5" />
                  </div>
                  <span className="text-xs mt-1 text-center font-medium">
                    {config?.label}
                  </span>
                </div>
                {index < STATE_ORDER.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </Card>

      {/* Available Actions */}
      {canChangeState && allowedTransitions.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-3">Available Actions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {allowedTransitions.map((state) => {
              const config = getStateConfig(state);
              const StateIcon = config?.icon || FileText;
              const requirements = TRANSITION_REQUIREMENTS[state as keyof typeof TRANSITION_REQUIREMENTS];
              
              return (
                <Button
                  key={state}
                  variant="outline"
                  className="h-auto min-h-[120px] p-4 flex flex-col items-start gap-2 text-left whitespace-normal"
                  onClick={() => handleTransitionClick(state)}
                  disabled={loading}
                >
                  <div className="flex items-center gap-2 w-full">
                    <StateIcon className="h-4 w-4 flex-shrink-0" />
                    <span className="font-medium">{config?.label}</span>
                  </div>
                  <p className="text-xs text-muted-foreground text-left leading-relaxed break-words whitespace-normal w-full">
                    {config?.description}
                  </p>
                  {requirements && (
                    <div className="flex items-center gap-1 text-xs text-orange-600">
                      <AlertTriangle className="h-3 w-3" />
                      <span>Requires {requirements.requiresAssignment ? 'assignment & ' : ''}notes</span>
                    </div>
                  )}
                </Button>
              );
            })}
          </div>
        </Card>
      )}

      {/* State History */}
      {stateHistory.length > 0 && (
        <Card className="p-4">
          <h4 className="font-medium mb-3">State History</h4>
          <div className="space-y-3">
            {stateHistory.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded">
                <div className="flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="text-xs">
                    {getStateConfig(entry.fromState)?.label} → {getStateConfig(entry.toState)?.label}
                  </Badge>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-3 w-3" />
                    <span>{entry.changedBy}</span>
                    <span className="text-muted-foreground">
                      {new Date(entry.changedAt).toLocaleString()}
                    </span>
                  </div>
                  {entry.notes && (
                    <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Feedback Messages */}
      {(error || success) && (
        <div className="space-y-2">
          {error && (
            <div className="text-destructive text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}
          {success && (
            <div className="text-green-600 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              {success}
            </div>
          )}
        </div>
      )}

      {/* Transition Dialog */}
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Transition to {getStateConfig(selectedTransition)?.label}
            </AlertDialogTitle>
            <div className="text-sm text-muted-foreground">
              {requirements?.message}
            </div>
          </AlertDialogHeader>
          
          <div className="space-y-4">
            {/* Assignment Selection */}
            {requirements?.requiresAssignment && (
              <div>
                <label htmlFor="assignee" className="block text-sm font-medium mb-2">
                  Assign to Responder *
                </label>
                <select
                  id="assignee"
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="w-full p-2 border border-input rounded-md bg-background"
                  required
                >
                  <option value="">Select a responder...</option>
                  {eventUsers
                    .filter(user => user.roles?.some((role: string) => 
                      ['responder', 'admin'].includes(role.toLowerCase())
                    ))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Notes Input */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium mb-2">
                {requirements?.requiresNotes ? 'Notes *' : 'Notes (optional)'}
              </label>
              <textarea
                id="notes"
                value={transitionNotes}
                onChange={(e) => setTransitionNotes(e.target.value)}
                placeholder={
                  selectedTransition === 'investigating' 
                    ? 'Describe the investigation plan and next steps...'
                    : selectedTransition === 'resolved'
                      ? 'Describe how the issue was resolved...'
                      : 'Add any relevant notes...'
                }
                className="w-full p-2 border border-input rounded-md bg-background min-h-[100px]"
                required={requirements?.requiresNotes}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDialog(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmTransition}
              disabled={
                loading ||
                (requirements?.requiresNotes && !transitionNotes.trim()) ||
                (requirements?.requiresAssignment && !selectedAssignee)
              }
            >
              {loading ? 'Processing...' : `Change to ${getStateConfig(selectedTransition)?.label}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
} 