import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';

const options: swaggerJSDoc.Options = {
  definition: {
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
              enum: ['SUPERADMIN', 'ADMIN', 'RESPONDENT', 'GUEST'],
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
            id: {
              type: 'string',
              format: 'uuid',
              description: 'Report unique identifier',
            },
            title: {
              type: 'string',
              description: 'Report title/summary',
            },
            description: {
              type: 'string',
              description: 'Detailed report description',
            },
            type: {
              type: 'string',
              enum: ['CODE_OF_CONDUCT', 'HARASSMENT', 'SAFETY', 'OTHER'],
              description: 'Type of report',
            },
            status: {
              type: 'string',
              enum: ['SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'CLOSED'],
              description: 'Current status of the report',
            },
            severity: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
              description: 'Severity level of the incident',
            },
            incidentAt: {
              type: 'string',
              format: 'date-time',
              description: 'When the incident occurred',
            },
            location: {
              type: 'string',
              description: 'Where the incident occurred',
            },
            partiesInvolved: {
              type: 'string',
              description: 'Parties involved in the incident',
            },
            contactPreference: {
              type: 'string',
              enum: ['EMAIL', 'PHONE', 'NONE'],
              description: 'Preferred contact method for the reporter',
            },
            isAnonymous: {
              type: 'boolean',
              description: 'Whether the report was submitted anonymously',
            },
            eventId: {
              type: 'string',
              format: 'uuid',
              description: 'Associated event ID',
            },
            reporterId: {
              type: 'string',
              format: 'uuid',
              description: 'Reporter user ID (null for anonymous)',
              nullable: true,
            },
            assignedToId: {
              type: 'string',
              format: 'uuid',
              description: 'Assigned respondent user ID',
              nullable: true,
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Report creation timestamp',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Report last update timestamp',
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
  },
  apis: ['./src/routes/*.ts'], // Path to the API routes files
};

export const specs = swaggerJSDoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Conducky API Documentation',
  }));

  // Serve the raw OpenAPI JSON
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(specs);
  });
}

export default { specs, setupSwagger }; 