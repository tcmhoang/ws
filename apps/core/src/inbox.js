import https from "https";
import Queue from "bull";
import axios from "axios";
import * as cheerio from "cheerio";
import { pool } from "./db.js";

const redisHost = process.env.REDIS_HOST || "localhost";
const scrapeQueue = new Queue("scrape-queue", {
  redis: {
    host: redisHost,
    port: 6379,
  },
});

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const extractRules = [
  { sel: "img", attr: "src", type: "image" },
  { sel: "img", attr: "data-src", type: "image" },
  { sel: "img", attr: "data-lazy-src", type: "image" },
  { sel: "video", attr: "src", type: "video" },
  { sel: "video source", attr: "src", type: "video" },
];

const crawl = (parsed, resolveUrl, url) => {
  const uniqueMediaUrls = new Set();
  const mediaRows = [];

  const addMedia = (rawSrc, type) => {
    const fullUrl = resolveUrl(rawSrc);

    if (
      fullUrl &&
      fullUrl.startsWith("http") &&
      !uniqueMediaUrls.has(fullUrl)
    ) {
      if (type === "image" && fullUrl.length < 20) return;

      uniqueMediaUrls.add(fullUrl);
      mediaRows.push([url, fullUrl, type]);
    }
  };

  extractRules.forEach(({ sel, attr, type }) => {
    parsed(sel).each((_, el) => addMedia(parsed(el).attr(attr), type));
  });

  parsed("a[href]").each((_, el) => {
    const href = parsed(el).attr("href");
    if (href && /\.(mp4|webm|ogg|mov|avi|mkv)$/i.test(href)) {
      addMedia(href, "video");
    }
  });
  return mediaRows;
};

const saveIO = async (mediaRows) => {
  if (mediaRows.length > 0) {
    const placeholders = mediaRows
      .map((_, i) => `($${i * 3 + 1}, $${i * 3 + 2}, $${i * 3 + 3})`)
      .join(",");

    const query = `
        INSERT INTO media (source_url, media_url, type) 
        VALUES ${placeholders}
        ON CONFLICT DO NOTHING
      `;
    await pool.query(query, mediaRows.flat());
  }
  return mediaRows.length;
};

scrapeQueue.process(5, async (job) => {
  const { url } = job.data;

  try {
    const checkRes = await pool.query(
      "SELECT 1 FROM media WHERE source_url = $1 LIMIT 1",
      [url],
    );
    if (checkRes.rowCount > 0) {
      console.log(`Skipping ${url} (Already scraped)`);
      return { status: "skipped" };
    }

    console.log(`Processing: ${url}`);

    const { data } = await axios.get(url, {
      timeout: 10000,
      httpsAgent: httpsAgent,
      headers: { "User-Agent": "Mozilla/5.0 (Compatible; MediaScraper/1.0)" },
    });

    const resolveUrl = (src) => {
      if (!src) return null;
      try {
        return new URL(src, url).href;
      } catch (e) {
        return null;
      }
    };
    const parsed = cheerio.load(data);

    const mediaRows = crawl(parsed, resolveUrl, url);

    const written = await saveIO(mediaRows);

    console.log(`Scraped ${written} items from ${url}`);
    return { status: "scraped", count: written };
  } catch (error) {
    console.error(`Failed ${url}: ${error.message}`);
    throw error;
  }
});

export default scrapeQueue;
