import { globby } from 'globby';
import fs from 'fs-extra';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

async function run() {
  const files = await globby(['src/content/{writing,projects}/**/*.{md,mdx}']);
  const out: Record<string, string[]> = {};
  const slugs: Record<string, string> = {};

  // map absolute filepath -> slug
  for (const fp of files) {
    const raw = await fs.readFile(fp, 'utf8');
    const { data } = matter(raw);
    const rel = fp.replace(/^src\/content\//, '').replace(/\.(md|mdx)$/, '');
    const slug = (data.slug as string) || `/${rel}`;
    slugs[fp] = slug;
    out[slug] = out[slug] || [];
  }

  for (const fp of files) {
    const raw = await fs.readFile(fp, 'utf8');
    const { content } = matter(raw);
    const tree = unified().use(remarkParse).parse(content);
    const fromSlug = slugs[fp];
    visit(tree, 'link', (node: any) => {
      const href = node.url as string;
      if (!href) return;
      // internal links to /writing/* or /projects/*
      if (href.startsWith('/writing/') || href.startsWith('/projects/')) {
        out[href] = out[href] || [];
        if (!out[href].includes(fromSlug)) out[href].push(fromSlug);
      }
    });
  }

  await fs.outputJson('src/generated/backlinks.json', out, { spaces: 2 });
  console.log('✓ Backlinks written:', Object.keys(out).length, 'pages');
}

run().catch(e => { console.error(e); process.exit(1); });
