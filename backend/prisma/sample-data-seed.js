const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive sample data seeding...');

  // Ensure roles exist first
  console.log('🔑 Creating roles...');
  const roles = ['Reporter', 'Responder', 'Event Admin', 'SuperAdmin'];
  const roleMap = {};
  for (const name of roles) {
    roleMap[name] = await prisma.role.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`✅ Role ensured: ${name}`);
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

  // Assign SuperAdmin role to Matt (use create since eventId is null)
  try {
    await prisma.userEventRole.create({
      data: { 
        userId: userRecords['Matt Stratton'].id, 
        eventId: null, 
        roleId: roleMap['SuperAdmin'].id 
      },
    });
    console.log('👑 SuperAdmin role assigned to Matt Stratton');
  } catch (error) {
    // Role might already exist, which is fine
    if (error.code !== 'P2002') { // P2002 is unique constraint violation
      throw error;
    }
    console.log('👑 SuperAdmin role already exists for Matt Stratton');
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

    // Create organization memberships
    // Admin
    await prisma.organizationMembership.upsert({
      where: { 
        organizationId_userId: { 
          organizationId: orgRecords[org.slug].id, 
          userId: userRecords[org.adminUser].id 
        }
      },
      update: {},
      create: {
        organizationId: orgRecords[org.slug].id,
        userId: userRecords[org.adminUser].id,
        role: 'org_admin',
        createdById: userRecords[org.adminUser].id,
      },
    });

    // Viewers
    for (const viewerName of org.viewerUsers) {
      await prisma.organizationMembership.upsert({
        where: { 
          organizationId_userId: { 
            organizationId: orgRecords[org.slug].id, 
            userId: userRecords[viewerName].id 
          }
        },
        update: {},
        create: {
          organizationId: orgRecords[org.slug].id,
          userId: userRecords[viewerName].id,
          role: 'org_viewer',
          createdById: userRecords[org.adminUser].id,
        },
      });
    }
    console.log(`👥 Organization memberships created for ${org.name}`);
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

    // Assign roles for this event
    // Event Admins
    for (const adminName of event.adminUsers) {
      await prisma.userEventRole.upsert({
        where: { userId_eventId_roleId: { 
          userId: userRecords[adminName].id, 
          eventId: eventRecords[event.slug].id, 
          roleId: roleMap['Event Admin'].id 
        }},
        update: {},
        create: { 
          userId: userRecords[adminName].id, 
          eventId: eventRecords[event.slug].id, 
          roleId: roleMap['Event Admin'].id 
        },
      });
    }

    // Responders
    for (const responderName of event.responderUsers) {
      await prisma.userEventRole.upsert({
        where: { userId_eventId_roleId: { 
          userId: userRecords[responderName].id, 
          eventId: eventRecords[event.slug].id, 
          roleId: roleMap['Responder'].id 
        }},
        update: {},
        create: { 
          userId: userRecords[responderName].id, 
          eventId: eventRecords[event.slug].id, 
          roleId: roleMap['Responder'].id 
        },
      });
    }

    // Reporters
    for (const reporterName of event.reporterUsers) {
      await prisma.userEventRole.upsert({
        where: { userId_eventId_roleId: { 
          userId: userRecords[reporterName].id, 
          eventId: eventRecords[event.slug].id, 
          roleId: roleMap['Reporter'].id 
        }},
        update: {},
        create: { 
          userId: userRecords[reporterName].id, 
          eventId: eventRecords[event.slug].id, 
          roleId: roleMap['Reporter'].id 
        },
      });
    }
    console.log(`👥 Event roles assigned for ${event.name}`);
  }

  // Create realistic reports with comments
  console.log('📋 Creating sample reports...');
  const sampleReports = [
    {
      eventSlug: 'devopsdays-chicago-2024',
      reporterName: 'Nancy Nixon',
      type: 'harassment',
      title: 'Inappropriate comments during workshop',
      description: 'During the Kubernetes workshop, another attendee made several inappropriate comments about women in tech. This made me and others uncomfortable.',
      state: 'investigating',
      severity: 'medium',
      incidentAt: new Date('2024-09-15T14:30:00Z'),
      parties: 'Workshop attendee in red DevOps t-shirt',
      location: 'Main conference room, Workshop #3',
      assignedResponder: 'Henry Harris',
    },
    {
      eventSlug: 'devopsdays-chicago-2024',
      reporterName: 'Oliver Olsen',
      type: 'other',
      title: 'Speaker made exclusionary remarks',
      description: 'The keynote speaker made several jokes that were exclusionary to the LGBTQ+ community. Multiple attendees noticed and seemed uncomfortable.',
      state: 'resolved',
      severity: 'high',
      incidentAt: new Date('2024-09-15T09:15:00Z'),
      parties: 'Keynote speaker',
      location: 'Main auditorium',
      assignedResponder: 'Iris Ivanova',
      resolution: 'Spoke with speaker privately. They apologized and will be more mindful in future presentations.',
    },
    {
      eventSlug: 'devopsdays-london-2024',
      reporterName: 'Rachel Roberts',
      type: 'safety',
      title: 'Unsafe behavior at after-party',
      description: 'Someone was heavily intoxicated and making others uncomfortable at the after-party venue. Security was not handling the situation well.',
      state: 'closed',
      severity: 'medium',
      incidentAt: new Date('2024-10-20T20:45:00Z'),
      parties: 'Intoxicated attendee, venue security',
      location: 'After-party venue - The Tech Pub',
      assignedResponder: 'Jack Johnson',
      resolution: 'Worked with venue management to address the situation. Attendee was asked to leave and given safe transportation.',
    },
    {
      eventSlug: 'diversitytech-summit-2024',
      reporterName: 'Uma Patel',
      type: 'harassment',
      title: 'Unwanted physical contact',
      description: 'During networking break, another attendee touched my shoulder repeatedly despite me stepping away multiple times. This made me very uncomfortable.',
      state: 'acknowledged',
      severity: 'high',
      incidentAt: new Date('2024-11-08T15:20:00Z'),
      parties: 'Male attendee, approximately 40s, wearing company logo shirt',
      location: 'Networking area near registration',
      assignedResponder: 'Luis Lopez',
    },
    {
      eventSlug: 'cloudnative-con-2024',
      reporterName: 'Xavier Xu',
      type: 'other',
      title: 'Accessibility issue with presentation',
      description: 'The speaker in Track 2 was not using the microphone properly and speaking very quietly. Those with hearing difficulties could not follow along.',
      state: 'resolved',
      severity: 'low',
      incidentAt: new Date('2024-12-05T11:30:00Z'),
      parties: 'Track 2 speaker',
      location: 'Conference Room B',
      assignedResponder: 'Henry Harris',
      resolution: 'Reminded speaker about microphone usage. AV team provided additional support.',
    },
    {
      eventSlug: 'local-meetup-network-conf',
      reporterName: 'Patricia Park',
      type: 'other',
      title: 'Disruptive behavior during panel',
      description: 'Attendee kept interrupting panelists and other audience members during Q&A. When asked to wait their turn, they became argumentative.',
      state: 'investigating',
      severity: 'medium',
      incidentAt: new Date('2025-01-15T16:00:00Z'),
      parties: 'Disruptive attendee',
      location: 'Panel Room A',
      assignedResponder: 'Karen Kim',
    },
  ];

  let reportCount = 0;
  for (const report of sampleReports) {
    const createdReport = await prisma.report.create({
      data: {
        eventId: eventRecords[report.eventSlug].id,
        reporterId: userRecords[report.reporterName].id,
        type: report.type,
        title: report.title,
        description: report.description,
        state: report.state,
        severity: report.severity,
        incidentAt: report.incidentAt,
        parties: report.parties,
        location: report.location,
        assignedResponderId: report.assignedResponder ? userRecords[report.assignedResponder].id : null,
        resolution: report.resolution || null,
        contactPreference: 'email',
      },
    });
    reportCount++;

    // Add comments to reports based on their state
    if (report.state !== 'submitted') {
      await prisma.reportComment.create({
        data: {
          reportId: createdReport.id,
          authorId: userRecords[report.assignedResponder || 'Henry Harris'].id,
          body: 'Thank you for reporting this incident. We take all reports seriously and will investigate promptly.',
          isMarkdown: false,
          visibility: 'public',
        },
      });

      if (report.state === 'investigating' || report.state === 'resolved' || report.state === 'closed') {
        await prisma.reportComment.create({
          data: {
            reportId: createdReport.id,
            authorId: userRecords[report.assignedResponder || 'Henry Harris'].id,
            body: 'We have begun our investigation and are gathering more information. We will keep you updated on our progress.',
            isMarkdown: false,
            visibility: 'public',
          },
        });
      }

      if (report.state === 'resolved' || report.state === 'closed') {
        await prisma.reportComment.create({
          data: {
            reportId: createdReport.id,
            authorId: userRecords[report.assignedResponder || 'Henry Harris'].id,
            body: report.resolution ? `**Resolution:** ${report.resolution}` : 'This matter has been resolved. Thank you for bringing it to our attention.',
            isMarkdown: true,
            visibility: 'public',
          },
        });
      }
    }

    console.log(`📋 Report created: ${report.title} (${report.eventSlug})`);
  }

  // Create additional sample reports for variety
  console.log('📋 Creating additional sample reports...');
  const reportTypes = ['harassment', 'safety', 'other'];
  const reportStates = ['submitted', 'acknowledged', 'investigating', 'resolved', 'closed'];
  const severities = ['low', 'medium', 'high', 'critical'];
  
  for (const [index, eventSlug] of Object.keys(eventRecords).entries()) {
    const event = events.find(e => e.slug === eventSlug);
    for (let i = 0; i < 3; i++) {
      const reporterName = event.reporterUsers[i % event.reporterUsers.length];
      const responderName = event.responderUsers[i % event.responderUsers.length];
      
      const createdReport = await prisma.report.create({
        data: {
          eventId: eventRecords[eventSlug].id,
          reporterId: userRecords[reporterName].id,
          type: reportTypes[i % reportTypes.length],
          title: `Sample Report #${index * 3 + i + 1}`,
          description: `This is a sample report created for testing purposes. It demonstrates various types of incidents that might occur at events.`,
          state: reportStates[i % reportStates.length],
          severity: severities[i % severities.length],
          assignedResponderId: userRecords[responderName].id,
          contactPreference: 'email',
        },
      });
      reportCount++;
      
      // Add a comment to each additional report
      await prisma.reportComment.create({
        data: {
          reportId: createdReport.id,
          authorId: userRecords[responderName].id,
          body: 'This is a sample comment for testing the report system.',
          isMarkdown: false,
          visibility: 'public',
        },
      });
    }
  }

  console.log('🎉 Sample data seeding completed successfully!');
  console.log('');
  console.log('📊 Summary:');
  console.log(`👥 Users: ${users.length} created`);
  console.log(`🏢 Organizations: ${organizations.length} created`);
  console.log(`🎪 Events: ${events.length} created`);
  console.log(`📋 Reports: ${reportCount} created with comments`);
  console.log('');
  console.log('🔐 Test Login Credentials:');
  console.log('Email: matt@mattstratton.com (SuperAdmin)');
  console.log('Email: alice.anderson@mattstratton.com (Org Admin)');
  console.log('Email: david.davis@mattstratton.com (Event Admin)');
  console.log('Email: henry.harris@mattstratton.com (Responder)');
  console.log('Email: nancy.nixon@mattstratton.com (Reporter)');
  console.log('Password: password (for all accounts)');
}

main()
  .catch(e => {
    console.error('❌ Error seeding sample data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 