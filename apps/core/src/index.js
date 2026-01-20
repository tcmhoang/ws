import Koa from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import { initDb, pool } from "./db.js";
import scrapeQueue from "./inbox.js";

const app = new Koa();
const router = new Router();

app.use(cors());
app.use(bodyParser());

router.post("/api/scrape", async (ctx) => {
  const { urls } = ctx.request.body;

  if (!urls || !Array.isArray(urls)) {
    ctx.status = 400;
    ctx.body = { error: "Invalid input. Expecting array of URLs." };
    return;
  }

  urls.forEach((url) => scrapeQueue.add({ url }));

  ctx.status = 202;
  ctx.body = { message: `Queued ${urls.length} URLs for processing.` };
});

router.get("/api/media", async (ctx) => {
  const { page = 1, type, search } = ctx.query;
  const limit = 20;
  const offset = (page - 1) * limit;

  let queryText = "SELECT * FROM media WHERE 1=1";
  let countText = "SELECT COUNT(*) FROM media WHERE 1=1";
  let params = [];
  let paramIndex = 1;

  if (type) {
    queryText += ` AND type = $${paramIndex}`;
    countText += ` AND type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }

  if (search) {
    queryText += ` AND media_url ILIKE $${paramIndex}`;
    countText += ` AND media_url ILIKE $${paramIndex}`;
    params.push(`%${search}%`);
    paramIndex++;
  }

  const paginationParams = [...params, limit, offset];
  const finalQuery = `${queryText} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;

  try {
    const dataRes = await pool.query(finalQuery, paginationParams);
    const countRes = await pool.query(countText, params);

    ctx.body = {
      total: parseInt(countRes.rows[0].count),
      data: dataRes.rows,
    };
  } catch (err) {
    console.error(err);
    ctx.status = 500;
    ctx.body = { error: "Database query failed" };
  }
});

app.use(router.routes()).use(router.allowedMethods());

await initDb();
app.listen(5000, () => console.log("🚀 Server running on port 5000 (Koa ESM)"));
