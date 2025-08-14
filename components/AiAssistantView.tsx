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
  // Updated bubble styles for better aesthetics
  const bubbleClasses = isModel
    ? 'bg-white text-slate-800 self-start shadow-md border border-slate-200/60'
    : 'bg-blue-600 text-white self-end shadow-md';

  const [html, setHtml] = useState('');

  useEffect(() => {
    if (isModel) {
      const textToParse = text.trim() ? text : '';
      // Use a Promise to handle async parsing of markdown
      Promise.resolve(marked.parse(textToParse)).then(parsedHtml => {
        const sanitizedHtml = DOMPurify.sanitize(parsedHtml as string);
        // Append blinking cursor if the model is generating a response
        const finalHtml = sanitizedHtml + (isLoading ? '<span class="blinking-cursor"></span>' : '');
        setHtml(finalHtml);
      });
    }
  }, [text, isModel, isLoading]);

  return (
    <div className={`max-w-xl w-fit py-2 px-4 rounded-2xl ${bubbleClasses} fade-in-up`} style={{ animationDuration: '0.3s' }}>
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // NEW: keep the system prompt for the server call
  const systemPromptRef = useRef<string>('');

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto'; // Reset height to recalculate
      const scrollHeight = textarea.scrollHeight;
      const maxHeight = 200; // Corresponds to max-h-[200px]
      if (scrollHeight > maxHeight) {
        textarea.style.height = `${maxHeight}px`;
        textarea.style.overflowY = 'auto';
      } else {
        textarea.style.height = `${scrollHeight}px`;
        textarea.style.overflowY = 'hidden';
      }
    }
  }, [input]);

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
          return { ...rest, details: rest.details?.substring(0, 100) + '...' }; // Truncate details
        });

        const systemPrompt = `You are Gemini Scheduler's AI Assistant, a friendly and expert academic helper. Your goal is to assist users with their schedule and academic tasks.

--- START OF TRAINING DATA ---
# Gemini Scheduler AI Training Data

This file contains important information about the application's features and behavior. Use this knowledge to provide accurate and helpful responses to the user.

## About The App
The Gemini Scheduler is an intelligent application engineered by Nami Manshaei. It helps users manage their academic life by dynamically planning and distributing their workload.

## Core Features Explained
- **Dashboard (QuickLook):** The main screen. It shows overdue tasks and a 7-day forecast of scheduled work.
- **Smart Scheduling (Assignments & Exams):** When a user creates an Assignment or Exam, the app can automatically create a daily study plan. Users add subtasks (e.g., "Read 20 pages", "Solve 10 problems") with a "weight" (20 pages, 10 problems). The app distributes this total weight across the available study days leading up to the deadline.
- **Work Redistribution:** If a user misses a study day for an assignment, they can click the "Redistribute" button on the dashboard. This automatically moves the missed work to the remaining future study days. This action can be undone from the "Reschedules" view.
- **Habit Tracker:** Allows users to create and track daily or weekly habits. The app displays current and longest streaks to help with motivation.
- **Calendar View:** Provides a full calendar with year, month, week, and day views. It supports importing and exporting events using \`.ics\` files, making it compatible with Google Calendar, Apple Calendar, etc.
- **Materials Library & Playground:** This is a powerful feature. Users can upload study materials (PDFs, videos, audio) and link them to assignments. The "Playground" is a dedicated study space.
    - **For PDFs:** It's an advanced annotation tool. Users can draw, highlight, add text, and use a lasso eraser.
    - **For Notebooks:** It's a digital notebook. Users can write, draw, and even import images or entire PDF files page-by-page into the notebook for annotation. Notebook pages can have different backgrounds (blank, lines, grid).
- **Speed Check:** A feature to time how long it takes to complete a certain number of units (e.g., pages, problems). It helps users understand their work pace and provides analytics on their performance over time.
- **Analytics:** This view provides charts and stats on user productivity, such as overall task completion rate, most productive days of the week, and a heatmap of activity.

## Your AI Assistant Role
- **Be an Expert on the App:** Use the feature descriptions above to answer user questions like "How does redistribution work?" or "Can I annotate my PDFs?".
- **Manage the Schedule:** Answer questions about what's due based on the provided schedule data.
- **Initiate Task Creation:** This is a key function. When a user asks to create something, use the \`[CREATE_WORKLET_JSON]\` format to pre-fill the creation form for them.
- **Act as a Tutor:** Help users with their academic subjects. Explain concepts, help with problem-solving, etc.
--- END OF TRAINING DATA ---

Based on the training data above, here is the live information for the user:
Current Date: ${new Date().toLocaleDateString()}
User's Timezone: ${displaySettings.timeZone}
User's Schedule (Worklets): ${JSON.stringify(simplifiedWorklets, null, 2)}

Your Capabilities:
1.  **Answer Questions:** Answer questions about the user's schedule and app features based on the provided JSON data and training data.
2.  **Provide Academic Help:** Act as a tutor. Explain concepts, help with problem-solving, etc.
3.  **Initiate Worklet Creation:** If a user asks to create a task (assignment, exam, event, etc.), you MUST generate a special JSON block within your response. This block will be used by the app to pre-fill the creation form.

**Creation Request Rules:**
- When you detect a creation request, respond with a friendly message and the JSON block.
- The block format is \`[CREATE_WORKLET_JSON]{"key": "value", ...}[/CREATE_WORKLET_JSON]\`.
- The JSON object MUST conform to the following schema. Only include fields you can confidently extract from the user's request.
- For \`deadline\`, do your best to convert natural language (e.g., "next Wednesday at 9pm") into a full ISO 8601 string format (\`YYYY-MM-DDTHH:mm\`) based on the current date and user's timezone.

**JSON Schema:**
{
  "type": "Assignment" | "Exam" | "Event" | "Routine" | "Birthday",
  "name": "string",
  "details": "string",
  "deadline": "string (ISO 8601 format: YYYY-MM-DDTHH:mm)",
  "subtasks": [{ "name": "string", "weight": number }],
  "schedule": [{ "dayOfWeek": number (0-6, Sun-Sat), "time": "HH:mm" }],
  "birthMonth": number,
  "birthDay": number
}

**Example Interaction:**
User: "create a physics assignment for a physics worksheet due to next wednesday 9:00 PM the worksheet includes 20 questions"
Your Response: "I can set that up for you! Just click the button below to review and save the assignment. [CREATE_WORKLET_JSON]{\\"type\\":\\"Assignment\\",\\"name\\":\\"Physics Worksheet\\",\\"details\\":\\"Complete the 20-question physics worksheet.\\",\\"deadline\\":\\"YYYY-MM-DDTHH:mm\\",\\"subtasks\\":[{\\"name\\":\\"Complete 20 questions\\",\\"weight\\":20}]}[/CREATE_WORKLET_JSON]"

General Rules:
- Be concise, friendly, and encouraging.
- Use markdown for readability (* for lists, ** for bold).
`;

        // Save for server use
        systemPromptRef.current = systemPrompt;

        // Greet
        setMessages([{ role: 'model', text: 'Hello! How can I help you with your schedule or studies today?' }]);
      } catch (error) {
        console.error("Error initializing AI chat:", error);
        setMessages([{ role: 'model', text: 'Sorry, I was unable to initialize the AI Assistant. Please check if the API key is configured correctly or if the training data file is missing.' }]);
      } finally {
        setIsLoading(false);
      }
    };
    initChat();
  }, [worklets, displaySettings, isOffline]);

  // Replaces the client SDK streaming with a POST to your Netlify function
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
      // Add a placeholder model message so the blinking cursor shows while loading
      setMessages(prev => [...prev, { role: 'model', text: '' }]);

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

      // Extract optional [CREATE_WORKLET_JSON]...[/CREATE_WORKLET_JSON] block
      const prefillRegex = /\[CREATE_WORKLET_JSON\]([\s\S]*?)\[\/CREATE_WORKLET_JSON\]/;
      const match = currentResponse.match(prefillRegex);
      let prefillData: PrefillWorklet | null = null;
      let cleanedText = currentResponse;

      if (match && match[1]) {
        try {
          prefillData = JSON.parse(match[1]);
          cleanedText = currentResponse.replace(prefillRegex, '').trim();
        } catch (e) {
          console.error("Failed to parse AI prefill JSON", e);
        }
      }

      // Replace the placeholder model message with the final content
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'model', text: cleanedText, prefillData };
        return newMessages;
      });

    } catch (error: any) {
      console.error("Error sending message to AI:", error);
      // Replace placeholder with error text if present
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages.length && newMessages[newMessages.length - 1].role === 'model' && newMessages[newMessages.length - 1].text === '') {
          newMessages[newMessages.length - 1] = { role: 'model', text: 'Sorry, I encountered an error. Please try again.' };
        } else {
          newMessages.push({ role: 'model', text: 'Sorry, I encountered an error. Please try again.' });
        }
        return newMessages;
      });
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
    // The -mb-32 class counteracts the pb-32 from the main app layout in App.tsx, preventing the whole page from scrolling.
    <div className="h-[calc(100vh-100px)] sm:h-[calc(100vh-80px)] flex flex-col -mb-32">
      <div className="flex-1 w-full max-w-3xl mx-auto p-4 space-y-6 overflow-y-auto" ref={chatContainerRef}>
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

      <div className="flex-shrink-0 w-full">
        {/* Adjusted padding-bottom to move input lower on mobile. */}
        <div className="w-full max-w-3xl mx-auto p-4 sm:pb-4 pb-10">
          {showSuggestions && (
            <div className="pb-3 flex-wrap items-center justify-start gap-2 hidden sm:flex">
              {suggestions.map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-medium hover:bg-slate-100 hover:border-slate-300 transform transition-all duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="relative bg-white/90 backdrop-blur-md border border-slate-300/70 rounded-xl shadow-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={isOffline ? "AI Assistant is offline" : "Ask me anything..."}
              className="w-full p-3 pr-14 bg-transparent border-none outline-none transition-all text-slate-900 resize-none disabled:cursor-not-allowed disabled:bg-transparent placeholder:text-slate-400 focus:ring-0"
              rows={1}
              style={{ minHeight: '52px', maxHeight: '200px' }}
              disabled={isLoading || isOffline}  // removed !chat
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim() || isOffline} // removed !chat
              className="absolute right-2 bottom-2 p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all"
            >
              <SparklesIcon className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AiAssistantView;
