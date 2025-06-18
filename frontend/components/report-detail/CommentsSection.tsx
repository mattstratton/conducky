import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, ChevronLeft, ChevronRight, Link, Check, Quote } from "lucide-react";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import ReactMarkdown from "react-markdown";

interface User {
  id: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
}

interface Comment {
  id: string;
  author: User;
  body: string;
  isMarkdown: boolean;
  createdAt: string;
  visibility: string;
}

interface CommentListResponse {
  comments: Comment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CommentsSectionProps {
  reportId: string;
  eventSlug: string;
  user: User;
  isResponderOrAbove: boolean;
  editingCommentId: string | null;
  setEditingCommentId: (id: string | null) => void;
  editCommentBody: string;
  setEditCommentBody: (body: string) => void;
  editCommentVisibility: string;
  setEditCommentVisibility: (v: string) => void;
  onCommentEdit?: (comment: Comment, body: string, visibility: string, isMarkdown?: boolean) => void;
  onCommentDelete?: (comment: Comment) => void;
  onCommentSubmit?: (body: string, visibility: string, isMarkdown?: boolean) => void;
  commentBody: string;
  setCommentBody: (body: string) => void;
  commentVisibility: string;
  setCommentVisibility: (v: string) => void;
}

// Helper function to highlight search terms in text
const highlightSearchTerm = (text: string, searchTerm: string) => {
  if (!searchTerm.trim()) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part) => {
    if (regex.test(part)) {
      return `<mark class="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">${part}</mark>`;
    }
    return part;
  }).join('');
};

