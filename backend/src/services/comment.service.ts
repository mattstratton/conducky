import { PrismaClient, CommentVisibility } from '../generated/prisma/client';
import { ServiceResult } from '../types';
import { Prisma } from '../generated/prisma/client';
import { logAudit } from '../utils/audit';
import logger from '../config/logger';
import { encryptField, decryptField, isEncrypted } from '../utils/encryption';

export interface CommentCreateData {
  incidentId: string;
  authorId?: string | null;
  body: string;
  visibility?: CommentVisibility;
  isMarkdown?: boolean;
}

export interface CommentUpdateData {
  body?: string;
  visibility?: CommentVisibility;
  isMarkdown?: boolean;
}

export interface CommentQuery {
  page?: number;
  limit?: number;
  visibility?: CommentVisibility;
  authorId?: string;
  search?: string; // Search in comment body
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}

export interface CommentWithDetails {
  id: string;
  incidentId: string;
  authorId?: string | null;
  body: string;
  isMarkdown: boolean;
  visibility: CommentVisibility;
  createdAt: Date;
  updatedAt: Date;
  author?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export interface CommentListResponse {
  comments: CommentWithDetails[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class CommentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Decrypt comment body if encrypted
   */
  private decryptCommentData(comment: any): any {
    if (!comment) return comment;
    
    const decrypted = { ...comment };
    
    try {
      // Decrypt body if it's encrypted
      if (decrypted.body && isEncrypted(decrypted.body)) {
        decrypted.body = decryptField(decrypted.body);
      }
    } catch (error) {
      logger().error('Error decrypting comment data:', error);
      // Don't throw error - return original data to prevent breaking the app
      logger().warn('Returning original encrypted comment data due to decryption failure');
    }
    
    return decrypted;
  }

  /**
   * Decrypt an array of comments
   */
  private decryptCommentArray(comments: any[]): any[] {
    return comments.map(comment => this.decryptCommentData(comment));
  }

  /**
   * Create a new comment on a report
   */
  async createComment(data: CommentCreateData): Promise<ServiceResult<{ comment: CommentWithDetails }>> {
    try {
      const { incidentId, authorId, body, visibility = 'public', isMarkdown = false } = data;      // Verify report exists
      const incident = await this.prisma.incident.findUnique({
        where: { id: incidentId },
        include: {
          event: true
        }
      });

      if (!incident) {
        return {
          success: false,
          error: 'Report not found'
        };
      }

      // Encrypt the comment body before storing
      const encryptedBody = encryptField(body);

      // Create the comment
      const comment = await this.prisma.incidentComment.create({
        data: {
          incidentId,
          authorId: authorId || null,
          body: encryptedBody,
          visibility,
          isMarkdown
        },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Log comment creation
      await logAudit({
        action: 'comment_created',
        targetType: 'IncidentComment',
        targetId: comment.id,
        userId: authorId || undefined,
        eventId: incident.eventId
      });

      // Decrypt the comment body for response
      const decryptedComment = this.decryptCommentData(comment);

      return {
        success: true,
        data: { comment: decryptedComment }
      };
    } catch (error: unknown) {
      logger().error('Error creating comment:', error);
      return {
        success: false,
        error: 'Failed to create comment.'
      };
    }
  }

  /**
   * Get paginated comments for a report with filtering and search
   */
  async getIncidentComments(incidentId: string, query: CommentQuery): Promise<ServiceResult<CommentListResponse>> {
    try {
      const {
        page = 1,
        limit = 10,
        visibility,
        authorId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'asc'
      } = query;

      // Validate pagination
      const pageNum = parseInt(page.toString());
      const limitNum = Math.min(parseInt(limit.toString()), 100);

      if (pageNum < 1 || limitNum < 1) {
        return {
          success: false,
          error: 'Invalid pagination parameters'
        };
      }

      // Validate sort parameters
      const validSortFields = ['createdAt', 'updatedAt'];
      const validSortOrders = ['asc', 'desc'];
      
      if (!validSortFields.includes(sortBy)) {
        return {
          success: false,
          error: 'Invalid sort field'
        };
      }

      if (!validSortOrders.includes(sortOrder)) {
        return {
          success: false,
          error: 'Invalid sort order'
        };
      }

      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const whereClause: Prisma.IncidentCommentWhereInput = { incidentId };

      if (visibility) {
        whereClause.visibility = visibility;
      }

      if (authorId) {
        whereClause.authorId = authorId;
      }

      // Add search functionality
      if (search && search.trim().length > 0) {
        whereClause.body = {
          contains: search.trim(),
          mode: 'insensitive' // Case-insensitive search
        };
      }

      // Get total count
      const total = await this.prisma.incidentComment.count({ where: whereClause });

      // Build order by clause with proper typing
      const orderBy: Prisma.IncidentCommentOrderByWithRelationInput = {};
      if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      } else if (sortBy === 'updatedAt') {
        orderBy.updatedAt = sortOrder;
      }

      // Get comments with author details
      const comments = await this.prisma.incidentComment.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        orderBy,
        skip,
        take: limitNum
      });

      // Decrypt comment bodies before returning
      const decryptedComments = this.decryptCommentArray(comments);

      return {
        success: true,
        data: {
          comments: decryptedComments,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      };
    } catch (error: unknown) {
      logger().error('Error fetching report comments:', error);
      return {
        success: false,
        error: 'Failed to fetch comments.'
      };
    }
  }

  /**
   * Get a specific comment by ID
   */
  async getCommentById(commentId: string): Promise<ServiceResult<{ comment: CommentWithDetails }>> {
    try {
      const comment = await this.prisma.incidentComment.findUnique({
        where: { id: commentId },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      if (!comment) {
        return {
          success: false,
          error: 'Comment not found'
        };
      }

      // Decrypt the comment body before returning
      const decryptedComment = this.decryptCommentData(comment);

      return {
        success: true,
        data: { comment: decryptedComment }
      };
    } catch (error: unknown) {
      logger().error('Error fetching comment:', error);
      return {
        success: false,
        error: 'Failed to fetch comment.'
      };
    }
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, data: CommentUpdateData, userId?: string): Promise<ServiceResult<{ comment: CommentWithDetails }>> {
    try {      // Check if comment exists and user has permission
      const existingComment = await this.prisma.incidentComment.findUnique({
        where: { id: commentId },
        include: {
          incident: {
            include: {
              event: true
            }
          }
        }
      });

      if (!existingComment) {
        return {
          success: false,
          error: 'Comment not found'
        };
      }

      // Check if user is the author (if userId provided)
      if (userId && existingComment.authorId !== userId) {
        return {
          success: false,
          error: 'Not authorized to update this comment'
        };
      }

      // Encrypt the updated body if provided
      const updateData: any = {
        visibility: data.visibility,
        isMarkdown: data.isMarkdown
      };
      
      if (data.body !== undefined) {
        updateData.body = encryptField(data.body);
      }

      // Update the comment
      const comment = await this.prisma.incidentComment.update({
        where: { id: commentId },
        data: updateData,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      // Log comment update
      await logAudit({
        action: 'comment_updated',
        targetType: 'IncidentComment',
        targetId: comment.id,
        userId: userId || undefined,
        eventId: existingComment.incident.eventId
      });

      // Decrypt the comment body for response
      const decryptedComment = this.decryptCommentData(comment);

      return {
        success: true,
        data: { comment: decryptedComment }
      };
    } catch (error: unknown) {
      logger().error('Error updating comment:', error);
      return {
        success: false,
        error: 'Failed to update comment.'
      };
    }
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: string, userId?: string): Promise<ServiceResult<{ message: string }>> {
    try {      // Check if comment exists and user has permission
      const existingComment = await this.prisma.incidentComment.findUnique({
        where: { id: commentId },
        include: {
          incident: {
            include: {
              event: true
            }
          }
        }
      });

      if (!existingComment) {
        return {
          success: false,
          error: 'Comment not found'
        };
      }

      // Check if user is the author (if userId provided)
      if (userId && existingComment.authorId !== userId) {
        return {
          success: false,
          error: 'Not authorized to delete this comment'
        };
      }

      // Delete the comment
      await this.prisma.incidentComment.delete({
        where: { id: commentId }
      });

      // Log comment deletion
      await logAudit({
        action: 'comment_deleted',
        targetType: 'IncidentComment',
        targetId: commentId,
        userId: userId || undefined,
        eventId: existingComment.incident.eventId
      });

      return {
        success: true,
        data: { message: 'Comment deleted successfully' }
      };
    } catch (error: unknown) {
      logger().error('Error deleting comment:', error);
      return {
        success: false,
        error: 'Failed to delete comment.'
      };
    }
  }

  /**
   * Get comment count for a report
   */
  async getCommentCount(incidentId: string, visibility?: CommentVisibility): Promise<ServiceResult<{ count: number }>> {
    try {
      const whereClause: Prisma.IncidentCommentWhereInput = { incidentId };

      if (visibility) {
        whereClause.visibility = visibility;
      }

      const count = await this.prisma.incidentComment.count({ where: whereClause });

      return {
        success: true,
        data: { count }
      };
    } catch (error: unknown) {
      logger().error('Error getting comment count:', error);
      return {
        success: false,
        error: 'Failed to get comment count.'
      };
    }
  }

  /**
   * Get comments by author across all reports (for user activity)
   */
  async getCommentsByAuthor(authorId: string, query: CommentQuery): Promise<ServiceResult<CommentListResponse>> {
    try {
      const {
        page = 1,
        limit = 20,
        visibility,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc' // Default to newest first for user activity
      } = query;

      // Validate pagination
      const pageNum = parseInt(page.toString());
      const limitNum = Math.min(parseInt(limit.toString()), 100);

      if (pageNum < 1 || limitNum < 1) {
        return {
          success: false,
          error: 'Invalid pagination parameters'
        };
      }

      // Validate sort parameters
      const validSortFields = ['createdAt', 'updatedAt'];
      const validSortOrders = ['asc', 'desc'];
      
      if (!validSortFields.includes(sortBy)) {
        return {
          success: false,
          error: 'Invalid sort field'
        };
      }

      if (!validSortOrders.includes(sortOrder)) {
        return {
          success: false,
          error: 'Invalid sort order'
        };
      }

      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const whereClause: Prisma.IncidentCommentWhereInput = { authorId };

      if (visibility) {
        whereClause.visibility = visibility;
      }

      // Add search functionality
      if (search && search.trim().length > 0) {
        whereClause.body = {
          contains: search.trim(),
          mode: 'insensitive' // Case-insensitive search
        };
      }

      // Get total count
      const total = await this.prisma.incidentComment.count({ where: whereClause });

      // Build order by clause with proper typing
      const orderBy: Prisma.IncidentCommentOrderByWithRelationInput = {};
      if (sortBy === 'createdAt') {
        orderBy.createdAt = sortOrder;
      } else if (sortBy === 'updatedAt') {
        orderBy.updatedAt = sortOrder;
      }

      // Get comments with report details
      const comments = await this.prisma.incidentComment.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          incident: {
            select: {
              id: true,
              title: true,
              eventId: true,
              event: {
                select: {
                  name: true,
                  slug: true
                }
              }
            }
          }
        },
        orderBy,
        skip,
        take: limitNum
      });

      // Decrypt comment bodies before returning
      const decryptedComments = this.decryptCommentArray(comments);

      return {
        success: true,
        data: {
          comments: decryptedComments,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      };
    } catch (error: unknown) {
      logger().error('Error fetching comments by author:', error);
      return {
        success: false,
        error: 'Failed to fetch comments by author.'
      };
    }
  }

  /**
   * Check if user can view comments on a report (based on visibility and permissions)
   */
  async canUserViewComments(incidentId: string, userId?: string, userRole?: string): Promise<ServiceResult<{ canView: boolean; visibleComments: CommentVisibility[] }>> {
    try {
      // Default visibility levels user can see
      let visibleComments: CommentVisibility[] = ['public'];

      // If user is authenticated, they can see internal comments if they have appropriate role
      if (userId && userRole) {
        // Get the report to check if user is involved
        const incident = await this.prisma.incident.findUnique({
          where: { id: incidentId },
          select: {
            reporterId: true,
            assignedResponderId: true,
            eventId: true
          }
        });

        if (!incident) {
          return {
            success: false,
            error: 'Report not found'
          };
        }

        // Check if user is reporter, assigned responder, or has admin/responder role
        const isReporter = incident.reporterId === userId;
        const isAssigned = incident.assignedResponderId === userId;
        const hasResponderRole = ['Event Admin', 'Responder', 'System Admin'].includes(userRole);

        if (isReporter || isAssigned || hasResponderRole) {
          visibleComments.push('internal');
        }
      }

      return {
        success: true,
        data: {
          canView: true,
          visibleComments
        }
      };
    } catch (error: unknown) {
      logger().error('Error checking comment visibility permissions:', error);
      return {
        success: false,
        error: 'Failed to check comment permissions.'
      };
    }
  }
} 