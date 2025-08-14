import React, { useState, useEffect, useRef } from 'react';
import { marked } from 'https://esm.sh/marked@^12.0.2';
import DOMPurify from 'https://esm.sh/dompurify@^3.1.0';
import { Worklet, DisplaySettings, PrefillWorklet } from '../types.ts';
import { SparklesIcon, PlusIcon } from './icons.tsx';

// Configure marked to handle line breaks correctly
marked.setOptions({
  breaks: true,
});

const MessageBubble: React.FC<{ role: 'user' | 'model', text: string, isLoading?: boolean }> = ({ role, text, isLoading }) => {
  const isModel = role === 'model';
  const bubbleClasses = isModel
    ? 'bg-white text-slate-800 self-start shadow-lg border border-slate-200/60'
    : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white self-end shadow-md';

  const [html, setHtml] = useState('');

  useEffect(() => {
    if (isModel) {
      const textToParse = text.trim() ? text : '';
      Promise.resolve(marked.parse(textToParse)).then(parsedHtml => {
        const sanitizedHtml = DOMPurify.sanitize(parsedHtml as string);
        const finalHtml = sanitizedHtml + (isLoading ? '<span class="blinking-cursor"></span>' : '');
        setHtml(finalHtml);
      });
    }
  }, [text, isModel, isLoading]);

  return (
    <div className={`max-w-xl w-fit p-3 rounded-2xl ${bubbleClasses} fade-in-up`} style={{ animationDuration: '0.3s' }}>
      {isModel ? (
        <div className="prose prose-sm max-w-none text-slate-800" dangerouslySetInnerHTML={{ __html: html }} />
      ) : (
        <div className="whitespace-pre-wrap font-sans">{text}</div>
      )}
    </div>
  );
};

interface AiAssistantViewProps {
  worklets: Worklet[];
  displaySettings: DisplaySettings;
  onNavigateWithPrefill: (data: PrefillWorklet) => void;
}

const AiAssistantView: React.FC<AiAssistantViewProps> = ({ worklets, displaySettings, onNavigateWithPrefill }) => {
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string, prefillData?: PrefillWorklet | null }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);
  const systemPromptRef = useRef<string>('');

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  useEffect(() => {
    if (isInitialized.current && !isOffline) return;

    const initChat = async () => {
      setIsLoading(true);

      if (isOffline) {
        setMessages([{ role: 'model', text: 'You seem to be offline. The AI Assistant requires an internet connection to function.' }]);
        setIsLoading(false);
        return;
      }

      try {
        isInitialized.current = true;

        const simplifiedWorklets = worklets.map(w => {
          const { dailyWorkload, dailyTasks, subtasks, undoState, ...rest } = w as any;
          return { ...rest, details: rest.details?.substring(0, 100) + '...' };
        });

        const systemPrompt = `You are Gemini Scheduler's AI Assistant, a friendly and expert academic helper. 
... (KEEP YOUR FULL TRAINING PROMPT HERE UNCHANGED) ...
Current Date: ${new Date().toLocaleDateString()}
User's Timezone: ${displaySettings.timeZone}
User's Schedule (Worklets): ${JSON.stringify(simplifiedWorklets, null, 2)}
... (REST OF PROMPT) ...
`;

        systemPromptRef.current = systemPrompt;

        setMessages([{ role: 'model', text: 'Hello! How can I help you with your schedule or studies today?' }]);
      } catch (error) {
        console.error("Error initializing AI chat:", error);
        setMessages([{ role: 'model', text: 'Sorry, I was unable to initialize the AI Assistant.' }]);
      } finally {
        setIsLoading(false);
      }
    };
    initChat();
  }, [worklets, displaySettings, isOffline]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = { role: 'user' as const, text: messageText };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    if (isOffline) {
      setMessages(prev => [...prev, { role: 'model', text: "AI Assistant cannot work while offline." }]);
      return;
    }

    setIsLoading(true);

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          systemPrompt: systemPromptRef.current,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Server error');

      let currentResponse = data.text || '';

      const prefillRegex = /\[CREATE_WORKLET_JSON\]([\s\S]*?)\[\/CREATE_WORKLET_JSON\]/;
      const match = currentResponse.match(prefillRegex);
      let prefillData = null;
      let cleanedText = currentResponse;

      if (match && match[1]) {
        try {
          prefillData = JSON.parse(match[1]);
          cleanedText = currentResponse.replace(prefillRegex, '').trim();
        } catch (e) {
          console.error("Failed to parse AI prefill JSON", e);
        }
      }

      setMessages(prev => [...prev, { role: 'model', text: cleanedText, prefillData }]);
    } catch (error: any) {
      console.error("Error sending message to AI:", error);
      setMessages(prev => [...prev, { role: 'model', text: `Sorry, I encountered an error: ${error?.message || error}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const suggestions = [
    "What's on my schedule for today?",
    "Create a study plan for my chemistry exam next Friday.",
    "Explain the main features of this app.",
    "Give me a 5-question quiz on World War II.",
  ];

  const showSuggestions = !isLoading && !isOffline && messages.length > 0 && messages[messages.length - 1].role === 'model';

  return (
    <div className="h-[calc(100vh-120px)] sm:h-[calc(100vh-80px)] flex flex-col bg-gradient-to-br from-sky-50 via-slate-50 to-blue-100">
      <div className="flex-grow p-4 space-y-4 overflow-y-auto" ref={chatContainerRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`flex flex-col items-${msg.role === 'user' ? 'end' : 'start'}`}>
            <MessageBubble
              role={msg.role}
              text={msg.text}
              isLoading={isLoading && index === messages.length - 1}
            />
            {msg.prefillData && (
              <button
                onClick={() => onNavigateWithPrefill(msg.prefillData!)}
                className="mt-2 px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition-all shadow-md flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Create: {msg.prefillData.name || 'New Item'}
              </button>
            )}
          </div>
        ))}
        {messages.length === 0 && isLoading && (
          <div className="flex justify-center items-center h-full">
            <div className="text-center text-slate-500">
              <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="font-semibold">Warming up the AI assistant...</p>
            </div>
          </div>
        )}
      </div>

      {showSuggestions && (
        <div className="flex-shrink-0 px-4 pb-2">
          <div className="flex flex-wrap items-center justify-start gap-2">
            {suggestions.map((suggestion, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(suggestion)}
                className="px-3 py-1.5 bg-white/80 border border-slate-200 backdrop-blur-sm text-slate-700 rounded-full text-sm font-medium hover:bg-white hover:border-slate-300 hover:shadow-md hover:-translate-y-0.5 transform transition-all duration-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-shrink-0 p-4 bg-white/70 backdrop-blur-sm border-t border-slate-200/80">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder={isOffline ? "AI Assistant is offline" : "Ask me anything about your schedule or studies..."}
            className="w-full p-3 bg-slate-100/50 border border-slate-300/70 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white outline-none transition-all text-slate-900 resize-none disabled:cursor-not-allowed disabled:bg-slate-100"
            rows={1}
            disabled={isLoading || isOffline}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim() || isOffline}
            className="p-3 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed transition-all"
          >
            <SparklesIcon className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AiAssistantView;
