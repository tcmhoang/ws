import pg from "pg";
const { Pool } = pg;

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "user",
  password: process.env.DB_PASSWORD || "password",
  database: process.env.DB_NAME || "mediadb",
  max: 20,
  idleTimeoutMillis: 30000,
});

export const initDb = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS media (
        id SERIAL PRIMARY KEY,
        source_url TEXT NOT NULL,
        media_url TEXT NOT NULL,
        type VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_type ON media(type);
      CREATE INDEX IF NOT EXISTS idx_media_url ON media(media_url); 
    `);
  } catch (err) {
    console.error("DB Init Error:", err);
  } finally {
    client.release();
  }
};

export { pool };
