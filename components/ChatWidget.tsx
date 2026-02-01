
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, Type, FunctionDeclaration } from '@google/genai';
import { decode, decodeAudioData, createBlob } from '../services/audioUtils';
import { SYSTEM_INSTRUCTION, WELCOME_MESSAGE, WEBSITE_URL, SUPPORTED_LANGUAGES, FARM_DEPOT_LOGO } from '../constants';
import VoiceButton from './VoiceButton';

interface ChatWidgetProps {
  isOpen: boolean;
  onToggle: () => void;
}

const ModelTypingIndicator = () => (
  <div className="flex gap-1 p-2.5 bg-white border border-primary/5 rounded-2xl w-14 justify-center shadow-sm ml-2">
    <div className="w-1.5 h-1.5 bg-secondary/60 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
    <div className="w-1.5 h-1.5 bg-secondary/60 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
    <div className="w-1.5 h-1.5 bg-secondary/60 rounded-full animate-bounce"></div>
  </div>
);

const UserTypingIndicator = () => (
  <div className="flex gap-1.5 p-2 bg-primary/10 border border-primary/20 rounded-full w-fit px-4 justify-center shadow-sm mr-2 self-end items-center">
    <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">Voice Listening</span>
    <div className="flex gap-0.5">
      <div className="w-1 h-3 bg-primary rounded-full animate-pulse [animation-duration:0.5s]"></div>
      <div className="w-1 h-3 bg-primary rounded-full animate-pulse [animation-duration:0.7s]"></div>
      <div className="w-1 h-3 bg-primary rounded-full animate-pulse [animation-duration:0.6s]"></div>
    </div>
  </div>
);

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onToggle }) => {
  const [isLive, setIsLive] = useState(false);
  const [isModelSpeaking, setIsModelSpeaking] = useState(false);
  const [isUserTyping, setIsUserTyping] = useState(false);
  const [isModelTyping, setIsModelTyping] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([]);
  const [status, setStatus] = useState<string>('Ready');
  const [isMinimized, setIsMinimized] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('0');

  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const sessionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentOutputTranscriptionRef = useRef<string>('');
  const currentInputTranscriptionRef = useRef<string>('');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isModelTyping, isUserTyping, scrollToBottom]);

  const navigationFunctions: FunctionDeclaration[] = [
    {
      name: 'navigate_to_page',
      parameters: { type: Type.OBJECT, properties: { page: { type: Type.STRING } }, required: ['page'] },
    },
    {
      name: 'search_marketplace',
      parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ['query'] },
    },
    {
      name: 'subscribe_to_farmdepot',
      parameters: { type: Type.OBJECT, properties: { email: { type: Type.STRING } }, required: ['email'] },
    }
  ];

  const handleFunctionCall = useCallback((name: string, args: any) => {
    let targetUrl = WEBSITE_URL;
    if (name === 'navigate_to_page') {
      window.open(`${targetUrl}/${args.page.toLowerCase().replace('/', '')}`, '_blank');
      return `Navigating to ${args.page} now, my customer!`;
    }
    if (name === 'search_marketplace') {
      window.open(`${targetUrl}/?s=${encodeURIComponent(args.query)}&post_type=product`, '_blank');
      return `Searching for the best ${args.query} deals for you!`;
    }
    if (name === 'subscribe_to_farmdepot') {
      return `Correct choice! Successfully signed ${args.email} up for the best agro-updates.`;
    }
    return 'Done.';
  }, []);

  const stopSession = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    setIsLive(false);
    setIsModelSpeaking(false);
    setIsModelTyping(false);
    setIsUserTyping(false);
    setStatus('Ready');
    sourcesRef.current.forEach(s => { try { s.stop(); } catch (e) {} });
    sourcesRef.current.clear();
  }, []);

  const clearChat = () => setMessages([]);

  const startSession = async () => {
    if (isLive) return;
    try {
      setStatus('Connecting...');
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      if (!inputAudioCtxRef.current) inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (!outputAudioCtxRef.current) outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      if (outputAudioCtxRef.current.state === 'suspended') await outputAudioCtxRef.current.resume();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsLive(true);
            setStatus('Active');
            const source = inputAudioCtxRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(session => { if (session) session.sendRealtimeInput({ media: createBlob(inputData) }); });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioCtxRef.current!.destination);

            sessionPromise.then(session => {
              session.sendRealtimeInput({ text: "INTERNAL: User joined. Greet them with your characteristic energetic, charming Nigerian market seller persona! Use the following exactly: " + WELCOME_MESSAGE });
            });
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && outputAudioCtxRef.current) {
              setIsModelSpeaking(true);
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioCtxRef.current.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioCtxRef.current, 24000, 1);
              const source = outputAudioCtxRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputAudioCtxRef.current.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
              source.onended = () => {
                sourcesRef.current.delete(source);
                if (sourcesRef.current.size === 0) setIsModelSpeaking(false);
              };
            }

            if (message.serverContent?.inputTranscription) {
              setIsUserTyping(true);
              const text = message.serverContent.inputTranscription.text;
              currentInputTranscriptionRef.current += text;
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'user') {
                  newMessages[newMessages.length - 1] = { role: 'user', text: currentInputTranscriptionRef.current };
                  return newMessages;
                }
                return [...prev, { role: 'user', text: currentInputTranscriptionRef.current }];
              });
            }

            if (message.serverContent?.outputTranscription) {
              setIsUserTyping(false);
              setIsModelTyping(true);
              const text = message.serverContent.outputTranscription.text;
              currentOutputTranscriptionRef.current += text;
              setMessages(prev => {
                const newMessages = [...prev];
                if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'model') {
                  newMessages[newMessages.length - 1] = { role: 'model', text: currentOutputTranscriptionRef.current };
                  return newMessages;
                }
                return [...prev, { role: 'model', text: currentOutputTranscriptionRef.current }];
              });
            }

            if (message.serverContent?.turnComplete) {
              currentOutputTranscriptionRef.current = '';
              currentInputTranscriptionRef.current = '';
              setIsModelTyping(false);
              setIsUserTyping(false);
            }

            if (message.toolCall) {
              for (const fc of message.toolCall.functionCalls) {
                const result = handleFunctionCall(fc.name, fc.args);
                sessionPromise.then(session => { session.sendToolResponse({ functionResponses: [{ id: fc.id, name: fc.name, response: { result } }] }); });
              }
            }
          },
          onerror: () => { setStatus('Error'); stopSession(); },
          onclose: () => { setIsLive(false); setStatus('Offline'); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: navigationFunctions }],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } }
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { setStatus('Perms Error'); }
  };

  const handleSendText = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!textInput.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text: textInput }]);
    setIsModelTyping(true);
    if (sessionRef.current) {
      sessionRef.current.sendRealtimeInput({ text: textInput });
    } else {
      startSession().then(() => sessionRef.current?.sendRealtimeInput({ text: textInput }));
    }
    setTextInput('');
  };

  const handleLanguageSelect = (id: string) => {
    setSelectedLanguage(id);
    const langObj = SUPPORTED_LANGUAGES.find(l => l.id === id);
    const msg = `Oya! Switch language to ${langObj?.label} for me now!`;
    if (sessionRef.current) {
      sessionRef.current.sendRealtimeInput({ text: msg });
    } else {
      setMessages(prev => [...prev, { role: 'user', text: `Switch to ${langObj?.label}` }]);
      startSession().then(() => sessionRef.current?.sendRealtimeInput({ text: msg }));
    }
  };

  useEffect(() => { if (isOpen && !isLive) startSession(); }, [isOpen]);

  return (
    <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 flex flex-col pointer-events-auto border border-gray-100 ${isMinimized ? 'w-72 h-14' : 'w-80 md:w-96 h-[650px]'}`}>
      <div className="bg-primary p-4 flex items-center justify-between text-white shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center p-1 overflow-hidden shadow-inner">
             <img src={FARM_DEPOT_LOGO} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm leading-none">FarmDepot AI</span>
            <span className="text-[9px] font-medium opacity-80 uppercase tracking-widest mt-0.5">Mama FarmDepot</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={clearChat} className="text-[10px] font-bold px-2 py-1 bg-white/10 rounded-md hover:bg-white/20 uppercase">Clear</button>
          <button onClick={() => setIsMinimized(!isMinimized)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md">{isMinimized ? '+' : '-'}</button>
          <button onClick={onToggle} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded-md">✕</button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="bg-gray-50 px-4 py-2 border-b flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shadow-sm">
            <div className="flex gap-1.5">
              {SUPPORTED_LANGUAGES.map(lang => (
                <button
                  key={lang.id}
                  onClick={() => handleLanguageSelect(lang.id)}
                  className={`text-[10px] px-3 py-1 rounded-full border transition-all font-bold whitespace-nowrap ${selectedLanguage === lang.id ? 'bg-primary border-primary text-white shadow-md' : 'bg-white border-gray-200 text-gray-500 hover:border-primary/30'}`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-lightPrimary space-y-4">
            {messages.length === 0 && !isModelTyping && (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8 opacity-60">
                <img src={FARM_DEPOT_LOGO} className="w-16 h-16 grayscale opacity-20" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-tighter">Oya, Mama is joining soon...</p>
              </div>
            )}
            <div className="flex flex-col gap-4">
              {messages.map((m, i) => (
                <div key={i} className={`max-w-[85%] p-3.5 rounded-2xl shadow-sm text-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.role === 'user' ? 'bg-primary text-white self-end rounded-tr-none' : 'bg-white text-gray-800 self-start border border-primary/5 rounded-tl-none'}`}>
                  {m.text}
                </div>
              ))}
              
              {isUserTyping && <UserTypingIndicator />}
              {isModelTyping && <ModelTypingIndicator />}
              
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="p-4 border-t bg-white space-y-4">
            <form onSubmit={handleSendText} className="flex gap-2 items-center">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Chat with Mama..."
                className="flex-1 bg-gray-50 border-gray-200 border rounded-full px-5 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all"
              />
              <button type="submit" className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-white hover:scale-105 shadow-lg active:scale-95 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 rotate-90" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </button>
            </form>
            
            <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
              <div className="flex-1">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">Mama is:</div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span className="text-[11px] font-black text-gray-600 uppercase">{status}</span>
                </div>
              </div>
              <VoiceButton isActive={isLive} isSpeaking={isModelSpeaking} onClick={isLive ? stopSession : startSession} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ChatWidget;
