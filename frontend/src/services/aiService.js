import { request } from './apiClient.js';

/**
 * Request trip generation from AI backend proxy
 * @param {Object} searchParams
 * @param {AbortSignal} [signal]
 * @returns {Promise<Object>}
 */
export const generateTripPlan = async (searchParams, signal = null) => {
  try {
    const body = {
      from: searchParams.from,
      to: searchParams.to,
      date: searchParams.date,
      returnDate: searchParams.returnDate,
      travelers: searchParams.travelers,
      budget: searchParams.budget,
      preferredMode: searchParams.preferredMode
    };

    const res = await request('/api/generate', {
      method: 'POST',
      body,
      signal,
      timeoutMs: 20000
    });

    if (!res.ok) {
      const err = new Error(res.data?.error || `AI generation failed with status ${res.status}`);
      err.code = res.data?.code || (res.status === 429 ? 'AI_QUOTA_EXCEEDED' : 'AI_ERROR');
      err.status = res.status;
      throw err;
    }

    return res.data;
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      if (signal?.aborted) {
        const cancelErr = new Error('Search cancelled by user');
        cancelErr.code = 'CANCELLED';
        throw cancelErr;
      }
      const timeoutErr = new Error('AI generation timed out after 20 seconds');
      timeoutErr.code = 'AI_TIMEOUT';
      throw timeoutErr;
    }
    throw error;
  }
};

/**
 * Send chat message to AI assistant backend proxy
 * @param {Object} params
 * @param {string} params.message
 * @param {Array} [params.chatHistory]
 * @param {Object} [params.tripContext]
 * @param {AbortSignal} [signal]
 * @returns {Promise<string>}
 */
export const sendChatMessage = async ({ message, chatHistory = [], tripContext = null }, signal = null) => {
  try {
    const body = {
      message: typeof message === 'string' ? message.slice(0, 1000) : '',
      chatHistory: Array.isArray(chatHistory) ? chatHistory.slice(-20) : [],
      tripContext: tripContext ? {
        from: tripContext.from,
        to: tripContext.to,
        date: tripContext.date,
        returnDate: tripContext.returnDate,
        travelers: tripContext.travelers,
        budget: tripContext.budget,
        distance: tripContext.distance
      } : null
    };

    const res = await request('/api/chat', {
      method: 'POST',
      body,
      signal,
      timeoutMs: 12000
    });

    if (!res.ok) {
      const err = new Error(res.data?.error || `Chat API error: ${res.status}`);
      err.status = res.status;
      err.code = res.data?.code;
      throw err;
    }

    if (res.data && typeof res.data.reply === 'string' && res.data.reply.trim()) {
      return res.data.reply.trim();
    }
    return "I'm sorry, I couldn't process that response. Can you try asking in a different way?";
  } catch (error) {
    if (error.name === 'TimeoutError' || error.name === 'AbortError') {
      console.warn('Chat request timed out or was cancelled');
    } else {
      console.warn('Chat AI response error:', error.message);
    }
    throw error;
  }
};
