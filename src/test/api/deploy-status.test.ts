import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/deploy-status/route";
import { NextRequest } from "next/server";

// Mock fetch for Vercel API calls
const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

function makeReq(headers: Record<string, string> = {}) {
  return new NextRequest("https://test.local/api/admin/deploy-status", {
    headers,
  });
}

describe("GET /api/admin/deploy-status", () => {
  beforeEach(() => {
    vi.resetModules();
    fetchMock.mockReset();
  });

  it("returns 401 without auth", async () => {
    process.env.CRON_SECRET = "test-secret";
    const req = makeReq();
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("returns 503 when CRON_SECRET not configured", async () => {
    delete process.env.CRON_SECRET;
    const req = makeReq({ Authorization: "Bearer test-secret" });
    const res = await GET(req);
    expect(res.status).toBe(503);
  });

  it("returns running deployment info from env vars", async () => {
    process.env.CRON_SECRET = "test-secret";
    process.env.VERCEL_GIT_COMMIT_SHA = "abc1234";
    process.env.VERCEL_GIT_COMMIT_MESSAGE = "feat: test deploy";
    process.env.VERCEL_GIT_COMMIT_AUTHOR_NAME = "testuser";
    process.env.NEXT_PUBLIC_VERCEL_ENV = "production";
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_test123";
    // No VERCEL_TOKEN → latestProduction null
    delete process.env.VERCEL_TOKEN;

    const req = makeReq({ Authorization: "Bearer test-secret" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.running.sha).toBe("abc1234");
    expect(body.running.message).toBe("feat: test deploy");
    expect(body.running.author).toBe("testuser");
    expect(body.running.env).toBe("production");
    expect(body.running.deploymentId).toBe("dpl_test123");
    expect(body.latestProduction).toBeNull();
    expect(body.isLive).toBe(false);
  });

  it("returns isLive=true when running SHA matches latest production", async () => {
    process.env.CRON_SECRET = "test-secret";
    process.env.VERCEL_GIT_COMMIT_SHA = "abc1234";
    process.env.VERCEL_TOKEN = "vercel-token";
    process.env.VERCEL_PROJECT_ID = "prj_test";

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          deployments: [
            {
              uid: "dpl_latest",
              state: "READY",
              target: "production",
              meta: {
                githubCommitSha: "abc1234",
                githubCommitMessage: "feat: test deploy",
              },
              createdat: Date.now() - 60000,
              ready: Date.now() - 30000,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const req = makeReq({ Authorization: "Bearer test-secret" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.isLive).toBe(true);
    expect(body.latestProduction?.state).toBe("READY");
    expect(body.latestProduction?.sha).toBe("abc1234");
    expect(body.edgeLagMs).toBeGreaterThan(0);
  });

  it("returns isLive=false when SHAs differ (stale edge)", async () => {
    process.env.CRON_SECRET = "test-secret";
    process.env.VERCEL_GIT_COMMIT_SHA = "new7890";
    process.env.VERCEL_TOKEN = "vercel-token";
    process.env.VERCEL_PROJECT_ID = "prj_test";

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          deployments: [
            {
              uid: "dpl_latest",
              state: "READY",
              target: "production",
              meta: {
                githubCommitSha: "abc1234",
                githubCommitMessage: "feat: old deploy",
              },
              createdat: Date.now() - 60000,
              ready: Date.now() - 30000,
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const req = makeReq({ Authorization: "Bearer test-secret" });
    const res = await GET(req);
    const body = await res.json();
    expect(body.isLive).toBe(false);
    expect(body.running.sha).toBe("new7890");
    expect(body.latestProduction?.sha).toBe("abc1234");
  });

  it("handles Vercel API failure gracefully", async () => {
    process.env.CRON_SECRET = "test-secret";
    process.env.VERCEL_GIT_COMMIT_SHA = "abc1234";
    process.env.VERCEL_TOKEN = "vercel-token";
    process.env.VERCEL_PROJECT_ID = "prj_test";

    fetchMock.mockRejectedValueOnce(new Error("Network error"));

    const req = makeReq({ Authorization: "Bearer test-secret" });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.running.sha).toBe("abc1234");
    expect(body.latestProduction).toBeNull();
    expect(body.isLive).toBe(false);
  });
});
