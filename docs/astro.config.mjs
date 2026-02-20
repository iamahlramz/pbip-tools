import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://iamahlramz.github.io',
  base: '/pbip-tools',
  integrations: [
    starlight({
      title: 'pbip-tools',
      description: 'Open-source tools for Power BI PBIP projects',
      social: {
        github: 'https://github.com/iamahlramz/pbip-tools',
      },
      sidebar: [
        {
          label: 'Getting Started',
          autogenerate: { directory: 'getting-started' },
        },
        {
          label: 'MCP Tools',
          autogenerate: { directory: 'tools' },
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        {
          label: 'Architecture',
          autogenerate: { directory: 'architecture' },
        },
      ],
    }),
  ],
});
