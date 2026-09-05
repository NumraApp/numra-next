import { Numra, createHandlers } from '@getnumra/core';

/* ═══════════════════════════════════════════════════════════════════════════
   @getnumra/next — route handlers for the App Router
   ───────────────────────────────────────────────────────────────────────────
   One file in your app:

       // app/api/numra/[...numra]/route.js
       import { createNumraRoute } from '@getnumra/next';

       export const { POST } = createNumraRoute({
         apiKey: process.env.NUMRA_API_KEY,
         authorize: async () => Boolean(await getSession()),
       });

   ── Why a catch-all rather than three files ───────────────────────────────
   The browser package calls `${endpoint}/check`, `/outcome` and `/webhook`.
   A catch-all keeps those three on one mount point, so the `endpoint` prop in
   @getnumra/react is a single string that matches what you wrote in the file
   path — three separate route files would be three places to keep in step.

   ── Why `next` is an OPTIONAL peer ────────────────────────────────────────
   Unlike @getnumra/express and @getnumra/fastify, nothing in this file imports the
   framework. A Next route handler receives a Web-standard Request and returns
   a Web-standard Response, so this package needs the App Router's file
   convention and nothing from the `next` package itself.

   Declared as a peer anyway, because it tells you what this adapter is for
   and warns on a version you actually have. Marked optional because npm
   installs root peers: as a hard peer it dragged the entire Next tree —
   around fifty entries including per-platform sharp binaries — into a
   lockfile for a package whose tests never boot Next.

   ── The raw body, Next's way ──────────────────────────────────────────────
   Easier here than anywhere else: a Request is a stream you choose how to
   read, so the webhook branch calls `req.text()` and gets exactly the bytes.
   There is no global parser to defeat. The `runtime` note below matters more.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @param {object} options
 * @param {string} [options.apiKey]
 * @param {(req: Request) => boolean|Promise<boolean>} [options.authorize]
 * @param {string} [options.webhookSecret]
 * @param {(event: object, req: Request) => void|Promise<void>} [options.onEvent]
 * @param {object} [options.client]
 * @param {string} [options.baseUrl]
 */
export function createNumraRoute(options = {}) {
  const { apiKey, authorize, webhookSecret, onEvent, client, baseUrl } = options;

  const numra = client ?? new Numra({ apiKey, baseUrl, integration: 'next' });
  const handlers = createHandlers({
    client: numra, authorize, webhookSecret,
    usage: "createNumraRoute({ apiKey, authorize: async () => Boolean(await getSession()) })",
  });

  const json = (out) =>
    new Response(JSON.stringify(out.body), {
      status: out.status,
      headers: { 'Content-Type': 'application/json' },
    });

  async function POST(request, ctx) {
    /* The catch-all segment, whatever it was named. Reading it from params
       rather than parsing the URL means the route works at any mount point. */
    const params = await ctx?.params;
    const segments = params ? Object.values(params).flat() : [];
    const action = String(segments[segments.length - 1] ?? '');

    if (action === 'webhook') {
      /* Exact bytes. Do not JSON.parse and re-stringify — that changes them
         and every signature fails. */
      const raw = await request.text();
      const headers = Object.fromEntries(request.headers.entries());
      const out = handlers.webhook(raw, headers);

      if (out.event) {
        /* Next has no "respond then continue" primitive in a plain route, so
           the handler is awaited. Keep it fast, or hand the event to a queue
           — Numra retries on a non-2xx and a slow handler risks a timeout
           becoming a duplicate delivery. */
        try {
          await onEvent?.(out.event, request);
        } catch (e) {
          console.error('[numra] onEvent threw:', e?.message);
        }
      }
      return json(out);
    }

    let body = null;
    try {
      body = await request.json();
    } catch {
      return json({ status: 400, body: { error: 'INVALID_PAYLOAD', message: 'Body must be JSON.' } });
    }

    if (action === 'check') return json(await handlers.check(body, request));
    if (action === 'outcome') return json(await handlers.outcome(body, request));

    return json({ status: 404, body: { error: 'NOT_FOUND' } });
  }

  return { POST };
}

export { Numra, NumraError } from '@getnumra/core';
