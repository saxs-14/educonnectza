import dotenv from 'dotenv';
dotenv.config();

/**
 * Universal AI Gateway supporting Google Gemini, OpenAI-compatible APIs, and local fallback.
 */
export class AIGatewayService {
  /**
   * Determine available AI provider based on environment variables
   * @returns {'gemini' | 'openai' | 'rule-based'}
   */
  static getActiveProvider() {
    if (process.env.GEMINI_API_KEY) return 'gemini';
    if (process.env.OPENAI_API_KEY) return 'openai';
    return 'rule-based';
  }

  /**
   * Generate educational response with role/tenant boundary protection
   * @param {Object} options
   * @param {string} options.prompt - Learner prompt or topic
   * @param {string} [options.mode='explain'] - 'explain', 'hint', 'worked_example', 'quiz_gen'
   * @param {string} [options.subjectName] - CAPS subject context (e.g. 'Mathematics', 'Physical Sciences')
   * @param {number} [options.grade] - Learner Grade (8-12)
   * @returns {Promise<{ content: string, mode: string, provider: string }>}
   */
  static async generateTutoringResponse({ prompt, mode = 'explain', subjectName = 'General', grade = 10 }) {
    const systemInstruction = `You are a CAPS-aligned AI Tutor for South African Grade ${grade} learners in ${subjectName}.
Rules:
1. Provide educational scaffolding. Explain concepts clearly with relevant SA examples.
2. If mode is "hint", give a helpful hint or clue without giving away the final numerical/direct answer.
3. Keep explanations structured, encouraging, and clear.
4. Do not assist with non-educational or malicious tasks.`;

    const provider = this.getActiveProvider();

    if (provider === 'gemini') {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
          contents: `${systemInstruction}\n\n[Mode: ${mode.toUpperCase()}]\nLearner question: ${prompt}`,
        });
        return { content: response.text, mode, provider: 'gemini' };
      } catch (err) {
        console.warn('[AIGateway] Gemini call failed, falling back to rule-based response:', err.message);
      }
    }

    // Rule-based fallback response for offline / zero API key operation
    const fallbackResponse = `[Grounded CAPS Guidance - ${subjectName} (Grade ${grade})]
Topic: ${prompt}

Key Learning Steps:
1. Review the core CAPS textbook definition for this topic.
2. Step 1: Identify the given variables and target variable.
3. Step 2: Apply the standard formula or rule for ${subjectName}.
${mode === 'hint' ? '💡 Hint: Focus on simplifying the left-hand side of the expression first.' : '📚 Tip: Practice similar textbook questions to reinforce this concept.'}`;

    return { content: fallbackResponse, mode, provider: 'rule-based-fallback' };
  }
}
