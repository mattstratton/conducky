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
  tagline: 'Conducky is a platform for managing Code of Conduct reports',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: canonicalUrl,
  baseUrl: baseUrl,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

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
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/docusaurus-social-card.jpg',
      metadata: [
        {
          name: 'canonical',
          content: canonicalUrl,
        },
      ],
      navbar: {
        title: 'Conducky',
        logo: {
          alt: 'Conducky Logo',
          src: 'img/conducky-logo.svg',
        },
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
            href: 'https://github.com/mattstratton/conducky',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
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
            ],
          },
          {
            title: 'Community',
            items: [],
          },
          {
            title: 'More',
            items: [
              {
                label: 'GitHub',
                href: 'https://github.com/mattstratton/conducky',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Matty Stratton. Built with Docusaurus.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
      },
    }),

  plugins: [
    [
      'docusaurus-plugin-react-docgen-typescript',
      {
        src: ['../frontend/components/**/*.tsx'],
        ignore: ['../frontend/components/**/*test.*'],
        parserOptions: {
          propFilter: (prop, component) => {
            if (prop.parent) {
              return !prop.parent.fileName.includes('@types/react');
            }
            return true;
          },
        },
      },
    ],
  ],
};

export default config;