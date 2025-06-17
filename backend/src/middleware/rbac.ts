/**
 * Role-Based Access Control (RBAC) Middleware
 * 
 * This module re-exports RBAC functions from the utils layer
 * for use as middleware in routes
 */

// Re-export RBAC functions from utils
export { requireRole, requireSuperAdmin } from '../utils/rbac'; 