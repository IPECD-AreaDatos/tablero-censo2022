import { Pool } from 'pg';

// Singleton para reutilizar la conexión en desarrollo y producción
const globalForPg = global as unknown as { pool: Pool };

export const pool =
  globalForPg.pool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false, // Cambiar a { rejectUnauthorized: false } si el servidor requiere SSL
  });

if (process.env.NODE_ENV !== 'production') globalForPg.pool = pool;

export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
}