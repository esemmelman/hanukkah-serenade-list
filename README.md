# Hanukkah serenade list

Google Apps Script program that reads the existing `hanukkah-signup` Supabase table and refreshes a Google Sheet with names, cell phones, emails, three date headcounts, party sizes, accompanying names, and totals. Alphabetized by first name (full-name alphabetical order).

## Output

[Open the Google Sheet](https://docs.google.com/spreadsheets/d/1gMip7rqtPr6wbGWquq8UKqeLjW9Bpg8nQfYOirxi3_w/edit).

The initial sheet is a verified November 16, 2026 snapshot. The refresh program is provided here; it must be installed and authorized in your Google account before the menu can refresh live data.

## Install the refresh menu (once)

1. Open the output sheet. Select **Extensions → Apps Script**.
2. Replace the default code with [Code.gs](Code.gs) and save.
3. In **Project Settings → Script properties**, add `SUPABASE_SECRET_KEY` with your secret API key (or legacy service-role key) from the Supabase project `fgomaujsdblpzxhnnqrg`. A publishable key cannot read the private contact fields. Never put this value in the code or GitHub. Only trusted administrators should have edit access to the spreadsheet or its bound script.
4. Select `refreshSerenaders` in Apps Script and run it. Authorize access to this spreadsheet and the external signup database. Optional: enable the manifest in Project Settings and replace it with [appsscript.json](appsscript.json) to use the declared scopes.
5. Reload the sheet. Use **Serenaders → Refresh signup list** whenever you need current signups.

The generated `Serenaders` tab belongs to the program. Keep manual notes in another tab. The GitHub Pages frontend opens the existing Google Sheet. The refresh program runs inside Google Sheets; the static website does not read private contacts or refresh the database itself.

## Counting rules

- One row per signup party; guests are listed alongside the main signup's contact information. The signup form collects no separate contact details for guests.
- December 5, 6, and 8, 2026 are the three date columns. A selected date receives the signup's `people_count`; an unselected date receives zero.
- Party size totals people once per signup; a person attending several nights appears in several date totals. These are not unique-person counts across duplicate signup submissions.
- Older entries with a larger party size and no guest names retain their recorded headcount. Rows without selected dates remain listed with zero date counts.
- The program reads all pages, validates results before writing, serializes refreshes with a lock, escapes formula-like text, and clears stale output when signups shrink. Failed reads preserve the previous output. Concurrent changes to the signup list during pagination may require another refresh.

## Checks

Run `npm test` with Node.js 18 or newer. No package installation is needed. Tests cover first-name order, multi-person and multi-night counts, empty and legacy entries, invalid input, and spreadsheet formula injection. The Google Apps Script runtime itself requires installation and authorization in Google Sheets.

The initial private snapshot and workbook build files are excluded from Git. Only code, documentation, and synthetic test data are published.

