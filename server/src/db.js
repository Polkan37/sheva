import Database from "better-sqlite3";

const db = new Database("./db/database.sqlite");

db.pragma("foreign_keys = ON");

export default db;