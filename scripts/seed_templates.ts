// import * as dotenv from "dotenv";
// const result = dotenv.config({ path: ".env.local" });
// if (result.error) {
//     console.error("Error loading .env.local:", result.error);
// }
// console.log("DATABASE_URL:", process.env.DATABASE_URL ? "Defined" : "Undefined");
// console.log("Connection String:", process.env.DATABASE_URL);

// Hardcode for debugging
process.env.DATABASE_URL = "postgresql://dev:dev@localhost:5432/wrapping_train";

import { db } from "@/db";
import { templates, TEMPLATE_CATEGORY } from "@/db/schema";
import { eq } from "drizzle-orm";

const NEW_TEMPLATES = [
    // Backgrounds (Category 1)
    {
        title: "野田線 (Noda Line)",
        videoUrl: "/video/templates/noda1.mov",
        thumbnailUrl: "/video/templates/noda1.mov", // Using video as thumbnail for now, or use a placeholder
        category: TEMPLATE_CATEGORY.BACKGROUND,
        displayOrder: 10,
        isActive: 1,
    },
    {
        title: "YouTuber列車",
        videoUrl: "/video/templates/youtuber_train.mov",
        thumbnailUrl: "/video/templates/youtuber_train.mov",
        category: TEMPLATE_CATEGORY.BACKGROUND,
        displayOrder: 20,
        isActive: 1,
    },
    // Window (Category 2)
    {
        title: "シャイン (Shine Overlay)",
        videoUrl: "/video/templates/shine_overlay.mp4",
        thumbnailUrl: "/video/templates/shine_overlay.mp4",
        category: TEMPLATE_CATEGORY.WINDOW,
        displayOrder: 10,
        isActive: 1,
    },
    // Wheel (Category 3)
    {
        title: "ハート投票 (Heart Vote)",
        videoUrl: "/video/templates/heart_vote.mov",
        thumbnailUrl: "/video/templates/heart_vote.mov",
        category: TEMPLATE_CATEGORY.WHEEL,
        displayOrder: 10,
        isActive: 1,
    },
];

async function main() {
    console.log("Seeding templates...");

    for (const template of NEW_TEMPLATES) {
        // Check if template with same videoUrl exists to avoid duplicates
        const existing = await db
            .select()
            .from(templates)
            .where(eq(templates.videoUrl, template.videoUrl))
            .limit(1);

        if (existing.length > 0) {
            console.log(`Skipping existing template: ${template.title}`);
            continue;
        }

        await db.insert(templates).values(template);
        console.log(`Inserted template: ${template.title}`);
    }

    console.log("Seeding completed.");
    process.exit(0);
}

main().catch((err) => {
    console.error("Seeding failed:", err);
    process.exit(1);
});
