
// Hardcode for debugging
process.env.DATABASE_URL = "postgresql://dev:dev@localhost:5432/wrapping_train";

import { db } from "@/db";
import { templates } from "@/db/schema";
import { desc } from "drizzle-orm";

async function main() {
    console.log("Verifying templates...");
    const result = await db.select().from(templates).orderBy(desc(templates.id)).limit(10);
    console.table(result.map(t => ({ id: t.id, title: t.title, category: t.category, url: t.videoUrl })));
    process.exit(0);
}

main().catch(err => {
    console.error("Verification failed:", err);
    process.exit(1);
});
