# Wazzup

Wazzup is a webmail client built with Next.js and Prisma/PostgreSQL where email
content is encrypted and signed on the client before it ever reaches the
server. The backend stores and relays ciphertext, public keys, and metadata;
it never sees plaintext message bodies or private keys.

An Electron shell (`main.js`) is included to wrap the deployed web app in a
desktop window, but it currently just points at a hosted URL and does not
bundle or spawn the Next.js server itself.

## How the encryption works

All cryptographic operations happen in the browser using `node-forge`
(`lib/crypto.ts`); the server only ever handles the resulting ciphertext.

- **Key pairs**: each user gets a 2048-bit RSA key pair generated client-side
  at registration.
- **Message confidentiality**: each email is encrypted with a random AES-256
  key using AES-GCM. That AES key is then wrapped for the recipient using
  RSA-OAEP (SHA-256) with the recipient's public key, so only the recipient's
  private key can unwrap it.
- **Integrity & authenticity**: the plaintext is hashed with SHA-256 and the
  hash is signed with the sender's private key using RSA-PSS. The signature
  and hash are stored alongside the message.
- **Private key storage**: a user's RSA private key is encrypted client-side
  with a key derived from their login password via PBKDF2 (SHA-256, 10,000
  iterations) and AES-GCM, then stored on the server as
  `encryptedPrivateKey`. The server stores only the encrypted blob, never the
  plaintext private key or the user's password (only its bcrypt hash).
- **Attachments** are encrypted the same way as message content (AES-GCM per
  file).

Session state (current user, session token, and the decrypted private key)
is kept in the browser's `sessionStorage`, not `localStorage`, so it is
cleared when the tab closes.

### Known limitations (as implemented today)

- Authentication between browser and API is a custom header-based scheme
  (`x-user-id` / `x-session-token`, see `lib/auth.ts`) rather than JWTs or a
  standard session/cookie library. The comments in the code acknowledge this
  is a simplified approach.
- The session token is only validated for presence, not verified against
  anything stored server-side — `authenticateRequest` trusts the `x-user-id`
  header as long as that user exists in the database.
- Rate limiting is an in-memory `Map` per server instance (not shared across
  processes/instances, and reset on restart).
- Registration is restricted to email addresses ending in `@crypto.agu`
  (see `app/api/auth/register/route.ts`), suggesting this project originated
  as a coursework/assignment build.
- `check-db-security.ts` is a standalone debug script that dumps users and
  emails from the database to the console to sanity-check that stored fields
  are actually hashed/encrypted rather than plaintext.

## Tech stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript
- **Styling/UI**: Tailwind CSS 4, Radix UI / `@base-ui/react`, shadcn-style
  components, Hugeicons/Lucide icons
- **Database/ORM**: PostgreSQL via Prisma 5 (`@prisma/client`)
- **Crypto**: `node-forge` (RSA, AES-GCM, PBKDF2, SHA-256, PSS)
- **Auth (password hashing)**: `bcryptjs`
- **Forms/validation**: `react-hook-form`, `zod`
- **Desktop packaging**: Electron + `electron-builder` (optional wrapper)
- **Package manager**: Bun (`bun.lock` is present)

## Project structure

```
app/
  api/
    auth/login, auth/register   # credential auth, returns encrypted private key blob
    emails/                     # send/list/delete/patch emails (POST/GET/DELETE/PATCH)
    emails/status/              # PATCH to toggle read/starred/archived
    users/lookup/                # look up a user's public key by email
    users/stats/                 # unread inbox count
  inbox/, login/, register/     # pages
components/
  auth/                         # login/register forms (key generation happens here)
  email/                        # compose, list, reading pane, mail display
  ui/                           # shadcn-based UI primitives
context/
  auth-context.tsx              # session state (sessionStorage), login/logout
  compose-context.tsx
lib/
  crypto.ts                     # all encryption/decryption/signing logic
  auth.ts                       # API-side request authentication + rate limiting
  db.ts                         # Prisma client singleton
prisma/
  schema.prisma                 # User, Email, Attachment models
main.js                         # Electron wrapper (loads a hosted URL)
check-db-security.ts            # standalone script to inspect DB contents
```

## Data model (Prisma)

- **User**: `email`, `name`, `passwordHash` (bcrypt), `publicKey` (PEM,
  plaintext), `encryptedPrivateKey` (PBKDF2+AES-GCM bundle).
- **Email**: `encryptedContent`, `encryptedAesKey` (RSA-OAEP wrapped),
  `iv`, `signature` (RSA-PSS), `messageHash` (SHA-256), plus `read`,
  `isStarred`, `isArchived` flags and indexes for inbox/sent queries.
- **Attachment**: per-file `encryptedContent` and `iv`, linked to an
  `Email` with cascade delete.

## Setup

### Prerequisites

- Node.js and [Bun](https://bun.sh) (scripts assume `bun`)
- A PostgreSQL database

### Environment variables

Create a `.env` file in the project root with:

```
DATABASE_URL=postgresql://user:password@host:port/dbname
```

This is the only environment variable read by the code (`lib/db.ts`,
via Prisma's `datasource db { url = env("DATABASE_URL") }`).

### Install and set up the database

```bash
bun install          # also runs `prisma generate` via postinstall
bunx prisma migrate dev   # create/apply the schema against DATABASE_URL
```

There is no seed script included.

## Running

### Development

```bash
bun run dev
```

Starts the Next.js dev server (default `http://localhost:3000`).

### Production

```bash
bun run build
bun run start
```

### Optional: Electron desktop wrapper

```bash
bun run electron        # launches the Electron shell
bun run electron:build  # builds the Next.js app, then packages with electron-builder (Windows/NSIS target configured)
```

Note: `main.js` currently hardcodes a deployed URL
(`https://wazzup-seven.vercel.app`) as its default target rather than
launching a local server, so the Electron build does not run the backend
itself — it needs a reachable Next.js instance (local or deployed).

## API summary

All routes are under `app/api/`:

- `POST /api/auth/register` — create a user (`name`, `email`, `password`,
  `publicKey`, `encryptedPrivateKey`); email must end in `@crypto.agu`.
- `POST /api/auth/login` — verify credentials, return user info, `publicKey`,
  and the encrypted private key bundle for client-side decryption.
- `GET /api/emails` — list inbox/sent emails for a user, paginated
  (`userId`, `type`, `isArchived`, `page`, `pageSize`), requires
  `x-user-id`/`x-session-token` headers.
- `POST /api/emails` — send an encrypted email (ciphertext, wrapped AES key,
  IV, signature, hash, optional attachments).
- `PATCH /api/emails` — update `read`/`isStarred`/`isArchived` on an owned
  email.
- `DELETE /api/emails?id=...` — delete an email you sent or received.
- `PATCH /api/emails/status` — alternate endpoint for updating email status
  flags (no auth/ownership check, unlike `PATCH /api/emails`).
- `GET /api/users/lookup?email=...` — resolve a user's public key by email
  (needed to encrypt a message to them).
- `GET /api/users/stats?userId=...` — unread inbox count for a user.

## License

See `LICENSE`.
