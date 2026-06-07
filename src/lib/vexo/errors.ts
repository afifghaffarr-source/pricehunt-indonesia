export class VexoAPIError extends Error {
  code: string;
  retryable: boolean;
  statusCode: number;

  constructor(params: { code: string; message: string; statusCode?: number; retryable?: boolean }) {
    super(params.message);
    this.name = "VexoAPIError";
    this.code = params.code;
    this.statusCode = params.statusCode || 500;
    this.retryable = params.retryable ?? false;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      retryable: this.retryable,
    };
  }
}

export class VexoTimeoutError extends VexoAPIError {
  constructor(timeoutMs: number) {
    super({
      code: "VEXO_TIMEOUT",
      message: `VexoAPI request timed out after ${timeoutMs}ms`,
      statusCode: 504,
      retryable: true,
    });
    this.name = "VexoTimeoutError";
  }
}

export class VexoRateLimitError extends VexoAPIError {
  constructor() {
    super({
      code: "VEXO_RATE_LIMIT",
      message: "VexoAPI rate limit exceeded",
      statusCode: 429,
      retryable: true,
    });
    this.name = "VexoRateLimitError";
  }
}

export class VexoConfigError extends VexoAPIError {
  constructor(missingVar: string) {
    super({
      code: "VEXO_CONFIG_ERROR",
      message: `Missing required environment variable: ${missingVar}`,
      statusCode: 500,
      retryable: false,
    });
    this.name = "VexoConfigError";
  }
}
