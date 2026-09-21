/// <reference types="node" />

import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DB_FILE_NAME) {
  throw new Error('DB_FILE_NAME is not defined');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'sqlite',

  dbCredentials: {
    url: process.env.DB_FILE_NAME,
  },
});