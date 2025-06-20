// ============================================================================
// CORE APPLICATION TYPES
// ============================================================================

/**
 * Base database entity with common fields
 */
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User entity representing system users
 */
export interface User extends BaseEntity {
  email: string;
  hashedPassword: string;
  name: string;
  avatarUrl?: string | null;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
  isActive: boolean;
}

/**
 * User data for API responses (without sensitive fields)
 */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event entity representing conferences/events
 */
export interface Event extends BaseEntity {
  name: string;
  slug: string;
  description?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  location?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  isActive: boolean;
  settings?: EventSettings | null;
}

/**
 * Event settings and configuration
 */
export interface EventSettings {
  allowAnonymousReports?: boolean;
  requireReporterContact?: boolean;
  customFields?: CustomField[];
  emailNotifications?: EmailNotificationSettings;
}

/**
 * Custom field configuration for reports
 */
export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  required: boolean;
  options?: string[];
  placeholder?: string;
}

/**
 * Email notification settings
 */
export interface EmailNotificationSettings {
  notifyOnNewReport?: boolean;
  notifyOnStatusChange?: boolean;
  notifyOnNewComment?: boolean;
  recipientEmails?: string[];
}

/**
 * Role entity for RBAC system
 */
export interface Role extends BaseEntity {
  name: string;
  description?: string | null;
  permissions: Permission[];
}

/**
 * Permission entity for RBAC system
 */
export interface Permission {
  id: string;
  name: string;
  description?: string | null;
  resource: string;
  action: string;
}

/**
 * User-Event-Role relationship for multi-tenancy
 */
export interface UserEventRole extends BaseEntity {
  userId: string;
  eventId: string;
  roleId: string;
  user?: User;
  event?: Event;
  role?: Role;
}

/**
 * Report entity - the core incident report
 */
export interface Report extends BaseEntity {
  eventId: string;
  reporterName?: string | null;
  reporterEmail?: string | null;
  reporterPhone?: string | null;
  isAnonymous: boolean;
  title: string;
  description: string;
  incidentDate?: Date | null;
  incidentLocation?: string | null;
  reportedPersonName?: string | null;
  reportedPersonRole?: string | null;  
  reportedPersonContact?: string | null;
  witnessNames?: string | null;
  witnessContacts?: string | null;
  status: ReportStatus;
  priority: ReportPriority;
  assignedToUserId?: string | null;
  internalNotes?: string | null;
  resolution?: string | null;
  resolutionDate?: Date | null;
  customFields?: Record<string, any>;
  event?: Event;
  assignedTo?: User;
  comments?: Comment[];
  evidence?: Evidence[];
  statusHistory?: StatusHistory[];
}

/**
 * Report status enumeration
 */
export enum ReportStatus {
  SUBMITTED = 'submitted',
  IN_REVIEW = 'in_review', 
  INVESTIGATING = 'investigating',
  PENDING_ACTION = 'pending_action',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  DISMISSED = 'dismissed'
}

/**
 * Report priority enumeration
 */
export enum ReportPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * Comment entity for report discussions
 */
export interface Comment extends BaseEntity {
  reportId: string;
  userId?: string | null;
  authorName?: string | null;
  content: string;
  isInternal: boolean;
  isAnonymous: boolean;
  report?: Report;
  user?: User;
}

/**
 * Evidence entity for report attachments
 */
export interface Evidence extends BaseEntity {
  reportId: string;
  fileName: string;
  originalName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedByUserId?: string | null;
  description?: string | null;
  report?: Report;
  uploadedBy?: User;
}

/**
 * Status history for tracking report state changes
 */
export interface StatusHistory extends BaseEntity {
  reportId: string;
  fromStatus?: ReportStatus | null;
  toStatus: ReportStatus;
  changedByUserId?: string | null;
  reason?: string | null;
  notes?: string | null;
  report?: Report;
  changedBy?: User;
}

/**
 * Audit log entity for system actions
 */
export interface AuditLog extends BaseEntity {
  eventId: string;
  userId?: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  event?: Event;
  user?: User;
}

/**
 * Notification entity for in-app notifications
 */
export interface Notification extends BaseEntity {
  userId: string;
  eventId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  priority: NotificationPriority;
  isRead: boolean;
  actionUrl?: string | null;
  metadata?: Record<string, any>;
  user?: User;
  event?: Event;
}

/**
 * Notification type enumeration
 */
