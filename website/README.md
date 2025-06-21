# Conducky Documentation Website

This directory contains the Conducky documentation website built with [Docusaurus](https://docusaurus.io/), enhanced with Tailwind CSS, Shadcn/UI components, and interactive API documentation.

## Features

- 📚 **Multi-Section Documentation**: User Guide, Admin Guide, Developer Docs
- 🎨 **Modern UI**: Tailwind CSS with Shadcn/UI components
- 🌙 **Dark Mode**: Full dark/light theme support
- 📱 **Mobile-First**: Responsive design optimized for all devices
- 🔧 **Interactive API Docs**: OpenAPI 3.0 with live testing capabilities
- 🚀 **Fast Development**: Hot reload and modern build tools

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Backend server running (for API documentation generation)

### Installation

```bash
npm install
```

### Development

Start the development server:

```bash
npm run start
```

This will start the Docusaurus development server at `http://localhost:3000` with hot reloading enabled.

## Available Scripts

### Core Docusaurus Scripts

- **`npm run start`** - Start development server with hot reloading
- **`npm run build`** - Build the static site for production
- **`npm run serve`** - Serve the built site locally for testing
- **`npm run clear`** - Clear Docusaurus cache and generated files

### API Documentation Scripts

- **`npm run gen-api-docs`** - Generate API documentation from OpenAPI specs
- **`npm run clean-api-docs`** - Remove generated API documentation
- **`npm run gen-api-docs:version`** - Generate versioned API documentation
- **`npm run clean-api-docs:version`** - Clean versioned API documentation

### Utility Scripts

- **`npm run swizzle`** - Customize Docusaurus components
- **`npm run write-translations`** - Generate translation files
- **`npm run write-heading-ids`** - Add heading IDs to markdown files
- **`npm run deploy`** - Deploy to GitHub Pages (if configured)

## Documentation Workflow

### 1. Writing Documentation

Documentation is organized into three main sections:

```
docs/
├── user-guide/          # End-user documentation
├── admin-guide/         # Administrator documentation
├── developer-docs/      # Developer documentation
└── api/                 # Generated API documentation (auto-generated)
```

#### Creating New Documentation

1. **User Guide**: Add files to `docs/user-guide/`
2. **Admin Guide**: Add files to `docs/admin-guide/`
3. **Developer Docs**: Add files to `docs/developer-docs/`

All documentation uses Markdown with MDX support for React components.

### 2. API Documentation Workflow

The API documentation is automatically generated from OpenAPI specifications. Here's the complete workflow:

#### Step 1: Add JSDoc Comments to Backend Routes

Add comprehensive JSDoc comments to your API routes in the backend. See `reference/example-jsdoc.md` for examples.

```typescript
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Authentication]
 *     summary: User login
 *     description: Authenticate a user with email and password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post('/login', loginHandler);
```

#### Step 2: Generate OpenAPI Specification

From the backend directory:

```bash
cd ../backend
npm run generate-docs
```

This creates/updates `backend/swagger.json` with the latest API specification.

#### Step 3: Generate Documentation

From the website directory:

```bash
npm run gen-api-docs conducky
```

This generates the interactive API documentation in `docs/api/`.

#### Step 4: Build and Test

```bash
npm run build
npm run start
```

Visit `http://localhost:3000/developer-docs/api-reference` to view the generated API documentation.

### 3. Customizing the Documentation

#### Styling with Tailwind CSS

The site includes a complete Tailwind CSS setup with:

- Custom color scheme for light/dark themes
- Typography plugin for beautiful prose
- Responsive utilities
- Custom CSS variables for theme integration

Add custom styles in `src/css/custom.css`:

```css
.custom-component {
  @apply bg-primary text-primary-foreground rounded-lg p-4;
}
```

#### Using Shadcn/UI Components

Create reusable UI components in `src/components/ui/`:

```typescript
// src/components/ui/my-component.tsx
import { Button } from './button';

export function MyComponent() {
  return (
    <Button variant="outline" size="lg">
      Click me
    </Button>
  );
}
```

Use components in MDX files:

```mdx
import { MyComponent } from '@site/src/components/ui/my-component';

# My Documentation Page

<MyComponent />
```

#### Configuration

Main configuration is in `docusaurus.config.js`:

- **Navbar**: Configure navigation items
- **Footer**: Add footer links and information
- **Plugins**: Enable/disable features
- **Themes**: Customize appearance

Sidebar configuration is in `sidebars.js`:

- **Auto-generated**: `{type: 'autogenerated', dirName: 'folder-name'}`
- **Manual**: Define custom sidebar structure
- **API Integration**: Includes generated API documentation

## Project Structure

```
website/
├── docs/                    # Documentation content
│   ├── user-guide/         # User documentation
│   ├── admin-guide/        # Admin documentation
│   ├── developer-docs/     # Developer documentation
│   └── api/                # Generated API docs (don't edit manually)
├── src/
│   ├── components/         # React components
│   │   └── ui/            # Shadcn/UI components
│   ├── css/               # Global styles
│   ├── lib/               # Utility functions
│   └── pages/             # Custom pages
├── static/                 # Static assets
├── docusaurus.config.js    # Main configuration
├── sidebars.js            # Sidebar configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── package.json           # Dependencies and scripts
```

## Development Tips

### Hot Reloading

The development server supports hot reloading for:
- Markdown content changes
- React component updates
- CSS modifications
- Configuration changes

### Debugging

- **Build Issues**: Run `npm run clear` to clear cache
- **API Docs Issues**: Regenerate with `npm run clean-api-docs && npm run gen-api-docs conducky`
- **Styling Issues**: Check Tailwind configuration and CSS variables

### Performance

- **Images**: Place in `static/img/` and use optimized formats (WebP)
- **Code Splitting**: Use dynamic imports for large components
- **Bundle Analysis**: Use `npm run build -- --bundle-analyzer`

## Deployment

### Production Build

```bash
npm run build
```

This creates a `build/` directory with static files ready for deployment.

### Automated API Documentation

The build process automatically handles API documentation generation:

1. **`npm run build`** - Standard build with API docs generation
2. **`npm run build:production`** - Production build with clean API docs regeneration
3. **`npm run build:dev`** - Development build without API docs (faster)

#### How It Works

The build process uses `build-docs.js` which:

- ✅ Checks for `../backend/swagger.json` 
- ✅ Generates API docs if the swagger file exists
- ✅ Creates fallback API documentation if swagger is missing
- ✅ Ensures the build never fails due to missing API specs
- ✅ Provides helpful logging for debugging

#### For Deployment Platforms

**Netlify**: Use the included `netlify.toml` configuration
**Vercel**: The build process works out-of-the-box
**GitHub Pages**: Use the `deploy` script after building
**Docker**: Include the swagger.json file in your build context

### Deployment Options

1. **Static Hosting**: Upload `build/` to any static host
2. **Netlify**: 
   - Connect your repository
   - Use the included `netlify.toml` configuration
   - Set base directory to `website`
   - Build command: `npm run build`
   - Publish directory: `build`
3. **Vercel**: 
   - Connect repository
   - Set build command: `npm run build`
   - Set output directory: `build`
   - Set install command: `npm install`
4. **GitHub Pages**: Use `npm run deploy` (requires configuration)
5. **Docker**: Use the provided Dockerfile for containerized deployment

### Environment Variables

Set these environment variables for production:

- `NODE_ENV=production`
- `BASE_URL` - Base URL for the site
- `API_URL` - Backend API URL for documentation

### Deployment Best Practices

#### Including API Documentation in Deployment

**Option 1: Pre-build the swagger.json** (Recommended)
```bash
# In your CI/CD pipeline or before deployment
cd backend
npm run generate-docs
cd ../website
npm run build
```

**Option 2: Include backend in build process**
- Ensure `backend/swagger.json` exists in your repository
- The build process will automatically use it

**Option 3: Fallback documentation** (Automatic)
- If no swagger.json is found, a basic API reference is created
- Users can still access endpoint information
- Includes setup instructions for full API docs

#### CI/CD Integration

For automated deployments, add this to your workflow:

```yaml
# Example GitHub Actions
- name: Generate API Documentation
  run: |
    cd backend
    npm install
    npm run generate-docs
    cd ../website
    npm install
    npm run build
```

#### Troubleshooting Deployment

1. **API docs not showing**: Check that `backend/swagger.json` exists
2. **Build failures**: Use `npm run build:dev` to skip API generation
3. **Missing dependencies**: Ensure all packages are in `dependencies`, not `devDependencies`
4. **Memory issues**: Use `NODE_OPTIONS="--max-old-space-size=4096"` for large builds

## Troubleshooting

### Common Issues

1. **Port 3000 already in use**
   ```bash
   # Kill existing process
   pkill -f docusaurus
   # Or use different port
   npm run start -- --port 3001
   ```

2. **API documentation not updating**
   ```bash
   npm run clean-api-docs
   cd ../backend && npm run generate-docs
   cd ../website && npm run gen-api-docs conducky
   ```

3. **Build failures**
   ```bash
   npm run clear
   npm install
   npm run build
   ```

4. **Styling issues**
   - Check Tailwind configuration
   - Verify CSS variable definitions
   - Clear browser cache

### Getting Help

- [Docusaurus Documentation](https://docusaurus.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn/UI Documentation](https://ui.shadcn.com)
- [OpenAPI Documentation](https://swagger.io/docs/)

## Contributing

1. Follow the existing documentation structure
2. Use Tailwind CSS for styling
3. Add JSDoc comments for API endpoints
4. Test documentation builds before submitting
5. Update this README for new features or workflows
