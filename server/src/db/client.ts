import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';

import { env } from '../config/env.js';
import * as schema from './schema.js';

const sqlite = new Database(env.databaseFile);

sqlite.pragma('foreign_keys = ON');
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('busy_timeout = 5000');

export const db = drizzle({
  client: sqlite,
  schema,
});