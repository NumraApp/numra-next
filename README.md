# @numra/next

**Numra phone checks, outcome reporting and verified webhooks as one Next.js App Router file.**

[![npm version](https://img.shields.io/npm/v/@numra/next)](https://www.npmjs.com/package/@numra/next) [![npm downloads](https://img.shields.io/npm/dm/@numra/next)](https://www.npmjs.com/package/@numra/next) [![licence: MIT](https://img.shields.io/npm/l/@numra/next)](LICENSE)

The backend endpoint that `@numra/react` calls, as one App Router file. Holds
your Numra API key so the browser never does.

```bash
npm install @numra/next
```

## One file

```js
// app/api/numra/[...numra]/route.js
import { createNumraRoute } from '@numra/next';

export const runtime = 'nodejs';

export const { POST } = createNumraRoute({
  apiKey: process.env.NUMRA_API_KEY,
  authorize: async () => Boolean(await getSession()),   // required
  webhookSecret: process.env.NUMRA_WEBHOOK_SECRET,      // optional
  onEvent: (event) => queue.add(event),
});
```

Then on the page:

```jsx
'use client';
import { useNumraCheck, RiskBadge } from '@numra/react';

const { data, isLoading } = useNumraCheck(phone);
<RiskBadge check={data} loading={isLoading} />
```

## Why a catch-all

The browser package calls `${endpoint}/check`, `/outcome` and `/webhook`. A
catch-all keeps all three on one mount point, so the `endpoint` prop is a
single string that matches the folder you created. Three separate route files
would be three places to keep in step.

The segment name is yours — `[...numra]`, `[...slug]`, anything. The route
reads the action from `params` rather than parsing the URL, so it works at any
depth.

## Node runtime, not edge

Signature verification uses `node:crypto`. If your project defaults to the
edge runtime, keep the `export const runtime = 'nodejs'` line above.

## `authorize` is required, and defaults to deny

This route spends your Numra quota, and every lookup is billable. Without an
`authorize` function it is an open relay pointed at your own bill, so the
default **denies every request** and logs what to write.

Return `true` to allow. If your check throws, the request is denied — failing
closed, so a database blip cannot become an open door.

Keep the key in `.env.local` and out of version control. A key committed once
is in the history of every clone of that repository, and rotating it is the
only fix. Never name it `NEXT_PUBLIC_*` — that prefix is what puts a value in
the browser bundle.

## Rate-limit it too

`authorize` decides who may spend your quota, not how much. On a public
checkout those are different questions — the guard is a session, and any
visitor gets one by loading the page — so one session in a loop is a bill.

Next has no built-in limiter and a route handler may be serverless, so the
counter has to live somewhere shared. Either put the limit at the edge, in
`middleware.js` matched to `/api/numra/:path*`, or count in the store you
already run:

```js
// middleware.js
export const config = { matcher: '/api/numra/(check|outcome)' };
```

Match `check` and `outcome` only. Numra retries a non-2xx, so a 429 on
`/webhook` comes straight back as a redelivery.

## Webhooks

Nothing to wire. A `Request` is a stream you choose how to read, so the
webhook branch calls `request.text()` and gets exactly the bytes Numra signed.
There is no global parser to defeat.

One caveat Next cannot avoid: a plain route handler has no "respond, then keep
working" primitive, so your `onEvent` is awaited before the 200 is sent. Keep
it fast or hand the event to a queue — Numra retries on a non-2xx, and a
handler slow enough to time out becomes a duplicate delivery.

**De-duplicate on `event.id` inside `onEvent`.** A retry reuses the id, and a
replay captured inside the 300-second signature window verifies perfectly — so
you will be called twice for one event, and a handler that cancels an order or
sends an SMS will do it twice.

The webhook action is deliberately outside `authorize`. Its signature is its
authentication, it spends no quota, and Numra has no session to satisfy a
session check with.

## What reaches the browser

A subset: verdict, risk level and score, trust, confidence, `isRated`,
blacklist flag, customer style. Not `raw`, not engine internals, nothing that
names another merchant.

Upstream failures are translated rather than relayed. A rejected credential
becomes `502 UPSTREAM_UNAVAILABLE`, never a 401 — the merchant's credential
problem is not the visitor's business, and a 401 in the browser reads as
"you are logged out".

## Endpoints

| Method | Path | Body |
|---|---|---|
| POST | `/api/numra/check` | `{ phone }` |
| POST | `/api/numra/outcome` | `{ phone, orderId, outcomeType, … }` |
| POST | `/api/numra/webhook` | raw, signed by Numra |

## Release notes

Every release is tagged and written up on the
[Releases page](https://github.com/NumraApp/numra-next/releases). The same
history in one file is in [CHANGELOG.md](CHANGELOG.md).

## Contributing

Bug reports and patches are welcome. [CONTRIBUTING.md](CONTRIBUTING.md) covers
running the tests, the regression test a change is expected to bring with it,
and which repository a given fix actually belongs in.

## Security

Vulnerabilities go privately to the address in [SECURITY.md](SECURITY.md).
**Do not open a public issue for a security problem** — this route holds a
credential that reads a shared fraud ledger, and a public report is a working
exploit for every merchant using it until a fix ships.

## The rest of the family

Twelve packages, one contract. The server side holds the API key; the browser
side calls the endpoint the server side mounts.

Server:

| Package | Repository |
|---|---|
| `@numra/core` | [numra-js-core](https://github.com/NumraApp/numra-js-core) |
| `@numra/express` | [numra-express](https://github.com/NumraApp/numra-express) |
| `@numra/fastify` | [numra-fastify](https://github.com/NumraApp/numra-fastify) |
| `@numra/next` | [numra-next](https://github.com/NumraApp/numra-next) — this repo |
| `@numra/nuxt` | [numra-nuxt](https://github.com/NumraApp/numra-nuxt) |
| `numra/numra-php` | [numra-php](https://github.com/NumraApp/numra-php) |
| `numra/laravel` | [numra-laravel](https://github.com/NumraApp/numra-laravel) |

Browser:

| Package | Repository |
|---|---|
| `@numra/browser` | [numra-browser](https://github.com/NumraApp/numra-browser) |
| `@numra/react` | [numra-react](https://github.com/NumraApp/numra-react) |
| `@numra/vue` | [numra-vue](https://github.com/NumraApp/numra-vue) |
| `@numra/svelte` | [numra-svelte](https://github.com/NumraApp/numra-svelte) |
| `@numra/angular` | [numra-angular](https://github.com/NumraApp/numra-angular) |

Documentation for all of them is at [numra.ma/docs](https://numra.ma/docs).

## Licence

MIT
