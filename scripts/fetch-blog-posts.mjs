import { mkdir, readFile, writeFile } from 'node:fs/promises';

const feedUrl = 'https://rss.blog.naver.com/ysukkim33.xml';
const response = await fetch(feedUrl, {
  headers: { 'User-Agent': 'KimYoungsookRealtySite/1.0' },
  signal: AbortSignal.timeout(30000)
});

if (!response.ok) throw new Error(`Naver blog RSS returned HTTP ${response.status}.`);
const xml = await response.text();

const decodeXml = value => String(value ?? '')
  .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/i, '$1')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
  .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
  .replaceAll('&lt;', '<')
  .replaceAll('&gt;', '>')
  .replaceAll('&quot;', '"')
  .replaceAll('&#39;', "'")
  .replaceAll('&amp;', '&')
  .trim();

const field = (block, name) => {
  const match = block.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return decodeXml(match?.[1]);
};

const plainText = value => decodeXml(value)
  .replace(/<br\s*\/?>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const excerpt = value => {
  const text = plainText(value);
  if (!text) return '김영숙부동산에서 확인한 부동산 정보와 현장 내용을 정리한 공개 글입니다.';
  return text.length > 135 ? `${text.slice(0, 134).trim()}…` : text;
};

const canonicalBlogUrl = value => {
  const url = new URL(value);
  if (url.hostname !== 'blog.naver.com' || !url.pathname.startsWith('/ysukkim33/')) {
    throw new Error(`Unexpected blog item URL: ${url.href}`);
  }
  url.search = '';
  url.hash = '';
  return url.href;
};

const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
  .map(match => match[1])
  .map(block => ({
    title: plainText(field(block, 'title')),
    url: canonicalBlogUrl(field(block, 'link')),
    publishedAt: new Date(field(block, 'pubDate')).toISOString(),
    excerpt: excerpt(field(block, 'description'))
  }))
  .filter(item => item.title && item.url && item.publishedAt)
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
  .slice(0, 10);

if (!items.length) throw new Error('No public blog posts were found in the RSS feed.');

let previous = null;
try {
  previous = JSON.parse(await readFile('content/blog-posts.json', 'utf8'));
} catch {}

const itemsChanged = JSON.stringify(previous?.items ?? []) !== JSON.stringify(items);

const output = {
  meta: {
    source: feedUrl,
    blog: '김영숙부동산 네이버 블로그',
    generatedAt: itemsChanged ? new Date().toISOString() : previous?.meta?.generatedAt ?? new Date().toISOString(),
    count: items.length
  },
  items
};

await mkdir('content', { recursive: true });
await writeFile('content/blog-posts.json', `${JSON.stringify(output, null, 2)}\n`, 'utf8');
console.log(`Wrote ${items.length} published blog posts.`);
