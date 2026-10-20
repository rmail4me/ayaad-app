// One-shot: `pnpm db:migrate` applies drizzle/*.sql files to the database.
// For the initial schema we have a hand-written drizzle/0001_init.sql.
// Future changes: `pnpm db:generate` creates incremental migrations from schema.ts diffs.

import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });
import postgres from 'postgres';
import fs from 'node:fs';
import path from 'node:path';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error('DATABASE_URL not set'); process.exit(1); }

  const sql = postgres(url, { max: 1, prepare: false });

  await sql`create table if not exists __ayaad_migrations (name text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set((await sql`select name from __ayaad_migrations`).map((r: any) => r.name));

  const dir = path.resolve('drizzle');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  for (const f of files) {
    if (applied.has(f)) { console.log(`skip ${f}`); continue; }
    console.log(`apply ${f}`);
    const body = fs.readFileSync(path.join(dir, f), 'utf8');
    await sql.unsafe(body);
    await sql`insert into __ayaad_migrations (name) values (${f})`;
  }

  await sql.end();
  console.log('migrations done');
}

main().catch(e => { console.error(e); process.exit(1); });
