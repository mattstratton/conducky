const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive sample data seeding...');

  // First, ensure unified roles exist
  console.log('🔑 Creating unified roles...');
  const unifiedRoles = [
    { name: 'system_admin', scope: 'system', level: 100, description: 'System administrator with global access' },
    { name: 'org_admin', scope: 'organization', level: 50, description: 'Organization administrator' },
    { name: 'org_viewer', scope: 'organization', level: 10, description: 'Organization viewer' },
    { name: 'event_admin', scope: 'event', level: 40, description: 'Event administrator' },
    { name: 'responder', scope: 'event', level: 20, description: 'Event responder' },
    { name: 'reporter', scope: 'event', level: 5, description: 'Event reporter' }
  ];

  const roleMap = {};
  for (const roleData of unifiedRoles) {
    const role = await prisma.unifiedRole.upsert({
      where: { name: roleData.name },
      update: {
        scope: roleData.scope,
        level: roleData.level,
        description: roleData.description
      },
      create: roleData,
    });
    roleMap[roleData.name] = role;
    console.log(`✅ Unified role ensured: ${roleData.name} (${roleData.scope}, level ${roleData.level})`);
  }

  // Create diverse users with @mattstratton.com emails
  console.log('👥 Creating users...');
  const passwordHash = await bcrypt.hash('password', 10);
  
  const users = [
    // SuperAdmin
    { name: 'Matt Stratton', email: 'matt@mattstratton.com', isSuper: true },
    
    // Organization admins
    { name: 'Alice Anderson', email: 'alice.anderson@mattstratton.com' },
    { name: 'Bob Baker', email: 'bob.baker@mattstratton.com' },
    { name: 'Carol Chen', email: 'carol.chen@mattstratton.com' },
    
    // Event administrators
    { name: 'David Davis', email: 'david.davis@mattstratton.com' },
    { name: 'Eve Evans', email: 'eve.evans@mattstratton.com' },
    { name: 'Frank Foster', email: 'frank.foster@mattstratton.com' },
    { name: 'Grace Green', email: 'grace.green@mattstratton.com' },
    
    // Responders
    { name: 'Henry Harris', email: 'henry.harris@mattstratton.com' },
    { name: 'Iris Ivanova', email: 'iris.ivanova@mattstratton.com' },
    { name: 'Jack Johnson', email: 'jack.johnson@mattstratton.com' },
    { name: 'Karen Kim', email: 'karen.kim@mattstratton.com' },
    { name: 'Luis Lopez', email: 'luis.lopez@mattstratton.com' },
    { name: 'Maya Miller', email: 'maya.miller@mattstratton.com' },
    
    // Reporters (community members)
    { name: 'Nancy Nixon', email: 'nancy.nixon@mattstratton.com' },
    { name: 'Oliver Olsen', email: 'oliver.olsen@mattstratton.com' },
    { name: 'Patricia Park', email: 'patricia.park@mattstratton.com' },
    { name: 'Quinn Quest', email: 'quinn.quest@mattstratton.com' },
    { name: 'Rachel Roberts', email: 'rachel.roberts@mattstratton.com' },
    { name: 'Sam Smith', email: 'sam.smith@mattstratton.com' },
    { name: 'Tina Torres', email: 'tina.torres@mattstratton.com' },
    { name: 'Uma Patel', email: 'uma.patel@mattstratton.com' },
    { name: 'Victor Valdez', email: 'victor.valdez@mattstratton.com' },
    { name: 'Wendy Wilson', email: 'wendy.wilson@mattstratton.com' },
    { name: 'Xavier Xu', email: 'xavier.xu@mattstratton.com' },
    { name: 'Yuki Yamamoto', email: 'yuki.yamamoto@mattstratton.com' },
    { name: 'Zoe Zhang', email: 'zoe.zhang@mattstratton.com' },
  ];

  const userRecords = {};
  for (const u of users) {
    userRecords[u.name] = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        name: u.name,
        passwordHash,
      },
    });
    console.log(`👤 User created: ${u.name} (${u.email})`);
  }

  // Assign System Admin role to Matt using unified RBAC
  try {
    await prisma.userRole.upsert({
      where: {
        user_role_unique: {
          userId: userRecords['Matt Stratton'].id,
          roleId: roleMap['system_admin'].id,
          scopeType: 'system',
          scopeId: 'SYSTEM'
        }
      },
      update: {},
      create: { 
        userId: userRecords['Matt Stratton'].id, 
        roleId: roleMap['system_admin'].id,
        scopeType: 'system',
        scopeId: 'SYSTEM',
        grantedAt: new Date()
      },
    });
    console.log('👑 System Admin role assigned to Matt Stratton');
  } catch (error) {
    console.log('👑 System Admin role already exists for Matt Stratton');
  }

  // Create Organizations
  console.log('🏢 Creating organizations...');
  const organizations = [
    {
      name: 'DevOps Days Global',
      slug: 'devopsdays-global',
      description: 'The global DevOps Days organization coordinating conferences worldwide',
      website: 'https://devopsdays.org',
      adminUser: 'Alice Anderson',
      viewerUsers: ['Bob Baker', 'Carol Chen'],
    },
    {
      name: 'Tech Conference Collective',
      slug: 'tech-conference-collective',
      description: 'A collective of technology conferences promoting diversity and inclusion',
      website: 'https://techconferencecollective.org',
      adminUser: 'Bob Baker',
      viewerUsers: ['Alice Anderson', 'David Davis'],
    },
    {
      name: 'Community Events Inc',
      slug: 'community-events-inc',
      description: 'Professional event management for tech communities',
      website: 'https://communityevents.tech',
      adminUser: 'Carol Chen',
      viewerUsers: ['Eve Evans', 'Frank Foster'],
    },
  ];

  const orgRecords = {};
  for (const org of organizations) {
    orgRecords[org.slug] = await prisma.organization.upsert({
      where: { slug: org.slug },
      update: {},
      create: {
        name: org.name,
        slug: org.slug,
        description: org.description,
        website: org.website,
        createdById: userRecords[org.adminUser].id,
      },
    });
    console.log(`🏢 Organization created: ${org.name}`);

    // Unified RBAC role for organization admin
    await prisma.userRole.upsert({
      where: {
        user_role_unique: {
          userId: userRecords[org.adminUser].id,
          roleId: roleMap['org_admin'].id,
          scopeType: 'organization',
          scopeId: orgRecords[org.slug].id
        }
      },
      update: {},
      create: {
        userId: userRecords[org.adminUser].id,
        roleId: roleMap['org_admin'].id,
        scopeType: 'organization',
        scopeId: orgRecords[org.slug].id,
        grantedAt: new Date()
      },
    });

    // Viewers
    for (const viewerName of org.viewerUsers) {
      // Unified RBAC role for organization viewer
      await prisma.userRole.upsert({
        where: {
          user_role_unique: {
            userId: userRecords[viewerName].id,
            roleId: roleMap['org_viewer'].id,
            scopeType: 'organization',
            scopeId: orgRecords[org.slug].id
          }
        },
        update: {},
        create: {
          userId: userRecords[viewerName].id,
          roleId: roleMap['org_viewer'].id,
          scopeType: 'organization',
          scopeId: orgRecords[org.slug].id,
          grantedAt: new Date()
        },
      });
    }
    console.log(`👥 Organization roles assigned for ${org.name}`);
  }

  // Create Events under Organizations
  console.log('🎪 Creating events...');
  const events = [
    // DevOps Days Global events
    {
      name: 'DevOps Days Chicago 2024',
      slug: 'devopsdays-chicago-2024',
      description: 'The premier DevOps conference in the Midwest',
      organizationSlug: 'devopsdays-global',
      website: 'https://devopsdays.org/chicago',
      contactEmail: 'chicago@devopsdays.org',
      startDate: new Date('2024-09-15'),
      endDate: new Date('2024-09-16'),
      adminUsers: ['David Davis'],
      responderUsers: ['Henry Harris', 'Iris Ivanova'],
      reporterUsers: ['Nancy Nixon', 'Oliver Olsen', 'Patricia Park', 'Quinn Quest'],
    },
    {
      name: 'DevOps Days London 2024',
      slug: 'devopsdays-london-2024',
      description: 'European DevOps community gathering',
      organizationSlug: 'devopsdays-global',
      website: 'https://devopsdays.org/london',
      contactEmail: 'london@devopsdays.org',
      startDate: new Date('2024-10-20'),
      endDate: new Date('2024-10-21'),
      adminUsers: ['Eve Evans'],
      responderUsers: ['Jack Johnson', 'Karen Kim'],
      reporterUsers: ['Rachel Roberts', 'Sam Smith', 'Tina Torres'],
    },
    // Tech Conference Collective events
    {
      name: 'DiversityTech Summit 2024',
      slug: 'diversitytech-summit-2024',
      description: 'Celebrating diversity and inclusion in technology',
      organizationSlug: 'tech-conference-collective',
      website: 'https://diversitytech.summit',
      contactEmail: 'hello@diversitytech.summit',
      startDate: new Date('2024-11-08'),
      endDate: new Date('2024-11-09'),
      adminUsers: ['Frank Foster'],
      responderUsers: ['Luis Lopez', 'Maya Miller'],
      reporterUsers: ['Uma Patel', 'Victor Valdez', 'Wendy Wilson'],
    },
    // Community Events Inc events
    {
      name: 'CloudNative Con 2024',
      slug: 'cloudnative-con-2024',
      description: 'The future of cloud native technologies',
      organizationSlug: 'community-events-inc',
      website: 'https://cloudnative.con',
      contactEmail: 'info@cloudnative.con',
      startDate: new Date('2024-12-05'),
      endDate: new Date('2024-12-07'),
      adminUsers: ['Grace Green'],
      responderUsers: ['Henry Harris', 'Jack Johnson'],
      reporterUsers: ['Xavier Xu', 'Yuki Yamamoto', 'Zoe Zhang'],
    },
    {
      name: 'Local Meetup Network Conf',
      slug: 'local-meetup-network-conf',
      description: 'Connecting local tech meetup organizers',
      organizationSlug: 'community-events-inc',
      website: 'https://localmeetup.network',
      contactEmail: 'organizers@localmeetup.network',
      startDate: new Date('2025-01-15'),
      endDate: new Date('2025-01-16'),
      adminUsers: ['David Davis', 'Eve Evans'],
      responderUsers: ['Karen Kim', 'Luis Lopez'],
      reporterUsers: ['Nancy Nixon', 'Patricia Park', 'Rachel Roberts', 'Sam Smith'],
    },
  ];

  const eventRecords = {};
  const tagRecords = {};
  
  for (const event of events) {
    eventRecords[event.slug] = await prisma.event.upsert({
      where: { slug: event.slug },
      update: {},
      create: {
        name: event.name,
        slug: event.slug,
        description: event.description,
        website: event.website,
        contactEmail: event.contactEmail,
        startDate: event.startDate,
        endDate: event.endDate,
        organizationId: orgRecords[event.organizationSlug].id,
        isActive: true,
      },
    });
    console.log(`🎪 Event created: ${event.name}`);

    // Create sample tags for each event
    console.log(`🏷️  Creating sample tags for ${event.name}...`);
    const eventTags = [
      { name: 'Harassment', color: '#EF4444' }, // Red
      { name: 'Safety Concern', color: '#F59E0B' }, // Orange  
      { name: 'Discrimination', color: '#DC2626' }, // Dark red
      { name: 'Accessibility', color: '#3B82F6' }, // Blue
      { name: 'Code of Conduct', color: '#8B5CF6' }, // Purple
      { name: 'Venue Issue', color: '#10B981' }, // Green
      { name: 'Speaker Issue', color: '#F59E0B' }, // Orange
      { name: 'Attendee Behavior', color: '#6B7280' }, // Gray
      { name: 'Social Media', color: '#EC4899' }, // Pink
      { name: 'Privacy Concern', color: '#0EA5E9' }, // Sky blue
    ];

    tagRecords[event.slug] = {};
    for (const tagData of eventTags) {
      const tag = await prisma.tag.upsert({
        where: {
          eventId_name: {
            eventId: eventRecords[event.slug].id,
            name: tagData.name
          }
        },
        update: {},
        create: {
          name: tagData.name,
          color: tagData.color,
          eventId: eventRecords[event.slug].id,
        },
      });
      tagRecords[event.slug][tagData.name] = tag;
      console.log(`🏷️  Tag created: ${tagData.name} (${tagData.color})`);
    }

    // Assign roles for this event
    // Event Admins (explicit per event)
    for (const adminName of event.adminUsers) {
      await prisma.userRole.upsert({
        where: {
          user_role_unique: {
            userId: userRecords[adminName].id,
            roleId: roleMap['event_admin'].id,
            scopeType: 'event',
            scopeId: eventRecords[event.slug].id
          }
        },
        update: {},
        create: { 
          userId: userRecords[adminName].id, 
          roleId: roleMap['event_admin'].id,
          scopeType: 'event',
          scopeId: eventRecords[event.slug].id,
          grantedAt: new Date()
        },
      });
    }

    // Also ensure current organization admins receive event_admin for seeded events
    const orgAdminMemberships = await prisma.organizationMembership.findMany({
      where: { organizationId: eventRecords[event.slug].organizationId, role: 'org_admin' },
      select: { userId: true }
    });
    for (const m of orgAdminMemberships) {
      await prisma.userRole.upsert({
        where: {
          user_role_unique: {
            userId: m.userId,
            roleId: roleMap['event_admin'].id,
            scopeType: 'event',
            scopeId: eventRecords[event.slug].id
          }
        },
        update: {},
        create: { 
          userId: m.userId, 
          roleId: roleMap['event_admin'].id,
          scopeType: 'event',
          scopeId: eventRecords[event.slug].id,
          grantedAt: new Date()
        },
      });
    }

    // Responders
    for (const responderName of event.responderUsers) {
      await prisma.userRole.upsert({
        where: {
          user_role_unique: {
            userId: userRecords[responderName].id,
            roleId: roleMap['responder'].id,
            scopeType: 'event',
            scopeId: eventRecords[event.slug].id
          }
        },
        update: {},
        create: { 
          userId: userRecords[responderName].id, 
          roleId: roleMap['responder'].id,
          scopeType: 'event',
          scopeId: eventRecords[event.slug].id,
          grantedAt: new Date()
        },
      });
    }

    // Reporters
    for (const reporterName of event.reporterUsers) {
      await prisma.userRole.upsert({
        where: {
          user_role_unique: {
            userId: userRecords[reporterName].id,
            roleId: roleMap['reporter'].id,
            scopeType: 'event',
            scopeId: eventRecords[event.slug].id
          }
        },
        update: {},
        create: { 
          userId: userRecords[reporterName].id, 
          roleId: roleMap['reporter'].id,
          scopeType: 'event',
          scopeId: eventRecords[event.slug].id,
          grantedAt: new Date()
        },
      });
    }
    console.log(`👥 Event roles assigned for ${event.name}`);
  }

  // Create sample incidents with tags
  console.log('📝 Creating sample incidents...');
  const sampleIncidents = [
    {
      eventSlug: 'devopsdays-chicago-2024',
      title: 'Inappropriate comments during networking session',
      description: 'A speaker made inappropriate comments about gender during the networking session that made several attendees uncomfortable.',
      reporterName: 'Nancy Nixon',
      responderName: 'Henry Harris',
      state: 'investigating',
      severity: 'medium',
      location: 'Main networking area',
      parties: 'John Speaker (speaker), Multiple attendees',
      tags: ['Harassment', 'Code of Conduct'],
      incidentAt: new Date('2024-09-15T15:30:00Z'),
    },
    {
      eventSlug: 'devopsdays-chicago-2024',
      title: 'Accessibility issue with main auditorium',
      description: 'The wheelchair ramp to the main auditorium is too steep and unsafe for attendees with mobility devices.',
      reporterName: 'Oliver Olsen',
      responderName: 'Iris Ivanova',
      state: 'resolved',
      severity: 'high',
      location: 'Main auditorium entrance',
      parties: 'Venue staff, Attendees with mobility devices',
      tags: ['Accessibility', 'Venue Issue', 'Safety Concern'],
      incidentAt: new Date('2024-09-15T09:00:00Z'),
    },
    {
      eventSlug: 'devopsdays-london-2024',
      title: 'Offensive social media posts by attendee',
      description: 'An attendee has been posting offensive content on social media using the event hashtag, reflecting poorly on the conference.',
      reporterName: 'Rachel Roberts',
      responderName: 'Jack Johnson',
      state: 'acknowledged',
      severity: 'low',
      location: 'Online/Social Media',
      parties: 'Twitter user @offensiveuser',
      tags: ['Social Media', 'Code of Conduct'],
      incidentAt: new Date('2024-10-20T18:45:00Z'),
    },
    {
      eventSlug: 'diversitytech-summit-2024',
      title: 'Discriminatory behavior in workshop',
      description: 'A workshop attendee made discriminatory comments about participants\' backgrounds and refused to work with certain team members.',
      reporterName: 'Uma Patel',
      responderName: 'Luis Lopez',
      state: 'submitted',
      severity: 'high',
      location: 'Workshop Room B',
      parties: 'Workshop participant, Team members',
      tags: ['Discrimination', 'Code of Conduct', 'Attendee Behavior'],
      incidentAt: new Date('2024-11-08T14:20:00Z'),
    },
    {
      eventSlug: 'cloudnative-con-2024',
      title: 'Privacy concern with photo sharing',
      description: 'Photos containing personal information were shared without consent in the event photo stream.',
      reporterName: 'Xavier Xu',
      responderName: 'Henry Harris',
      state: 'closed',
      severity: 'medium',
      location: 'Conference hall',
      parties: 'Photographer, Attendees in photos',
      tags: ['Privacy Concern', 'Social Media'],
      incidentAt: new Date('2024-12-05T16:15:00Z'),
    },
  ];

  for (const incidentData of sampleIncidents) {
    const timeline = {};
    const now = new Date();
    if (incidentData.state && incidentData.state !== 'submitted') {
      timeline.firstResponseAt = now;
    }
    if (['resolved', 'closed'].includes(incidentData.state)) {
      timeline.resolvedAt = now;
    }
    const incident = await prisma.incident.create({
      data: {
        title: incidentData.title,
        description: incidentData.description,
        state: incidentData.state,
        severity: incidentData.severity,
        location: incidentData.location,
        parties: incidentData.parties,
        incidentAt: incidentData.incidentAt,
        eventId: eventRecords[incidentData.eventSlug].id,
        reporterId: userRecords[incidentData.reporterName].id,
        assignedResponderId: userRecords[incidentData.responderName].id,
        ...timeline,
      },
    });

    // Add tags to the incident
    for (const tagName of incidentData.tags) {
      await prisma.incidentTag.create({
        data: {
          incidentId: incident.id,
          tagId: tagRecords[incidentData.eventSlug][tagName].id,
        },
      });
    }

    console.log(`📝 Incident created: ${incidentData.title} with tags: ${incidentData.tags.join(', ')}`);

    // Add some comments to incidents and create simple state history
    const comments = [
      {
        body: 'Initial report received and acknowledged. Starting investigation.',
        authorName: incidentData.responderName,
        visibility: 'public',
      },
      {
        body: 'Contacted venue security and event organizers about this issue.',
        authorName: incidentData.responderName,
        visibility: 'internal',
      },
    ];

    for (const commentData of comments) {
      await prisma.incidentComment.create({
        data: {
          body: commentData.body,
          visibility: commentData.visibility,
          incidentId: incident.id,
          authorId: userRecords[commentData.authorName].id,
        },
      });
    }
    // Seed a basic state history chain
    const transitions = [];
    if (incidentData.state === 'submitted') {
      transitions.push({ from: null, to: 'submitted' });
    } else {
      transitions.push({ from: null, to: 'submitted' });
      transitions.push({ from: 'submitted', to: 'acknowledged' });
      if (incidentData.state === 'investigating' || incidentData.state === 'resolved' || incidentData.state === 'closed') {
        transitions.push({ from: 'acknowledged', to: 'investigating' });
      }
      if (incidentData.state === 'resolved' || incidentData.state === 'closed') {
        transitions.push({ from: 'investigating', to: 'resolved' });
      }
      if (incidentData.state === 'closed') {
        transitions.push({ from: 'resolved', to: 'closed' });
      }
    }
    for (const t of transitions) {
      await prisma.incidentStateHistory.create({
        data: {
          incidentId: incident.id,
          fromState: t.from,
          toState: t.to,
          changedById: userRecords[incidentData.responderName].id,
          changedAt: new Date(),
        }
      });
    }
    console.log(`💬 Comments added to incident: ${incidentData.title}`);
  }

  console.log('✅ Sample data seeding completed successfully!');
  console.log('');
  console.log('🔑 Test Credentials:');
  console.log('System Admin: matt@mattstratton.com / password');
  console.log('Org Admin: alice.anderson@mattstratton.com / password');
  console.log('Event Admin: david.davis@mattstratton.com / password');
  console.log('Responder: henry.harris@mattstratton.com / password');
  console.log('Reporter: nancy.nixon@mattstratton.com / password');
  console.log('');
  console.log('📊 Created:');
  console.log(`👥 ${users.length} users`);
  console.log(`🏢 ${organizations.length} organizations`);
  console.log(`🎪 ${events.length} events`);
  console.log(`🏷️  ${events.length * 10} tags`);
  console.log(`📝 ${sampleIncidents.length} incidents with tags`);
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 