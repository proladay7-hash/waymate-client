import { AI_AGENT_BASE_URL } from '../config/api';

export interface ChatSource {
  title: string;
  url: string;
}

export interface ChatMessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: ChatSource[];
  isError?: boolean;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  timestamp: string;
  sources: ChatSource[];
  isFallback?: boolean;
}

let currentSessionId: string | null = null;

export function getOrCreateSessionId(): string {
  if (!currentSessionId) {
    currentSessionId = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  }
  return currentSessionId;
}

export function resetSessionId(): string {
  currentSessionId = 'session_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  return currentSessionId;
}

/**
 * Health check for waymate-agent
 */
export async function checkAiAgentHealth(): Promise<{
  status: string;
  ollama_status: boolean;
  knowledge_entries?: number;
  mode?: string;
} | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${AI_AGENT_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Send chat message to waymate-agent
 */
export async function sendChatMessage(
  message: string,
  sessionId?: string,
  userId?: string,
  language: 'ENG' | 'VIE' = 'ENG'
): Promise<ChatResponse> {
  const activeSession = sessionId || getOrCreateSessionId();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const res = await fetch(`${AI_AGENT_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        message,
        session_id: activeSession,
        user_id: userId || 'waymate_user',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      return {
        response: data.response,
        session_id: data.session_id || activeSession,
        timestamp: data.timestamp || new Date().toISOString(),
        sources: data.sources || [],
        isFallback: false,
      };
    } else {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.warn('[AiAgentApi] Network error connecting to waymate-agent:', err?.message);
    // Intelligent local client fallback for instant responsive feedback
    return generateLocalFallback(message, activeSession, language);
  }
}

/**
 * Local offline fallback if waymate-agent is currently starting or unreachable
 */
function generateLocalFallback(
  message: string,
  sessionId: string,
  language: 'ENG' | 'VIE'
): ChatResponse {
  const q = message.toLowerCase();
  const isVn = language === 'VIE' || /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/.test(q);

  const response = isVn
    ? 'Trợ lý WayMate AI hiện không khả dụng. Vui lòng đảm bảo Ollama đang hoạt động với mô hình qwen2.5:0.5b.'
    : 'WayMate AI Agent is currently not available. Please ensure Ollama is running with model qwen2.5:0.5b.';

  return {
    response,
    session_id: sessionId,
    timestamp: new Date().toISOString(),
    sources: [],
    isFallback: true,
  };
}
