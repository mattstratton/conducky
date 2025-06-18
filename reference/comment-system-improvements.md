# Comment System Improvements Implementation Plan

## Overview

This document outlines the implementation plan for improving the Conducky comment system to address:

- **Issue #36**: Add filtering, pagination, and possibly search for comments on an incident
- **Issue #37**: Comments should support markdown and basic formatting 
- **Issue #39**: Consider having direct links to a specific comment on an incident

## Current State Analysis

### What's Already Implemented ✅

1. **Core Comment Infrastructure**
   - Database schema with `ReportComment` model
   - `CommentVisibility` enum (public/internal)
   - Basic CRUD operations via `CommentService`
   - Slug-based API endpoints for creating and fetching comments
   - Role-based permissions for internal/public comments
   - Frontend UI with edit/delete capabilities

2. **Frontend Dependencies**
   - `react-markdown` library is already installed
   - `@tailwindcss/typography` for markdown styling
   - Shadcn/ui components for consistent UI

3. **Current API Endpoints**
   - `POST /events/slug/:slug/reports/:reportId/comments` - Create comment
   - `GET /events/slug/:slug/reports/:reportId/comments` - Fetch comments (basic pagination)

### Current Limitations 🔄

1. **Issue #36 - Filtering/Pagination/Search**
   - Frontend doesn't implement pagination controls
   - No filtering UI for internal vs external comments
   - No search functionality
   - Backend has basic pagination but not fully utilized

2. **Issue #37 - Markdown Support**
   - Comments are rendered as plain text
   - No markdown editor or formatting toolbar
   - No quote functionality

3. **Issue #39 - Deep Linking**
   - No unique anchors for individual comments
   - No URL structure for comment permalinks
   - No navigation to specific comments

## Implementation Plan

### Phase 1: Enhanced Pagination and Filtering (Issue #36)

#### Backend Changes

1. **Enhance Comment Service**
   - Add search capability to `getReportComments` method
   - Improve filtering options beyond just visibility
   - Add metadata to pagination responses

**Files to modify:**
- `backend/src/services/comment.service.ts`

**New functionality:**
```typescript
interface CommentQuery {
  page?: number;
  limit?: number;
  visibility?: CommentVisibility;
  authorId?: string;
  search?: string; // Search in comment body
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}
```

2. **Update API Routes**
   - Enhance GET endpoint to accept search and advanced filtering parameters
   - Return rich pagination metadata

**Files to modify:**
- `backend/src/routes/event.routes.ts`

#### Frontend Changes

1. **Create Comment Filter Controls Component**
   - Visibility filter (All/Public/Internal)
   - Author filter dropdown
   - Search input field
   - Sort controls

**New file:**
- `frontend/components/report-detail/CommentFilters.tsx`

2. **Create Pagination Component**
   - Page navigation controls
   - Items per page selector
   - Total count display

**New file:**
- `frontend/components/report-detail/CommentPagination.tsx`

3. **Update CommentsSection Component**
   - Integrate filter and pagination components
   - Manage filter state
   - Handle API calls with filtering parameters

**Files to modify:**
- `frontend/components/report-detail/CommentsSection.tsx`
- `frontend/pages/events/[eventSlug]/reports/[reportId]/index.tsx`

#### Testing Requirements

- Backend unit tests for enhanced filtering and search
- Frontend tests for filter and pagination components
- Integration tests for comment filtering workflows

### Phase 2: Markdown Support and Formatting (Issue #37)

#### Backend Changes

1. **Add Comment Metadata**
   - Track if comment contains markdown
   - Store rendered HTML version for performance (optional)
   - Add validation for markdown content

**Database migration:**
```sql
ALTER TABLE "ReportComment" ADD COLUMN "isMarkdown" BOOLEAN DEFAULT false;
```

**Files to modify:**
- `backend/prisma/schema.prisma`
- Add new migration file

2. **Update Comment Service**
   - Add markdown validation
   - Sanitize markdown input to prevent XSS

**Files to modify:**
- `backend/src/services/comment.service.ts`

#### Frontend Changes

1. **Create Markdown Editor Component**
   - Textarea with markdown formatting toolbar
   - Live preview toggle
   - Common formatting buttons (bold, italic, quote, code)
   - "Copy as quote" functionality for replying to comments

**New file:**
- `frontend/components/ui/markdown-editor.tsx`

**Features:**
```typescript
interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  showPreview?: boolean;
  quotedText?: string; // For reply/quote functionality
  rows?: number;
}
```

2. **Create Quote Reply Feature**
   - Add "Quote Reply" button to each comment
   - Pre-populate editor with quoted text
   - Proper markdown quote formatting

3. **Update Comment Rendering**
   - Render markdown content using `react-markdown`
   - Apply typography classes for proper styling
   - Handle code blocks and other markdown elements

**Files to modify:**
- `frontend/components/report-detail/CommentsSection.tsx`
- `frontend/pages/events/[eventSlug]/reports/[reportId]/index.tsx`

4. **Add Markdown Dependencies**
   - Consider adding markdown parsing utilities
   - Add DOMPurify for sanitization if needed

#### UI/UX Considerations

- Mobile-responsive markdown editor
- Keyboard shortcuts for common formatting
- Help tooltip showing markdown syntax
- Preview mode for complex markdown

### Phase 3: Comment Deep Linking (Issue #39)

