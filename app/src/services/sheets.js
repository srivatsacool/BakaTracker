// Google Sheets Database Service
import { GOOGLE_CONFIG, HABITS_HEADER, HABIT_LOGS_HEADER, TASKS_HEADER, SETTINGS_HEADER } from '../config/google';

const SPREADSHEET_TITLE = 'BakaTracker Data';
let spreadsheetId = null;

// Get or create the app's spreadsheet
export const getOrCreateSpreadsheet = async () => {
  // First, try to find existing spreadsheet
  const existingId = localStorage.getItem('bakatracker_spreadsheet_id');
  
  if (existingId) {
    try {
      await window.gapi.client.sheets.spreadsheets.get({
        spreadsheetId: existingId,
      });
      spreadsheetId = existingId;
      return spreadsheetId;
    } catch (error) {
      // Spreadsheet not found, create new one
      localStorage.removeItem('bakatracker_spreadsheet_id');
    }
  }
  
  // Create new spreadsheet
  const response = await window.gapi.client.sheets.spreadsheets.create({
    properties: {
      title: SPREADSHEET_TITLE,
    },
    sheets: [
      { properties: { title: GOOGLE_CONFIG.SHEET_NAMES.HABITS } },
      { properties: { title: GOOGLE_CONFIG.SHEET_NAMES.HABIT_LOGS } },
      { properties: { title: GOOGLE_CONFIG.SHEET_NAMES.TASKS } },
      { properties: { title: GOOGLE_CONFIG.SHEET_NAMES.SETTINGS } },
    ],
  });
  
  spreadsheetId = response.result.spreadsheetId;
  localStorage.setItem('bakatracker_spreadsheet_id', spreadsheetId);
  
  // Initialize headers
  await initializeSheetHeaders();
  
  return spreadsheetId;
};

// Initialize headers for all sheets
const initializeSheetHeaders = async () => {
  const batchData = [
    {
      range: `${GOOGLE_CONFIG.SHEET_NAMES.HABITS}!A1:H1`,
      values: [HABITS_HEADER],
    },
    {
      range: `${GOOGLE_CONFIG.SHEET_NAMES.HABIT_LOGS}!A1:E1`,
      values: [HABIT_LOGS_HEADER],
    },
    {
      range: `${GOOGLE_CONFIG.SHEET_NAMES.TASKS}!A1:I1`,
      values: [TASKS_HEADER],
    },
    {
      range: `${GOOGLE_CONFIG.SHEET_NAMES.SETTINGS}!A1:B1`,
      values: [SETTINGS_HEADER],
    },
  ];
  
  await window.gapi.client.sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    resource: {
      valueInputOption: 'RAW',
      data: batchData,
    },
  });
};

// Generic CRUD operations

// Create/Append rows
export const appendRows = async (sheetName, rows) => {
  if (!spreadsheetId) await getOrCreateSpreadsheet();
  
  const response = await window.gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    resource: {
      values: rows,
    },
  });
  
  return response.result;
};

// Read all rows
export const getRows = async (sheetName) => {
  if (!spreadsheetId) await getOrCreateSpreadsheet();
  
  try {
    const response = await window.gapi.client.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });
    
    const values = response.result.values;
    if (!values || values.length <= 1) return [];
    
    const headers = values[0];
    return values.slice(1).map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] || '';
      });
      return obj;
    });
  } catch (error) {
    console.error(`Error reading ${sheetName}:`, error);
    return [];
  }
};

// Update row by ID
export const updateRow = async (sheetName, id, data) => {
  if (!spreadsheetId) await getOrCreateSpreadsheet();
  
  // Get all rows to find the row index
  const response = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });
  
  const values = response.result.values;
  if (!values) return null;
  
  const headers = values[0];
  const rowIndex = values.findIndex((row, index) => index > 0 && row[0] === id);
  
  if (rowIndex === -1) return null;
  
  // Create updated row
  const updatedRow = headers.map((header) => {
    if (data.hasOwnProperty(header)) return data[header];
    return values[rowIndex][headers.indexOf(header)] || '';
  });
  
  await window.gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!A${rowIndex + 1}:Z${rowIndex + 1}`,
    valueInputOption: 'RAW',
    resource: {
      values: [updatedRow],
    },
  });
  
  return { id, ...data };
};

// Delete row by ID
export const deleteRow = async (sheetName, id) => {
  if (!spreadsheetId) await getOrCreateSpreadsheet();
  
  // Get sheet ID
  const sheetsResponse = await window.gapi.client.sheets.spreadsheets.get({
    spreadsheetId,
  });
  
  const sheet = sheetsResponse.result.sheets.find(
    (s) => s.properties.title === sheetName
  );
  
  if (!sheet) return false;
  
  // Find row index
  const dataResponse = await window.gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:A`,
  });
  
  const values = dataResponse.result.values;
  if (!values) return false;
  
  const rowIndex = values.findIndex((row, index) => index > 0 && row[0] === id);
  
  if (rowIndex === -1) return false;
  
  // Delete the row
  await window.gapi.client.sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    resource: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        },
      ],
    },
  });
  
  return true;
};

