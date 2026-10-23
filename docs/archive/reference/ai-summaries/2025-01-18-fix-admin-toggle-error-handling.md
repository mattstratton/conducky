# Admin Events Toggle Error Handling Fix

**Date:** January 18, 2025  
**Issue:** Prisma P2025 error handling in admin events toggle endpoint

## Problem Description

The `PATCH /api/admin/events/:eventId/toggle` endpoint was using an overly restrictive string match for Prisma "Record not found" errors. The code was checking for an exact match of `error.message === 'Record to update not found.'`, but Prisma typically returns much more verbose error messages that include additional context.

**Example of actual Prisma error message:**
```
"An operation failed because it depends on one or more records that were required but not found. Record to update not found."
```

This mismatch prevented the condition from matching, causing the API to incorrectly return a generic 500 error instead of the intended 404 status when an event was not found.

## Solution

**Before:**
```javascript
} catch (error) {
  logger().error('Error toggling event status:', error);
  if (error instanceof Error && error.message === 'Record to update not found.') {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.status(500).json({ error: 'Failed to toggle event status' });
}
```

**After:**
```javascript
} catch (error: any) {
  logger().error('Error toggling event status:', error);
  if (error?.code === 'P2025') {
    res.status(404).json({ error: 'Event not found' });
    return;
  }
  res.status(500).json({ error: 'Failed to toggle event status' });
}
```

## Changes Made

### 1. Updated Admin Routes Error Handling
- **File:** `backend/src/routes/admin.routes.ts`
- **Change:** Replaced exact string matching with Prisma error code checking
- **Line 436:** Changed from `error.message === 'Record to update not found.'` to `error?.code === 'P2025'`
- **Type Safety:** Added proper TypeScript typing with `error: any`

### 2. Updated Mock Implementation
- **File:** `backend/__mocks__/@prisma/client.js`
- **Change:** Modified the event update mock to properly simulate Prisma P2025 errors
- **Improvement:** Now throws errors with the correct `code` property for testing

## Benefits

1. **Accurate Error Responses:** The API now correctly returns 404 status codes when events are not found
2. **Robust Error Handling:** Uses Prisma's standard error codes instead of fragile message matching
3. **Consistent with Codebase:** Follows the same pattern used throughout the application (see `invite.service.ts`)
4. **Better Developer Experience:** More predictable API responses for frontend consumption

## Testing

- All existing integration tests continue to pass (246 tests)
- Verified that P2025 errors are correctly caught and return 404 status
- Confirmed that other error scenarios still return appropriate 500 errors
- Mock implementation properly simulates real Prisma behavior

## Technical Details

Prisma throws `PrismaKnownClientError` with specific error codes:
- **P2025:** "An operation failed because it depends on one or more records that were required but not found"
- This is the standard error for update/delete operations on non-existent records

The fix aligns with Prisma's recommended error handling patterns and matches the implementation used elsewhere in the codebase. 