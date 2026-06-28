/**
 * Unit tests for src/lib/env.ts (server-only env helpers).
 *
 * Strategy: mutate `process.env` in beforeEach/afterEach to verify the
 * helpers read fresh each call (no module-level caching). Backwards-
 * compatible with the existing pattern in `api-admin-auth.test.ts` etc.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getIngestionSecret,
  getCronSecret,
  getVexoConfig,
  getVapidConfig,
  isPriceSimulationEnabled,
} from "@/lib/env";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  // Reset to a clean slate so each test sets only what it needs.
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) delete process.env[key];
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    process.env[key] = value;
  }
  delete process.env.INGESTION_SECRET;
  delete process.env.CRON_SECRET;
  delete process.env.VEXO_API_BASE_URL;
  delete process.env.VEXO_API_KEY;
  delete process.env.VEXO_API_TIMEOUT_MS;
  delete process.env.VEXO_CACHE_TTL_SECONDS;
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  delete process.env.VAPID_PRIVATE_KEY;
  delete process.env.VAPID_SUBJECT;
  delete process.env.ENABLE_PRICE_SIMULATION;
});

afterEach(() => {
  // Restore the .env.local values so subsequent test files see them.
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    process.env[key] = value;
  }
});

describe("getIngestionSecret", () => {
  it("returns the secret when INGESTION_SECRET is set", () => {
    process.env.INGESTION_SECRET = "test-secret-abc";
    expect(getIngestionSecret()).toBe("test-secret-abc");
  });

  it("returns null when INGESTION_SECRET is unset (caller decides)", () => {
    expect(getIngestionSecret()).toBeNull();
  });

  it("returns empty string when INGESTION_SECRET is empty (callers handle via `if (!secret)`)", () => {
    process.env.INGESTION_SECRET = "";
    expect(getIngestionSecret()).toBe("");
  });

  it("reads fresh on every call (no module-level caching)", () => {
    expect(getIngestionSecret()).toBeNull();
    process.env.INGESTION_SECRET = "set-after-first-call";
    expect(getIngestionSecret()).toBe("set-after-first-call");
  });
});

describe("getCronSecret", () => {
  it("returns the secret when CRON_SECRET is set", () => {
    process.env.CRON_SECRET = "cron-xyz";
    expect(getCronSecret()).toBe("cron-xyz");
  });

  it("returns null when CRON_SECRET is unset", () => {
    expect(getCronSecret()).toBeNull();
  });

  it("returns empty string for empty value (callers handle via `if (!secret)`)", () => {
    process.env.CRON_SECRET = "";
    expect(getCronSecret()).toBe("");
  });
});

describe("getVexoConfig", () => {
  it("returns defaults when no VEXO_* vars are set", () => {
    const cfg = getVexoConfig();
    expect(cfg.baseUrl).toBe("https://vexoapi.dev");
    expect(cfg.apiKey).toBe("");
    expect(cfg.timeoutMs).toBe(10_000);
    expect(cfg.cacheTtlSeconds).toBe(3600);
  });

  it("returns explicit values when all VEXO_* vars are set", () => {
    process.env.VEXO_API_BASE_URL = "https://custom.vexo.example";
    process.env.VEXO_API_KEY = "vk_test_123";
    process.env.VEXO_API_TIMEOUT_MS = "5000";
    process.env.VEXO_CACHE_TTL_SECONDS = "60";
    const cfg = getVexoConfig();
    expect(cfg.baseUrl).toBe("https://custom.vexo.example");
    expect(cfg.apiKey).toBe("vk_test_123");
    expect(cfg.timeoutMs).toBe(5000);
    expect(cfg.cacheTtlSeconds).toBe(60);
  });

  it("trims whitespace from VEXO_API_BASE_URL", () => {
    process.env.VEXO_API_BASE_URL = "  https://with-spaces.example  ";
    expect(getVexoConfig().baseUrl).toBe("https://with-spaces.example");
  });

  it("falls back to default when VEXO_API_TIMEOUT_MS is non-numeric", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.VEXO_API_TIMEOUT_MS = "not-a-number";
    expect(getVexoConfig().timeoutMs).toBe(10_000);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn.mock.calls[0][0]).toContain("VEXO_API_TIMEOUT_MS");
    warn.mockRestore();
  });

  it("falls back to default when VEXO_API_TIMEOUT_MS is zero or negative", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.VEXO_API_TIMEOUT_MS = "0";
    expect(getVexoConfig().timeoutMs).toBe(10_000);
    process.env.VEXO_API_TIMEOUT_MS = "-5";
    expect(getVexoConfig().timeoutMs).toBe(10_000);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("falls back to default when VEXO_CACHE_TTL_SECONDS is invalid", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    process.env.VEXO_CACHE_TTL_SECONDS = "garbage";
    expect(getVexoConfig().cacheTtlSeconds).toBe(3600);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("returns empty apiKey when VEXO_API_KEY is unset", () => {
    expect(getVexoConfig().apiKey).toBe("");
  });
});

describe("getVapidConfig", () => {
  it("returns the full config when both keys are set", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub-abc";
    process.env.VAPID_PRIVATE_KEY = "priv-xyz";
    process.env.VAPID_SUBJECT = "mailto:ops@example.com";
    const cfg = getVapidConfig();
    expect(cfg).toEqual({
      publicKey: "pub-abc",
      privateKey: "priv-xyz",
      subject: "mailto:ops@example.com",
    });
  });

  it("returns null when public key is missing", () => {
    process.env.VAPID_PRIVATE_KEY = "priv-xyz";
    expect(getVapidConfig()).toBeNull();
  });

  it("returns null when private key is missing", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub-abc";
    expect(getVapidConfig()).toBeNull();
  });

  it("returns null when both keys are missing", () => {
    expect(getVapidConfig()).toBeNull();
  });

  it("defaults subject to mailto:admin@bijakbeli.id when VAPID_SUBJECT is unset", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub-abc";
    process.env.VAPID_PRIVATE_KEY = "priv-xyz";
    const cfg = getVapidConfig();
    expect(cfg?.subject).toBe("mailto:admin@bijakbeli.id");
  });

  it("trims whitespace from VAPID_SUBJECT", () => {
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "pub-abc";
    process.env.VAPID_PRIVATE_KEY = "priv-xyz";
    process.env.VAPID_SUBJECT = "  mailto:admin@trimmed.example  ";
    expect(getVapidConfig()?.subject).toBe("mailto:admin@trimmed.example");
  });
});

describe("isPriceSimulationEnabled", () => {
  it("returns false when ENABLE_PRICE_SIMULATION is unset", () => {
    expect(isPriceSimulationEnabled()).toBe(false);
  });

  it('returns true only when ENABLE_PRICE_SIMULATION === "true"', () => {
    process.env.ENABLE_PRICE_SIMULATION = "true";
    expect(isPriceSimulationEnabled()).toBe(true);
  });

  it('returns false for any other value (including "TRUE", "1", "yes")', () => {
    process.env.ENABLE_PRICE_SIMULATION = "TRUE";
    expect(isPriceSimulationEnabled()).toBe(false);
    process.env.ENABLE_PRICE_SIMULATION = "1";
    expect(isPriceSimulationEnabled()).toBe(false);
    process.env.ENABLE_PRICE_SIMULATION = "yes";
    expect(isPriceSimulationEnabled()).toBe(false);
  });

  it("returns false for empty string", () => {
    process.env.ENABLE_PRICE_SIMULATION = "";
    expect(isPriceSimulationEnabled()).toBe(false);
  });
});