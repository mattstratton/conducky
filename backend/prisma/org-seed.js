const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding organization data...');

  // Get or create SuperAdmin user
  const superEmail = 'superadmin@test.com';
  const superUser = await prisma.user.findUnique({
    where: { email: superEmail }
  });

  if (!superUser) {
    console.log('❌ SuperAdmin user not found. Please run the main seed first: npm run seed');
    return;
  }

  // Create additional organizations to match frontend mock data
  const organizations = [
    {
      name: 'Tech Conference Organization',
      slug: 'tech-conference-org',
      description: 'Leading technology conferences and events across the globe',
      website: 'https://techconf.org',
      logoUrl: 'https://via.placeholder.com/200x200/3B82F6/FFFFFF?text=TCO'
    },
    {
      name: 'Community Events Hub',
      slug: 'community-events-hub',
      description: 'Building stronger communities through meaningful events',
      website: 'https://communityevents.org',
      logoUrl: 'https://via.placeholder.com/200x200/10B981/FFFFFF?text=CEH'
    },
    {
      name: 'Professional Development Network',
      slug: 'prof-dev-network',
      description: 'Advancing careers through professional development events',
      website: 'https://profdev.network',
      logoUrl: 'https://via.placeholder.com/200x200/8B5CF6/FFFFFF?text=PDN'
    }
  ];

  // Create additional users for testing
  const additionalUsers = [
    {
      email: 'sarah.johnson@techconf.org',
      name: 'Sarah Johnson',
      password: 'password123'
    },
    {
      email: 'mike.chen@communityevents.org',
      name: 'Mike Chen',
      password: 'password123'
    },
    {
      email: 'alex.rodriguez@profdev.network',
      name: 'Alex Rodriguez',
      password: 'password123'
    },
    {
      email: 'emma.davis@techconf.org',
      name: 'Emma Davis',
      password: 'password123'
    },
    {
      email: 'john.smith@communityevents.org',
      name: 'John Smith',
      password: 'password123'
    }
  ];

  console.log('👥 Creating additional users...');
  const createdUsers = [];
  for (const userData of additionalUsers) {
    const passwordHash = await bcrypt.hash(userData.password, 10);
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        email: userData.email,
        name: userData.name,
        passwordHash: passwordHash,
      },
    });
    createdUsers.push(user);
    console.log(`✅ User created: ${user.name} (${user.email})`);
  }

  console.log('🏢 Creating organizations...');
  const createdOrgs = [];
  for (const orgData of organizations) {
    const org = await prisma.organization.upsert({
      where: { slug: orgData.slug },
      update: {},
      create: {
        name: orgData.name,
        slug: orgData.slug,
        description: orgData.description,
        website: orgData.website,
        logoUrl: orgData.logoUrl,
        createdById: superUser.id,
      },
    });
    createdOrgs.push(org);
    console.log(`✅ Organization created: ${org.name} (${org.slug})`);
  }

  // Create organization memberships
  console.log('👔 Creating organization memberships...');
  
  // Tech Conference Organization memberships
  const techOrg = createdOrgs[0];
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: techOrg.id,
        userId: createdUsers[0].id, // Sarah Johnson
      },
    },
    update: {},
    create: {
      organizationId: techOrg.id,
      userId: createdUsers[0].id,
      role: 'org_admin',
      createdById: superUser.id,
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: techOrg.id,
        userId: createdUsers[3].id, // Emma Davis
      },
    },
    update: {},
    create: {
      organizationId: techOrg.id,
      userId: createdUsers[3].id,
      role: 'org_viewer',
      createdById: superUser.id,
    },
  });

  // Community Events Hub memberships
  const communityOrg = createdOrgs[1];
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: communityOrg.id,
        userId: createdUsers[1].id, // Mike Chen
      },
    },
    update: {},
    create: {
      organizationId: communityOrg.id,
      userId: createdUsers[1].id,
      role: 'org_admin',
      createdById: superUser.id,
    },
  });

  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: communityOrg.id,
        userId: createdUsers[4].id, // John Smith
      },
    },
    update: {},
    create: {
      organizationId: communityOrg.id,
      userId: createdUsers[4].id,
      role: 'org_viewer',
      createdById: superUser.id,
    },
  });

  // Professional Development Network memberships
  const profDevOrg = createdOrgs[2];
  await prisma.organizationMembership.upsert({
    where: {
      organizationId_userId: {
        organizationId: profDevOrg.id,
        userId: createdUsers[2].id, // Alex Rodriguez
      },
    },
    update: {},
    create: {
      organizationId: profDevOrg.id,
      userId: createdUsers[2].id,
      role: 'org_admin',
      createdById: superUser.id,
    },
  });

  // Create some events for these organizations
  console.log('📅 Creating events for organizations...');
  
  const events = [
    {
      name: 'TechConf 2025',
      slug: 'techconf-2025',
      organizationId: techOrg.id,
      isActive: true,
      codeOfConduct: 'We are committed to providing a harassment-free experience for everyone.',
      contactEmail: 'organizers@techconf2025.org'
    },
    {
      name: 'DevOps Summit',
      slug: 'devops-summit',
      organizationId: techOrg.id,
      isActive: true,
      codeOfConduct: 'Professional conduct is expected from all participants.',
      contactEmail: 'team@devopssummit.org'
    },
    {
      name: 'Community Meetup Series',
      slug: 'community-meetup-series',
      organizationId: communityOrg.id,
      isActive: true,
      codeOfConduct: 'Building inclusive communities through respectful interaction.',
      contactEmail: 'hello@communitymeetups.org'
    },
    {
      name: 'Career Development Workshop',
      slug: 'career-dev-workshop',
      organizationId: profDevOrg.id,
      isActive: false,
      codeOfConduct: 'Professional development in a supportive environment.',
      contactEmail: 'workshops@profdev.network'
    }
  ];

  for (const eventData of events) {
    const event = await prisma.event.upsert({
      where: { slug: eventData.slug },
      update: {
        organizationId: eventData.organizationId,
      },
      create: {
        name: eventData.name,
        slug: eventData.slug,
        organizationId: eventData.organizationId,
        isActive: eventData.isActive,
        codeOfConduct: eventData.codeOfConduct,
        contactEmail: eventData.contactEmail,
      },
    });
    console.log(`✅ Event created: ${event.name} (${event.slug})`);

    // Add event roles for organization admins
    const orgAdmin = await prisma.organizationMembership.findFirst({
      where: {
        organizationId: eventData.organizationId,
        role: 'org_admin'
      },
      include: { user: true }
    });

    if (orgAdmin) {
      const eventAdminRole = await prisma.role.findUnique({ where: { name: 'Event Admin' } });
      await prisma.userEventRole.upsert({
        where: {
          userId_eventId_roleId: {
            userId: orgAdmin.userId,
            eventId: event.id,
            roleId: eventAdminRole.id,
          },
        },
        update: {},
        create: {
          userId: orgAdmin.userId,
          eventId: event.id,
          roleId: eventAdminRole.id,
        },
      });
      console.log(`✅ Event admin role assigned to ${orgAdmin.user.name} for ${event.name}`);
    }
  }

  console.log('\n🎯 Organization seed data complete!');
  console.log('\n📋 Summary:');
  console.log(`✅ ${organizations.length} organizations created`);
  console.log(`✅ ${additionalUsers.length} additional users created`);
  console.log(`✅ ${events.length} events created and linked to organizations`);
  console.log(`✅ Organization memberships and roles assigned`);
  
  console.log('\n🔗 Available organization URLs:');
  organizations.forEach(org => {
    console.log(`   http://localhost:3000/orgs/${org.slug}`);
  });

  console.log('\n👤 Test user credentials:');
  additionalUsers.forEach(user => {
    console.log(`   ${user.email} / ${user.password}`);
  });
}

main()
  .catch(e => {
    console.error('❌ Error seeding organization data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 