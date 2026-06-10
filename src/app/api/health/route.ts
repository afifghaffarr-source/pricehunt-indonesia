import { NextResponse } from "next/server"

/**
 * Basic health check endpoint
 * Returns 200 if application is running
 */
export async function GET() {
  const healthCheck = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  }

  return NextResponse.json(healthCheck, { status: 200 })
}

export const dynamic = "force-dynamic"
