// Google Cloud Vision API Service for OCR
import { GOOGLE_CONFIG } from '../config/google';

/**
 * Analyze an image using Google Cloud Vision API
 * @param {string} base64Image - Base64 encoded image data (without data URL prefix)
 * @returns {Promise<string>} - Extracted text from the image
 */
export const analyzeImage = async (base64Image) => {
  const response = await fetch(
    `https://vision.googleapis.com/v1/images:annotate?key=${GOOGLE_CONFIG.API_KEY}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            image: {
              content: base64Image,
            },
            features: [
              {
                type: 'TEXT_DETECTION',
                maxResults: 10,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Vision API request failed');
  }

  const data = await response.json();
  const textAnnotations = data.responses?.[0]?.textAnnotations;
  
  if (!textAnnotations || textAnnotations.length === 0) {
    return '';
  }

  // First annotation contains the full detected text
  return textAnnotations[0].description || '';
};

/**
 * Parse events/tasks from OCR extracted text
 * @param {string} text - Raw text from OCR
 * @returns {Array<Object>} - Array of detected events
 */
export const parseEventsFromText = (text) => {
  const events = [];
  const lines = text.split('\n').filter(line => line.trim());

  // Date patterns
  const datePatterns = [
    // DD/MM/YYYY or MM/DD/YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g,
    // Month names: Dec 15, December 15, 15 Dec
    /(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?/gi,
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s*(\d{1,2})(?:st|nd|rd|th)?/gi,
    // Relative dates
    /(today|tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday))/gi,
  ];

  // Time patterns
  const timePatterns = [
    // 3:00 PM, 3:00PM, 15:00
    /(\d{1,2}):(\d{2})\s*(am|pm)?/gi,
    // at noon, at midnight
    /\b(noon|midnight)\b/gi,
  ];

  // Process each line
  for (const line of lines) {
    let foundDate = null;
    let foundTime = null;
    let title = line.trim();

    // Try to extract dates
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        foundDate = parseDate(match[0]);
        title = line.replace(pattern, '').trim();
        break;
      }
    }

    // Try to extract times
    for (const pattern of timePatterns) {
      const match = line.match(pattern);
      if (match) {
        foundTime = match[0];
        title = title.replace(pattern, '').trim();
        break;
      }
    }

    // Clean up title
    title = title
      .replace(/^[\-\•\*\s]+/, '') // Remove leading bullets
      .replace(/[\-\•\*\s]+$/, '') // Remove trailing bullets
      .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
      .trim();

    // Only add if we found a date or the line looks like a task
    if (foundDate || foundTime || (title.length > 5 && title.length < 100)) {
      if (title) {
        events.push({
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: title.charAt(0).toUpperCase() + title.slice(1),
          date: foundDate || new Date().toISOString().split('T')[0],
          time: foundTime || '',
          sourceSnippet: line.substring(0, 80),
          confidence: foundDate ? 0.9 : foundTime ? 0.7 : 0.5,
          selected: foundDate || foundTime ? true : false,
        });
      }
    }
  }

  // Sort by confidence
  events.sort((a, b) => b.confidence - a.confidence);

  return events.slice(0, 10); // Max 10 suggestions
};

/**
 * Parse a date string into ISO format
 */
const parseDate = (dateStr) => {
  const today = new Date();
  const lowerStr = dateStr.toLowerCase();

  // Handle relative dates
  if (lowerStr === 'today') {
    return today.toISOString().split('T')[0];
  }
  if (lowerStr === 'tomorrow') {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  // Handle "next monday", "next tuesday", etc.
  const nextDayMatch = lowerStr.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/);
  if (nextDayMatch) {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = days.indexOf(nextDayMatch[1]);
    const currentDay = today.getDay();
    let daysUntil = targetDay - currentDay;
    if (daysUntil <= 0) daysUntil += 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntil);
    return nextDate.toISOString().split('T')[0];
  }

  // Handle month names
  const months = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
  };

  // Try "Dec 15" or "15 Dec" format
  const monthMatch = lowerStr.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*(\d{1,2})/);
  const dayMonthMatch = lowerStr.match(/(\d{1,2})\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/);

  if (monthMatch) {
    const month = months[monthMatch[1].substring(0, 3)];
    const day = parseInt(monthMatch[2]);
    const year = today.getFullYear();
    return new Date(year, month, day).toISOString().split('T')[0];
  }

  if (dayMonthMatch) {
    const day = parseInt(dayMonthMatch[1]);
    const month = months[dayMonthMatch[2].substring(0, 3)];
    const year = today.getFullYear();
    return new Date(year, month, day).toISOString().split('T')[0];
  }

  // Try numeric formats DD/MM/YYYY
  const numericMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1]);
    const month = parseInt(numericMatch[2]) - 1;
    let year = numericMatch[3] ? parseInt(numericMatch[3]) : today.getFullYear();
    if (year < 100) year += 2000;
    return new Date(year, month, day).toISOString().split('T')[0];
  }

  return null;
};

/**
 * Convert a file to base64
 * @param {File} file - Image file
 * @returns {Promise<string>} - Base64 string (without data URL prefix)
 */
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};
