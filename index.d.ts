import type { Numra, NumraError } from '@getnumra/core';

export interface NumraRouteOptions {
  /** Numra credential. Server-side only. */
  apiKey?: string;
  /**
   * Runs before every lookup. Return false to reject.
   *
   * REQUIRED. The default denies everything and logs why — this route spends
   * your Numra quota, so leaving it open is an open relay pointed at your
   * own bill.
   */
  authorize?: (req: Request) => boolean | Promise<boolean>;
  /** Enables the `/webhook` segment when set. */
  webhookSecret?: string;
  onEvent?: (event: Record<string, unknown>, req: Request) => void | Promise<void>;
  /** A pre-built client, for tests. */
  client?: Numra;
  baseUrl?: string;
}

/** What the browser receives — a subset. Never `raw`, never engine internals. */
export interface BrowserCheck {
  phone: string;
  verdict: string;
  riskLevel: string;
  riskScore: number;
  trustScore: number;
  confidence: number;
  isRated: boolean;
  isBlacklisted: boolean;
  customerStyle: { code: string; label: string; icon: string; color: string; riskSensitivity: number } | null;
}

export interface NumraRouteContext {
  params?: Record<string, string | string[]> | Promise<Record<string, string | string[]>>;
}

/**
 * Handlers for an App Router catch-all:
 *
 *     // app/api/numra/[...numra]/route.js
 *     export const { POST } = createNumraRoute({ apiKey, authorize });
 *
 * Node runtime only — signature verification needs crypto. Add
 * `export const runtime = 'nodejs'` if your project defaults to edge.
 */
export declare function createNumraRoute(options?: NumraRouteOptions): {
  POST: (request: Request, ctx?: NumraRouteContext) => Promise<Response>;
};

export { Numra, NumraError } from '@getnumra/core';