// ============ HABIT OPERATIONS ============

export const getHabits = () => getRows(GOOGLE_CONFIG.SHEET_NAMES.HABITS);

export const createHabit = async (habit) => {
  const id = `habit_${Date.now()}`;
  const row = [
    id,
    habit.name,
    habit.icon || 'check_circle',
    habit.color || 'primary',
    habit.frequency || 'daily',
    new Date().toISOString(),
    '0',
    habit.goal || '1',
  ];
  
  await appendRows(GOOGLE_CONFIG.SHEET_NAMES.HABITS, [row]);
  return { id, ...habit, streak: 0, createdAt: new Date().toISOString() };
};

export const updateHabit = (id, data) => updateRow(GOOGLE_CONFIG.SHEET_NAMES.HABITS, id, data);
export const deleteHabit = (id) => deleteRow(GOOGLE_CONFIG.SHEET_NAMES.HABITS, id);

// ============ HABIT LOG OPERATIONS ============

export const getHabitLogs = () => getRows(GOOGLE_CONFIG.SHEET_NAMES.HABIT_LOGS);

export const logHabitCompletion = async (habitId, completed = true, notes = '') => {
  const id = `log_${Date.now()}`;
  const date = new Date().toISOString().split('T')[0];
  const row = [id, habitId, date, completed.toString(), notes];
  
  await appendRows(GOOGLE_CONFIG.SHEET_NAMES.HABIT_LOGS, [row]);
  return { id, habitId, date, completed, notes };
};

export const getHabitLogsForDate = async (date) => {
  const logs = await getHabitLogs();
  return logs.filter((log) => log.date === date);
};

// ============ TASK OPERATIONS ============

export const getTasks = () => getRows(GOOGLE_CONFIG.SHEET_NAMES.TASKS);

export const createTask = async (task) => {
  const id = `task_${Date.now()}`;
  const row = [
    id,
    task.title,
    task.description || '',
    task.dueDate || '',
    task.dueTime || '',
    task.priority || 'medium',
    task.category || 'general',
    'false',
    new Date().toISOString(),
  ];
  
  await appendRows(GOOGLE_CONFIG.SHEET_NAMES.TASKS, [row]);
  return { id, ...task, completed: false, createdAt: new Date().toISOString() };
};

export const updateTask = (id, data) => updateRow(GOOGLE_CONFIG.SHEET_NAMES.TASKS, id, data);
export const deleteTask = (id) => deleteRow(GOOGLE_CONFIG.SHEET_NAMES.TASKS, id);

export const toggleTaskComplete = async (id) => {
  const tasks = await getTasks();
  const task = tasks.find((t) => t.id === id);
  if (!task) return null;
  
  const newCompleted = task.completed !== 'true';
  return updateTask(id, { completed: newCompleted.toString() });
};

// ============ SETTINGS OPERATIONS ============

export const getSetting = async (key) => {
  const settings = await getRows(GOOGLE_CONFIG.SHEET_NAMES.SETTINGS);
  const setting = settings.find((s) => s.key === key);
  return setting?.value || null;
};

export const setSetting = async (key, value) => {
  const settings = await getRows(GOOGLE_CONFIG.SHEET_NAMES.SETTINGS);
  const existingSetting = settings.find((s) => s.key === key);
  
  if (existingSetting) {
    // Update is complex, just delete and re-add for simplicity
    await deleteRow(GOOGLE_CONFIG.SHEET_NAMES.SETTINGS, key);
  }
  
  await appendRows(GOOGLE_CONFIG.SHEET_NAMES.SETTINGS, [[key, value]]);
  return { key, value };
};
