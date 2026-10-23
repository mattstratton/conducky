/**
 * Incident Field Filtering Utility
 * 
 * This utility filters incident data to only include appropriate fields
 * based on the user's role and relationship to the incident
 */

import { Incident, User } from '../generated/prisma/client';

// Define minimal incident fields that unauthorized users can see
export interface IncidentMinimal {
  id: string;
  eventId: string;
  title: string;
  state: string;
  createdAt: Date;
  updatedAt: Date;
}

// Full incident interface for authorized users
export interface IncidentWithDetails extends Incident {
  reporter?: User | null;
  assignedResponder?: User | null;
  relatedFiles?: any[];
  comments?: any[];
  tags?: any[];
  stateHistory?: any[];
}

/**
 * Determines if a user should see full incident details
 * @param userId - Current user ID
 * @param incident - Incident data with reporter info
 * @param userRoles - Array of user's roles for the event
 * @returns boolean indicating if full details should be shown
 */
export function shouldShowFullDetails(
  userId: string,
  incident: { reporterId: string | null },
  userRoles: string[]
): boolean {
  // Show full details if user is:
  // 1. The reporter of the incident
  // 2. Has responder, event_admin, or system_admin role
  return (
    incident.reporterId === userId ||
    userRoles.some(role => ['responder', 'event_admin', 'system_admin'].includes(role))
  );
}

/**
 * Filters incident data to minimal fields for unauthorized users
 * @param incident - Full incident data
 * @returns Minimal incident data
 */
export function filterToMinimalFields(incident: any): IncidentMinimal {
  return {
    id: incident.id,
    eventId: incident.eventId,
    title: incident.title,
    state: incident.state,
    createdAt: incident.createdAt,
    updatedAt: incident.updatedAt,
  };
}

/**
 * Filters a single incident based on user permissions
 * @param incident - Incident data to filter
 * @param userId - Current user ID
 * @param userRoles - Array of user's roles for the event
 * @returns Filtered incident data (minimal or full)
 */
export function filterIncidentForUser(
  incident: any,
  userId: string,
  userRoles: string[]
): IncidentMinimal | any {
  if (shouldShowFullDetails(userId, incident, userRoles)) {
    return incident; // Return full incident data
  }
  
  return filterToMinimalFields(incident);
}

/**
 * Filters an array of incidents based on user permissions
 * @param incidents - Array of incident data to filter
 * @param userId - Current user ID
 * @param userRoles - Array of user's roles for the event
 * @returns Array of filtered incident data
 */
export function filterIncidentsForUser(
  incidents: any[],
  userId: string,
  userRoles: string[]
): (IncidentMinimal | any)[] {
  return incidents.map(incident => 
    filterIncidentForUser(incident, userId, userRoles)
  );
} 