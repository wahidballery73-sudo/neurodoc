import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export type User = {
  id: string;
  email: string;
  password_hash: string;
  created_at: number;
};

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "users.db");
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
`);

export function findUserByEmail(email: string): User | undefined {
  const stmt = db.prepare("SELECT * FROM users WHERE LOWER(email) = LOWER(?)");
  return stmt.get(email) as User | undefined;
}

export function createUser(email: string, password: string): User {
  const existing = findUserByEmail(email);
  if (existing) {
    throw new Error("User with this email already exists.");
  }
  const id = crypto.randomUUID();
  const password_hash = bcrypt.hashSync(password, 10);
  const created_at = Date.now();

  const stmt = db.prepare(
    "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)"
  );
  stmt.run(id, email.toLowerCase(), password_hash, created_at);

  return { id, email: email.toLowerCase(), password_hash, created_at };
}

// Auto-create demo user on init
try {
  const demoEmail = "demo@neurodoc.app";
  const demoUser = findUserByEmail(demoEmail);
  if (!demoUser) {
    createUser(demoEmail, "demo1234");
    console.log("[db] Created demo user: demo@neurodoc.app / demo1234");
  }
} catch (err) {
  // Ignore if already created
}

export default db;
