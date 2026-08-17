import { test } from 'node:test';
import assert from 'node:assert';
import { AIGatewayService } from '../services/aiGatewayService.js';

test('AIGatewayService provides rule-based fallback response when API keys are absent', async () => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const response = await AIGatewayService.generateTutoringResponse({
    prompt: 'How do I solve quadratic equations?',
    mode: 'explain',
    subjectName: 'Mathematics',
    grade: 11,
  });

  assert.strictEqual(response.mode, 'explain');
  assert.strictEqual(response.provider, 'rule-based-fallback');
  assert.ok(response.content.includes('Grounded CAPS Guidance'));

  if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey;
});
