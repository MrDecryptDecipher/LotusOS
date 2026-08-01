import { getDb } from "../db";

const db = getDb();
const email = process.env.SEED_EMAIL ?? "test@lotus-os.local";
const name = process.env.SEED_NAME ?? "Lotus Test User";

const [user] = await db`
  INSERT INTO users (email, name)
  VALUES (${email}, ${name})
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
  RETURNING id, email, name
`;

console.log("Seeded user:", user);
await db.end();
