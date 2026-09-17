# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

A one-page static site (Vite + vanilla JS) that shows a personal letter, gated behind a password. Deployed for free to GitHub Pages via GitHub Actions. Since the repo is public, the "password protection" is real client-side encryption (AES-GCM, key derived via PBKDF2 from the password using the Web Crypto API) — not just a UI gate. Only ciphertext is ever committed; the plaintext letter and the password never touch git or GitHub Actions.

## Commands

```bash
npm install
npm run encrypt   # reads content/letter.local.md + a password (interactive prompt or $ENCRYPT_PASSWORD) -> writes src/letter.enc.json
npm run dev        # local dev server
npm run build       # production build to dist/
npm run preview     # serve the production build locally
```

There is no test suite or linter in this project (intentionally — single-page personal project).

## Architecture

- `content/letter.local.md` — plaintext letter, written in Markdown (headings, bold/italic, lists, blockquotes, hr, links). Gitignored, local-only. This is the only file a user needs to edit to change the letter content.
- `scripts/encrypt.mjs` — run manually (never in CI). Derives an AES-256-GCM key from a password via PBKDF2 (250,000 iterations, SHA-256) using Node's `crypto.webcrypto` (same Web Crypto API as browsers, so encrypt and decrypt sides can't drift), encrypts `content/letter.local.md`, and writes `src/letter.enc.json`.
- `src/letter.enc.json` — the only letter-related file that gets committed: `{ v, kdf, hash, iterations, salt, iv, ciphertext }`, all base64 except the integers. Safe to make public since it's useless without the password.
- `src/crypto.js` — browser-side counterpart: `decryptLetter(artifact, password)` re-derives the same key from the params stored in the artifact and calls `crypto.subtle.decrypt`. A wrong password fails the AES-GCM auth tag check and the promise rejects — this is the only wrong-password signal, and `src/main.js` shows one generic error message regardless of failure reason (no information leakage).
- `src/main.js` / `index.html` — password form -> `decryptLetter` -> on success, the decrypted Markdown source is parsed with `marked.parse()` and injected via `innerHTML` into `#letter-content` (styled in `src/style.css`), then the form is hidden; on failure show the generic error. No HTML sanitizer (e.g. DOMPurify) is used on the parsed output — this is deliberate, not an oversight: the letter is authored solely by the site owner before encryption and never incorporates external/untrusted input, so the only theoretical risk is self-XSS, which isn't a real attack surface here. Don't "fix" this by adding a sanitizer unless the content authoring model changes to accept input from anyone else.
- Letter screen has a "← 뒤로가기" back button (`#letter-back`, wired to `goBackToGate()` in `main.js`). It fades the letter out, clears `#letter-content`, and fully resets the gate (`resetGate()`: closes the password form, clears the password input, hides the error) — i.e. going back always lands on a clean password-entry screen, never a stale one.
- `src/assets/` holds bundled images, following two import conventions depending on use: `?raw` SVG imports for inline logos (see `src/testimonials.js`), and plain imports for raster photos that get set as an `<img>` `src` via JS (see the hero photo below). Do not reference files under `src/assets/` directly as string paths in `index.html` — always import them in JS so Vite fingerprints/bundles them.
- Hero headline has a clickable profile photo (`#hero-photo-btn` / `#hero-photo-img`, currently `src/assets/user-2.png`) inline with the "(사진) 에게 보낼" text. Hover shows a "kgh @ cutie" tooltip (`.hero-photo-tooltip`); click opens an ID-card-style modal (`#id-card-overlay` in `index.html`, `openIdCard`/`closeIdCard` in `main.js`) with a larger photo and the same name/role label. Modal closes via the ✕ button, clicking the backdrop, or Escape. Photo/tooltip sizing is in `em` units off the headline font-size, so resizing the headline (`.hero-headline`) proportionally resizes the photo too.
- `.github/workflows/deploy.yml` — builds with Vite and deploys `dist/` to GitHub Pages via `actions/upload-pages-artifact` + `actions/deploy-pages`. Only ever touches the already-committed ciphertext; has no access to the plaintext or password. Repo Settings → Pages → Source must be set to "GitHub Actions" (one-time manual step, not automatable from the workflow itself).
- `vite.config.js` sets `base: '/farewell-letter/'` to match the GitHub Pages project-site URL path — must be kept in sync with the actual repo name.

## Security model

Because the repo must be public for free GitHub Pages, treat everything committed (salt, iv, iteration count, ciphertext) as attacker-visible. There is no way to rate-limit password guesses on a static site, so the passphrase's entropy is the only real defense — encourage long passphrases over short passwords when this comes up. Never add a code path that lets the plaintext letter or the encryption password reach a committed file or a GitHub Actions log.
