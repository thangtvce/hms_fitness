// src/utils/gemini.js
// Utility to call Gemini AI API for health advice
// Usage: await getGeminiHealthAdvice({ macro, status })
// Returns: short 2-line health warning string

import axios from 'axios';

// You should store your Gemini API key securely, e.g. in .env or app config
import { GEMINI_API_KEY } from '@env';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/**
 * Get short health advice from Gemini AI for macro over/under consumption
 * @param {Object} params
 * @param {string} params.macro - Macro name (Carbs/Protein/Fats)
 * @param {string} params.status - 'over' or 'under'
 * @returns {Promise<string>} 2-line health warning
 */
export async function getGeminiHealthAdvice({ macro, status }) {
  try {
    const prompt = `Give a concise, 2-line health warning for ${status === 'over' ? 'overconsumption' : 'underconsumption'} of ${macro} in daily diet. Avoid generic advice, be specific and actionable. No more than 2 lines.`;
    const response = await axios.post(
      `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || '';
  } catch (e) {
    return '';
  }
}
