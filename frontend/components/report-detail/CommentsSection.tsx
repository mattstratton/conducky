import React from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";

interface CommentsSectionProps {
  comments: any[];
  user: any;
  isResponderOrAbove: boolean;
  editingCommentId: string | null;
  setEditingCommentId: (id: string | null) => void;
  editCommentBody: string;
  setEditCommentBody: (body: string) => void;
  editCommentVisibility: string;
  setEditCommentVisibility: (v: string) => void;
  onCommentEdit?: (comment: any, body: string, visibility: string) => void;
  onCommentDelete?: (comment: any) => void;
  onCommentSubmit?: (body: string, visibility: string) => void;
  commentBody: string;
  setCommentBody: (body: string) => void;
  commentVisibility: string;
  setCommentVisibility: (v: string) => void;
}

export function CommentsSection({
  comments,
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
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-2">Comments</h3>
      {comments.length === 0 ? (
        <div className="text-gray-500 dark:text-gray-400">No comments yet.</div>
      ) : (
        <ul className="space-y-4">
          {comments.map((comment: any) => (
            <li key={comment.id} className="border-b border-gray-200 dark:border-gray-700 pb-2">
              <div className="flex items-center gap-2 mb-1">
                <Avatar user={comment.author} size={28} />
                <span className="font-semibold">{comment.author?.name || comment.author?.email || 'Unknown'}</span>
                <span className="text-xs text-gray-500 ml-2">{new Date(comment.createdAt).toLocaleString()}</span>
                {comment.visibility === 'internal' && <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">Internal</span>}
              </div>
              {editingCommentId === comment.id ? (
                <div className="flex flex-col gap-2 mt-1">
                  <textarea
                    value={editCommentBody}
                    onChange={e => setEditCommentBody(e.target.value)}
                    className="border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
                  />
                  {isResponderOrAbove && (
                    <select
                      value={editCommentVisibility}
                      onChange={e => setEditCommentVisibility(e.target.value)}
                      className="border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="public">Public</option>
                      <option value="internal">Internal</option>
                    </select>
                  )}
                  <div className="flex gap-2 mt-2">
                    <Button onClick={() => { onCommentEdit && onCommentEdit(comment, editCommentBody, editCommentVisibility); setEditingCommentId(null); }} className="bg-green-600 text-white px-3 py-1 text-sm">Save</Button>
                    <Button onClick={() => setEditingCommentId(null)} className="bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-3 py-1 text-sm">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-1">{comment.body}</div>
              )}
              {/* Edit/Delete controls */}
              {(user && (user.id === comment.author?.id || isResponderOrAbove)) && (
                <div className="flex gap-2 mt-1">
                  <Button onClick={() => { setEditingCommentId(comment.id); setEditCommentBody(comment.body); setEditCommentVisibility(comment.visibility); }} className="bg-blue-600 text-white px-2 py-1 text-xs">Edit</Button>
                  <Button onClick={() => onCommentDelete && onCommentDelete(comment)} className="bg-red-600 text-white px-2 py-1 text-xs">Delete</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {/* Add comment form */}
      {user && onCommentSubmit && (
        <form onSubmit={e => { e.preventDefault(); onCommentSubmit(commentBody, commentVisibility); setCommentBody(""); setCommentVisibility("public"); }} className="mt-4 flex flex-col gap-2">
          <textarea
            value={commentBody}
            onChange={e => setCommentBody(e.target.value)}
            className="border px-2 py-1 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-400"
            placeholder="Add a comment..."
            required
          />
          {isResponderOrAbove && (
            <select
              value={commentVisibility}
              onChange={e => setCommentVisibility(e.target.value)}
              className="border px-2 py-1 rounded w-40 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="public">Public</option>
              <option value="internal">Internal</option>
            </select>
          )}
          <Button type="submit" className="bg-blue-600 text-white px-3 py-1 text-sm">Add Comment</Button>
        </form>
      )}
    </div>
  );
} 