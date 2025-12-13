// Google Sheets API Configuration
// You'll need to create a Google Cloud project and enable the Sheets API

export const GOOGLE_CONFIG = {
  // Replace with your Google Cloud project credentials
  CLIENT_ID: '250800258787-tvkc0osplon8eud3nkd246m2hsdgcjr9.apps.googleusercontent.com',
  API_KEY: 'AIzaSyA3QxJsx8kOJiX_JhQPhYDDHesWSo-vNQ0',
  
  // Discovery docs for Google Sheets API
  DISCOVERY_DOCS: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
  
  // Scopes required for Google Sheets and Vision API
  SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/cloud-vision'
  ].join(' '),
  
  // Spreadsheet structure
  SHEET_NAMES: {
    HABITS: 'Habits',
    HABIT_LOGS: 'HabitLogs',
    TASKS: 'Tasks',
    SETTINGS: 'Settings'
  }
};

// Initialize GAPI headers for spreadsheet
export const HABITS_HEADER = ['id', 'name', 'icon', 'color', 'frequency', 'createdAt', 'streak', 'goal'];
export const HABIT_LOGS_HEADER = ['id', 'habitId', 'date', 'completed', 'notes'];
export const TASKS_HEADER = ['id', 'title', 'description', 'dueDate', 'dueTime', 'priority', 'category', 'completed', 'createdAt'];
export const SETTINGS_HEADER = ['key', 'value'];