export enum NotificationType {
  REPORT_CREATED = 'report_created',
  REPORT_ASSIGNED = 'report_assigned',
  REPORT_STATUS_CHANGED = 'report_status_changed',
  NEW_COMMENT = 'new_comment',
  EVIDENCE_UPLOADED = 'evidence_uploaded',
  USER_INVITED = 'user_invited',
  SYSTEM_ALERT = 'system_alert'
}

/**
 * Notification priority enumeration
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

/**
 * User notification settings (per-user preferences)
 */
export interface UserNotificationSettings {
  id: string;
  userId: string;
  reportSubmittedInApp: boolean;
  reportSubmittedEmail: boolean;
  reportAssignedInApp: boolean;
  reportAssignedEmail: boolean;
  reportStatusChangedInApp: boolean;
  reportStatusChangedEmail: boolean;
  reportCommentAddedInApp: boolean;
  reportCommentAddedEmail: boolean;
  eventInvitationInApp: boolean;
  eventInvitationEmail: boolean;
  eventRoleChangedInApp: boolean;
  eventRoleChangedEmail: boolean;
  systemAnnouncementInApp: boolean;
  systemAnnouncementEmail: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Authentication request body
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * User registration request body
 */
export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

/**
 * Password reset request body
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation request body
 */
export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

/**
 * Report creation request body
 */
export interface CreateReportRequest {
  eventId: string;
  reporterName?: string;
  reporterEmail?: string;
  reporterPhone?: string;
  isAnonymous?: boolean;
  title: string;
  description: string;
  incidentDate?: string | Date;
  incidentLocation?: string;
  reportedPersonName?: string;
  reportedPersonRole?: string;
  reportedPersonContact?: string;
  witnessNames?: string;
  witnessContacts?: string;
  customFields?: Record<string, any>;
}

/**
 * Report update request body
 */
export interface UpdateReportRequest {
  title?: string;
  description?: string;
  status?: ReportStatus;
  priority?: ReportPriority;
  assignedToUserId?: string;
  internalNotes?: string;
  resolution?: string;
  customFields?: Record<string, any>;
}

/**
 * Comment creation request body
 */
export interface CreateCommentRequest {
  reportId: string;
  content: string;
  isInternal?: boolean;
  isAnonymous?: boolean;
}

/**
 * Event creation request body
 */
export interface CreateEventRequest {
  name: string;
  slug: string;
  description?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  location?: string;
  websiteUrl?: string;
  contactEmail?: string;
  settings?: EventSettings;
}

/**
 * Event update request body
 */
export interface UpdateEventRequest {
  name?: string;
  description?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  location?: string;
  websiteUrl?: string;
  contactEmail?: string;
  isActive?: boolean;
  settings?: EventSettings;
}

/**
 * User invitation request body
 */
export interface InviteUserRequest {
  email: string;
  name: string;
  roleId: string;
  eventId: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

/**
 * Paginated response for list endpoints
 */
export interface PaginatedResponse<T = any> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Authentication response
 */
export interface AuthResponse {
  user: UserResponse;
  token?: string;
  sessionId?: string;
}

/**
 * Report list item for summary views
 */
export interface ReportListItem {
  id: string;
  title: string;
  status: ReportStatus;
  priority: ReportPriority;
  reporterName?: string;
  isAnonymous: boolean;
  incidentDate?: Date;
  assignedTo?: {
    id: string;
    name: string;
  };
  commentCount: number;
  evidenceCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Event statistics response
 */
export interface EventStats {
  totalReports: number;
  reportsByStatus: Record<ReportStatus, number>;
  reportsByPriority: Record<ReportPriority, number>;
  recentActivity: {
    newReports: number;
    resolvedReports: number;
    pendingReports: number;
  };
  assignmentStats: {
    assigned: number;
    unassigned: number;
    overdue: number;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Query parameters for list endpoints
 */
export interface ListQueryParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
  filter?: Record<string, any>;
}

/**
 * File upload information
 */
export interface FileUpload {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

/**
 * Express session with user information
 */
export interface SessionData {
  userId?: string;
  user?: UserResponse;
  isAuthenticated?: boolean;
}

/**
 * Database connection options
 */
export interface DatabaseConfig {
  url: string;
  ssl?: boolean;
  connectionLimit?: number;
  acquireTimeout?: number;
  timeout?: number;
}

/**
 * Application configuration
 */
export interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  cors: {
    origin: string[];
    credentials: boolean;
  };
  session: {
    secret: string;
    maxAge: number;
    secure: boolean;
  };
  database: DatabaseConfig;
  upload: {
    maxFileSize: number;
    allowedMimeTypes: string[];
    destination: string;
  };
  email: {
    provider: string;
    from: string;
    replyTo?: string;
  };
}