export function CommentsSection({
  reportId,
  eventSlug,
  user,
  isResponderOrAbove,
  editingCommentId,
  setEditingCommentId,
  editCommentBody,
  setEditCommentBody,
  editCommentVisibility,
  setEditCommentVisibility,
  onCommentEdit,
  onCommentDelete,
  onCommentSubmit,
  commentBody,
  setCommentBody,
  commentVisibility,
  setCommentVisibility,
}: CommentsSectionProps) {
  // State for comments data and pagination
  const [comments, setComments] = useState<Comment[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for filtering and search
  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt">("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [copiedCommentId, setCopiedCommentId] = useState<string | null>(null);

  // State for markdown editing
  const [useMarkdown, setUseMarkdown] = useState(false);
  const [editingIsMarkdown, setEditingIsMarkdown] = useState(false);
  const [quotedComment, setQuotedComment] = useState<Comment | null>(null);

  // Function to build API URL with current filters
  const buildApiUrl = useCallback((page: number, customSearchTerm?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: pagination.limit.toString(),
      sortBy,
      sortOrder,
    });

    const currentSearchTerm = customSearchTerm !== undefined ? customSearchTerm : searchTerm;
    if (currentSearchTerm.trim()) {
      params.append("search", currentSearchTerm.trim());
    }

    if (visibilityFilter !== "all") {
      params.append("visibility", visibilityFilter);
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    return `${apiUrl}/api/events/slug/${eventSlug}/reports/${reportId}/comments?${params}`;
  }, [reportId, eventSlug, searchTerm, visibilityFilter, sortBy, sortOrder, pagination.limit]);

  // Function to find which page a comment is on
  const findCommentPage = useCallback(async (commentId: string): Promise<number | null> => {
    try {
      // First get the total pages by doing a request without search filters
      const baseParams = new URLSearchParams({
        page: "1",
        limit: pagination.limit.toString(),
        sortBy,
        sortOrder,
      });

      if (visibilityFilter !== "all") {
        baseParams.append("visibility", visibilityFilter);
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const baseResponse = await fetch(
        `${apiUrl}/api/events/slug/${eventSlug}/reports/${reportId}/comments?${baseParams}`,
        { credentials: "include" }
      );

      if (!baseResponse.ok) return null;

      const baseData: CommentListResponse = await baseResponse.json();
      const totalPages = baseData.pagination.totalPages;

      // Search through all pages to find the comment
      for (let page = 1; page <= totalPages; page++) {
        const pageParams = new URLSearchParams({
          page: page.toString(),
          limit: pagination.limit.toString(),
          sortBy,
          sortOrder,
        });

        if (visibilityFilter !== "all") {
          pageParams.append("visibility", visibilityFilter);
        }

        const response = await fetch(
          `${apiUrl}/api/events/slug/${eventSlug}/reports/${reportId}/comments?${pageParams}`,
          { credentials: "include" }
        );

        if (response.ok) {
          const data: CommentListResponse = await response.json();
          const commentFound = data.comments.find(c => c.id === commentId);
          if (commentFound) {
            return page;
          }
        }
      }
      return null;
    } catch (error) {
      console.error("Error finding comment page:", error);
      return null;
    }
  }, [reportId, eventSlug, visibilityFilter, sortBy, sortOrder, pagination.limit]);

  // Fetch comments function
  const fetchComments = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const url = buildApiUrl(page);
      const response = await fetch(url, { credentials: "include" });

      if (!response.ok) {
        throw new Error("Failed to fetch comments");
      }

      const data: CommentListResponse = await response.json();
      setComments(data.comments);
      setPagination(data.pagination);

      // Handle direct comment linking
      if (window.location.hash) {
        const commentId = window.location.hash.replace('#comment-', '');
        const commentExists = data.comments.find(c => c.id === commentId);
        if (commentExists) {
          setTimeout(() => {
            const element = document.getElementById(`comment-${commentId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        } else {
          // Comment not found on current page, search for it
          findCommentPage(commentId).then(foundPage => {
            if (foundPage && foundPage !== page) {
              fetchComments(foundPage);
            }
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comments");
      setComments([]);
      setPagination({ page: 1, limit: 10, total: 0, totalPages: 0 });
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, findCommentPage]);

  // Initial load
  useEffect(() => {
    fetchComments(1);
  }, [visibilityFilter, sortBy, sortOrder]);

  // Handle search with proper debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchComments(1);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  // Handle URL hash changes (for direct links)
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash) {
        const commentId = window.location.hash.replace('#comment-', '');
        const commentExists = comments.find(c => c.id === commentId);
        if (commentExists) {
          setTimeout(() => {
            const element = document.getElementById(`comment-${commentId}`);
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }, 100);
        } else {
          // Comment not on current page, search for it
          findCommentPage(commentId).then(foundPage => {
            if (foundPage && foundPage !== pagination.page) {
              fetchComments(foundPage);
            }
          });
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [comments, pagination.page, findCommentPage, fetchComments]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchComments(newPage);
    }
  };

  // Enhanced comment submission that refreshes the list
  const handleCommentSubmit = async (body: string, visibility: string, isMarkdown?: boolean) => {
    if (onCommentSubmit) {
      await onCommentSubmit(body, visibility, isMarkdown);
      // Refresh comments after successful submission
      setTimeout(() => fetchComments(pagination.page), 500);
    }
  };

  // Enhanced comment edit that refreshes the list
  const handleCommentEdit = async (comment: Comment, body: string, visibility: string, isMarkdown?: boolean) => {
    if (onCommentEdit) {
      await onCommentEdit(comment, body, visibility, isMarkdown);
      // Refresh comments after successful edit
      setTimeout(() => fetchComments(pagination.page), 500);
    }
  };

  // Enhanced comment delete that refreshes the list
  const handleCommentDelete = async (comment: Comment) => {
    if (onCommentDelete) {
      await onCommentDelete(comment);
      // Refresh comments after successful deletion, handle page adjustment
      const newTotal = pagination.total - 1;
      const newTotalPages = Math.ceil(newTotal / pagination.limit);
      const adjustedPage = pagination.page > newTotalPages ? Math.max(1, newTotalPages) : pagination.page;
      setTimeout(() => fetchComments(adjustedPage), 500);
    }
  };

  // Handle comment link copying with feedback
  const handleCopyCommentLink = async (commentId: string) => {
    const url = new URL(window.location.href);
    url.hash = `comment-${commentId}`;
    await navigator.clipboard.writeText(url.toString());
    setCopiedCommentId(commentId);
    setTimeout(() => setCopiedCommentId(null), 2000);
  };

  // Handle quote reply
  const handleQuoteReply = (comment: Comment) => {
    setQuotedComment(comment);
    setUseMarkdown(true);
    // Scroll to comment form
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  };

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">
          Comments {pagination.total > 0 && `(${pagination.total})`}
          {searchTerm && (
            <span className="text-sm text-muted-foreground ml-2">
              - searching for &ldquo;{searchTerm}&rdquo;
            </span>
          )}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Filter Controls */}
      {showFilters && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search comments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Visibility Filter - Only show for Responders and Admins */}
              {isResponderOrAbove && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Visibility</label>
                  <Select value={visibilityFilter} onValueChange={setVisibilityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All comments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All comments</SelectItem>
                      <SelectItem value="public">Public only</SelectItem>
                      <SelectItem value="internal">Internal only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Sort By */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sort by</label>
                <Select value={sortBy} onValueChange={(value: "createdAt" | "updatedAt") => setSortBy(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Created date</SelectItem>
                    <SelectItem value="updatedAt">Updated date</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort Order */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Order</label>
                <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Oldest first</SelectItem>
                    <SelectItem value="desc">Newest first</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clear filters */}
            {(searchTerm || visibilityFilter !== "all" || sortBy !== "createdAt" || sortOrder !== "asc") && (
              <div className="mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setVisibilityFilter("all");
                    setSortBy("createdAt");
                    setSortOrder("asc");
                  }}
                >
                  Clear all filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading comments...</div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mb-4">
          <p className="text-destructive text-sm">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchComments(pagination.page)}
            className="mt-2"
          >
            Try again
          </Button>
        </div>
      )}

      {/* Comments List */}
      {!loading && !error && (
        <>
          {comments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm || visibilityFilter !== "all" 
                ? "No comments match your filters." 
                : "No comments yet."
              }
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment: Comment) => (
                <Card key={comment.id} id={`comment-${comment.id}`} className="p-4">
                  <div className="flex items-start gap-3">
                    {(() => {
                      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                      let avatarSrc: string | undefined = undefined;
                      if (comment.author?.avatarUrl) {
                        avatarSrc = comment.author.avatarUrl.startsWith("/")
                          ? apiUrl + comment.author.avatarUrl
                          : comment.author.avatarUrl;
                      }
                      return (
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={avatarSrc} alt={comment.author?.name || comment.author?.email || "User avatar"} />
                          <AvatarFallback>
                            {comment.author?.name
                              ? comment.author.name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
                              : comment.author?.email
                                ? comment.author.email[0].toUpperCase()
                                : "U"}
                          </AvatarFallback>
                        </Avatar>
                      );
                    })()}

                    <div className="flex-1 space-y-2">
                      {/* Comment Header */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {comment.author?.name || comment.author?.email || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.createdAt).toLocaleString()}
                        </span>
                        {comment.visibility === 'internal' && (
                          <Badge variant="secondary" className="text-xs">
                            Internal
                          </Badge>
                        )}

                        <div className="ml-auto flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuoteReply(comment)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            title="Quote this comment"
                          >
                            <Quote className="h-3 w-3" />
                            Quote
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyCommentLink(comment.id)}
                            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                            title="Copy link to this comment"
                          >
                            {copiedCommentId === comment.id ? (
                              <>
                                <Check className="h-3 w-3" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Link className="h-3 w-3" />
                                Link
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Comment Body */}
                      {editingCommentId === comment.id ? (
                        <div className="space-y-3">
                          <MarkdownEditor
                            value={editCommentBody}
                            onChange={setEditCommentBody}
                            placeholder="Edit your comment..."
                            rows={4}
                          />
                          <div className="flex gap-3 items-center">
                            {isResponderOrAbove && (
                              <Select value={editCommentVisibility} onValueChange={setEditCommentVisibility}>
                                <SelectTrigger className="w-32">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="public">Public</SelectItem>
                                  <SelectItem value="internal">Internal</SelectItem>
                                </SelectContent>
                              </Select>
                            )}
                            <div className="flex gap-2">
                              <Button
                                onClick={() => {
                                  if (editCommentBody.trim()) {
                                    handleCommentEdit(comment, editCommentBody, editCommentVisibility, editingIsMarkdown);
                                    setEditingCommentId(null);
                                  }
                                }}
                                disabled={!editCommentBody.trim()}
                                size="sm"
                              >
                                Save
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setEditingCommentId(null)}
                                size="sm"
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <ReactMarkdown>
                            {highlightSearchTerm(comment.body, searchTerm)}
                          </ReactMarkdown>
                        </div>
                      )}

                      {/* Action Buttons */}
                      {user && (user.id === comment.author?.id || isResponderOrAbove) && editingCommentId !== comment.id && (
                        <div className="flex gap-2 pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCommentId(comment.id);
                              setEditCommentBody(comment.body);
                              setEditCommentVisibility(comment.visibility);
                              setEditingIsMarkdown(comment.isMarkdown);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCommentDelete(comment)}
                            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} comments
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm font-medium">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Comment Form */}
      {user && onCommentSubmit && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <form
              onSubmit={e => {
                e.preventDefault();
                if (commentBody.trim()) {
                  handleCommentSubmit(commentBody, commentVisibility, useMarkdown);
                  setCommentBody("");
                  setCommentVisibility("public");
                  setUseMarkdown(false);
                  setQuotedComment(null);
                }
              }}
              className="space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium">Add a comment</label>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={useMarkdown}
                        onChange={(e) => setUseMarkdown(e.target.checked)}
                        className="mr-1"
                      />
                      Use markdown editor
                    </label>
                  </div>
                </div>
                
                {useMarkdown ? (
                  <MarkdownEditor
                    value={commentBody}
                    onChange={setCommentBody}
                    placeholder="Write your comment in markdown..."
                    quotedText={quotedComment ? quotedComment.body : undefined}
                    rows={5}
                  />
                ) : (
                  <textarea
                    value={commentBody}
                    onChange={e => setCommentBody(e.target.value)}
                    className="w-full min-h-[100px] p-3 border rounded-md resize-y bg-background"
                    placeholder="Write your comment..."
                    required
                  />
                )}
              </div>
              
              <div className="flex items-center justify-between">
                {isResponderOrAbove && (
                  <Select value={commentVisibility} onValueChange={setCommentVisibility}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="internal">Internal</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                
                <Button type="submit" disabled={!commentBody.trim()}>
                  Add Comment
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}