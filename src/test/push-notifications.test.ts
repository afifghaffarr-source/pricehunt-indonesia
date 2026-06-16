/**
 * v1.5.5 — push-notifications: clean up expired subscriptions.
 *
 * When web-push returns 404 (subscription gone) or 410 (subscription expired),
 * the user profile's `push_subscription` JSONB field should be cleared so we
 * don't keep retrying a dead subscription on every notification.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mocks = vi.hoisted(() => ({
  webpushSend: vi.fn(),
  createAdminClient: vi.fn(),
}));

// Mock the web-push library (dynamic-imported inside the route)
vi.mock("web-push", () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: (...args: unknown[]) => mocks.webpushSend(...args),
  },
  setVapidDetails: vi.fn(),
  sendNotification: (...args: unknown[]) => mocks.webpushSend(...args),
}));

// Mock the Supabase admin client so we can swap in our test fixtures.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mocks.createAdminClient,
}));

const ORIGINAL_VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const ORIGINAL_VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

beforeEach(() => {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-vapid-public";
  process.env.VAPID_PRIVATE_KEY = "test-vapid-private";
  mocks.webpushSend.mockReset();
  mocks.createAdminClient.mockReset();
});

afterEach(() => {
  if (ORIGINAL_VAPID_PUBLIC === undefined) delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  else process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = ORIGINAL_VAPID_PUBLIC;
  if (ORIGINAL_VAPID_PRIVATE === undefined) delete process.env.VAPID_PRIVATE_KEY;
  else process.env.VAPID_PRIVATE_KEY = ORIGINAL_VAPID_PRIVATE;
});

async function callSendPushNotification(userId: string) {
  const { sendPushNotificationToUser } = await import("@/lib/push-notifications");
  return sendPushNotificationToUser(userId, {
    title: "Test",
    body: "Hello",
    url: "/",
  });
}

describe("push-notifications — expired subscription cleanup", () => {
  it("cleans up push_subscription from user_profiles on web-push 404", async () => {
    const updateCalls: Array<{ table: string; payload: unknown }> = [];

    const supabaseMock = {
      from: (table: string) => {
        if (table !== "user_profiles") return {};
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "user-1",
                    preferences: {
                      push_enabled: true,
                      push_subscription: { endpoint: "https://push.example/abc" },
                    },
                  },
                  error: null,
                }),
            }),
          }),
          update: (payload: unknown) => {
            updateCalls.push({ table, payload });
            return {
              eq: () => Promise.resolve({ error: null }),
            };
          },
        };
      },
    };
    mocks.createAdminClient.mockReturnValue(supabaseMock);
    // Simulate web-push 404: subscription gone
    mocks.webpushSend.mockRejectedValue({ statusCode: 404, message: "Not Found" });

    const result = await callSendPushNotification("user-1");

    expect(result).toBe(false);
    expect(updateCalls).toHaveLength(1);
    const update = updateCalls[0].payload as { preferences: Record<string, unknown> };
    expect(update.preferences.push_subscription).toBeNull();
    expect(update.preferences.push_enabled).toBe(false);
  });

  it("cleans up push_subscription on web-push 410 (Gone)", async () => {
    const updateCalls: Array<{ payload: unknown }> = [];

    const supabaseMock = {
      from: (table: string) => {
        if (table !== "user_profiles") return {};
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "user-2",
                    preferences: {
                      push_enabled: true,
                      push_subscription: { endpoint: "https://push.example/xyz" },
                    },
                  },
                  error: null,
                }),
            }),
          }),
          update: (payload: unknown) => {
            updateCalls.push({ payload });
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      },
    };
    mocks.createAdminClient.mockReturnValue(supabaseMock);
    mocks.webpushSend.mockRejectedValue({ statusCode: 410, message: "Gone" });

    const result = await callSendPushNotification("user-2");

    expect(result).toBe(false);
    expect(updateCalls).toHaveLength(1);
    const update = updateCalls[0].payload as { preferences: Record<string, unknown> };
    expect(update.preferences.push_subscription).toBeNull();
    expect(update.preferences.push_enabled).toBe(false);
  });

  it("does NOT clean up on transient web-push errors (500, network)", async () => {
    const updateCalls: unknown[] = [];

    const supabaseMock = {
      from: (table: string) => {
        if (table !== "user_profiles") return {};
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "user-3",
                    preferences: {
                      push_enabled: true,
                      push_subscription: { endpoint: "https://push.example/def" },
                    },
                  },
                  error: null,
                }),
            }),
          }),
          update: (payload: unknown) => {
            updateCalls.push(payload);
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      },
    };
    mocks.createAdminClient.mockReturnValue(supabaseMock);
    // 500 is NOT a 404/410 — should NOT clean up (transient)
    mocks.webpushSend.mockRejectedValue({ statusCode: 500, message: "Internal Server Error" });

    const result = await callSendPushNotification("user-3");

    expect(result).toBe(false);
    expect(updateCalls).toHaveLength(0); // no cleanup
  });

  it("preserves other preferences when cleaning up push_subscription", async () => {
    let capturedPayload: unknown = null;

    const supabaseMock = {
      from: (table: string) => {
        if (table !== "user_profiles") return {};
        return {
          select: () => ({
            eq: () => ({
              single: () =>
                Promise.resolve({
                  data: {
                    id: "user-4",
                    preferences: {
                      push_enabled: true,
                      push_subscription: { endpoint: "https://push.example/ghi" },
                      theme: "dark",
                      language: "id",
                      price_alerts: ["tokopedia", "shopee"],
                    },
                  },
                  error: null,
                }),
            }),
          }),
          update: (payload: unknown) => {
            capturedPayload = payload;
            return { eq: () => Promise.resolve({ error: null }) };
          },
        };
      },
    };
    mocks.createAdminClient.mockReturnValue(supabaseMock);
    mocks.webpushSend.mockRejectedValue({ statusCode: 404 });

    await callSendPushNotification("user-4");

    const update = capturedPayload as { preferences: Record<string, unknown> };
    expect(update.preferences.theme).toBe("dark");
    expect(update.preferences.language).toBe("id");
    expect(update.preferences.price_alerts).toEqual(["tokopedia", "shopee"]);
    expect(update.preferences.push_subscription).toBeNull();
    expect(update.preferences.push_enabled).toBe(false);
  });
});
