/**
 * Am I Underpaid? — Google Sheets + Drive capture endpoint.
 *
 * SETUP (5 minutes):
 *  1. Create a new Google Sheet. Top menu: Extensions → Apps Script.
 *  2. Delete the default code, paste THIS whole file.
 *  3. Set SECRET_TOKEN below to a long random string of your choice (keep it private).
 *  4. (Optional) To store resumes, create a Drive folder, open it, and copy the
 *     folder id from the URL (the part after /folders/). Paste it into DRIVE_FOLDER_ID.
 *  5. Click Deploy → New deployment → type "Web app".
 *       - Execute as: Me
 *       - Who has access: Anyone
 *     Deploy, authorize, and COPY the Web app URL.
 *  6. In Vercel, set env vars:
 *       SHEETS_WEBHOOK_URL   = the Web app URL
 *       SHEETS_WEBHOOK_TOKEN = the same SECRET_TOKEN you set below
 *
 * The site only posts here when a user ticks the consent box.
 */

var SECRET_TOKEN = 'CHANGE_ME_to_a_long_random_string';
var DRIVE_FOLDER_ID = ''; // optional: paste a Drive folder id to store resume PDFs

var HEADERS = [
  'Timestamp', 'Email', 'Job Title', 'SOC Label', 'Salary', 'Experience',
  'City', 'Industry', 'Company Size', 'Verdict', 'Gap', 'Market Median',
  'Seniority', 'AI Provider', 'Resume',
];

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);

    // Reject anyone who doesn't have the shared token.
    if (!SECRET_TOKEN || body.token !== SECRET_TOKEN) {
      return json({ ok: false, error: 'unauthorized' });
    }

    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

    // Optionally save the resume PDF to Drive and capture a link.
    var resumeLink = '';
    if (body.resumeFileData && DRIVE_FOLDER_ID) {
      try {
        var bytes = Utilities.base64Decode(body.resumeFileData);
        var name = (body.resumeFileName || 'resume.pdf');
        var blob = Utilities.newBlob(bytes, 'application/pdf', name);
        var folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
        var file = folder.createFile(blob);
        resumeLink = file.getUrl();
      } catch (err) {
        resumeLink = 'upload_failed';
      }
    } else if (body.resumeFileName) {
      resumeLink = 'not_stored';
    }

    sheet.appendRow([
      body.timestamp || new Date().toISOString(),
      body.email || '',
      body.jobTitle || '',
      body.socLabel || '',
      body.salary || '',
      body.experience || '',
      body.city || '',
      body.industry || '',
      body.companySize || '',
      body.verdict || '',
      body.gap || '',
      body.marketMedian || '',
      body.seniorityLevel || '',
      body.provider || '',
      resumeLink,
    ]);

    return json({ ok: true });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
