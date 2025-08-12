import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button as AlertDialogAction } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, AlertTriangle, CheckCircle, Clock, XCircle, Eye, FileText, User, Pencil } from "lucide-react";

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
  // Severity editing props
  severity?: string;
  canEditSeverity?: boolean;
  onSeverityChange?: (severity: string) => void;
  // New: Reopen handler
  onReopen?: (notes: string, assignedToUserId?: string) => Promise<{ success: boolean; error?: string }> | void;
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
  stateHistory = [],
  // Severity editing props
  severity = "",
  canEditSeverity = false,
  onSeverityChange,
  onReopen
}: StateManagementSectionProps) {
  const [selectedTransition, setSelectedTransition] = useState<string>("");
  const [transitionNotes, setTransitionNotes] = useState<string>("");
  const [selectedAssignee, setSelectedAssignee] = useState<string>(assignedResponderId);
  const [showDialog, setShowDialog] = useState<boolean>(false);

  // Reopen modal state
  const [showReopenDialog, setShowReopenDialog] = useState<boolean>(false);
  const [reopenNotes, setReopenNotes] = useState<string>("");
  const [reopenAssignee, setReopenAssignee] = useState<string>("");
  const [reopenSubmitting, setReopenSubmitting] = useState<boolean>(false);
  const [reopenError, setReopenError] = useState<string>("");
  
  // Severity editing state
  const [editingSeverity, setEditingSeverity] = useState<boolean>(false);
  const [localSeverity, setLocalSeverity] = useState<string>(severity);

  const handleTransitionClick = (newState: string) => {
    setSelectedTransition(newState);
    setTransitionNotes("");
    setSelectedAssignee(assignedResponderId || ""); // Preserve current assignee
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

    if (onStateChange) {
      onStateChange(selectedTransition, transitionNotes, selectedAssignee);
    }
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

  // Severity editing functions
  const handleSeverityEdit = () => {
    setEditingSeverity(true);
    setLocalSeverity(severity);
  };

  const handleSeveritySave = () => {
    if (onSeverityChange) {
      onSeverityChange(localSeverity);
    }
    setEditingSeverity(false);
  };

  const handleSeverityCancel = () => {
    setLocalSeverity(severity);
    setEditingSeverity(false);
  };

  const canShowReopen = canChangeState && (currentState === 'resolved' || currentState === 'closed');

  const submitReopen = async () => {
    if (!onReopen) {
      setShowReopenDialog(false);
      return;
    }
    if (!reopenNotes.trim()) {
      setReopenError('Notes are required to reopen an incident.');
      return;
    }
    setReopenSubmitting(true);
    setReopenError("");
    try {
      const result = await onReopen(reopenNotes, reopenAssignee || undefined);
      if (result && !result.success) {
        setReopenError(result.error || 'Failed to reopen incident.');
        setReopenSubmitting(false);
        return;
      }
      setShowReopenDialog(false);
      setReopenNotes("");
      setReopenAssignee("");
    } catch (e) {
      setReopenError(e instanceof Error ? e.message : 'Failed to reopen incident.');
    } finally {
      setReopenSubmitting(false);
    }
  };

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

      {/* Severity Section - Only show to responders and above */}
      {canEditSeverity && (
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <div className="flex-1">
            <h3 className="font-semibold">Severity</h3>
            {editingSeverity ? (
              <div className="flex items-center gap-2 mt-1">
                <select
                  value={localSeverity}
                  onChange={(e) => setLocalSeverity(e.target.value)}
                  className="border px-2 py-1 rounded bg-background text-foreground"
                  disabled={loading}
                >
                  <option value="">(none)</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <Button size="sm" onClick={handleSeveritySave} disabled={loading}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleSeverityCancel}>
                  Cancel
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                {severity ? (
                  <Badge 
                    variant="secondary"
                    className={
                      severity === 'critical' ? 'bg-red-100 text-red-800 border-red-200' :
                      severity === 'high' ? 'bg-orange-100 text-orange-800 border-orange-200' :
                      severity === 'medium' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                      severity === 'low' ? 'bg-blue-100 text-blue-800 border-blue-200' :
                      'bg-gray-100 text-gray-800 border-gray-200'
                    }
                  >
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">(none)</span>
                )}
                <button 
                  type="button" 
                  onClick={handleSeverityEdit}
                  className="p-1 rounded hover:bg-muted" 
                  aria-label="Edit severity"
                  disabled={loading}
                >
                  <Pencil size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Visual Workflow Progress */}
      <Card className="p-4">
        <h4 className="font-medium mb-3">Progress Timeline</h4>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {STATE_ORDER.map((state, index) => {
            const config = getStateConfig(state);
            const StateIcon = config?.icon || FileText;
            const isActive = state === currentState;
            const isCompleted = getStatePosition(state) < currentPosition;
            const isPossible = canChangeState && allowedTransitions.includes(state); // Restore proper allowedTransitions logic
            
            // Find when this state was reached from state history
            const stateEntry = stateHistory.find(entry => entry.toState === state);
            const stateTimestamp = stateEntry ? new Date(stateEntry.changedAt).toLocaleString() : null;
            
            return (
              <React.Fragment key={state}>
                <div className="flex flex-col items-center min-w-[100px]">
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
                  {/* Show timestamp if state was reached */}
                  {(isActive || isCompleted) && stateTimestamp && (
                    <span className="text-xs mt-1 text-center text-muted-foreground">
                      {stateTimestamp}
                    </span>
                  )}
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
      {(canChangeState && (allowedTransitions.length > 0 || canShowReopen)) && (
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
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto pt-2">
                      {requirements.requiresNotes && <FileText size={12} />}
                      {requirements.requiresAssignment && <User size={12} />}
                    </div>
                  )}
                </Button>
              );
            })}

            {/* Reopen Action, shown when state is resolved or closed */}
            {canShowReopen && (
              <Button
                key="reopen"
                variant="outline"
                className="h-auto min-h-[120px] p-4 flex flex-col items-start gap-2 text-left whitespace-normal border-blue-300 hover:bg-blue-50"
                onClick={() => setShowReopenDialog(true)}
                disabled={loading}
              >
                <div className="flex items-center gap-2 w-full">
                  <ArrowRight className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">Reopen</span>
                </div>
                <p className="text-xs text-muted-foreground text-left leading-relaxed break-words whitespace-normal w-full">
                  Reopen this report with required notes. Optionally assign to a responder to move directly into investigation.
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-auto pt-2">
                  <FileText size={12} />
                </div>
              </Button>
            )}
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
      {requirements && (
        <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <ArrowRight className="h-5 w-5" />
                <AlertDialogTitle>Change Status to {getStateConfig(selectedTransition)?.label}</AlertDialogTitle>
              </div>
            </AlertDialogHeader>
            <div className="space-y-3">
              {requirements?.requiresNotes && (
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    className="w-full border rounded p-2 min-h-[100px]"
                    placeholder="Add notes explaining this change..."
                    value={transitionNotes}
                    onChange={(e) => setTransitionNotes(e.target.value)}
                  />
                  {!transitionNotes.trim() && (
                    <div className="text-xs text-muted-foreground mt-1">Notes are required for this transition.</div>
                  )}
                </div>
              )}
              {requirements?.requiresAssignment && (
                <div>
                  <label className="block text-sm font-medium mb-1">Assign to</label>
                  <select
                    className="w-full border rounded p-2"
                    value={selectedAssignee}
                    onChange={(e) => setSelectedAssignee(e.target.value)}
                  >
                    <option value="">Select a responder...</option>
                    {eventUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name || u.email}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmTransition}
                disabled={
                  loading ||
                  (requirements?.requiresNotes && !transitionNotes.trim()) ||
                  (requirements?.requiresAssignment && !selectedAssignee)
                }
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Reopen Dialog */}
      {canShowReopen && (
        <AlertDialog open={showReopenDialog} onOpenChange={setShowReopenDialog}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <div className="flex items-center gap-3">
                <ArrowRight className="h-5 w-5" />
                <AlertDialogTitle>Reopen Report</AlertDialogTitle>
              </div>
            </AlertDialogHeader>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Notes (required)</label>
                <textarea
                  className="w-full border rounded p-2 min-h-[100px]"
                  placeholder="Explain why this report is being reopened..."
                  value={reopenNotes}
                  onChange={(e) => setReopenNotes(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign to (optional)</label>
                <select
                  className="w-full border rounded p-2"
                  value={reopenAssignee}
                  onChange={(e) => setReopenAssignee(e.target.value)}
                >
                  <option value="">No assignee</option>
                  {eventUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name || u.email}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">If assigned, the report will move to Investigating; otherwise it will move to Acknowledged.</p>
              </div>
              {reopenError && (
                <div className="text-destructive text-sm">{reopenError}</div>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={reopenSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={submitReopen} disabled={reopenSubmitting || !reopenNotes.trim()}>
                {reopenSubmitting ? 'Reopening...' : 'Reopen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

export default StateManagementSection; 