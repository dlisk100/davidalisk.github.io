# davidalisk.com

Personal website built with Astro + MDX + Tailwind CSS, featuring Anthropic-inspired design.

## Structure

- `/site` - New Astro-based website
- `/old_site` - Previous Hugo site (archived)
- `CNAME` - Custom domain configuration

## Quick Start

```bash
cd site
pnpm install
pnpm dev          # Start dev server at http://localhost:4321
pnpm build        # Build for production
pnpm preview      # Preview production build
```

## Features

- **Astro + MDX** - Fast static site with rich content
- **Tailwind CSS** - Anthropic-inspired design tokens
- **Content Collections** - Type-safe content with `writing` and `notes`
- **Pagefind Search** - Client-side full-text search
- **Backlinks** - Automatic bidirectional linking between posts
- **GitHub Pages** - Automated deploy via GitHub Actions

## Content

Posts live in `site/src/content/writing/*.mdx` with frontmatter:

```yaml
---
title: "Your Post Title"
summary: "Optional summary"
tags: ["Tag1", "Tag2"]
updated: "2025-01-15"
draft: false
---
```

## Deployment

Pushes to `claude/anthropic-redesign-*` or `main` trigger automatic deployment to GitHub Pages.

Custom domain: `davidalisk.com`

## TODOs

- [ ] Add Inter & JetBrains Mono font files to `/site/public/fonts`
- [ ] Populate `/about`, `/apps`, and `/now` pages
- [ ] Add OG image generation (optional)
- [ ] Create notes content

---

Built in New York. © 2025 David Lisk
