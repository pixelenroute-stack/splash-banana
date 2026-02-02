
/**
 * @fileoverview Google Apps Script to be deployed on the Google Sheet.
 * This script detects edits and sends a webhook to the application/N8N to trigger sync.
 */

// CONFIGURATION
// Replace with your N8N webhook URL or App Endpoint
var WEBHOOK_URL = "YOUR_N8N_WEBHOOK_URL_HERE"; 
var SECRET_TOKEN = "YOUR_SECRET_TOKEN"; // Optional security token

/**
 * Trigger function that runs on every edit.
 * @param {Object} e - The event object.
 */
function onEdit(e) {
  if (!e) return;
  
  var range = e.range;
  var sheet = range.getSheet();
  
  // 1. FILTERING: Only process edits in the 'Clients' sheet
  if (sheet.getName() !== 'Clients') return;
  
  // 2. FILTERING: Ignore header row
  var row = range.getRow();
  if (row <= 1) return;
  
  // 3. PAYLOAD CONSTRUCTION
  var payload = {
    action: 'sheet_modified',
    spreadsheetId: e.source.getId(),
    sheetName: sheet.getName(),
    rowNumber: row,
    columnNumber: range.getColumn(),
    oldValue: e.oldValue,
    newValue: e.value,
    userEmail: Session.getActiveUser().getEmail(),
    timestamp: new Date().toISOString()
  };
  
  // 4. WEBHOOK EXECUTION
  sendWebhook(payload);
}

/**
 * Sends the payload to the external service.
 */
function sendWebhook(payload) {
  var options = {
    'method': 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload),
    'muteHttpExceptions': true,
    'headers': {
      'X-Auth-Token': SECRET_TOKEN
    }
  };
  
  try {
    var response = UrlFetchApp.fetch(WEBHOOK_URL, options);
    Logger.log("Webhook sent: " + response.getResponseCode());
  } catch (error) {
    Logger.log("Error sending webhook: " + error.toString());
  }
}

/**
 * INSTALLATION INSTRUCTIONS:
 * 1. Open your Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Paste this code.
 * 4. Update WEBHOOK_URL.
 * 5. Save the project.
 * 6. Go to Triggers (Clock icon).
 * 7. Add Trigger: 
 *    - Function: onEdit
 *    - Event source: From spreadsheet
 *    - Event type: On edit
 * 8. Save and authorize permissions.
 */
