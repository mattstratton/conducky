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
      console.error(`Failed to update ${field}:`, error);
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
      <span className="flex items-center gap-2">
        {displayValue}
        {canEdit && (
          <button 
            type="button" 
            onClick={() => setEditingField(fieldName)} 
            className="ml-2 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" 
            aria-label={`Edit ${fieldName}`}
          >
            <Pencil size={14} />
          </button>
        )}
      </span>
    );
  };

  return (
    <table className="w-full border-collapse mb-4">
      <tbody>
        <tr>
          <td className="font-bold w-32">ID</td>
          <td>{id}</td>
        </tr>
        <tr>
          <td className="font-bold">Type</td>
          <td>
            {renderEditableField(
              'type',
              formatType(type),
              canEditType,
              <TypeEditForm
                initialType={type}
                onSave={(value) => handleEdit('type', value)}
                onCancel={() => setEditingField(null)}
              />
            )}
          </td>
        </tr>
        <tr>
          <td className="font-bold">Description</td>
          <td>
            {renderEditableField(
              'description',
              <div className="whitespace-pre-wrap break-words max-w-md">{description}</div>,
              canEditDescription,
              <DescriptionEditForm
                initialDescription={description}
                onSave={(value) => handleEdit('description', value)}
                onCancel={() => setEditingField(null)}
              />
            )}
          </td>
        </tr>
        <tr>
          <td className="font-bold">Reporter</td>
          <td>{reporter ? (reporter.name || reporter.email || 'Anonymous') : 'Anonymous'}</td>
        </tr>
        {(incidentAt || canEditIncidentAt) && (
          <tr>
            <td className="font-bold">Incident Date</td>
            <td>
              {renderEditableField(
                'incidentAt',
                formatIncidentDate(incidentAt) || <span className="italic text-gray-400">Not specified</span>,
                canEditIncidentAt,
                                 <IncidentDateEditForm
                   initialIncidentAt={incidentAt || null}
                   onSave={(value) => handleEdit('incidentAt', value)}
                   onCancel={() => setEditingField(null)}
                 />
              )}
            </td>
          </tr>
        )}
        {(location || canEditLocation) && (
          <tr>
            <td className="font-bold">Location</td>
            <td>
              {renderEditableField(
                'location',
                location || <span className="italic text-gray-400">Not specified</span>,
                canEditLocation,
                <LocationEditForm
                  initialLocation={location || ""}
                  onSave={(value) => handleEdit('location', value)}
                  onCancel={() => setEditingField(null)}
                />
              )}
            </td>
          </tr>
        )}
        {(parties || canEditParties) && (
          <tr>
            <td className="font-bold">Parties Involved</td>
            <td>
              {renderEditableField(
                'parties',
                parties ? (
                  <div className="whitespace-pre-wrap break-words max-w-md">{parties}</div>
                ) : (
                  <span className="italic text-gray-400">Not specified</span>
                ),
                canEditParties,
                                 <PartiesEditForm
                   initialParties={parties || null}
                   onSave={(value) => handleEdit('parties', value)}
                   onCancel={() => setEditingField(null)}
                 />
              )}
            </td>
          </tr>
        )}
        <tr>
          <td className="font-bold">Contact Preference</td>
          <td>
            {renderEditableField(
              'contactPreference',
              formatContactPreference(contactPreference),
              canEditContactPreference,
              <ContactPreferenceEditForm
                initialContactPreference={contactPreference || "email"}
                onSave={(value) => handleEdit('contactPreference', value)}
                onCancel={() => setEditingField(null)}
              />
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
} 