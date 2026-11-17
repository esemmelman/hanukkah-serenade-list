# Hanukkah serenade PDF

[Program website](https://esemmelman.github.io/hanukkah-serenade-list/)

This program displays current `hanukkah-signup` entries on screen and provides a downloadable PDF created directly in the browser. Google Apps Script and Google Sheets are not used.

## Use

Open the program website. If requested, enter your organizer passcode and click **Sign in and view signups**. The current list loads automatically on launch for a remembered organizer. After successful authentication, that browser stays signed in for 90 days. Keep the passcode private: anyone possessing it can read the signup contacts. Replaced access codes and previous organizer links are no longer accepted.

The screen lists names, formatted US cell numbers, emails, three date columns, accompanying guests, and totals in first-name order. **Refresh signups** fetches the latest records. **Download PDF** saves the same displayed list as a landscape US Letter PDF. Long PDFs paginate with repeated headers. One row represents a signup party. Each selected night counts the full party; the party-size total counts people once per signup. Duplicate signup submissions remain separate records. A failed refresh labels any previous on-screen list as stale and hides its PDF link until a successful refresh.

## Implementation and privacy

- `docs/` is a static GitHub Pages app. Pinned jsPDF and AutoTable distributions and licenses are served locally from `docs/vendor/`; there are no third-party scripts or analytics.
- `docs/report.mjs` validates, sorts, formats, totals, and generates PDFs. Contact fields are passed as plain PDF text, never HTML.
- `supabase/functions/serenade-export-data/index.ts` is a read-only endpoint in project `fgomaujsdblpzxhnnqrg`. It hashes the submitted organizer code before comparison, then reads the fixed signup table with its server-only credential. No database key reaches the browser. Platform JWT verification is disabled because the function performs its own access-code authentication.
- Responses disable caching. CORS accepts only the program's GitHub Pages origin. A restrictive Content Security Policy limits scripts to bundled files and requests to the existing Supabase project.
- The passcode is never saved in browser storage, cookies, Git, or public website files. Instead, a server-signed session token is stored in this browser's local storage for 90 days from sign-in. The server checks its signature and expiration on every fetch; reuse does not extend the expiration. Clearing site data, changing browsers, or rotating the passcode requires signing in again. Browsers that block storage retain authentication only while the page remains open.
- Session signatures use a server-only key tied to the passcode verifier, so changing the passcode also revokes existing sessions. A SHA-256 verifier is substituted for `__DEPLOYMENT_ACCESS_HASH__` only in the private deployment payload. Do not deploy the source placeholder unchanged. Never commit the passcode or its current verifier.
- The old `serenade-admin-data` Google integration now returns HTTP 410 and no contact data. Existing Google app projects are not used by this program.

## Development

Use Node.js 24 or newer. Run `npm ci` and `npm test`. Tests cover first-name sorting, date/party counts, phone formatting, invalid and legacy input, real PDF creation and pagination, denied access, origin checks, and database pagination.

For a local preview, serve `docs/` with a static server. Live browser reads require the production origin, by design. Test endpoint reads with the organizer code from an ignored local configuration, never by putting a code into source or fixtures.

The generated PDF, private link, and verification artifacts are ignored by Git. The published repository contains code and synthetic test data only.
