import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

/**
 * Database health check endpoint
 * Tests Supabase connection and response time
 */
export async function GET() {
  const startTime = Date.now()

  try {
    const supabase = await createClient()

    // Simple query to test DB connectivity
    const { error } = await supabase
      .from("products")
      .select("id")
      .limit(1)
      .single()

    const responseTime = Date.now() - startTime

    if (error && error.code !== "PGRST116") {
      // PGRST116 = no rows returned (which is OK, means DB is accessible)
      return NextResponse.json(
        {
          status: "unhealthy",
          database: "error",
          error: error.message,
          responseTime,
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      {
        status: "healthy",
        database: "connected",
        responseTime,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  } catch (error) {
    const responseTime = Date.now() - startTime

    return NextResponse.json(
      {
        status: "unhealthy",
        database: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

export const dynamic = "force-dynamic"
