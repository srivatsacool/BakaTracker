/**
 * BakaTracker - Google Apps Script Backend API v2.1
 * Deploy this as a Web App:
 * 1. Open Google Sheets.
 * 2. Click Extensions > Apps Script.
 * 3. Delete any code and paste this script.
 * 4. Click Deploy > New deployment.
 * 5. Select type: "Web app".
 * 6. Set Execute as: "Me", Who has access: "Anyone".
 * 7. Deploy, authorize permissions, and copy the Web App URL.
 * 8. Paste the URL into BakaTracker's settings.
 */

function doGet(e) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  initializeSheets(spreadsheet);
  
  // Verify API key if configured
  const configuredApiKey = getApiKey(spreadsheet);
  if (configuredApiKey) {
    const providedApiKey = e.parameter.apiKey;
    if (providedApiKey !== configuredApiKey) {
      return createJsonResponse({ status: 'error', message: 'Unauthorized: Invalid API Key' });
    }
  }
  
  const action = e.parameter.action || 'getAll';
  
  if (action === 'getAll') {
    const data = {
      habits: readSheetData(spreadsheet.getSheetByName('Habits')),
      habitLogs: readSheetData(spreadsheet.getSheetByName('HabitLogs')),
      tasks: readSheetData(spreadsheet.getSheetByName('Tasks')),
      journal: readSheetData(spreadsheet.getSheetByName('Journal')),
      quotes: readSheetData(spreadsheet.getSheetByName('Quotes')),
      events: readSheetData(spreadsheet.getSheetByName('Events')),
      settings: readSheetData(spreadsheet.getSheetByName('Settings')),
      metadata: readSheetData(spreadsheet.getSheetByName('Metadata')),
      character: readSheetData(spreadsheet.getSheetByName('Character')),
      weeklyStats: readSheetData(spreadsheet.getSheetByName('WeeklyStats'))
    };
    return createJsonResponse({ status: 'success', data: data });
  }
  
  return createJsonResponse({ status: 'error', message: 'Invalid action' });
}

function doPost(e) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  initializeSheets(spreadsheet);
  
  let postData;
  try {
    postData = JSON.parse(e.postData.contents);
  } catch (err) {
    return createJsonResponse({ status: 'error', message: 'Invalid JSON payload' });
  }
  
  // Verify API key if configured
  const configuredApiKey = getApiKey(spreadsheet);
  if (configuredApiKey) {
    const providedApiKey = postData.apiKey;
    if (providedApiKey !== configuredApiKey) {
      return createJsonResponse({ status: 'error', message: 'Unauthorized: Invalid API Key' });
    }
  }
  
  const action = postData.action;
  
  if (action === 'sync') {
    const payload = postData.data;
    if (payload.habits) writeSheetData(spreadsheet.getSheetByName('Habits'), payload.habits, ['id', 'name', 'type', 'icon', 'xp', 'stat', 'active', 'created_at', 'updated_at']);
    if (payload.habitLogs) writeSheetData(spreadsheet.getSheetByName('HabitLogs'), payload.habitLogs, ['id', 'date', 'habit_id', 'value', 'xp_earned', 'created_at']);
    if (payload.tasks) writeSheetData(spreadsheet.getSheetByName('Tasks'), payload.tasks, ['id', 'title', 'notes', 'area', 'status', 'today', 'xp', 'due_date', 'created_at', 'updated_at', 'completed_at']);
    if (payload.journal) writeSheetData(spreadsheet.getSheetByName('Journal'), payload.journal, ['id', 'date', 'highlight', 'notes', 'mood', 'quote_id', 'created_at', 'updated_at']);
    if (payload.events) writeSheetData(spreadsheet.getSheetByName('Events'), payload.events, ['id', 'type', 'source', 'entity', 'entity_id', 'xp', 'stat', 'metadata', 'timestamp']);
    if (payload.settings) writeSheetData(spreadsheet.getSheetByName('Settings'), payload.settings, ['key', 'value']);
    if (payload.metadata) writeSheetData(spreadsheet.getSheetByName('Metadata'), payload.metadata, ['schema_version', 'xp_formula', 'last_sync']);
    if (payload.character) writeSheetData(spreadsheet.getSheetByName('Character'), payload.character, ['id', 'level', 'total_xp', 'discipline', 'health', 'knowledge', 'creativity', 'career', 'title', 'updated_at']);
    if (payload.weeklyStats) writeSheetData(spreadsheet.getSheetByName('WeeklyStats'), payload.weeklyStats, ['week_start', 'xp', 'health', 'knowledge', 'career', 'creativity', 'discipline']);
    
    return createJsonResponse({ status: 'success', message: 'Synchronization completed successfully' });
  }
  
  return createJsonResponse({ status: 'error', message: 'Unknown post action' });
}

