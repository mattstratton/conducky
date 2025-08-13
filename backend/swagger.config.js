module.exports = {
  openapi: '3.0.0',
  info: {
    title: 'Conducky API',
    version: '1.0.0',
    description: 'API for Conducky - Code of Conduct incident management system',
    contact: {
      name: 'Conducky Support',
      url: 'https://conducky.com',
      email: 'support@conducky.com',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: process.env.API_BASE_URL || 'http://localhost:3001',
      description: 'Development server',
    },
    {
      url: 'https://api.conducky.com',
      description: 'Production server',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'connect.sid',
      },
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'User unique identifier',
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
          },
          firstName: {
            type: 'string',
            description: 'User first name',
          },
          lastName: {
            type: 'string',
            description: 'User last name',
          },
          role: {
            type: 'string',
            enum: ['SYSTEM_ADMIN', 'ADMIN', 'RESPONDENT', 'GUEST'],
            description: 'User global role',
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the user account is active',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp',
          },
        },
      },
      Event: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: 'Event unique identifier',
          },
          name: {
            type: 'string',
            description: 'Event name',
          },
          slug: {
            type: 'string',
            description: 'Event URL slug',
          },
          description: {
            type: 'string',
            description: 'Event description',
          },
          isActive: {
            type: 'boolean',
            description: 'Whether the event is currently active',
          },
          startDate: {
            type: 'string',
            format: 'date',
            description: 'Event start date',
          },
          endDate: {
            type: 'string',
            format: 'date',
            description: 'Event end date',
          },
          contactEmail: {
            type: 'string',
            format: 'email',
            description: 'Contact email for the event',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Event creation timestamp',
          },
        },
      },
      Report: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', description: 'Incident unique identifier' },
          title: { type: 'string', description: 'Incident title/summary' },
          description: { type: 'string', description: 'Detailed incident description' },
          state: {
            type: 'string',
            enum: ['submitted', 'acknowledged', 'investigating', 'resolved', 'closed'],
            description: 'Current state of the incident',
          },
          severity: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            nullable: true,
            description: 'Severity level of the incident',
          },
          incidentAt: { type: 'string', format: 'date-time', nullable: true, description: 'When the incident occurred' },
          location: { type: 'string', nullable: true, description: 'Where the incident occurred' },
          parties: { type: 'string', nullable: true, description: 'Parties involved in the incident' },
          eventId: { type: 'string', format: 'uuid', description: 'Associated event ID' },
          reporterId: { type: 'string', format: 'uuid', nullable: true, description: 'Reporter user ID (null for anonymous)' },
          assignedResponderId: { type: 'string', format: 'uuid', nullable: true, description: 'Assigned responder user ID' },
          resolution: { type: 'string', nullable: true, description: 'Resolution notes' },
          firstResponseAt: { type: 'string', format: 'date-time', nullable: true, description: 'When the incident first left submitted' },
          resolvedAt: { type: 'string', format: 'date-time', nullable: true, description: 'When the incident was resolved' },
          escalatedAt: { type: 'string', format: 'date-time', nullable: true, description: 'When the incident was escalated' },
          reopenedAt: { type: 'string', format: 'date-time', nullable: true, description: 'When the incident was reopened' },
          createdAt: { type: 'string', format: 'date-time', description: 'Creation timestamp' },
          updatedAt: { type: 'string', format: 'date-time', description: 'Last update timestamp' },
        },
      },
              Organization: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Organization unique identifier',
            },
            name: {
              type: 'string',
              description: 'Organization name',
            },
            slug: {
              type: 'string',
              description: 'Organization URL slug',
            },
            description: {
              type: 'string',
              description: 'Organization description',
            },
            website: {
              type: 'string',
              format: 'uri',
              description: 'Organization website URL',
              nullable: true,
            },
            isActive: {
              type: 'boolean',
              description: 'Whether the organization is currently active',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Organization creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Organization last update timestamp',
            },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
    },
  },
  security: [
    {
      sessionAuth: [],
    },
  ],
}; 