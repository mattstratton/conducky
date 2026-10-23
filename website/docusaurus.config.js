// @ts-check
import { themes as prismThemes } from 'prism-react-renderer';

// Detect if running in Read the Docs
const isReadTheDocs = process.env.READTHEDOCS === 'True';

// Get raw canonical URL from RTD or fallback
const rawRtdUrl = process.env.READTHEDOCS_CANONICAL_URL || 'https://conducky.readthedocs.io';

// Strip version/lang subpaths for canonical <link> URL
const canonicalUrl = isReadTheDocs
  ? rawRtdUrl.replace(/\/(en|fr|es|pt|de|zh)(\/[^/]+)?\/?$/, '')
  : 'https://conducky.com/';

// Extract base URL subpath from RTD canonical URL
const baseUrl = isReadTheDocs
  ? new URL(rawRtdUrl).pathname.replace(/\/$/, '/') // ensure trailing slash
  : '/';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Conducky',
  tagline: 'Code of Conduct incident management platform for conferences and events',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: canonicalUrl,
  baseUrl: baseUrl,

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          routeBasePath: '/',
          editUrl: 'https://github.com/mattstratton/conducky/tree/main/website/',
          docRootComponent: "@theme/DocRoot",
          docItemComponent: "@theme/ApiItem",
          // Enhanced navigation
          showLastUpdateAuthor: false,
          showLastUpdateTime: false,
          breadcrumbs: true,
          // Enable doc versioning for future use
          includeCurrentVersion: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        // Enable sitemap generation
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      }),
    ],
  ],

  plugins: [
    [
      'docusaurus-plugin-openapi-docs',
      {
        id: 'conducky-api',
        docsPluginId: 'classic',
        config: {
          conducky: {
            specPath: '../backend/swagger.json',
            outputDir: 'docs/api',
            sidebarOptions: {
              groupPathsBy: 'tag',
              categoryLinkSource: 'tag',
            },
            downloadUrl: '/api-docs.json',
            hideSendButton: true,
            showSchemas: true,

          },
        },
      },
    ],
    // Enhanced search functionality
    [
      require.resolve('@docusaurus/plugin-client-redirects'),
      {
        redirects: [
          // Redirect old URLs to new ones for better SEO
          {
            to: '/user-guide/intro',
            from: '/docs/user-guide',
          },
          {
            to: '/admin-guide/intro',
            from: '/docs/admin-guide',
          },
          {
            to: '/developer-docs/intro',
            from: '/docs/developer-docs',
          },
        ],
      },
    ],
  ],

  themes: ["docusaurus-theme-openapi-docs", "@docusaurus/theme-mermaid"],
  
  // Enable Mermaid support globally
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/conducky-social-card.jpg',
      // Enhanced metadata
      metadata: [
        {
          name: 'canonical',
          content: canonicalUrl,
        },
        {
          name: 'robots',
          content: 'index, follow',
        },
        {
          name: 'description',
          content: 'Comprehensive documentation for Conducky, a code of conduct incident management platform designed for conferences and events. Learn how to set up, manage, and use Conducky effectively.',
        },
        {
          name: 'keywords',
          content: 'code of conduct, incident management, conference safety, event management, harassment reporting, Conducky',
        },
        {
          property: 'og:type',
          content: 'website',
        },
        {
          property: 'og:title',
          content: 'Conducky Documentation - Code of Conduct Management',
        },
        {
          property: 'og:description',
          content: 'Complete guide for using Conducky, the comprehensive incident management platform for conference and event safety.',
        },
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
      ],
      
      // Enhanced search configuration (placeholder - requires actual Algolia setup)
      // algolia: {
      //   appId: 'YOUR_APP_ID',
      //   apiKey: 'YOUR_SEARCH_API_KEY',
      //   indexName: 'conducky',
      //   contextualSearch: true,
      //   searchPagePath: 'search',
      //   searchParameters: {},
      //   facetFilters: [],
      // },

      navbar: {
        title: 'Conducky',
        logo: {
          alt: 'Conducky Logo',
          src: 'img/conducky-logo.svg',
          srcDark: 'img/conducky-logo-dark.svg',
          width: 32,
          height: 32,
        },
        hideOnScroll: false,
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'userGuideSidebar',
            position: 'left',
            label: 'User Guide',
          },
          {
            type: 'docSidebar',
            sidebarId: 'adminGuideSidebar',
            position: 'left',
            label: 'Admin Guide',
          },
          {
            type: 'docSidebar',
            sidebarId: 'developerDocsSidebar',
            position: 'left',
            label: 'Developer Docs',
          },
          {
            type: 'docSidebar',
            sidebarId: 'securitySidebar',
            position: 'left',
            label: 'Security',
          },
          {
            type: 'docSidebar',
            sidebarId: 'apiSidebar',
            position: 'left',
            label: 'API Reference',
          },
          // Enhanced search bar (commented out until Algolia is configured)
          // {
          //   type: 'search',
          //   position: 'right',
          // },
          {
            href: 'https://github.com/mattstratton/conducky',
            label: 'GitHub',
            position: 'right',
            className: 'header-github-link',
            'aria-label': 'GitHub repository',
          },
        ],
      },
      
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Get Started',
                to: '/user-guide/getting-started/overview',
              },
              {
                label: 'User Guide',
                to: '/user-guide/intro',
              },
              {
                label: 'Admin Guide',
                to: '/admin-guide/intro',
              },
              {
                label: 'Developer Docs',
                to: '/developer-docs/intro',
              },
              {
                label: 'API Reference',
                to: '/api',
              },
            ],
          },
          {
            title: 'Help & Support',
            items: [
              {
                label: 'Troubleshooting',
                to: '/user-guide/troubleshooting',
              },
              {
                label: 'FAQ',
                to: '/user-guide/faq/overview',
              },
              {
                label: 'Community',
                href: 'https://github.com/mattstratton/conducky/discussions',
              },
              {
                label: 'Report Issues',
                href: 'https://github.com/mattstratton/conducky/issues',
              },
            ],
          },
          {
            title: 'Project',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/mattstratton/conducky',
              },
              {
                label: 'Releases',
                href: 'https://github.com/mattstratton/conducky/releases',
              },
              {
                label: 'License',
                href: 'https://github.com/mattstratton/conducky/blob/main/LICENSE',
              },
              {
                label: 'Contributing',
                href: 'https://github.com/mattstratton/conducky/blob/main/CONTRIBUTING.md',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Matty Stratton. Built with Docusaurus. <br/> <a href="/privacy-policy" style="color: #9ca3af;">Privacy Policy</a> | <a href="/terms-of-service" style="color: #9ca3af;">Terms of Service</a>`,
      },
      
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['bash', 'diff', 'json', 'yaml', 'docker', 'sql'],
      },
      languageTabs: [
        {
          highlight: "javascript",
          language: "javascript",
          logoClass: "javascript",
        },
        {
          highlight: "javascript",
          language: "nodejs",
          logoClass: "nodejs",
        },
        {
          highlight: "bash",
          language: "curl",
          logoClass: "bash",
        }
      ],
      
      colorMode: {
        defaultMode: 'light',
        disableSwitch: false,
        respectPrefersColorScheme: true,
      },

      // Enhanced table of contents
      tableOfContents: {
        minHeadingLevel: 2,
        maxHeadingLevel: 4,
      },

      // Enhanced announcement bar for important updates
      announcementBar: {
        id: 'support_conducky',
        content:
          '⭐ If you find Conducky useful, give it a star on <a target="_blank" rel="noopener noreferrer" href="https://github.com/mattstratton/conducky">GitHub</a>! ⭐',
        backgroundColor: '#fafbfc',
        textColor: '#091E42',
        isCloseable: true,
      },

      // Enhanced docs configuration
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },

      // Mermaid configuration
      mermaid: {
        theme: {light: 'neutral', dark: 'dark'},
        options: {
          maxTextSize: 100000, // Increased from 50 to fix "Maximum text size exceeded" error
          maxEdges: 1000, // Also increase edge limit if needed
        },
      },
    }),
};

export default config;