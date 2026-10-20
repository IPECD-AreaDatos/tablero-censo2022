import { Pool } from 'pg';

const globalForPg = global as unknown as { 
  dwhPool: Pool;
  datalakePool: Pool;
};

// Conexión DWH (censo_ipecd_departamentos, censo_nea_nacion_*, etc.)
export const dwhPool =
  globalForPg.dwhPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

// Conexión DATALAKE (base_piramide_*, base_tasas_*, etc.)
export const datalakePool =
  globalForPg.datalakePool ||
  new Pool({
    connectionString: process.env.DATALAKE_URL,
    ssl: false,
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPg.dwhPool = dwhPool;
  globalForPg.datalakePool = datalakePool;
}

// Helper para DWH
export async function queryDwh<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await dwhPool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
}

// Helper para Datalake
export async function queryDatalake<T = any>(text: string, params?: any[]): Promise<T[]> {
  const client = await datalakePool.connect();
  try {
    const res = await client.query(text, params);
    return res.rows;
  } finally {
    client.release();
  }
}

// Alias query por defecto hacia DWH
export const query = queryDwh;