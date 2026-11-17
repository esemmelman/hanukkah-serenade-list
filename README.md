# Hanukkah serenade list

Refresh the existing [Google Sheet](https://docs.google.com/spreadsheets/d/1gMip7rqtPr6wbGWquq8UKqeLjW9Bpg8nQfYOirxi3_w/edit?gid=851372248) from current `hanukkah-signup` database entries with a button. Output is alphabetized by first name, with `(###) ###-####` US phone numbers, emails, December 5/6/8 headcounts, party sizes, accompanying names, and totals.

[Program website](https://esemmelman.github.io/hanukkah-serenade-list/)

## Google app

The refresh app is installed in [this Apps Script project](https://script.google.com/home/projects/11t-cCYYpVIFbyGc0syR4Q5HEh1mUZ1bI0wU2iAyKaPwAIPoc6I1zn4ZO/edit). Deployment is restricted to **Only myself**, executing as the organizer. Google authorization is required before the first deployment can complete. Once deployed, the website links to the app's **Refresh Spreadsheet** button.

The button fetches and validates live data before clearing the generated output. It then replaces the `Serenaders` tab's generated columns A:H, retains first-name order, and displays the number of signups, people, and nightly totals. No write happens while merely opening the page. Keep manual notes in a different tab. Failed reads preserve existing output; write failures are reported and can be retried.

## Security and hosting

- GitHub Pages hosts the public landing page. It contains no private signup data or credentials.
- Google Apps Script performs spreadsheet writes using the organizer's Google authorization. It has access to spreadsheets, email identity, and external requests; its code targets only the linked spreadsheet.
- `supabase/functions/serenade-admin-data/index.ts` is deployed in project `fgomaujsdblpzxhnnqrg`. It accepts POST requests with a Google access token, validates that token against Google's userinfo endpoint, and permits only the verified organizer email. Supabase's JWT verification is disabled for this function because it implements Google authentication itself.
- The database service credential stays in the Supabase runtime. No key needs to be pasted into Apps Script or stored in GitHub.
- The endpoint returns no contact data to unauthenticated or other Google accounts. Its responses disable caching.

## Updating the Google app

The project was installed through the Google editor because connected tools cannot create Apps Script projects. `Code.gs` and `appsscript.json` contain the maintained refresh implementation and scopes. For updates, paste `Code.gs` into the existing project, apply the manifest scopes, then update the existing deployment to a new version while retaining **Only myself** access. Keep the published app URL in `docs/index.html` synchronized after a new deployment.

## Counting rules

Each row is one signup party. Guests share the main signup contact information. A selected date receives the full `people_count`; unselected dates receive zero. Party size totals people once per signup. The same person can appear in multiple date totals; duplicate signup submissions remain separate entries. Older entries retain recorded headcounts even if guest names were not collected.

## Verification

Run `npm test` with Node.js. Tests cover alphabetical order, party/date counts, empty and legacy entries, phone formats, validation, formula-like text, and preservation of the spreadsheet on failed fetches. Initial workbook and private snapshot artifacts are ignored by Git. End-to-end Google app verification requires completing the Google authorization in the browser.
