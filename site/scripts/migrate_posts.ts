import fs from 'fs-extra';
import path from 'path';
import matter from 'gray-matter';
import { globby } from 'globby';
import TurndownService from 'turndown';

const CANDIDATE_DIRS = [
  '../old_site/content/posts',
  '../content/posts',
  'posts',
  'blog',
  '_posts',
  'content',
  '_site/blog',
  '_site/posts',
  'old_site',
  './'
];

async function findSources() {
  for (const d of CANDIDATE_DIRS) {
    if (await fs.pathExists(d)) {
      const files = await globby([`${d}/**/*.{md,markdown,mdx,html}`], { dot:true });
      if (files.length) return files.slice(0, 10); // cap search
    }
  }
  return [];
}

function toFrontmatterDefaults(title:string) {
  return {
    title,
    tags: [] as string[],
    draft: false,
    updated: new Date().toISOString().slice(0,10),
    summary: ''
  };
}

async function run(){
  const files = await findSources();
  if (!files.length) {
    console.log('⚠ No source posts found. Place your posts under old_site/content/posts/ or content/posts/.');
    return;
  }

  console.log(`Found ${files.length} potential source file(s)...`);

  const td = new TurndownService();
  let migrated = 0;

  for (const fp of files) {
    const ext = path.extname(fp).toLowerCase();
    let content = await fs.readFile(fp,'utf8');
    let data:any = {};
    let body = content;

    if (ext === '.md' || ext === '.markdown' || ext === '.mdx') {
      const parsed = matter(content);
      data = { ...toFrontmatterDefaults(parsed.data.title || path.basename(fp, ext)), ...parsed.data };
      body = parsed.content;
    } else if (ext === '.html') {
      const titleMatch = content.match(/<title>(.*?)<\/title>/i) || content.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const title = titleMatch ? titleMatch[1].trim() : path.basename(fp, ext);
      data = toFrontmatterDefaults(title);
      body = td.turndown(content);
    } else {
      continue;
    }

    // Ensure tags is an array
    if (data.tags && !Array.isArray(data.tags)) {
      data.tags = [data.tags];
    }

    // Convert date to updated if present
    if (data.date && !data.updated) {
      const dateObj = new Date(data.date);
      data.updated = dateObj.toISOString().slice(0,10);
      delete data.date;
    }

    const safeSlug = (data.slug || data.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-+|-+$/g,'');

    const outPath = `src/content/writing/${safeSlug}.mdx`;

    // Create frontmatter without slug field (slug is determined by filename)
    const cleanData = { ...data };
    delete cleanData.slug;

    const fm = matter.stringify(body.trim(), cleanData);
    await fs.outputFile(outPath, fm, 'utf8');

    console.log(`✓ Migrated: ${path.basename(fp)} → ${safeSlug}.mdx`);
    migrated++;

    if (migrated >= 2) break; // Only need two posts
  }

  console.log(`\n✓ Successfully migrated ${migrated} post(s) to src/content/writing/`);
}

run().catch(e=>{ console.error(e); process.exit(1); });
