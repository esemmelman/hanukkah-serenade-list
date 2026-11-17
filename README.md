# Hanukkah serenade PDF

[Program website](https://esemmelman.github.io/hanukkah-serenade-list/)

This program fetches current `hanukkah-signup` entries and creates a downloadable PDF directly in the browser. Google Apps Script and Google Sheets are not used.

## Use

Open the program website, enter your organizer passcode, click **Create PDF**, then **Download PDF**. Keep the passcode private: anyone possessing it can read the signup contacts. Replaced access codes and previous organizer links are no longer accepted.

Each click fetches current records. The PDF is landscape US Letter, sorted by first name, with names, formatted US cell numbers, emails, three date columns, accompanying guests, and totals. Long lists paginate with repeated headers. One row represents a signup party. Each selected night counts the full party; the party-size total counts people once per signup. Duplicate signup submissions remain separate records.

## Implementation and privacy

- `docs/` is a static GitHub Pages app. Pinned jsPDF and AutoTable distributions and licenses are served locally from `docs/vendor/`; there are no third-party scripts or analytics.
- `docs/report.mjs` validates, sorts, formats, totals, and generates PDFs. Contact fields are passed as plain PDF text, never HTML.
- `supabase/functions/serenade-export-data/index.ts` is a read-only endpoint in project `fgomaujsdblpzxhnnqrg`. It hashes the submitted organizer code before comparison, then reads the fixed signup table with its server-only credential. No database key reaches the browser. Platform JWT verification is disabled because the function performs its own access-code authentication.
- Responses disable caching. CORS accepts only the program's GitHub Pages origin. A restrictive Content Security Policy limits scripts to bundled files and requests to the existing Supabase project.
- The passcode stays in page memory. It is not saved in browser storage, cookies, Git, or public website files. A SHA-256 verifier is substituted for `__DEPLOYMENT_ACCESS_HASH__` only in the private deployment payload. Do not deploy the source placeholder unchanged. Replacing that verifier revokes previous codes. Never commit the passcode or its current verifier.
- The old `serenade-admin-data` Google integration now returns HTTP 410 and no contact data. Existing Google app projects are not used by this program.

## Development

Use Node.js 24 or newer. Run `npm ci` and `npm test`. Tests cover first-name sorting, date/party counts, phone formatting, invalid and legacy input, real PDF creation and pagination, denied access, origin checks, and database pagination.

For a local preview, serve `docs/` with a static server. Live browser reads require the production origin, by design. Test endpoint reads with the organizer code from an ignored local configuration, never by putting a code into source or fixtures.

The generated PDF, private link, and verification artifacts are ignored by Git. The published repository contains code and synthetic test data only.
