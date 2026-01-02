// Best practice: proxy via your backend for caching + CORS.
// For now we attempt Wikipedia REST summary endpoint directly.
// If it fails, we return null and your UI will show a fallback.

const cache = new Map();

export async function fetchWikipediaThumbnail(title) {
  const key = title.toLowerCase();
  if (cache.has(key)) return cache.get(key);

  // Wikipedia REST summary: /page/summary/{title}
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;

  try {
    const res = await fetch(url, {
      headers: { "Accept": "application/json" },
    });
    if (!res.ok) throw new Error(`wiki ${res.status}`);
    const data = await res.json();
    const thumb = data?.thumbnail?.source || null;
    const out = { thumb, title: data?.title || title, extract: data?.extract || "" };
    cache.set(key, out);
    return out;
  } catch {
    const out = { thumb: null, title, extract: "" };
    cache.set(key, out);
    return out;
  }
}
