import { IAIProvider } from './providers/types.js';
import { GeminiProvider } from './providers/geminiProvider.js';
import { FallbackAIProvider } from './providers/fallbackProvider.js';

export * from './providers/types.js';
export * from './providers/geminiProvider.js';
export * from './providers/fallbackProvider.js';
export * from './schemas/aiSchemas.js';

let activeProvider: IAIProvider | null = null;

export function getAIProvider(): IAIProvider {
  if (activeProvider) {
    return activeProvider;
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey && geminiKey.trim().length > 0) {
    console.log('[AI] Initializing Google Gemini provider');
    activeProvider = new GeminiProvider();
  } else {
    console.log('[AI] No GEMINI_API_KEY detected. Initializing deterministic fallback provider');
    activeProvider = new FallbackAIProvider();
  }

  return activeProvider;
}
