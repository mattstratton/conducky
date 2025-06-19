import React, { useState } from "react";
import { Pencil } from "lucide-react";
import { LocationEditForm } from "./LocationEditForm";
import { ContactPreferenceEditForm } from "./ContactPreferenceEditForm";
import { IncidentDateEditForm } from "./IncidentDateEditForm";
import { PartiesEditForm } from "./PartiesEditForm";
import { DescriptionEditForm } from "./DescriptionEditForm";
import { TypeEditForm } from "./TypeEditForm";

interface ReportMetaTableProps {
  id: string;
  type: string;
  description: string;
  reporter?: { name?: string; email?: string } | null;
  location?: string | null;
  contactPreference?: string;
  incidentAt?: string | null;
  parties?: string | null;
  // Edit permissions and handlers
  canEditLocation?: boolean;
  canEditContactPreference?: boolean;
  canEditIncidentAt?: boolean;
  canEditParties?: boolean;
  canEditDescription?: boolean;
  canEditType?: boolean;
  onLocationEdit?: (location: string) => Promise<void>;
  onContactPreferenceEdit?: (contactPreference: string) => Promise<void>;
  onIncidentAtEdit?: (incidentAt: string | null) => Promise<void>;
  onPartiesEdit?: (parties: string | null) => Promise<void>;
  onDescriptionEdit?: (description: string) => Promise<void>;
  onTypeEdit?: (type: string) => Promise<void>;
}

export function ReportMetaTable({ 
  id, 
  type, 
  description, 
  reporter, 
  location, 
  contactPreference, 
  incidentAt, 
  parties,
  canEditLocation = false,
  canEditContactPreference = false,
  canEditIncidentAt = false,
  canEditParties = false,
  canEditDescription = false,
  canEditType = false,
  onLocationEdit,
  onContactPreferenceEdit,
  onIncidentAtEdit,
  onPartiesEdit,
  onDescriptionEdit,
  onTypeEdit
}: ReportMetaTableProps) {
  const [editingField, setEditingField] = useState<string | null>(null);

  // Format contact preference for display
  const formatContactPreference = (pref?: string) => {
    switch (pref) {
      case 'email': return 'Email';
      case 'phone': return 'Phone';
      case 'in_person': return 'In Person';
      case 'no_contact': return 'No Contact Preferred';
      default: return 'Email'; // default
    }
  };

  // Format incident date for display
  const formatIncidentDate = (dateString?: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  };

  // Format type for display
  const formatType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const handleEdit = async (field: string, value: string | null) => {
    try {
      switch (field) {
        case 'location':
          await onLocationEdit?.(value || "");
          break;
        case 'contactPreference':
          await onContactPreferenceEdit?.(value || "email");
          break;
        case 'incidentAt':
          await onIncidentAtEdit?.(value);
          break;
        case 'parties':
          await onPartiesEdit?.(value);
          break;
        case 'description':
          await onDescriptionEdit?.(value || "");
          break;
        case 'type':
          await onTypeEdit?.(value || "other");
          break;
      }
      setEditingField(null);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to update ${field}:`, error);
      }
      // Error handling is done by the parent component
    }
  };

  const renderEditableField = (
    fieldName: string,
    displayValue: React.ReactNode,
    canEdit: boolean,
    editForm: React.ReactNode
  ) => {
    if (editingField === fieldName) {
      return editForm;
    }

    return (
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {displayValue}
        </div>
        {canEdit && (
          <button 
            type="button" 
            onClick={() => setEditingField(fieldName)} 
            className="flex-shrink-0 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 touch-manipulation" 
            aria-label={`Edit ${fieldName}`}
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
    );
  };

  const MetaField = ({ 
    label, 
    children, 
    className = "" 
  }: { 
    label: string; 
    children: React.ReactNode; 
    className?: string; 
  }) => (
    <div className={`px-4 sm:px-6 py-3 border-b border-border last:border-b-0 ${className}`}>
      <div className="text-sm font-medium text-muted-foreground mb-1">
        {label}
      </div>
      <div className="text-sm">
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-0 bg-background rounded-lg border">
      <MetaField label="Report ID">
        <span className="font-mono text-xs bg-muted px-2 py-1 rounded">
          {id}
        </span>
      </MetaField>

      <MetaField label="Type">
        {renderEditableField(
          'type',
          <span className="font-medium">{formatType(type)}</span>,
          canEditType,
          <TypeEditForm
            initialType={type}
            onSave={(value) => handleEdit('type', value)}
            onCancel={() => setEditingField(null)}
          />
        )}
      </MetaField>

      <MetaField label="Description">
        {renderEditableField(
          'description',
          <div className="whitespace-pre-wrap break-words text-foreground">
            {description}
          </div>,
          canEditDescription,
          <DescriptionEditForm
            initialDescription={description}
            onSave={(value) => handleEdit('description', value)}
            onCancel={() => setEditingField(null)}
          />
        )}
      </MetaField>

      <MetaField label="Reporter">
        <span className="font-medium">
          {reporter ? (reporter.name || reporter.email || 'Anonymous') : 'Anonymous'}
        </span>
      </MetaField>

      {(incidentAt || canEditIncidentAt) && (
        <MetaField label="Incident Date">
          {renderEditableField(
            'incidentAt',
            formatIncidentDate(incidentAt) ? (
              <span className="font-medium">{formatIncidentDate(incidentAt)}</span>
            ) : (
              <span className="italic text-muted-foreground">Not specified</span>
            ),
            canEditIncidentAt,
            <IncidentDateEditForm
              initialIncidentAt={incidentAt || null}
              onSave={(value) => handleEdit('incidentAt', value)}
              onCancel={() => setEditingField(null)}
            />
          )}
        </MetaField>
      )}

      {(location || canEditLocation) && (
        <MetaField label="Location">
          {renderEditableField(
            'location',
            location ? (
              <span className="font-medium">{location}</span>
            ) : (
              <span className="italic text-muted-foreground">Not specified</span>
            ),
            canEditLocation,
            <LocationEditForm
              initialLocation={location || ""}
              onSave={(value) => handleEdit('location', value)}
              onCancel={() => setEditingField(null)}
            />
          )}
        </MetaField>
      )}

      {(parties || canEditParties) && (
        <MetaField label="Parties Involved">
          {renderEditableField(
            'parties',
            parties ? (
              <div className="whitespace-pre-wrap break-words font-medium">
                {parties}
              </div>
            ) : (
              <span className="italic text-muted-foreground">Not specified</span>
            ),
            canEditParties,
            <PartiesEditForm
              initialParties={parties || null}
              onSave={(value) => handleEdit('parties', value)}
              onCancel={() => setEditingField(null)}
            />
          )}
        </MetaField>
      )}

      <MetaField label="Contact Preference">
        {renderEditableField(
          'contactPreference',
          <span className="font-medium">{formatContactPreference(contactPreference)}</span>,
          canEditContactPreference,
          <ContactPreferenceEditForm
            initialContactPreference={contactPreference || "email"}
            onSave={(value) => handleEdit('contactPreference', value)}
            onCancel={() => setEditingField(null)}
          />
        )}
      </MetaField>
    </div>
  );
} 