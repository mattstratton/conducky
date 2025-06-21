// backend/__mocks__/@prisma/client.js

// Shared persistent in-memory store for all tests
const inMemoryStore = {
  events: [{ id: "1", name: "Event1", slug: "event1" }],
  roles: [
    { id: "1", name: "SuperAdmin" },
    { id: "2", name: "Event Admin" },
    { id: "3", name: "Responder" },
    { id: "4", name: "Reporter" },
  ],
  organizations: [
    { id: "1", name: "Test Organization", slug: "test-org", description: "Test org", createdById: "1" }
  ],
  organizationMemberships: [
    { id: "1", organizationId: "1", userId: "1", role: "org_admin", createdById: "1" }
  ],
  users: [{ id: "1", email: "admin@example.com", name: "Admin" }],
  userEventRoles: [
    {
      userId: "1",
      eventId: "1",
      roleId: "1",
      role: { name: "SuperAdmin" },
      user: { id: "1", email: "admin@example.com", name: "Admin" },
    },
  ],
  reports: [{ id: "r1", eventId: "1", state: "submitted" }],
  auditLogs: [
    // Example state change log for report r1
    {
      id: "al1",
      targetType: "Report",
      targetId: "r1",
      action: "State changed from submitted to acknowledged",
      userId: "1",
      timestamp: new Date(),
      user: { name: "Admin", email: "admin@example.com" }
    }
  ],
  eventLogos: [],
  eventInvites: [],
  userAvatars: [],
  passwordResetTokens: [],
  notifications: [],
  reportComments: [],
  rateLimitAttempts: [],
  systemSettings: [
    { id: "1", key: "showPublicEventList", value: "false" }
  ],
  evidenceFiles: [
    {
      id: "e1",
      filename: "download.txt",
      mimetype: "text/plain; charset=utf-8",
      size: 10,
      data: Buffer.from("downloadme"),
      reportId: "r1",
      report: {
        id: "r1",
        eventId: "1",
        event: { id: "1", name: "Event1", slug: "event1" }
      }
    }
  ],
  // Organization-related models
  organizations: [],
  organizationMemberships: [],
  organizationLogos: [],
  organizationInviteLinks: [],
};