function getApiKey(spreadsheet) {
  const sheet = spreadsheet.getSheetByName('Settings');
  if (!sheet) return null;
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;
  const data = readSheetData(sheet);
  const apiKeyRow = data.find(row => row.key === 'api_key');
  return apiKeyRow && apiKeyRow.value ? String(apiKeyRow.value).trim() : null;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
     .setMimeType(ContentService.MimeType.JSON)
     .setHeader('Access-Control-Allow-Origin', '*');
}

function initializeSheets(spreadsheet) {
  const sheetsConfig = {
    'Habits': ['id', 'name', 'type', 'icon', 'xp', 'stat', 'active', 'created_at', 'updated_at'],
    'HabitLogs': ['id', 'date', 'habit_id', 'value', 'xp_earned', 'created_at'],
    'Tasks': ['id', 'title', 'notes', 'area', 'status', 'today', 'xp', 'due_date', 'created_at', 'updated_at', 'completed_at'],
    'Journal': ['id', 'date', 'highlight', 'notes', 'mood', 'quote_id', 'created_at', 'updated_at'],
    'Quotes': ['id', 'quote', 'author', 'category', 'active'],
    'Events': ['id', 'type', 'source', 'entity', 'entity_id', 'xp', 'stat', 'metadata', 'timestamp'],
    'Settings': ['key', 'value'],
    'Metadata': ['schema_version', 'xp_formula', 'last_sync'],
    'Character': ['id', 'level', 'total_xp', 'discipline', 'health', 'knowledge', 'creativity', 'career', 'title', 'updated_at'],
    'WeeklyStats': ['week_start', 'xp', 'health', 'knowledge', 'career', 'creativity', 'discipline']
  };
  
  for (const sheetName in sheetsConfig) {
    let sheet = spreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(sheetName);
      sheet.appendRow(sheetsConfig[sheetName]);
      
      // Pre-fill quotes if it's the Quotes sheet
      if (sheetName === 'Quotes') {
        const defaultQuotes = [
          ['q1', 'Small progress is still progress.', 'Anonymous', 'Motivation', 'true'],
          ['q2', 'Done is better than perfect.', 'Sheryl Sandberg', 'Consistency', 'true'],
          ['q3', 'Consistency beats intensity.', 'Bruce Lee', 'Discipline', 'true'],
          ['q4', 'Focus is a muscle, and you build it by using it.', 'Anonymous', 'Focus', 'true'],
          ['q5', 'You do not rise to the level of your goals. You fall to the level of your systems.', 'James Clear', 'Systems', 'true']
        ];
        defaultQuotes.forEach(q => sheet.appendRow(q));
      }
      
      // Pre-fill metadata sheet
      if (sheetName === 'Metadata') {
        sheet.appendRow(['2.0', 'completed_tasks_if_today + habit_logs + journal_highlights', new Date().toISOString()]);
      }
    }
  }
}

function readSheetData(sheet) {
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow <= 1) return [];
  
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  
  return values.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let val = row[index];
      // Convert boolean strings to boolean
      if (val === 'true') val = true;
      if (val === 'false') val = false;
      obj[header] = val;
    });
    return obj;
  });
}

function writeSheetData(sheet, dataList, headers) {
  if (!sheet) return;
  
  // Clear everything except header row
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.deleteRows(2, lastRow - 1);
  }
  
  if (dataList.length === 0) return;
  
  const rows = dataList.map(item => {
    return headers.map(header => {
      let val = item[header];
      if (val === undefined || val === null) return '';
      // Convert boolean to string for safety
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      return val;
    });
  });
  
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}
