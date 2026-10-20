import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

declare global { // eslint-disable-next-line no-var
  var __AYAAD_PG__: ReturnType<typeof postgres> | undefined;
}

const sql = globalThis.__AYAAD_PG__ ?? postgres(process.env.DATABASE_URL!, {
  max: 10,
  idle_timeout: 20,
  prepare: false, // Supabase pooler compatibility
});
if (!globalThis.__AYAAD_PG__) globalThis.__AYAAD_PG__ = sql;

export const db = drizzle(sql, { schema });
export { schema };
