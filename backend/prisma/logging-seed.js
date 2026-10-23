const { createPrismaClient } = require('./db');

const prisma = createPrismaClient();

const seedLoggingSettings = async () => {
  console.log('🔧 Seeding default logging settings...');

  const defaultLoggingSettings = [
    {
      key: 'logLevel',
      value: 'error'
    },
    {
      key: 'logDestinations',
      value: JSON.stringify({
        console: true,
        file: false,
        errorFile: false
      })
    },
    {
      key: 'logFilePath',
      value: 'logs/combined.log'
    },
    {
      key: 'logErrorFilePath',
      value: 'logs/error.log'
    }
  ];

  for (const setting of defaultLoggingSettings) {
    const existing = await prisma.systemSetting.findUnique({
      where: { key: setting.key }
    });

    if (!existing) {
      await prisma.systemSetting.create({
        data: setting
      });
      console.log(`✅ Created logging setting: ${setting.key} = ${setting.value}`);
    } else {
      console.log(`ℹ️  Logging setting already exists: ${setting.key}`);
    }
  }

  console.log('✅ Logging settings seed completed');
};

// Run the seed function
if (require.main === module) {
  seedLoggingSettings()
    .catch((e) => {
      console.error('❌ Error seeding logging settings:', e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { seedLoggingSettings }; 