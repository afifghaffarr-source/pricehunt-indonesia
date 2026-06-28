/**
 * Unit tests for src/lib/vexo/errors.ts — Vexo error class hierarchy.
 */
import { describe, it, expect } from "vitest";
import {
  VexoAPIError,
  VexoTimeoutError,
  VexoRateLimitError,
  VexoConfigError,
} from "@/lib/vexo/errors";

describe("VexoAPIError", () => {
  it("stores code, message, statusCode, retryable", () => {
    const err = new VexoAPIError({
      code: "TEST",
      message: "test message",
      statusCode: 418,
      retryable: true,
    });
    expect(err.code).toBe("TEST");
    expect(err.message).toBe("test message");
    expect(err.statusCode).toBe(418);
    expect(err.retryable).toBe(true);
    expect(err.name).toBe("VexoAPIError");
  });

  it("defaults statusCode to 500 when not provided", () => {
    const err = new VexoAPIError({ code: "X", message: "m" });
    expect(err.statusCode).toBe(500);
  });

  it("defaults retryable to false when not provided", () => {
    const err = new VexoAPIError({ code: "X", message: "m" });
    expect(err.retryable).toBe(false);
  });

  it("is a proper Error subclass (stack, throwable, catchable)", () => {
    const err = new VexoAPIError({ code: "X", message: "m" });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(VexoAPIError);
    expect(typeof err.stack).toBe("string");
    expect(() => {
      throw err;
    }).toThrow(VexoAPIError);
  });

  it("toJSON excludes internal statusCode (clients shouldn't branch on it)", () => {
    const err = new VexoAPIError({
      code: "TEST",
      message: "m",
      statusCode: 503,
      retryable: true,
    });
    expect(err.toJSON()).toEqual({
      code: "TEST",
      message: "m",
      retryable: true,
    });
  });
});

describe("VexoTimeoutError", () => {
  it("uses VEXO_TIMEOUT code, 504 status, retryable=true", () => {
    const err = new VexoTimeoutError(15_000);
    expect(err.code).toBe("VEXO_TIMEOUT");
    expect(err.statusCode).toBe(504);
    expect(err.retryable).toBe(true);
    expect(err.message).toContain("15000ms");
    expect(err.name).toBe("VexoTimeoutError");
  });

  it("is catchable as VexoAPIError", () => {
    const err = new VexoTimeoutError(1000);
    expect(err).toBeInstanceOf(VexoAPIError);
    try {
      throw err;
    } catch (e) {
      expect(e).toBeInstanceOf(VexoAPIError);
    }
  });
});

describe("VexoRateLimitError", () => {
  it("uses VEXO_RATE_LIMIT code, 429 status, retryable=true", () => {
    const err = new VexoRateLimitError();
    expect(err.code).toBe("VEXO_RATE_LIMIT");
    expect(err.statusCode).toBe(429);
    expect(err.retryable).toBe(true);
    expect(err.message).toContain("rate limit");
    expect(err.name).toBe("VexoRateLimitError");
  });
});

describe("VexoConfigError", () => {
  it("uses VEXO_CONFIG_ERROR code, 500 status, retryable=false", () => {
    const err = new VexoConfigError("VEXO_API_KEY");
    expect(err.code).toBe("VEXO_CONFIG_ERROR");
    expect(err.statusCode).toBe(500);
    expect(err.retryable).toBe(false);
    expect(err.message).toContain("VEXO_API_KEY");
    expect(err.name).toBe("VexoConfigError");
  });
});