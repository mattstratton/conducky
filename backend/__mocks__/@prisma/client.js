// backend/__mocks__/@prisma/client.js

// Shared persistent in-memory store for all tests
const inMemoryStore = {
  events: [{ id: "1", name: "Event1", slug: "event1" }],
  roles: [
    { id: "1", name: "SuperAdmin" },
    { id: "2", name: "Admin" },
    { id: "3", name: "Responder" },
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
  auditLogs: [],
  eventLogos: [],
  eventInvites: [],
  userAvatars: [],
};

class PrismaClient {
  constructor() {
    this.event = {
      findUnique: jest.fn(
        ({ where }) =>
          inMemoryStore.events.find(
            (e) => e.id === where.id || e.slug === where.slug,
          ) || null,
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
      create: jest.fn(({ data }) => ({
        id: (inMemoryStore.roles.length + 1).toString(),
        ...data,
      })),
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
        // If include.role is true, populate the role property from inMemoryStore.roles
        if (include && include.role) {
          results = results.map((uer) => ({
            ...uer,
            role:
              inMemoryStore.roles.find((r) => r.id === uer.roleId) || uer.role,
          }));
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
      delete: jest.fn(({ where }) => {
        const idx = inMemoryStore.userEventRoles.findIndex(
          (uer) =>
            uer.userId === where.userId &&
            uer.eventId === where.eventId &&
            uer.roleId === where.roleId,
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
          },
        );
        return { count: before - inMemoryStore.userEventRoles.length };
      }),
      upsert: jest.fn(async ({ where, update, create }) => {
        // Find by unique keys (simulate composite unique constraint)
        const idx = inMemoryStore.userEventRoles.findIndex(
          (uer) =>
            uer.userId === where.userId &&
            uer.eventId === where.eventId &&
            uer.roleId === where.roleId,
        );
        if (idx !== -1) {
          // Update existing
          inMemoryStore.userEventRoles[idx] = {
            ...inMemoryStore.userEventRoles[idx],
            ...update,
          };
          return inMemoryStore.userEventRoles[idx];
        } else {
          // Create new
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
      create: jest.fn(({ data }) => {
        const newReport = {
          id: `r${inMemoryStore.reports.length + 1}`,
          ...data,
        };
        inMemoryStore.reports.push(newReport);
        return newReport;
      }),
      findMany: jest.fn(({ where }) => {
        if (!where || !where.eventId) return [];
        const eventExists = inMemoryStore.events.some(
          (e) => e.id === where.eventId,
        );
        if (!eventExists) {
          const err = new Error("Event not found");
          err.code = "P2025";
          throw err;
        }
        return inMemoryStore.reports.filter((r) => r.eventId === where.eventId);
      }),
    };
    this.auditLog = {
      create: jest.fn(({ data }) => {
        const log = { id: String(inMemoryStore.auditLogs.length + 1), ...data };
        inMemoryStore.auditLogs.push(log);
        return log;
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
          (inMemoryStore.eventInvites || []).find((i) => i.id === where.id) ||
          null
        );
      }),
      update: jest.fn(({ where, data }) => {
        const idx = (inMemoryStore.eventInvites || []).findIndex(
          (i) => i.id === where.id,
        );
        if (idx === -1) {
          const err = new Error("Invite not found");
          err.code = "P2025";
          throw err;
        }
        inMemoryStore.eventInvites[idx] = {
          ...inMemoryStore.eventInvites[idx],
          ...data,
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
      findUnique: jest.fn(({ where }) => {
        if (!inMemoryStore.evidenceFiles) return null;
        if (where.id) {
          return (
            inMemoryStore.evidenceFiles.find(
              (e) => e.id === where.id,
            ) || null
          );
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
    };
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
  }
}

module.exports = { PrismaClient, inMemoryStore };
