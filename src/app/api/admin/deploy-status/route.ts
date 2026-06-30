import { NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/api-auth";

/**
 * GET /api/admin/deploy-status
 *
 * Returns the build-time commit SHA baked into THIS running deployment
 * plus the latest production deployment from the Vercel API. By
 * comparing the two SHAs you can tell whether the edge is serving the
 * build you expect or a stale one.
 *
 * Auth: CRON_SECRET (same as cron endpoints — it's a lightweight
 * server-side secret, no user session needed).
 *
 * Response shape:
 *   {
 *     running: {
 *       sha:        string | null,   // VERCEL_GIT_COMMIT_SHA (build-time)
 *       message:    string | null,   // VERCEL_GIT_COMMIT_MESSAGE
 *       author:     string | null,   // VERCEL_GIT_COMMIT_AUTHOR_NAME
 *       env:        string | null,   // NEXT_PUBLIC_VERCEL_ENV
 *       deploymentId: string | null, // VERCEL_DEPLOYMENT_ID
 *       buildTime:  string | null,   // BUILD_TIMESTAMP or similar
 *     },
 *     latestProduction: {             // from Vercel API (if token configured)
 *       uid:        string,
 *       state:      string,           // READY | BUILDING | ERROR | etc.
 *       sha:        string | null,
 *       message:    string | null,
 *       created:    string,           // ISO timestamp
 *       ready:      string | null,    // ISO timestamp or null
 *     } | null,
 *     isLive: boolean,                // running.sha === latestProduction.sha
 *     edgeLagMs: number | null,       // ready timestamp - created timestamp
 *   }
 *
 * No external dependencies. Reads env vars + one Vercel API call.
 */

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request);
  if (authError) return authError;

  const running = {
    sha:          process.env.VERCEL_GIT_COMMIT_SHA          ?? null,
    message:      process.env.VERCEL_GIT_COMMIT_MESSAGE      ?? null,
    // ponytail: Vercel truncates commit messages to 72 chars
    author:       process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME  ?? null,
    env:          process.env.NEXT_PUBLIC_VERCEL_ENV        ?? null,
    deploymentId: process.env.VERCEL_DEPLOYMENT_ID           ?? null,
    url:          process.env.VERCEL_URL                    ?? null,
    buildTime:    process.env.BUILD_TIMESTAMP               ?? new Date().toISOString(),
  };

  // Fetch latest production deployment from Vercel API.
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  let latestProduction: {
    uid: string;
    state: string;
    sha: string | null;
    message: string | null;
    created: string;
    ready: string | null;
  } | null = null;

  if (token && projectId) {
    try {
      const url = `https://api.vercel.com/v6/deployments?projectId=${projectId}&limit=5&target=production`;
      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        // Vercel API can be slow; cap at 5s
        signal: AbortSignal.timeout(5000),
      });
      if (resp.ok) {
        const data = await resp.json() as {
          deployments: Array<{
            uid: string;
            state: string;
            target: string | string[];
            meta?: {
              githubCommitSha?: string;
              githubCommitMessage?: string;
            };
            createdat?: number;
            ready?: number | null;
          }>;
        };
        const prod = data.deployments?.[0];
        if (prod) {
          latestProduction = {
            uid:      prod.uid,
            state:    prod.state,
            sha:      prod.meta?.githubCommitSha ?? null,
            message:  prod.meta?.githubCommitMessage ?? null,
            created:  prod.createdat ? new Date(prod.createdat).toISOString() : new Date().toISOString(),
            ready:    prod.ready ? new Date(prod.ready).toISOString() : null,
          };
        }
      }
    } catch {
      // Non-fatal — the running deployment info is still useful
    }
  }

  const isLive = !!(running.sha && latestProduction?.sha && running.sha === latestProduction.sha);

  let edgeLagMs: number | null = null;
  if (latestProduction?.created && latestProduction?.ready) {
    edgeLagMs = new Date(latestProduction.ready).getTime() - new Date(latestProduction.created).getTime();
  }

  return NextResponse.json({
    running,
    latestProduction,
    isLive,
    edgeLagMs,
    timestamp: new Date().toISOString(),
  });
}