#### Backend Changes

1. **Add Comment Anchoring Support**
   - Ensure comments have stable IDs for anchoring
   - Add API endpoint to fetch specific comment
   - Validate comment access permissions for direct links

**New endpoint:**
- `GET /events/slug/:slug/reports/:reportId/comments/:commentId`

**Files to modify:**
- `backend/src/routes/event.routes.ts`
- `backend/src/services/comment.service.ts`

#### Frontend Changes

1. **URL Structure and Routing**
   - Support URL fragments for comment anchoring: `/reports/123#comment-456`
   - Handle navigation to specific comments on page load
   - Scroll to comment and highlight it temporarily

2. **Comment Permalink Feature**
   - Add "Permalink" button/icon to each comment
   - Copy comment URL to clipboard functionality
   - Share comment link with proper permissions context

3. **Comment Navigation**
   - Highlight target comment when accessed via direct link
   - Smooth scrolling to comment
   - Handle pagination when comment is not on current page

**Files to modify:**
- `frontend/components/report-detail/CommentsSection.tsx`
- `frontend/pages/events/[eventSlug]/reports/[reportId]/index.tsx`

**New functionality:**
```typescript
// Handle URL fragments
useEffect(() => {
  const hash = router.asPath.split('#')[1];
  if (hash?.startsWith('comment-')) {
    const commentId = hash.replace('comment-', '');
    scrollToComment(commentId);
  }
}, [router.asPath]);
```

#### Security and Privacy Considerations

- Ensure comment permalinks respect visibility permissions
- Validate user access when following direct comment links
- Handle anonymous/public access appropriately

### Phase 4: Enhanced User Experience Features

#### Additional Features to Consider

1. **Comment Notifications**
   - Notify users when comments are added to reports they're involved in
   - Email digest for comment activity

2. **Comment Reactions**
   - Simple emoji reactions (👍, 👎, ❤️)
   - Reaction count display

3. **Comment Threading** (Future consideration)
   - Reply to specific comments
   - Nested comment display

4. **Comment Export**
   - Export comment thread to PDF/text
   - Audit trail generation

## Implementation Order and Timeline

### Sprint 1 (Issues #36 - Filtering & Pagination)
**Duration:** 1-2 weeks

**Tasks:**
1. Backend comment service enhancements
2. API route updates for filtering/search
3. Frontend filter controls component
4. Pagination component
5. Integration and testing

**Deliverables:**
- Enhanced comment filtering (visibility, author, search)
- Proper pagination with controls
- Improved mobile responsiveness

### Sprint 2 (Issue #37 - Markdown Support)
**Duration:** 1-2 weeks

**Tasks:**
1. Database schema updates
2. Backend markdown validation
3. Markdown editor component
4. Comment rendering updates
5. Quote reply functionality

**Deliverables:**
- Full markdown support in comments
- Formatting toolbar with common options
- Quote reply feature
- Mobile-optimized markdown editor

### Sprint 3 (Issue #39 - Deep Linking)
**Duration:** 1 week

**Tasks:**
1. Comment permalink API
2. URL fragment handling
3. Comment navigation features
4. Clipboard integration
5. Security validation

**Deliverables:**
- Direct comment linking
- Permalink sharing
- Automatic navigation to linked comments

## Technical Considerations

### Performance
- Implement comment caching for frequently accessed reports
- Consider lazy loading for large comment threads
- Optimize markdown rendering performance

### Mobile Experience
- Touch-friendly markdown editor
- Responsive comment filters
- Swipe gestures for comment navigation

### Accessibility
- Proper ARIA labels for comment controls
- Keyboard navigation for comment threads
- Screen reader support for markdown content

### Security
- Sanitize all markdown input to prevent XSS
- Validate comment permissions for direct links
- Rate limiting for comment operations

## Testing Strategy

### Backend Tests
- Unit tests for enhanced comment service methods
- Integration tests for filtering and search functionality
- API endpoint tests with various permission scenarios

### Frontend Tests
- Component tests for new UI elements
- User interaction tests for markdown editor
- URL routing tests for comment deep linking

### End-to-End Tests
- Complete comment workflow testing
- Cross-browser compatibility
- Mobile device testing

## Documentation Updates

### Developer Documentation
- Update API documentation with new comment endpoints
- Document markdown editor component usage
- Add troubleshooting guide for comment features

### User Documentation
- Create markdown formatting guide
- Document comment filtering and search features
- Add help section for comment permalinks

## Rollout Strategy

### Phase Rollout
1. **Beta Testing**: Deploy to staging environment
2. **Limited Release**: Enable for select events
3. **Full Release**: Deploy to all production events
4. **Monitoring**: Track usage and performance metrics

### Feature Flags
Consider implementing feature flags for:
- Markdown editor (allow gradual rollout)
- Advanced filtering (enable per event)
- Deep linking (control per user role)

## Success Metrics

### User Engagement
- Comment thread length increase
- User retention in comment discussions
- Mobile comment usage statistics

### Performance Metrics
- Comment load time improvements
- Search response time
- Page load impact assessment

### Quality Metrics
- Reduced support tickets for comment issues
- Improved user feedback scores
- Accessibility compliance verification

---

This implementation plan provides a comprehensive roadmap for enhancing the comment system while maintaining security, performance, and usability standards established in the Conducky project. 