// backend/__mocks__/@prisma/client.js

// Shared persistent in-memory store for all tests
const inMemoryStore = {
  events: [{ id: "1", name: "Event1", slug: "event1", organizationId: "org1" }],
  roles: [
    { id: "1", name: "System Admin" },
    { id: "2", name: "Event Admin" },
    { id: "3", name: "Responder" },
    { id: "4", name: "Reporter" },
  ],
  // Unified RBAC tables
   unifiedRoles: [
    { id: "1", name: "system_admin", description: "System Administrator", level: 100 },
    { id: "2", name: "event_admin", description: "Event Administrator", level: 80 },
    { id: "3", name: "responder", description: "Incident Responder", level: 60 },
     { id: "4", name: "reporter", description: "Incident Reporter", level: 40 },
    { id: "5", name: "org_admin", description: "Organization Administrator", level: 90 },
    { id: "6", name: "org_viewer", description: "Organization Viewer", level: 30 },
  ],
  userRoles: [
    // System Admin user
    { 
      id: "1", 
      userId: "1", 
      roleId: "1", 
      scopeType: "system", 
      scopeId: "SYSTEM", 
      grantedAt: new Date(), 
      role: { id: "1", name: "system_admin" },
      user: { id: "1", email: "admin@example.com", name: "Admin" }
    },
    // Event Admin for event 1
    { 
      id: "2", 
      userId: "1", 
      roleId: "2", 
      scopeType: "event", 
      scopeId: "1", 
      grantedAt: new Date(), 
      role: { id: "2", name: "event_admin" },
      user: { id: "1", email: "admin@example.com", name: "Admin" }
    },
    // Reporter for event 1
    { 
      id: "3", 
      userId: "2", 
      roleId: "4", 
      scopeType: "event", 
      scopeId: "1", 
      grantedAt: new Date(), 
      role: { id: "4", name: "reporter" },
      user: { id: "2", email: "reporter@example.com", name: "Reporter User" }
    },
    // Responder for event 1
    { 
      id: "4", 
      userId: "3", 
      roleId: "3", 
      scopeType: "event", 
      scopeId: "1", 
      grantedAt: new Date(), 
      role: { id: "3", name: "responder" },
      user: { id: "3", email: "responder@example.com", name: "Responder User" }
    },
  ],
  organizations: [
    { id: "1", name: "Test Organization", slug: "test-org", description: "Test org", createdById: "1" }
  ],
  organizationMemberships: [
    { id: "1", organizationId: "1", userId: "1", role: "org_admin", createdById: "1" }
  ],
  users: [
    { id: "1", email: "admin@example.com", name: "Admin" },
    { id: "2", email: "reporter@example.com", name: "Reporter User" },
    { id: "3", email: "responder@example.com", name: "Responder User" }
  ],
  userEventRoles: [
    {
      userId: "1",
      eventId: "1",
      roleId: "1",
      role: { name: "System Admin" },
      user: { id: "1", email: "admin@example.com", name: "Admin" },
    },
    {
      userId: "2",
      eventId: "1",
      roleId: "4",
      role: { name: "Reporter" },
      user: { id: "2", email: "reporter@example.com", name: "Reporter User" },
    },
    {
      userId: "3",
      eventId: "1",
      roleId: "3",
      role: { name: "Responder" },
      user: { id: "3", email: "responder@example.com", name: "Responder User" },
    },
  ],
  incidents: [
    { id: "r1", eventId: "1", state: "submitted", severity: "low" },
    { 
      id: "1", 
      eventId: "1", 
      state: "submitted", 
      reporterId: "2", 
      title: "Test Incident", 
      description: "Test description",
      type: "harassment",
      severity: "high",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ],
   auditLogs: [
    // Example state change log for report r1 (for existing tests)
    {
      id: "al0",
      targetType: "Incident",
      targetId: "r1",
      action: "State changed from submitted to acknowledged",
      userId: "1",
      timestamp: new Date(),
      user: { name: "Admin", email: "admin@example.com" }
    },
    // Example state change log for report 1 (for new tests)
    {
      id: "al1",
      targetType: "Incident",
      targetId: "1",
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
  incidentComments: [],
  rateLimitAttempts: [],
  systemSettings: [
    { id: "1", key: "showPublicEventList", value: "false" }
  ],
  userPinnedIncidents: [],
  relatedFiles: [
    {
      id: "e1",
      filename: "download.txt",
      mimetype: "text/plain; charset=utf-8",
      size: 10,
      data: Buffer.from("downloadme"),
      incidentId: "1",
      incident: {
        id: "1",
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
        if (idx === -1) {
          const err = new Error("An operation failed because it depends on one or more records that were required but not found. Record to update not found.");
          err.code = "P2025";
          throw err;
        }
        inMemoryStore.events[idx] = { ...inMemoryStore.events[idx], ...data };
        return inMemoryStore.events[idx];
      }),
      findMany: jest.fn(({ where, select }) => {
        let events = [...inMemoryStore.events];
        if (where) {
          events = events.filter(event => {
            if (where.organizationId && event.organizationId !== where.organizationId) {
              return false;
            }
            return true;
          });
        }
        
        // Apply select if provided
        if (select) {
          events = events.map(event => {
            const result = {};
            Object.keys(select).forEach(key => {
              if (select[key] && event[key] !== undefined) {
                result[key] = event[key];
              }
            });
            return result;
          });
        }
        
        return events;
      }),
    };
    this.role = {
      findUnique: jest.fn(
        ({ where }) =>
          inMemoryStore.roles.find((r) => 
            (where.id && r.id === where.id) || 
            (where.name && r.name === where.name)
          ) || null,
      ),
      findFirst: jest.fn(
        ({ where }) =>
          inMemoryStore.roles.find((r) => 
            (where.id && r.id === where.id) || 
            (where.name && r.name === where.name)
          ) || null,
      ),
      findMany: jest.fn(() => [...inMemoryStore.roles]),
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
        ({ where, include }) => {
          const user = inMemoryStore.users.find(
            (u) => u.id === where.id || u.email === where.email,
          );
          if (!user) return null;
          
          // Add avatarUrl if user has an avatar
          const userWithAvatar = { ...user };
          const userAvatar = inMemoryStore.userAvatars.find(a => a.userId === user.id);
          if (userAvatar) {
            userWithAvatar.avatarUrl = `/api/users/${user.id}/avatar`;
          }
          
          return userWithAvatar;
        },
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
    this.userPinnedIncident = {
      findMany: jest.fn(({ where, select }) => {
        let pins = [...inMemoryStore.userPinnedIncidents];
        if (where) {
          if (where.userId) pins = pins.filter(p => p.userId === where.userId);
          if (where.eventId) pins = pins.filter(p => p.eventId === where.eventId);
        }
        if (select && select.incidentId) {
          return pins.map(p => ({ incidentId: p.incidentId }));
        }
        return pins;
      }),
      upsert: jest.fn(({ where, update, create }) => {
        const idx = inMemoryStore.userPinnedIncidents.findIndex(p => p.userId === where.userId_incidentId.userId && p.incidentId === where.userId_incidentId.incidentId);
        if (idx !== -1) {
          inMemoryStore.userPinnedIncidents[idx] = { ...inMemoryStore.userPinnedIncidents[idx], ...update };
          return inMemoryStore.userPinnedIncidents[idx];
        }
        const newPin = { id: `pin${inMemoryStore.userPinnedIncidents.length + 1}`, createdAt: new Date().toISOString(), ...create };
        inMemoryStore.userPinnedIncidents.push(newPin);
        return newPin;
      }),
      deleteMany: jest.fn(({ where }) => {
        const before = inMemoryStore.userPinnedIncidents.length;
        inMemoryStore.userPinnedIncidents = inMemoryStore.userPinnedIncidents.filter(p => !(p.userId === where.userId && p.incidentId === where.incidentId));
        return { count: before - inMemoryStore.userPinnedIncidents.length };
      }),
      groupBy: jest.fn(({ by, where, _count }) => {
        if (by && by[0] === 'type') {
          const buckets = {};
          inMemoryStore.notifications.filter(n => !where || n.userId === where.userId).forEach(n => {
            buckets[n.type] = (buckets[n.type] || 0) + 1;
          });
          return Object.keys(buckets).map(type => ({ type, _count: { type: buckets[type] } }));
        }
        if (by && by[0] === 'priority') {
          const buckets = {};
          inMemoryStore.notifications.filter(n => !where || n.userId === where.userId).forEach(n => {
            buckets[n.priority] = (buckets[n.priority] || 0) + 1;
          });
          return Object.keys(buckets).map(priority => ({ priority, _count: { priority: buckets[priority] } }));
        }
        return [];
      })
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
            
            if (include.user) {
              // Find the user and add avatarUrl if they have an avatar
              const user = inMemoryStore.users.find(u => u.id === result.userId);
              if (user) {
                const userWithAvatar = { ...user };
                const userAvatar = inMemoryStore.userAvatars.find(a => a.userId === user.id);
                if (userAvatar) {
                  userWithAvatar.avatarUrl = `/api/users/${user.id}/avatar`;
                }
                enhancedResult.user = userWithAvatar;
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
          
          if (include.user) {
            // Find the user and add avatarUrl if they have an avatar
            const user = inMemoryStore.users.find(u => u.id === result.userId);
            if (user) {
              const userWithAvatar = { ...user };
              const userAvatar = inMemoryStore.userAvatars.find(a => a.userId === user.id);
              if (userAvatar) {
                userWithAvatar.avatarUrl = `/api/users/${user.id}/avatar`;
              }
              result.user = userWithAvatar;
            }
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
    this.incident = {
      findUnique: jest.fn(
        ({ where }) =>
          inMemoryStore.incidents.find((r) => r.id === where.id) || null,
      ),
      update: jest.fn(({ where, data }) => {
        const incident = inMemoryStore.incidents.find((r) => r.id === where.id);
        if (incident) Object.assign(incident, data);
        return { ...incident, reporter: inMemoryStore.users[0] };
      }),
      delete: jest.fn(({ where }) => {
        const idx = inMemoryStore.incidents.findIndex((r) => r.id === where.id);
        if (idx === -1) {
          const err = new Error("Record not found");
          err.code = "P2025";
          throw err;
        }
        const deletedIncident = inMemoryStore.incidents.splice(idx, 1)[0];
        return deletedIncident;
      }),
      create: jest.fn(({ data }) => {
        // Transform Prisma relation syntax to flat structure
        const transformedData = { ...data };
        
        // Handle event relation: { event: { connect: { id: "1" } } } -> { eventId: "1" }
        if (data.event?.connect?.id) {
          transformedData.eventId = data.event.connect.id;
          delete transformedData.event;
        }
        
        // Handle reporter relation: { reporter: { connect: { id: "1" } } } -> { reporterId: "1" }
        if (data.reporter?.connect?.id) {
          transformedData.reporterId = data.reporter.connect.id;
          delete transformedData.reporter;
        }
        
        const newIncident = {
          id: `r${inMemoryStore.incidents.length + 1}`,
          ...transformedData,
        };
        inMemoryStore.incidents.push(newIncident);
        return newIncident;
      }),
      findMany: jest.fn(({ where, include, orderBy, skip, take }) => {
        let results = [...inMemoryStore.incidents];
        
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
            // Filter by multiple IDs (for export with specific incident IDs)
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
          results = results.map(incident => {
            const enrichedIncident = { ...incident };
            
            if (include.event) {
              enrichedIncident.event = inMemoryStore.events.find(e => e.id === incident.eventId);
            }
            
            if (include.reporter) {
              enrichedIncident.reporter = inMemoryStore.users.find(u => u.id === incident.reporterId);
            }
            
            if (include.assignedResponder) {
              enrichedIncident.assignedResponder = incident.assignedResponderId ? 
                inMemoryStore.users.find(u => u.id === incident.assignedResponderId) : null;
            }
            
            if (include.relatedFiles) {
              enrichedIncident.relatedFiles = incident.relatedFiles || [];
            }
            
            if (include._count) {
              enrichedIncident._count = incident._count || { comments: 0 };
            }
            
            return enrichedIncident;
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
        let results = [...inMemoryStore.incidents];
        
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
        let results = [...inMemoryStore.incidents];
        
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
        let results = [...inMemoryStore.incidents];
        
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
      updateMany: jest.fn(({ where, data }) => {
        let count = 0;
        inMemoryStore.incidents.forEach((incident, idx) => {
          let matches = true;
          
          if (where.id && where.id.in) {
            if (!where.id.in.includes(incident.id)) {
              matches = false;
            }
          } else if (where.id && incident.id !== where.id) {
            matches = false;
          }
          
          if (where.eventId && incident.eventId !== where.eventId) {
            matches = false;
          }
          
          if (matches) {
            inMemoryStore.incidents[idx] = {
              ...incident,
              ...data,
              updatedAt: new Date().toISOString(),
            };
            count++;
          }
        });
        
        return { count };
      }),
      deleteMany: jest.fn(({ where }) => {
        let count = 0;
        const toDelete = [];
        
        inMemoryStore.incidents.forEach((incident, idx) => {
          let matches = true;
          
          if (where.id && where.id.in) {
            if (!where.id.in.includes(incident.id)) {
              matches = false;
            }
          } else if (where.id && incident.id !== where.id) {
            matches = false;
          }
          
          if (where.eventId && incident.eventId !== where.eventId) {
            matches = false;
          }
          
          if (matches) {
            toDelete.push(idx);
            count++;
          }
        });
        
        // Delete from end to start to avoid index shifts
        toDelete.reverse().forEach(idx => {
          inMemoryStore.incidents.splice(idx, 1);
        });
        
        return { count };
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
          results = results.filter(log => {
            // Helper function to check if a log matches a condition
            const matchesCondition = (condition, log) => {
              if (condition.userId && log.userId !== condition.userId) return false;
              if (condition.organizationId !== undefined && log.organizationId !== condition.organizationId) return false;
              if (condition.targetType && log.targetType !== condition.targetType) return false;
              if (condition.targetId && log.targetId !== condition.targetId) return false;
              if (condition.action && log.action !== condition.action) return false;
              if (condition.timestamp) {
                if (condition.timestamp.gte && new Date(log.timestamp) < new Date(condition.timestamp.gte)) return false;
                if (condition.timestamp.lte && new Date(log.timestamp) > new Date(condition.timestamp.lte)) return false;
              }
              if (condition.eventId) {
                if (condition.eventId.in) {
                  if (!condition.eventId.in.includes(log.eventId)) return false;
                } else if (log.eventId !== condition.eventId) {
                  return false;
                }
              }
              return true;
            };
            
            // Handle AND conditions
            if (where.AND) {
              return where.AND.every(andCondition => {
                if (andCondition.OR) {
                  return andCondition.OR.some(orCondition => matchesCondition(orCondition, log));
                }
                return matchesCondition(andCondition, log);
              });
            }
            
            // Handle OR conditions
            if (where.OR) {
              return where.OR.some(orCondition => matchesCondition(orCondition, log));
            }
            
            // Handle direct conditions
            return matchesCondition(where, log);
          });
        }
        
        // Apply ordering
        if (orderBy) {
          if (orderBy.timestamp === 'desc') {
            results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
          } else if (orderBy.timestamp === 'asc') {
            results.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
          }
          if (orderBy.action === 'desc') {
            results.sort((a, b) => b.action.localeCompare(a.action));
          } else if (orderBy.action === 'asc') {
            results.sort((a, b) => a.action.localeCompare(b.action));
          }
          if (orderBy.targetType === 'desc') {
            results.sort((a, b) => b.targetType.localeCompare(a.targetType));
          } else if (orderBy.targetType === 'asc') {
            results.sort((a, b) => a.targetType.localeCompare(b.targetType));
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
          results = results.filter(log => {
            // Helper function to check if a log matches a condition
            const matchesCondition = (condition, log) => {
              if (condition.userId && log.userId !== condition.userId) return false;
              if (condition.eventId && log.eventId !== condition.eventId) return false;
              if (condition.organizationId !== undefined && log.organizationId !== condition.organizationId) return false;
              if (condition.targetType && log.targetType !== condition.targetType) return false;
              if (condition.targetId && log.targetId !== condition.targetId) return false;
              if (condition.action && log.action !== condition.action) return false;
              if (condition.timestamp) {
                if (condition.timestamp.gte && new Date(log.timestamp) < new Date(condition.timestamp.gte)) return false;
                if (condition.timestamp.lte && new Date(log.timestamp) > new Date(condition.timestamp.lte)) return false;
              }
              if (condition.eventId && condition.eventId.in && !condition.eventId.in.includes(log.eventId)) return false;
              return true;
            };
            
            // Handle AND conditions
            if (where.AND) {
              return where.AND.every(andCondition => {
                if (andCondition.OR) {
                  return andCondition.OR.some(orCondition => matchesCondition(orCondition, log));
                }
                return matchesCondition(andCondition, log);
              });
            }
            
            // Handle OR conditions
            if (where.OR) {
              return where.OR.some(orCondition => matchesCondition(orCondition, log));
            }
            
            // Handle direct conditions
            return matchesCondition(where, log);
          });
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
      create: jest.fn(({ data, include }) => {
        if (!inMemoryStore.eventInvites) inMemoryStore.eventInvites = [];
        const newInvite = {
          id: `invite-${inMemoryStore.eventInvites.length + 1}`,
          createdAt: new Date(),
          useCount: 0,
          disabled: false,
          ...data,
        };
        inMemoryStore.eventInvites.push(newInvite);
        
        // Handle includes
        if (include && include.role) {
          const role = inMemoryStore.unifiedRoles.find(r => r.id === data.roleId);
          if (role) {
            newInvite.role = role;
          }
        }
        
        return newInvite;
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
    this.relatedFile = {
      create: jest.fn(({ data, include }) => {
        if (!inMemoryStore.relatedFiles) inMemoryStore.relatedFiles = [];
        // Ensure data is a Buffer
        const fileData = data.data instanceof Buffer ? data.data : Buffer.from(data.data);
        const newRelatedFile = {
          id: `e${inMemoryStore.relatedFiles.length + 1}`,
          createdAt: new Date(),
          ...data,
          data: fileData,
        };
        inMemoryStore.relatedFiles.push(newRelatedFile);
        
        // Handle includes
        if (include) {
          const result = { ...newRelatedFile };
          
          if (include.uploader && newRelatedFile.uploaderId) {
            const uploader = inMemoryStore.users.find(u => u.id === newRelatedFile.uploaderId);
            if (uploader) {
              result.uploader = {
                id: uploader.id,
                name: uploader.name,
                email: uploader.email
              };
            }
          }
          
          return result;
        }
        
        return newRelatedFile;
      }),
      // findUnique should only be used for id, not reportId (reportId is not unique)
      findUnique: jest.fn(({ where, include }) => {
        if (!inMemoryStore.relatedFiles) return null;
        if (where.id) {
          const found = inMemoryStore.relatedFiles.find(
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
            
            if (include.incident) {
              const incident = inMemoryStore.incidents.find(r => r.id === found.incidentId);
              if (incident) {
                result.incident = { ...incident };
                
                // Handle nested includes
                if (include.incident.include && include.incident.include.event) {
                  const event = inMemoryStore.events.find(e => e.id === incident.eventId);
                  if (event) {
                    result.incident.event = event;
                  }
                }
              }
            } else if (include.report) {
              // Legacy support for old report field
              const report = inMemoryStore.incidents.find(r => r.id === found.reportId || found.incidentId);
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
      // findMany should be used for incidentId
      findMany: jest.fn(({ where, select }) => {
        if (!inMemoryStore.relatedFiles) return [];
        let results = [...inMemoryStore.relatedFiles];
        
        if (where) {
          if (where.incidentId) {
            results = results.filter((e) => e.incidentId === where.incidentId);
          }
          if (where.reportId) {
            // Legacy support for old reportId field
            results = results.filter((e) => e.reportId === where.reportId);
          }
        }
        
        // Apply select if provided
        if (select) {
          results = results.map(relatedFile => {
            const selected = {};
            Object.keys(select).forEach(key => {
              if (select[key]) {
                if (key === 'uploader' && relatedFile.uploaderId) {
                  // Handle uploader relationship
                  const uploader = inMemoryStore.users.find(u => u.id === relatedFile.uploaderId);
                  if (uploader) {
                    selected[key] = {
                      id: uploader.id,
                      name: uploader.name,
                      email: uploader.email
                    };
                  }
                } else if (relatedFile[key] !== undefined) {
                  selected[key] = relatedFile[key];
                }
              }
            });
            return selected;
          });
        }
        
        return results;
      }),
      deleteMany: jest.fn(({ where }) => {
        if (!inMemoryStore.relatedFiles) return { count: 0 };
        const before = inMemoryStore.relatedFiles.length;
        if (where.incidentId) {
          inMemoryStore.relatedFiles = inMemoryStore.relatedFiles.filter(
            (e) => e.incidentId !== where.incidentId
          );
        } else if (where.reportId) {
          // Legacy support for old reportId field
          inMemoryStore.relatedFiles = inMemoryStore.relatedFiles.filter(
            (e) => e.reportId !== where.reportId
          );
        }
        return { count: before - inMemoryStore.relatedFiles.length };
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
              result.report = inMemoryStore.incidents.find(r => r.id === notification.reportId) || null;
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
    this.incidentComment = {
              findMany: jest.fn(({ where, orderBy, skip, take, include }) => {
          let results = [...inMemoryStore.incidentComments];
        
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
        let results = [...inMemoryStore.incidentComments];
        
        if (where) {
          if (where.incidentId) {
            results = results.filter((comment) => comment.incidentId === where.incidentId);
          }
          if (where.userId) {
            results = results.filter((comment) => comment.userId === where.userId);
          }
        }
        
        return results.length;
      }),
      create: jest.fn(({ data }) => {
        const comment = {
          id: `c${inMemoryStore.incidentComments.length + 1}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...data,
        };
        inMemoryStore.incidentComments.push(comment);
        return comment;
      }),
      findFirst: jest.fn(({ where, orderBy }) => {
        let results = [...inMemoryStore.incidentComments];
        
        if (where) {
          if (where.incidentId) {
            results = results.filter((comment) => comment.incidentId === where.incidentId);
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
        if (!inMemoryStore.incidentComments) {
          inMemoryStore.incidentComments = [];
          return { count: 0 };
        }
        const before = inMemoryStore.incidentComments.length;
        if (where.incidentId) {
          inMemoryStore.incidentComments = inMemoryStore.incidentComments.filter(
            (c) => c.incidentId !== where.incidentId
          );
        }
        return { count: before - inMemoryStore.incidentComments.length };
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
      findMany: jest.fn(({ where } = {}) => {
        let results = [...inMemoryStore.systemSettings];
        if (where && where.key && where.key.in) {
          // Filter by key array (for public settings)
          results = results.filter(s => where.key.in.includes(s.key));
        }
        return results;
      }),
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
            incidentSubmittedInApp: true,
            incidentSubmittedEmail: false,
            incidentAssignedInApp: true,
            incidentAssignedEmail: false,
            incidentStatusChangedInApp: true,
            incidentStatusChangedEmail: false,
            incidentCommentAddedInApp: true,
            incidentCommentAddedEmail: false,
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
    
    // Add unified RBAC models
    this.unifiedRole = {
      findUnique: jest.fn(({ where }) =>
        inMemoryStore.unifiedRoles.find((r) => r.id === where.id || r.name === where.name) || null
      ),
      findMany: jest.fn(() => [...inMemoryStore.unifiedRoles]),
      create: jest.fn(({ data }) => {
        const newRole = {
          id: (inMemoryStore.unifiedRoles.length + 1).toString(),
          ...data,
        };
        inMemoryStore.unifiedRoles.push(newRole);
        return newRole;
      }),
    };

    this.userRole = {
      findMany: jest.fn(({ where, include }) => {
        let results = [...inMemoryStore.userRoles];
        
        if (where) {
          if (where.userId) {
            results = results.filter((ur) => ur.userId === where.userId);
          }
          if (where.scopeType) {
            results = results.filter((ur) => ur.scopeType === where.scopeType);
          }
          if (where.scopeId) {
            results = results.filter((ur) => ur.scopeId === where.scopeId);
          }
          if (where.roleId) {
            results = results.filter((ur) => ur.roleId === where.roleId);
          }
        }

        // Handle includes
        if (include) {
          results = results.map(ur => {
            const result = { ...ur };
            if (include.role && !result.role) {
              // Only look up if not already embedded
              result.role = inMemoryStore.unifiedRoles.find(r => r.id === ur.roleId);
            }
            if (include.user && !result.user) {
              // Only look up if not already embedded
              result.user = inMemoryStore.users.find(u => u.id === ur.userId);
            }
            return result;
          });
        }

        return results;
      }),
      findFirst: jest.fn(({ where }) => {
        let results = [...inMemoryStore.userRoles];
        
        if (where) {
          if (where.userId) {
            results = results.filter((ur) => ur.userId === where.userId);
          }
          if (where.scopeType) {
            results = results.filter((ur) => ur.scopeType === where.scopeType);
          }
          if (where.scopeId) {
            results = results.filter((ur) => ur.scopeId === where.scopeId);
          }
          if (where.roleId) {
            results = results.filter((ur) => ur.roleId === where.roleId);
          }
        }

        return results[0] || null;
      }),
      create: jest.fn(({ data }) => {
        const newUserRole = {
          id: (inMemoryStore.userRoles.length + 1).toString(),
          grantedAt: new Date(),
          ...data,
        };
        inMemoryStore.userRoles.push(newUserRole);
        return newUserRole;
      }),
      upsert: jest.fn(({ where, create, update }) => {
        // Check if user role exists based on compound unique constraint
        const existingIndex = inMemoryStore.userRoles.findIndex(ur => 
          ur.userId === where.user_role_unique.userId &&
          ur.roleId === where.user_role_unique.roleId &&
          ur.scopeType === where.user_role_unique.scopeType &&
          ur.scopeId === where.user_role_unique.scopeId
        );

        if (existingIndex !== -1) {
          // Update existing
          inMemoryStore.userRoles[existingIndex] = {
            ...inMemoryStore.userRoles[existingIndex],
            ...update,
          };
          return inMemoryStore.userRoles[existingIndex];
        } else {
          // Create new
          const newUserRole = {
            id: (inMemoryStore.userRoles.length + 1).toString(),
            grantedAt: new Date(),
            ...create,
          };
          inMemoryStore.userRoles.push(newUserRole);
          return newUserRole;
        }
      }),
      deleteMany: jest.fn(({ where }) => {
        const before = inMemoryStore.userRoles.length;
        if (where) {
          inMemoryStore.userRoles = inMemoryStore.userRoles.filter(ur => {
            let keep = true;
            if (where.userId && ur.userId !== where.userId) keep = false;
            if (where.roleId && ur.roleId !== where.roleId) keep = false;
            if (where.scopeType && ur.scopeType !== where.scopeType) keep = false;
            if (where.scopeId && ur.scopeId !== where.scopeId) keep = false;
            return !keep; // filter keeps items that return true, we want to remove items where keep is false
          });
        }
        return { count: before - inMemoryStore.userRoles.length };
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
