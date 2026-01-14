import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";

/**
 * Health check endpoint
 *
 * Used by Railway/load balancers to verify the application is healthy
 */
export async function GET() {
  try {
    // Check database connectivity
    await db.execute(sql`SELECT 1`);

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok",
      },
    });
  } catch (error) {
    console.error("[Health] Database check failed:", error);

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        checks: {
          database: "failed",
        },
      },
      { status: 503 }
    );
  }
}