class PrismaClient {
  async $disconnect() {
    // No-op for mock
    return Promise.resolve();
  }
  constructor() {
    this.event = {
      findUnique: jest.fn(
        ({ where }) =>
          inMemoryStore.events.find((e) => e.id === where.id || e.slug === where.slug) || null
      ),
      create: jest.fn(({ data }) => {
        if (inMemoryStore.events.some((e) => e.slug === data.slug)) {
          const err = new Error("Unique constraint failed");
          err.code = "P2002";
          throw err;
        }
        const newEvent = {
          id: (inMemoryStore.events.length + 1).toString(),
          ...data,
        };
        inMemoryStore.events.push(newEvent);
        return newEvent;
      }),
      update: jest.fn(({ where, data }) => {
        // Support update by slug or id
        const idx = inMemoryStore.events.findIndex(
          (e) =>
            (where.id && e.id === where.id) ||
            (where.slug && e.slug === where.slug),
        );
        if (idx === -1) throw new Error("Event not found");
        inMemoryStore.events[idx] = { ...inMemoryStore.events[idx], ...data };
        return inMemoryStore.events[idx];
      }),
    };
    this.role = {
      findUnique: jest.fn(
        ({ where }) =>
          inMemoryStore.roles.find((r) => r.name === where.name) || null,
      ),
      findFirst: jest.fn(
        ({ where }) =>
          inMemoryStore.roles.find((r) => r.name === where.name) || null,
      ),
      create: jest.fn(({ data }) => {
        const newRole = {
          id: (inMemoryStore.roles.length + 1).toString(),
          ...data,
        };
        inMemoryStore.roles.push(newRole);
        return newRole;
      }),
    };
    this.user = {
      findUnique: jest.fn(
        ({ where }) =>
          inMemoryStore.users.find(
            (u) => u.id === where.id || u.email === where.email,
          ) || null,
      ),
      count: jest.fn(() => inMemoryStore.users.length),
      create: jest.fn(({ data }) => {
        if (inMemoryStore.users.some((u) => u.email === data.email)) {
          const err = new Error("Unique constraint failed");
          err.code = "P2002";
          throw err;
        }
        const user = { ...data, id: String(inMemoryStore.users.length + 1) };
        inMemoryStore.users.push(user);
        return user;
      }),
      update: jest.fn(({ where, data }) => {
        const user = inMemoryStore.users.find((u) => u.id === where.id);
        if (user) Object.assign(user, data);
        return user;
      }),
      delete: jest.fn(({ where }) => {
        const idx = inMemoryStore.users.findIndex((u) => u.id === where.id);
        if (idx !== -1) {
          return inMemoryStore.users.splice(idx, 1)[0];
        }
        return null;
      }),
    };
    this.userEventRole = {
      findMany: jest.fn(({ where, include }) => {
        let results = inMemoryStore.userEventRoles;
        if (where) {
          if (where.userId) {
            results = results.filter((uer) => uer.userId === where.userId);
          }
          if (where.eventId) {
            // Ensure type-safe comparison (always string)
            results = results.filter(
              (uer) => String(uer.eventId) === String(where.eventId),
            );
          }
          if (where.role && where.role.name) {
            results = results.filter(
              (uer) => uer.role && uer.role.name === where.role.name,
            );
          }
          if (where.user && where.user.OR) {
            results = results.filter((uer) => {
              return where.user.OR.some((cond) => {
                if (cond.email) {
                  return uer.user && uer.user.email === cond.email;
                }
                return false;
              });
            });
          }
        }
        
        if (include) {
          results = results.map((result) => {
            const enhancedResult = { ...result };
            
            if (include.role) {
              // Role is already included in the mock data
              enhancedResult.role = result.role;
            }
            
            if (include.event) {
              // Find the event
              const event = inMemoryStore.events.find(e => String(e.id) === String(result.eventId));
              if (event) {
                enhancedResult.event = event;
              }
            }
            
            return enhancedResult;
          });
        }
        
        return results;
      }),
      count: jest.fn(({ where }) => {
        let results = inMemoryStore.userEventRoles;
        if (where) {
          if (where.userId) {
            results = results.filter((uer) => uer.userId === where.userId);
          }
          if (where.eventId) {
            results = results.filter((uer) => uer.eventId === where.eventId);
          }
          if (where.role && where.role.name) {
            results = results.filter(
              (uer) => uer.role && uer.role.name === where.role.name,
            );
          }
          if (where.user && where.user.OR) {
            results = results.filter((uer) => {
              return where.user.OR.some((cond) => {
                if (cond.name && cond.name.contains) {
                  if (
                    !uer.user.name ||
                    !uer.user.name
                      .toLowerCase()
                      .includes(cond.name.contains.toLowerCase())
                  )
                    return false;
                }
                if (cond.email && cond.email.contains) {
                  if (
                    !uer.user.email ||
                    !uer.user.email
                      .toLowerCase()
                      .includes(cond.email.contains.toLowerCase())
                  )
                    return false;
                }
                return true;
              });
            });
          }
        }
        return results.length;
      }),
      create: jest.fn(({ data }) => {
        const newUER = {
          ...data,
          role: inMemoryStore.roles.find((r) => r.id === data.roleId),
          user: inMemoryStore.users.find((u) => u.id === data.userId),
        };
        inMemoryStore.userEventRoles.push(newUER);
        return newUER;
      }),
      createMany: jest.fn(({ data }) => {
        const created = [];
        data.forEach(item => {
          const newUER = {
            ...item,
            role: inMemoryStore.roles.find((r) => r.id === item.roleId),
            user: inMemoryStore.users.find((u) => u.id === item.userId),
          };
          inMemoryStore.userEventRoles.push(newUER);
          created.push(newUER);
        });
        return { count: created.length };
      }),
      delete: jest.fn(({ where }) => {
        const idx = inMemoryStore.userEventRoles.findIndex(
          (uer) =>
            uer.userId === where.userId &&
            uer.eventId === where.eventId &&
            uer.roleId === where.roleId
        );
        if (idx !== -1) {
          return inMemoryStore.userEventRoles.splice(idx, 1)[0];
        }
        return null;
      }),
      deleteMany: jest.fn(({ where }) => {
        const before = inMemoryStore.userEventRoles.length;
        inMemoryStore.userEventRoles = inMemoryStore.userEventRoles.filter(
          (uer) => {
            if (where.userId && uer.userId !== where.userId) return true;
            if (where.eventId && uer.eventId !== where.eventId) return true;
            if (where.roleId && uer.roleId !== where.roleId) return true;
            return false;
          }
        );
        return { count: before - inMemoryStore.userEventRoles.length };
      }),
      findFirst: jest.fn(({ where, include }) => {
        let results = inMemoryStore.userEventRoles;
        if (where) {
          if (where.userId) {
            results = results.filter((uer) => uer.userId === where.userId);
          }
          if (where.eventId) {
            results = results.filter(
              (uer) => String(uer.eventId) === String(where.eventId)
            );
          }
          if (where.role && where.role.name) {
            results = results.filter(
              (uer) => uer.role && uer.role.name === where.role.name
            );
          }
        }
        
        if (results.length === 0) {
          return null;
        }
        
        let result = results[0];
        
        // Handle includes
        if (include) {
          result = { ...result };
          
          if (include.role) {
            result.role = inMemoryStore.roles.find((r) => r.id === result.roleId) || result.role;
          }
          
          if (include.event) {
            result.event = inMemoryStore.events.find((e) => e.id === result.eventId) || result.event;
          }
        }
        
        return result;
      }),
      upsert: jest.fn(async ({ where, update, create }) => {
        const idx = inMemoryStore.userEventRoles.findIndex(
          (uer) =>
            uer.userId === where.userId &&
            uer.eventId === where.eventId &&
            uer.roleId === where.roleId
        );
        if (idx !== -1) {
          inMemoryStore.userEventRoles[idx] = {
            ...inMemoryStore.userEventRoles[idx],
            ...update,
          };
          return inMemoryStore.userEventRoles[idx];
        } else {
          const newRole = { ...create };
          inMemoryStore.userEventRoles.push(newRole);
          return newRole;
        }
      }),
    };
    this.report = {
      findUnique: jest.fn(
        ({ where }) =>
          inMemoryStore.reports.find((r) => r.id === where.id) || null,
      ),
      update: jest.fn(({ where, data }) => {
        const report = inMemoryStore.reports.find((r) => r.id === where.id);
        if (report) Object.assign(report, data);
        return { ...report, reporter: inMemoryStore.users[0] };
      }),
      delete: jest.fn(({ where }) => {
        const idx = inMemoryStore.reports.findIndex((r) => r.id === where.id);
        if (idx === -1) {
          const err = new Error("Record not found");
          err.code = "P2025";
          throw err;
        }
        const deletedReport = inMemoryStore.reports.splice(idx, 1)[0];
        return deletedReport;
      }),
      create: jest.fn(({ data }) => {
        const newReport = {
          id: `r${inMemoryStore.reports.length + 1}`,
          ...data,
        };
        inMemoryStore.reports.push(newReport);
        return newReport;
      }),
      findMany: jest.fn(({ where, include, orderBy, skip, take }) => {
        let results = [...inMemoryStore.reports];
        
        // Helper function to apply a single where condition
        const applyWhereCondition = (results, condition) => {
          if (condition.eventId && !condition.eventId.in) {
            // Single event filter
            const eventExists = inMemoryStore.events.some(
              (e) => e.id === condition.eventId,
            );
            if (!eventExists) {
              const err = new Error("Event not found");
              err.code = "P2025";
              throw err;
            }
            results = results.filter((r) => r.eventId === condition.eventId);
          }
          
          if (condition.eventId && condition.eventId.in) {
            // Multiple events filter (for cross-event queries)
            results = results.filter((r) => condition.eventId.in.includes(r.eventId));
          }
          
          if (condition.id && condition.id.in) {
            // Filter by multiple IDs (for export with specific report IDs)
            results = results.filter((r) => condition.id.in.includes(r.id));
          }
          
          if (condition.state) {
            results = results.filter((r) => r.state === condition.state);
          }
          
          if (condition.severity) {
            results = results.filter((r) => r.severity === condition.severity);
          }
          
          if (condition.reporterId) {
            results = results.filter((r) => r.reporterId === condition.reporterId);
          }
          
          if (condition.assignedResponderId) {
            results = results.filter((r) => r.assignedResponderId === condition.assignedResponderId);
          }
          
          if (condition.assignedResponderId === null) {
            results = results.filter((r) => !r.assignedResponderId);
          }
          
          if (condition.OR) {
            results = results.filter((r) => {
              return condition.OR.some(orCondition => {
                if (orCondition.title && orCondition.title.contains) {
                  return r.title.toLowerCase().includes(orCondition.title.contains.toLowerCase());
                }
                if (orCondition.description && orCondition.description.contains) {
                  return r.description.toLowerCase().includes(orCondition.description.contains.toLowerCase());
                }
                return false;
              });
            });
          }
          
          return results;
        };
        
        // Apply where filters
        if (where) {
          if (where.AND) {
            // Handle AND clauses - apply each condition sequentially
            for (const condition of where.AND) {
              results = applyWhereCondition(results, condition);
            }
          } else {
            // Handle direct where conditions
            results = applyWhereCondition(results, where);
          }
        }
        
        // Apply includes
        if (include) {
          results = results.map(report => {
            const enrichedReport = { ...report };
            
            if (include.event) {
              enrichedReport.event = inMemoryStore.events.find(e => e.id === report.eventId);
            }
            
            if (include.reporter) {
              enrichedReport.reporter = inMemoryStore.users.find(u => u.id === report.reporterId);
            }
            
            if (include.assignedResponder) {
              enrichedReport.assignedResponder = report.assignedResponderId ? 
                inMemoryStore.users.find(u => u.id === report.assignedResponderId) : null;
            }
            
            if (include.evidenceFiles) {
              enrichedReport.evidenceFiles = report.evidenceFiles || [];
            }
            
            if (include._count) {
              enrichedReport._count = report._count || { comments: 0 };
            }
            
            return enrichedReport;
          });
        }
        
        // Apply ordering
        if (orderBy) {
          results.sort((a, b) => {
            for (const order of Array.isArray(orderBy) ? orderBy : [orderBy]) {
              const field = Object.keys(order)[0];
              const direction = order[field];
              
              let aVal = a[field];
              let bVal = b[field];
              
              if (field === 'createdAt' || field === 'updatedAt') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
              }
              
              if (aVal < bVal) return direction === 'asc' ? -1 : 1;
              if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            }
            return 0;
          });
        }
        
        // Apply pagination
        if (skip) {
          results = results.slice(skip);
        }
        if (take) {
          results = results.slice(0, take);
        }
        
        return results;
      }),
      count: jest.fn(({ where }) => {
        let results = [...inMemoryStore.reports];
        
        // Helper function to apply a single where condition (same as in findMany)
        const applyWhereCondition = (results, condition) => {
          if (condition.eventId && !condition.eventId.in) {
            results = results.filter((r) => r.eventId === condition.eventId);
          }
          
          if (condition.eventId && condition.eventId.in) {
            results = results.filter((r) => condition.eventId.in.includes(r.eventId));
          }
          
          if (condition.id && condition.id.in) {
            // Filter by multiple IDs (for export with specific report IDs)
            results = results.filter((r) => condition.id.in.includes(r.id));
          }
          
          if (condition.state) {
            results = results.filter((r) => r.state === condition.state);
          }
          
          if (condition.severity) {
            results = results.filter((r) => r.severity === condition.severity);
          }
          
          if (condition.reporterId) {
            results = results.filter((r) => r.reporterId === condition.reporterId);
          }
          
          if (condition.assignedResponderId) {
            results = results.filter((r) => r.assignedResponderId === condition.assignedResponderId);
          }
          
          if (condition.assignedResponderId === null) {
            results = results.filter((r) => !r.assignedResponderId);
          }
          
          if (condition.OR) {
            results = results.filter((r) => {
              return condition.OR.some(orCondition => {
                if (orCondition.title && orCondition.title.contains) {
                  return r.title.toLowerCase().includes(orCondition.title.contains.toLowerCase());
                }
                if (orCondition.description && orCondition.description.contains) {
                  return r.description.toLowerCase().includes(orCondition.description.contains.toLowerCase());
                }
                return false;
              });
            });
          }
          
          return results;
        };
        
        // Apply same where filters as findMany
        if (where) {
          if (where.AND) {
            // Handle AND clauses - apply each condition sequentially
            for (const condition of where.AND) {
              results = applyWhereCondition(results, condition);
            }
          } else {
            // Handle direct where conditions
            results = applyWhereCondition(results, where);
          }
        }
        
        return results.length;
      }),
      findFirst: jest.fn(({ where, orderBy }) => {
        let results = [...inMemoryStore.reports];
        
        const applyWhereCondition = (results, condition) => {
          if (condition.eventId) {
            results = results.filter((r) => r.eventId === condition.eventId);
          }
          if (condition.id) {
            results = results.filter((r) => r.id === condition.id);
          }
          if (condition.id && condition.id.in) {
            // Filter by multiple IDs (for export with specific report IDs)
            results = results.filter((r) => condition.id.in.includes(r.id));
          }
          if (condition.reporterId) {
            results = results.filter((r) => r.reporterId === condition.reporterId);
          }
          if (condition.responderId) {
            results = results.filter((r) => r.responderId === condition.responderId);
          }
          if (condition.state) {
            results = results.filter((r) => r.state === condition.state);
          }
          if (condition.type) {
            results = results.filter((r) => r.type === condition.type);
          }
          if (condition.urgency) {
            results = results.filter((r) => r.urgency === condition.urgency);
          }
          if (condition.createdAt) {
            if (condition.createdAt.gte) {
              results = results.filter((r) => new Date(r.createdAt) >= new Date(condition.createdAt.gte));
            }
            if (condition.createdAt.lte) {
              results = results.filter((r) => new Date(r.createdAt) <= new Date(condition.createdAt.lte));
            }
          }
          if (condition.OR) {
            results = results.filter(r => {
              return condition.OR.some(orCondition => {
                if (orCondition.title && orCondition.title.contains) {
                  return r.title.toLowerCase().includes(orCondition.title.contains.toLowerCase());
                }
                if (orCondition.description && orCondition.description.contains) {
                  return r.description.toLowerCase().includes(orCondition.description.contains.toLowerCase());
                }
                return false;
              });
            });
          }
          
          return results;
        };
        
        // Apply same where filters as findMany
        if (where) {
          if (where.AND) {
            // Handle AND clauses - apply each condition sequentially
            for (const condition of where.AND) {
              results = applyWhereCondition(results, condition);
            }
          } else {
            // Handle direct where conditions
            results = applyWhereCondition(results, where);
          }
        }
        
        // Apply ordering
        if (orderBy) {
          if (orderBy.createdAt === 'desc') {
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          } else if (orderBy.createdAt === 'asc') {
            results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
        }
        
        return results[0] || null;
      }),
      groupBy: jest.fn(({ by, where, _count }) => {
        let results = [...inMemoryStore.reports];
        
        // Apply where filters using the same logic as findMany
        const applyWhereCondition = (results, condition) => {
          if (condition.eventId && !condition.eventId.in) {
            results = results.filter((r) => r.eventId === condition.eventId);
          }
          
          if (condition.eventId && condition.eventId.in) {
            results = results.filter((r) => condition.eventId.in.includes(r.eventId));
          }
          
          if (condition.id && condition.id.in) {
            // Filter by multiple IDs (for export with specific report IDs)
            results = results.filter((r) => condition.id.in.includes(r.id));
          }
          
          if (condition.state) {
            results = results.filter((r) => r.state === condition.state);
          }
          
          if (condition.severity) {
            results = results.filter((r) => r.severity === condition.severity);
          }
          
          if (condition.reporterId) {
            results = results.filter((r) => r.reporterId === condition.reporterId);
          }
          
          if (condition.assignedResponderId) {
            results = results.filter((r) => r.assignedResponderId === condition.assignedResponderId);
          }
          
          if (condition.assignedResponderId === null) {
            results = results.filter((r) => !r.assignedResponderId);
          }
          
          return results;
        };
        
        if (where) {
          if (where.AND) {
            for (const condition of where.AND) {
              results = applyWhereCondition(results, condition);
            }
          } else {
            results = applyWhereCondition(results, where);
          }
        }
        
        // Group by the specified field
        const groups = {};
        results.forEach(report => {
          const key = report[by[0]]; // Assuming single field grouping
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(report);
        });
        
        // Return grouped results with counts
        return Object.keys(groups).map(key => {
          const result = {};
          result[by[0]] = key;
          if (_count) {
            result._count = {};
            Object.keys(_count).forEach(countField => {
              result._count[countField] = groups[key].length;
            });
          }
          return result;
        });
      }),
    };
    this.auditLog = {
      create: jest.fn(({ data }) => {
        const log = { id: String(inMemoryStore.auditLogs.length + 1), ...data };
        inMemoryStore.auditLogs.push(log);
        return log;
      }),
      findMany: jest.fn(({ where, orderBy, skip, take, include }) => {
        let results = [...inMemoryStore.auditLogs];
        
        if (where) {
          if (where.userId) {
            results = results.filter((log) => log.userId === where.userId);
          }
          if (where.eventId) {
            results = results.filter((log) => log.eventId === where.eventId);
          }
          if (where.targetType) {
            results = results.filter((log) => log.targetType === where.targetType);
          }
          if (where.targetId) {
            results = results.filter((log) => log.targetId === where.targetId);
          }
        }
        
        // Apply ordering - use timestamp instead of createdAt
        if (orderBy) {
          if (orderBy.timestamp === 'desc') {
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          } else if (orderBy.timestamp === 'asc') {
            results.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          }
          // Also support createdAt for backward compatibility
          if (orderBy.createdAt === 'desc') {
            results.sort((a, b) => new Date(b.createdAt || b.timestamp) - new Date(a.createdAt || a.timestamp));
          } else if (orderBy.createdAt === 'asc') {
            results.sort((a, b) => new Date(a.createdAt || a.timestamp) - new Date(b.createdAt || b.timestamp));
          }
        }
        
        // Apply includes
        if (include && include.user) {
          results = results.map(log => {
            const user = inMemoryStore.users.find(u => u.id === log.userId);
            return {
              ...log,
              user: user || null
            };
          });
        }
        
        // Apply pagination
        if (skip) {
          results = results.slice(skip);
        }
        if (take) {
          results = results.slice(0, take);
        }
        
        return results;
      }),
      count: jest.fn(({ where }) => {
        let results = [...inMemoryStore.auditLogs];
        
        if (where) {
          if (where.userId) {
            results = results.filter((log) => log.userId === where.userId);
          }
          if (where.eventId) {
            results = results.filter((log) => log.eventId === where.eventId);
          }
        }
        
        return results.length;
      }),
      findFirst: jest.fn(({ where, orderBy }) => {
        let results = [...inMemoryStore.auditLogs];
        
        if (where) {
          if (where.userId) {
            results = results.filter((log) => log.userId === where.userId);
          }
          if (where.eventId) {
            results = results.filter((log) => log.eventId === where.eventId);
          }
        }
        
        // Apply ordering
        if (orderBy) {
          if (orderBy.createdAt === 'desc') {
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          } else if (orderBy.createdAt === 'asc') {
            results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
        }
        
        return results[0] || null;
      }),
    };
    this.eventLogo = {
      deleteMany: jest.fn(({ where }) => {
        const before = inMemoryStore.eventLogos.length;
        inMemoryStore.eventLogos = inMemoryStore.eventLogos.filter((l) => {
          if (where && where.eventId && l.eventId !== where.eventId)
            return true;
          return false;
        });
        return { count: before - inMemoryStore.eventLogos.length };
      }),
      create: jest.fn(({ data }) => {
        const logo = {
          id: String(inMemoryStore.eventLogos.length + 1),
          ...data,
        };
        inMemoryStore.eventLogos.push(logo);
        return logo;
      }),
      findFirst: jest.fn(({ where }) => {
        return (
          inMemoryStore.eventLogos.find((l) => l.eventId === where.eventId) ||
          null
        );
      }),
    };
    this.eventInviteLink = {
      findUnique: jest.fn(({ where }) => {
        return (
          (inMemoryStore.eventInvites || []).find((i) => 
            (where.id && i.id === where.id) || (where.code && i.code === where.code)
          ) || null
        );
      }),
      update: jest.fn(({ where, data }) => {
        const idx = (inMemoryStore.eventInvites || []).findIndex(
          (i) => (where.id && i.id === where.id) || (where.code && i.code === where.code),
        );
        if (idx === -1) {
          const err = new Error("Invite not found");
          err.code = "P2025";
          throw err;
        }
        
        // Handle increment operations
        const updatedData = { ...data };
        if (data.useCount && data.useCount.increment) {
          updatedData.useCount = (inMemoryStore.eventInvites[idx].useCount || 0) + data.useCount.increment;
        }
        
        inMemoryStore.eventInvites[idx] = {
          ...inMemoryStore.eventInvites[idx],
          ...updatedData,
        };
        return inMemoryStore.eventInvites[idx];
      }),
    };
    this.evidenceFile = {
      create: jest.fn(({ data }) => {
        if (!inMemoryStore.evidenceFiles) inMemoryStore.evidenceFiles = [];
        const newEvidence = {
          id: `e${inMemoryStore.evidenceFiles.length + 1}`,
          ...data,
        };
        inMemoryStore.evidenceFiles.push(newEvidence);
        return newEvidence;
      }),
      // findUnique should only be used for id, not reportId (reportId is not unique)
      findUnique: jest.fn(({ where, include }) => {
        if (!inMemoryStore.evidenceFiles) return null;
        if (where.id) {
          const found = inMemoryStore.evidenceFiles.find(
            (e) => e.id === where.id,
          );
          if (!found) return null;
          
          // Ensure .data is a Buffer (simulate DB binary storage)
          if (!(found.data instanceof Buffer)) {
            found.data = Buffer.from(found.data);
          }
          
          // Handle includes
          if (include) {
            const result = { ...found };
            
            if (include.report) {
              const report = inMemoryStore.reports.find(r => r.id === found.reportId);
              if (report) {
                result.report = { ...report };
                
                // Handle nested includes
                if (include.report.include && include.report.include.event) {
                  const event = inMemoryStore.events.find(e => e.id === report.eventId);
                  if (event) {
                    result.report.event = event;
                  }
                }
              }
            }
            
            return result;
          }
          
          return found;
        }
        return null;
      }),
      // findMany should be used for reportId
      findMany: jest.fn(({ where }) => {
        if (!inMemoryStore.evidenceFiles) return [];
        if (where.reportId) {
          return inMemoryStore.evidenceFiles.filter(
            (e) => e.reportId === where.reportId,
          );
        }
        return [];
      }),
      deleteMany: jest.fn(({ where }) => {
        if (!inMemoryStore.evidenceFiles) return { count: 0 };
        const before = inMemoryStore.evidenceFiles.length;
        if (where.reportId) {
          inMemoryStore.evidenceFiles = inMemoryStore.evidenceFiles.filter(
            (e) => e.reportId !== where.reportId
          );
        }
        return { count: before - inMemoryStore.evidenceFiles.length };
      }),
    };
    // Note: reportComment methods are defined later in the constructor
    this.userAvatar = {
      findUnique: jest.fn(({ where }) => {
        return (
          inMemoryStore.userAvatars.find((a) => a.userId === where.userId) ||
          null
        );
      }),
      create: jest.fn(({ data }) => {
        // Remove any existing avatar for this user
        inMemoryStore.userAvatars = inMemoryStore.userAvatars.filter(
          (a) => a.userId !== data.userId,
        );
        const avatar = {
          id: String(inMemoryStore.userAvatars.length + 1),
          ...data,
        };
        inMemoryStore.userAvatars.push(avatar);
        return avatar;
      }),
      deleteMany: jest.fn(({ where }) => {
        const before = inMemoryStore.userAvatars.length;
        inMemoryStore.userAvatars = inMemoryStore.userAvatars.filter(
          (a) => a.userId !== where.userId,
        );
        return { count: before - inMemoryStore.userAvatars.length };
      }),
    };
    this.passwordResetToken = {
      findUnique: jest.fn(({ where, include }) => {
        const token = inMemoryStore.passwordResetTokens.find(
          (t) => t.token === where.token
        );
        if (token && include && include.user) {
          token.user = inMemoryStore.users.find((u) => u.id === token.userId);
        }
        return token || null;
      }),
      findFirst: jest.fn(({ where, orderBy }) => {
        let results = inMemoryStore.passwordResetTokens;
        
        if (where) {
          if (where.user && where.user.email) {
            const user = inMemoryStore.users.find(u => u.email === where.user.email);
            if (user) {
              results = results.filter(t => t.userId === user.id);
            } else {
              return null; // No user found with that email
            }
          }
          if (where.createdAt && where.createdAt.gte) {
            results = results.filter(t => new Date(t.createdAt) >= where.createdAt.gte);
          }
        }
        
        if (orderBy && orderBy.createdAt === 'asc') {
          results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        }
        
        return results[0] || null;
      }),
      create: jest.fn(({ data }) => {
        const token = {
          id: String(inMemoryStore.passwordResetTokens.length + 1),
          createdAt: new Date(),
          ...data,
        };
        inMemoryStore.passwordResetTokens.push(token);
        return token;
      }),
      update: jest.fn(({ where, data }) => {
        const idx = inMemoryStore.passwordResetTokens.findIndex(
          (t) => t.token === where.token
        );
        if (idx !== -1) {
          inMemoryStore.passwordResetTokens[idx] = {
            ...inMemoryStore.passwordResetTokens[idx],
            ...data,
          };
          return inMemoryStore.passwordResetTokens[idx];
        }
        return null;
      }),
      count: jest.fn(({ where }) => {
        let results = inMemoryStore.passwordResetTokens;
        
        if (where) {
          if (where.user && where.user.email) {
            const user = inMemoryStore.users.find(u => u.email === where.user.email);
            if (user) {
              results = results.filter(t => t.userId === user.id);
            } else {
              return 0; // No user found with that email
            }
          }
          if (where.createdAt && where.createdAt.gte) {
            results = results.filter(t => new Date(t.createdAt) >= where.createdAt.gte);
          }
        }
        
        return results.length;
      }),
      deleteMany: jest.fn(({ where }) => {
        const before = inMemoryStore.passwordResetTokens.length;
        inMemoryStore.passwordResetTokens = inMemoryStore.passwordResetTokens.filter(
          (t) => {
            // Handle OR condition
            if (where.OR) {
              return !where.OR.some(condition => {
                if (condition.userId && t.userId === condition.userId) return true;
                if (condition.expiresAt && condition.expiresAt.lt && t.expiresAt < condition.expiresAt.lt) return true;
                return false;
              });
            }
            
            // Handle direct conditions (keep tokens that don't match the delete criteria)
            if (where.userId && t.userId === where.userId) return false;
            if (where.expiresAt && where.expiresAt.lt && t.expiresAt < where.expiresAt.lt) return false;
            return true;
          }
        );
        return { count: before - inMemoryStore.passwordResetTokens.length };
      }),
    };
    this.notification = {
      findMany: jest.fn(({ where, include, orderBy, skip, take }) => {
        let results = [...inMemoryStore.notifications];
        
        // Apply where filters
        if (where) {
          if (where.userId) {
            results = results.filter((n) => n.userId === where.userId);
          }
          if (where.isRead !== undefined) {
            results = results.filter((n) => n.isRead === where.isRead);
          }
          if (where.type) {
            results = results.filter((n) => n.type === where.type);
          }
          if (where.priority) {
            results = results.filter((n) => n.priority === where.priority);
          }
        }
        
        // Apply ordering
        if (orderBy) {
          if (orderBy.createdAt === 'desc') {
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          } else if (orderBy.createdAt === 'asc') {
            results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
        }
        
        // Apply pagination
        if (skip) {
          results = results.slice(skip);
        }
        if (take) {
          results = results.slice(0, take);
        }
        
        // Apply includes
        if (include) {
          results = results.map(notification => {
            const result = { ...notification };
            if (include.event && notification.eventId) {
              result.event = inMemoryStore.events.find(e => e.id === notification.eventId) || null;
            }
            if (include.report && notification.reportId) {
              result.report = inMemoryStore.reports.find(r => r.id === notification.reportId) || null;
            }
            return result;
          });
        }
        
        return results;
      }),
      count: jest.fn(({ where }) => {
        let results = [...inMemoryStore.notifications];
        
        if (where) {
          if (where.userId) {
            results = results.filter((n) => n.userId === where.userId);
          }
          if (where.isRead !== undefined) {
            results = results.filter((n) => n.isRead === where.isRead);
          }
          if (where.type) {
            results = results.filter((n) => n.type === where.type);
          }
          if (where.priority) {
            results = results.filter((n) => n.priority === where.priority);
          }
        }
        
        return results.length;
      }),
      findUnique: jest.fn(({ where }) => {
        return inMemoryStore.notifications.find((n) => n.id === where.id) || null;
      }),
      create: jest.fn(({ data }) => {
        const notification = {
          id: `n${inMemoryStore.notifications.length + 1}`,
          isRead: false,
          priority: 'normal',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...data,
        };
        inMemoryStore.notifications.push(notification);
        return notification;
      }),
      update: jest.fn(({ where, data }) => {
        const idx = inMemoryStore.notifications.findIndex((n) => n.id === where.id);
        if (idx === -1) {
          const err = new Error("Notification not found");
          err.code = "P2025";
          throw err;
        }
        
        inMemoryStore.notifications[idx] = {
          ...inMemoryStore.notifications[idx],
          ...data,
          updatedAt: new Date().toISOString(),
        };
        return inMemoryStore.notifications[idx];
      }),
      updateMany: jest.fn(({ where, data }) => {
        let count = 0;
        inMemoryStore.notifications.forEach((notification, idx) => {
          let matches = true;
          
          if (where.userId && notification.userId !== where.userId) {
            matches = false;
          }
          if (where.isRead !== undefined && notification.isRead !== where.isRead) {
            matches = false;
          }
          
          if (matches) {
            inMemoryStore.notifications[idx] = {
              ...notification,
              ...data,
              updatedAt: new Date().toISOString(),
            };
            count++;
          }
        });
        
        return { count };
      }),
      delete: jest.fn(({ where }) => {
        const idx = inMemoryStore.notifications.findIndex((n) => n.id === where.id);
        if (idx === -1) {
          const err = new Error("Notification not found");
          err.code = "P2025";
          throw err;
        }
        const deleted = inMemoryStore.notifications[idx];
        inMemoryStore.notifications.splice(idx, 1);
        return deleted;
      }),
      groupBy: jest.fn(({ by, where, _count }) => {
        let results = [...inMemoryStore.notifications];
        // Apply where filters
        if (where) {
          if (where.userId) {
            results = results.filter((n) => n.userId === where.userId);
          }
        }
        // Group by the specified field
        const groups = {};
        results.forEach(notification => {
          const key = notification[by[0]]; // Assuming single field grouping
          if (!groups[key]) {
            groups[key] = [];
          }
          groups[key].push(notification);
        });
        // Return grouped results with counts
        return Object.keys(groups).map(key => {
          const result = {};
          result[by[0]] = key;
          if (_count) {
            result._count = {};
            Object.keys(_count).forEach(countField => {
              result._count[countField] = groups[key].length;
            });
          }
          return result;
        });
      }),
    };
    this.reportComment = {
      findMany: jest.fn(({ where, orderBy, skip, take, include }) => {
        let results = [...inMemoryStore.reportComments];
        
        if (where) {
          if (where.reportId) {
            results = results.filter((comment) => comment.reportId === where.reportId);
          }
          if (where.userId) {
            results = results.filter((comment) => comment.userId === where.userId);
          }
        }
        
        // Apply ordering
        if (orderBy) {
          if (orderBy.createdAt === 'desc') {
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          } else if (orderBy.createdAt === 'asc') {
            results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
        }
        
        // Apply pagination
        if (skip) {
          results = results.slice(skip);
        }
        if (take) {
          results = results.slice(0, take);
        }
        
        // Apply includes
        if (include) {
          results = results.map(comment => {
            const result = { ...comment };
            if (include.user) {
              result.user = inMemoryStore.users.find(u => u.id === comment.userId) || null;
            }
            return result;
          });
        }
        
        return results;
      }),
      count: jest.fn(({ where }) => {
        let results = [...inMemoryStore.reportComments];
        
        if (where) {
          if (where.reportId) {
            results = results.filter((comment) => comment.reportId === where.reportId);
          }
          if (where.userId) {
            results = results.filter((comment) => comment.userId === where.userId);
          }
        }
        
        return results.length;
      }),
      create: jest.fn(({ data }) => {
        const comment = {
          id: `c${inMemoryStore.reportComments.length + 1}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...data,
        };
        inMemoryStore.reportComments.push(comment);
        return comment;
      }),
      findFirst: jest.fn(({ where, orderBy }) => {
        let results = [...inMemoryStore.reportComments];
        
        if (where) {
          if (where.reportId) {
            results = results.filter((comment) => comment.reportId === where.reportId);
          }
          if (where.userId) {
            results = results.filter((comment) => comment.userId === where.userId);
          }
        }
        
        // Apply ordering
        if (orderBy) {
          if (orderBy.createdAt === 'desc') {
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          } else if (orderBy.createdAt === 'asc') {
            results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          }
        }
        
        return results[0] || null;
      }),
      deleteMany: jest.fn(({ where }) => {
        if (!inMemoryStore.reportComments) {
          inMemoryStore.reportComments = [];
          return { count: 0 };
        }
        const before = inMemoryStore.reportComments.length;
        if (where.reportId) {
          inMemoryStore.reportComments = inMemoryStore.reportComments.filter(
            (c) => c.reportId !== where.reportId
          );
        }
        return { count: before - inMemoryStore.reportComments.length };
      }),
    };
    this.rateLimitAttempt = {
      count: jest.fn(({ where }) => {
        let results = [...inMemoryStore.rateLimitAttempts];
        
        if (where) {
          if (where.key) {
            results = results.filter((attempt) => attempt.key === where.key);
          }
          if (where.type) {
            results = results.filter((attempt) => attempt.type === where.type);
          }
          if (where.createdAt && where.createdAt.gte) {
            const gteDate = new Date(where.createdAt.gte);
            results = results.filter((attempt) => new Date(attempt.createdAt) >= gteDate);
          }
        }
        
        return results.length;
      }),
      create: jest.fn(({ data }) => {
        const attempt = {
          id: `ra${inMemoryStore.rateLimitAttempts.length + 1}`,
          createdAt: new Date(),
          ...data,
        };
        inMemoryStore.rateLimitAttempts.push(attempt);
        return attempt;
      }),
      deleteMany: jest.fn(({ where }) => {
        const originalLength = inMemoryStore.rateLimitAttempts.length;
        
        if (where) {
          if (where.expiresAt && where.expiresAt.lt) {
            const ltDate = new Date(where.expiresAt.lt);
            inMemoryStore.rateLimitAttempts = inMemoryStore.rateLimitAttempts.filter(
              (attempt) => new Date(attempt.expiresAt) >= ltDate
            );
          }
        }
        
        return { count: originalLength - inMemoryStore.rateLimitAttempts.length };
      }),
      findFirst: jest.fn(({ where, orderBy }) => {
        let results = [...inMemoryStore.rateLimitAttempts];
        
        if (where) {
          if (where.key) {
            results = results.filter((attempt) => attempt.key === where.key);
          }
          if (where.type) {
            results = results.filter((attempt) => attempt.type === where.type);
          }
          if (where.createdAt && where.createdAt.gte) {
            const gteDate = new Date(where.createdAt.gte);
            results = results.filter((attempt) => new Date(attempt.createdAt) >= gteDate);
          }
        }
        
        // Apply ordering
        if (orderBy) {
          if (orderBy.createdAt === 'asc') {
            results.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          } else if (orderBy.createdAt === 'desc') {
            results.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          }
        }
        
        return results[0] || null;
      }),
    };
    this.systemSetting = {
      findMany: jest.fn(() => [...inMemoryStore.systemSettings]),
      findUnique: jest.fn(({ where }) => {
        return inMemoryStore.systemSettings.find(s => s.key === where.key) || null;
      }),
      upsert: jest.fn(({ where, update, create }) => {
        const existing = inMemoryStore.systemSettings.find(s => s.key === where.key);
        if (existing) {
          Object.assign(existing, update);
          return existing;
        } else {
          const newSetting = {
            id: String(inMemoryStore.systemSettings.length + 1),
            ...create
          };
          inMemoryStore.systemSettings.push(newSetting);
          return newSetting;
        }
      }),
      deleteMany: jest.fn(({ where }) => {
        const originalLength = inMemoryStore.systemSettings.length;
        if (where && where.key && where.key.startsWith) {
          // where.key.startsWith contains the prefix string to match against
          const prefix = where.key.startsWith;
          inMemoryStore.systemSettings = inMemoryStore.systemSettings.filter(
            s => !s.key.startsWith(prefix)
          );
        }
        return { count: originalLength - inMemoryStore.systemSettings.length };
      }),
    };
    this.userNotificationSettings = {
      findUnique: jest.fn(({ where }) =>
        inMemoryStore.userNotificationSettings?.find((s) => s.userId === where.userId) || null
      ),
      create: jest.fn(({ data }) => {
        const newSettings = {
          id: (Math.random() + 1).toString(36).substring(7),
          ...{
            reportSubmittedInApp: true,
            reportSubmittedEmail: false,
            reportAssignedInApp: true,
            reportAssignedEmail: false,
            reportStatusChangedInApp: true,
            reportStatusChangedEmail: false,
            reportCommentAddedInApp: true,
            reportCommentAddedEmail: false,
            eventInvitationInApp: true,
            eventInvitationEmail: false,
            eventRoleChangedInApp: true,
            eventRoleChangedEmail: false,
            systemAnnouncementInApp: true,
            systemAnnouncementEmail: false,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          ...data,
        };
        if (!inMemoryStore.userNotificationSettings) inMemoryStore.userNotificationSettings = [];
        inMemoryStore.userNotificationSettings.push(newSettings);
        return newSettings;
      }),
      update: jest.fn(({ where, data }) => {
        const idx = inMemoryStore.userNotificationSettings?.findIndex((s) => s.userId === where.userId);
        if (idx === -1 || idx === undefined) throw new Error('Not found');
        const updated = {
          ...inMemoryStore.userNotificationSettings[idx],
          ...data,
          updatedAt: new Date(),
        };
        inMemoryStore.userNotificationSettings[idx] = updated;
        return updated;
      }),
      deleteMany: jest.fn(({ where }) => {
        if (!inMemoryStore.userNotificationSettings) return { count: 0 };
        const before = inMemoryStore.userNotificationSettings.length;
        inMemoryStore.userNotificationSettings = inMemoryStore.userNotificationSettings.filter(
          (s) => s.userId !== where.userId
        );
        return { count: before - inMemoryStore.userNotificationSettings.length };
      }),
    };
    
    // Organization models
    this.organization = {
      findUnique: jest.fn(({ where }) =>
        inMemoryStore.organizations.find((o) => o.id === where.id || o.slug === where.slug) || null
      ),
      findMany: jest.fn(({ where, include }) => {
        let results = [...inMemoryStore.organizations];
        if (where) {
          if (where.createdById) {
            results = results.filter((o) => o.createdById === where.createdById);
          }
        }
        return results;
      }),
      create: jest.fn(({ data }) => {
        if (inMemoryStore.organizations.some((o) => o.slug === data.slug)) {
          const err = new Error("Unique constraint failed");
          err.code = "P2002";
          throw err;
        }
        const newOrg = {
          id: (inMemoryStore.organizations.length + 1).toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        inMemoryStore.organizations.push(newOrg);
        return newOrg;
      }),
      update: jest.fn(({ where, data }) => {
        const idx = inMemoryStore.organizations.findIndex((o) => o.id === where.id);
        if (idx === -1) throw new Error("Organization not found");
        inMemoryStore.organizations[idx] = { 
          ...inMemoryStore.organizations[idx], 
          ...data,
          updatedAt: new Date()
        };
        return inMemoryStore.organizations[idx];
      }),
      delete: jest.fn(({ where }) => {
        const idx = inMemoryStore.organizations.findIndex((o) => o.id === where.id);
        if (idx !== -1) {
          return inMemoryStore.organizations.splice(idx, 1)[0];
        }
        return null;
      }),
      deleteMany: jest.fn(({ where }) => {
        const before = inMemoryStore.organizations.length;
        if (where) {
          if (where.slug) {
            inMemoryStore.organizations = inMemoryStore.organizations.filter(
              (o) => o.slug !== where.slug
            );
          }
          if (where.id) {
            inMemoryStore.organizations = inMemoryStore.organizations.filter(
              (o) => o.id !== where.id
            );
          }
        }
        return { count: before - inMemoryStore.organizations.length };
      }),
    };
    
    this.organizationMembership = {
      findUnique: jest.fn(({ where }) => {
        // Handle compound key lookup for organizationId_userId
        if (where.organizationId_userId) {
          const { organizationId, userId } = where.organizationId_userId;
          return inMemoryStore.organizationMemberships.find(
            (m) => m.organizationId === organizationId && m.userId === userId
          ) || null;
        }
        // Handle simple id lookup
        if (where.id) {
          return inMemoryStore.organizationMemberships.find((m) => m.id === where.id) || null;
        }
        return null;
      }),
      findMany: jest.fn(({ where, include }) => {
        let results = [...inMemoryStore.organizationMemberships];
        if (where) {
          if (where.userId) {
            results = results.filter((m) => m.userId === where.userId);
          }
          if (where.organizationId) {
            results = results.filter((m) => m.organizationId === where.organizationId);
          }
          if (where.role) {
            results = results.filter((m) => m.role === where.role);
          }
        }
        return results;
      }),
      findFirst: jest.fn(({ where }) => {
        let results = [...inMemoryStore.organizationMemberships];
        if (where) {
          if (where.userId) {
            results = results.filter((m) => m.userId === where.userId);
          }
          if (where.organizationId) {
            results = results.filter((m) => m.organizationId === where.organizationId);
          }
          if (where.role) {
            results = results.filter((m) => m.role === where.role);
          }
        }
        return results[0] || null;
      }),
      create: jest.fn(({ data }) => {
        const newMembership = {
          id: (inMemoryStore.organizationMemberships.length + 1).toString(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        inMemoryStore.organizationMemberships.push(newMembership);
        return newMembership;
      }),
      update: jest.fn(({ where, data }) => {
        const idx = inMemoryStore.organizationMemberships.findIndex((m) => m.id === where.id);
        if (idx === -1) throw new Error("Membership not found");
        inMemoryStore.organizationMemberships[idx] = { 
          ...inMemoryStore.organizationMemberships[idx], 
          ...data,
          updatedAt: new Date()
        };
        return inMemoryStore.organizationMemberships[idx];
      }),
      delete: jest.fn(({ where }) => {
        const idx = inMemoryStore.organizationMemberships.findIndex((m) => m.id === where.id);
        if (idx !== -1) {
          return inMemoryStore.organizationMemberships.splice(idx, 1)[0];
        }
        return null;
      }),
      deleteMany: jest.fn(({ where }) => {
        const before = inMemoryStore.organizationMemberships.length;
        if (where) {
          if (where.userId) {
            inMemoryStore.organizationMemberships = inMemoryStore.organizationMemberships.filter(
              (m) => m.userId !== where.userId
            );
          }
          if (where.id) {
            inMemoryStore.organizationMemberships = inMemoryStore.organizationMemberships.filter(
              (m) => m.id !== where.id
            );
          }
          if (where.organizationId) {
            inMemoryStore.organizationMemberships = inMemoryStore.organizationMemberships.filter(
              (m) => m.organizationId !== where.organizationId
            );
          }
        }
        return { count: before - inMemoryStore.organizationMemberships.length };
      }),
    };
    
    // Add transaction support for the mock
    this.$transaction = jest.fn().mockImplementation(async (operations) => {
      // Handle both callback and array patterns
      if (typeof operations === 'function') {
        // Callback pattern: prisma.$transaction(async (tx) => { ... })
        return await operations(this);
      } else if (Array.isArray(operations)) {
        // Array pattern: prisma.$transaction([op1, op2, ...])
        const results = [];
        for (const operation of operations) {
          results.push(await operation);
        }
        return results;
      }
      throw new Error('Transaction must be called with a function or array of operations');
    });
  }
}

module.exports = { PrismaClient, inMemoryStore };
