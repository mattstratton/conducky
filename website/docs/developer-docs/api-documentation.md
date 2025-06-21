# API Documentation

This guide covers how to work with Conducky's API documentation system, which is built using OpenAPI specifications and integrated with Docusaurus.

## Overview

Conducky uses OpenAPI 3.0 specifications to document its REST API. The API documentation is automatically generated from these specifications and integrated into the main documentation site.

## Features

- **Interactive API Explorer**: Test API endpoints directly from the documentation
- **Automatic Schema Generation**: API schemas are generated from the OpenAPI spec
- **Code Examples**: Multiple programming language examples for each endpoint
- **Authentication Support**: Session-based authentication with proper security documentation
- **Mobile-Responsive**: Optimized for viewing on all device sizes

## Accessing the API Documentation

### Live Documentation
- **Documentation Site**: http://localhost:3000/api/conducky
- **Interactive Swagger UI**: http://localhost:4000/api-docs (when backend is running)
- **OpenAPI JSON**: http://localhost:4000/api-docs.json

### Navigation
The API documentation is organized into several sections:
- **Authentication**: Login/logout endpoints
- **Events**: Event management operations
- **Reports**: Incident report management
- **Users**: User management (admin only)
- **Schemas**: Data model definitions

## API Specification Structure

The OpenAPI specification includes:

### Security
- Session-based authentication using cookies
- Role-based access control for different endpoints
- Proper error responses for unauthorized access

### Endpoints
Each endpoint includes:
- HTTP method and path
- Request/response schemas
- Authentication requirements
- Parameter descriptions
- Example responses
- Error scenarios

### Schemas
Well-defined data models for:
- User entities with role information
- Event entities with metadata
- Report entities with status tracking
- Error responses with consistent formatting

## Development Workflow

### 1. Generate OpenAPI Specification
```bash
# From the backend directory
npm run generate-docs
```

### 2. Generate Documentation
```bash
# From the website directory
npm run gen-api-docs conducky
```

### 3. Build Documentation Site
```bash
npm run build
```

### 4. Serve Documentation
```bash
npm run start
```

## Updating API Documentation

### Adding New Endpoints
1. Add JSDoc comments to your Express route handlers
2. Use proper OpenAPI 3.0 syntax in comments
3. Regenerate the OpenAPI specification
4. Regenerate the documentation

### Example JSDoc Comment
```javascript
/**
 * @swagger
 * /api/events:
 *   get:
 *     tags: [Events]
 *     summary: Get all events
 *     security:
 *       - sessionAuth: []
 *     responses:
 *       200:
 *         description: List of events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 */
```

## Customization

### Styling
The API documentation uses custom CSS classes for styling:
- `.theme-api-markdown`: Main content styling with typography support
- `.api-method`: Styling for HTTP method badges
- `.schema`: Styling for schema documentation

### Theming
- Supports both light and dark themes
- Automatically switches based on Docusaurus theme
- Custom color schemes for different API methods (GET, POST, PUT, DELETE)

## Testing the API

### Interactive Testing
Use the built-in API explorer to:
1. Select an endpoint
2. Fill in required parameters
3. Authenticate if needed
4. Send requests and view responses

### Authentication Testing
For protected endpoints:
1. First login using the `/api/auth/login` endpoint
2. The session cookie will be automatically included in subsequent requests
3. Test protected endpoints like `/api/events` or `/api/reports`

## Troubleshooting

### Common Issues

**Build Errors**
- Ensure all dependencies are installed: `npm install`
- Check for syntax errors in the OpenAPI specification
- Verify that the swagger.json file exists in the backend directory

**Missing Documentation**
- Regenerate the OpenAPI spec: `npm run generate-docs`
- Regenerate the documentation: `npm run gen-api-docs conducky`
- Clear the Docusaurus cache: `npm run clear`

**Styling Issues**
- Ensure Tailwind CSS is properly configured
- Check that the typography plugin is installed
- Verify CSS custom properties are defined

### Getting Help

If you encounter issues with the API documentation:
1. Check the console for error messages
2. Verify your OpenAPI specification is valid
3. Ensure all required dependencies are installed
4. Review the build logs for specific errors

## Best Practices

### OpenAPI Specifications
- Use consistent naming conventions
- Include comprehensive descriptions
- Provide example values for all parameters
- Document all possible error responses
- Use proper HTTP status codes

### Documentation Maintenance
- Keep API docs in sync with code changes
- Review generated documentation for accuracy
- Test all documented endpoints regularly
- Update examples when APIs change

### Performance
- Minimize the size of the OpenAPI specification
- Use appropriate caching for the documentation site
- Optimize images and other assets
- Consider lazy loading for large API specifications 