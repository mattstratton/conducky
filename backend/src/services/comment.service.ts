import { PrismaClient, CommentVisibility } from '@prisma/client';
import { ServiceResult } from '../types';

export interface CommentCreateData {
  reportId: string;
  authorId?: string | null;
  body: string;
  visibility?: CommentVisibility;
}

export interface CommentUpdateData {
  body?: string;
  visibility?: CommentVisibility;
}

export interface CommentQuery {
  page?: number;
  limit?: number;
  visibility?: CommentVisibility;
  authorId?: string;
}

export interface CommentWithDetails {
  id: string;
  reportId: string;
  authorId?: string | null;
  body: string;
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
   * Create a new comment on a report
   */
  async createComment(data: CommentCreateData): Promise<ServiceResult<{ comment: CommentWithDetails }>> {
    try {
      const { reportId, authorId, body, visibility = 'public' } = data;

      // Verify report exists
      const report = await this.prisma.report.findUnique({
        where: { id: reportId }
      });

      if (!report) {
        return {
          success: false,
          error: 'Report not found'
        };
      }

      // Create the comment
      const comment = await this.prisma.reportComment.create({
        data: {
          reportId,
          authorId: authorId || null,
          body,
          visibility
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

      return {
        success: true,
        data: { comment }
      };
    } catch (error: any) {
      console.error('Error creating comment:', error);
      return {
        success: false,
        error: 'Failed to create comment.'
      };
    }
  }

  /**
   * Get comments for a report with pagination and filtering
   */
  async getReportComments(reportId: string, query: CommentQuery): Promise<ServiceResult<CommentListResponse>> {
    try {
      const {
        page = 1,
        limit = 20,
        visibility,
        authorId
      } = query;

      // Validate pagination
      const pageNum = parseInt(page.toString());
      const limitNum = Math.min(parseInt(limit.toString()), 100); // Max 100 per page

      if (pageNum < 1 || limitNum < 1) {
        return {
          success: false,
          error: 'Invalid pagination parameters'
        };
      }

      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const whereClause: any = { reportId };

      if (visibility) {
        whereClause.visibility = visibility;
      }

      if (authorId) {
        whereClause.authorId = authorId;
      }

      // Get total count
      const total = await this.prisma.reportComment.count({ where: whereClause });

      // Get comments with author details
      const comments = await this.prisma.reportComment.findMany({
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
        orderBy: { createdAt: 'asc' }, // Chronological order for comments
        skip,
        take: limitNum
      });

      return {
        success: true,
        data: {
          comments,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      };
    } catch (error: any) {
      console.error('Error fetching report comments:', error);
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
      const comment = await this.prisma.reportComment.findUnique({
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

      return {
        success: true,
        data: { comment }
      };
    } catch (error: any) {
      console.error('Error fetching comment:', error);
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
    try {
      // Check if comment exists and user has permission
      const existingComment = await this.prisma.reportComment.findUnique({
        where: { id: commentId }
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

      // Update the comment
      const comment = await this.prisma.reportComment.update({
        where: { id: commentId },
        data,
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

      return {
        success: true,
        data: { comment }
      };
    } catch (error: any) {
      console.error('Error updating comment:', error);
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
    try {
      // Check if comment exists and user has permission
      const existingComment = await this.prisma.reportComment.findUnique({
        where: { id: commentId }
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
      await this.prisma.reportComment.delete({
        where: { id: commentId }
      });

      return {
        success: true,
        data: { message: 'Comment deleted successfully' }
      };
    } catch (error: any) {
      console.error('Error deleting comment:', error);
      return {
        success: false,
        error: 'Failed to delete comment.'
      };
    }
  }

  /**
   * Get comment count for a report
   */
  async getCommentCount(reportId: string, visibility?: CommentVisibility): Promise<ServiceResult<{ count: number }>> {
    try {
      const whereClause: any = { reportId };

      if (visibility) {
        whereClause.visibility = visibility;
      }

      const count = await this.prisma.reportComment.count({ where: whereClause });

      return {
        success: true,
        data: { count }
      };
    } catch (error: any) {
      console.error('Error getting comment count:', error);
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
        visibility
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

      const skip = (pageNum - 1) * limitNum;

      // Build where clause
      const whereClause: any = { authorId };

      if (visibility) {
        whereClause.visibility = visibility;
      }

      // Get total count
      const total = await this.prisma.reportComment.count({ where: whereClause });

      // Get comments with report details
      const comments = await this.prisma.reportComment.findMany({
        where: whereClause,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          report: {
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
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum
      });

      return {
        success: true,
        data: {
          comments,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          }
        }
      };
    } catch (error: any) {
      console.error('Error fetching comments by author:', error);
      return {
        success: false,
        error: 'Failed to fetch comments by author.'
      };
    }
  }

  /**
   * Check if user can view comments on a report (based on visibility and permissions)
   */
  async canUserViewComments(reportId: string, userId?: string, userRole?: string): Promise<ServiceResult<{ canView: boolean; visibleComments: CommentVisibility[] }>> {
    try {
      // Default visibility levels user can see
      let visibleComments: CommentVisibility[] = ['public'];

      // If user is authenticated, they can see internal comments if they have appropriate role
      if (userId && userRole) {
        // Get the report to check if user is involved
        const report = await this.prisma.report.findUnique({
          where: { id: reportId },
          select: {
            reporterId: true,
            assignedResponderId: true,
            eventId: true
          }
        });

        if (!report) {
          return {
            success: false,
            error: 'Report not found'
          };
        }

        // Check if user is reporter, assigned responder, or has admin/responder role
        const isReporter = report.reporterId === userId;
        const isAssigned = report.assignedResponderId === userId;
        const hasResponderRole = ['Admin', 'Responder', 'SuperAdmin'].includes(userRole);

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
    } catch (error: any) {
      console.error('Error checking comment visibility permissions:', error);
      return {
        success: false,
        error: 'Failed to check comment permissions.'
      };
    }
  }
} 