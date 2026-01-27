import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2 } from 'lucide-react';
import { ChatMessage, ExtractedEntity, RiskReport } from '../types';
import { sendChatMessage } from '../services/geminiService';

interface ChatWidgetProps {
  entity: ExtractedEntity | null;
  riskReport: RiskReport | null;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ entity, riskReport }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      // Construct relevant context for the AI
      let contextString = "";
      if (entity) {
        contextString += `Entity: ${entity.name} (${entity.type})\nID: ${entity.idNumber || 'N/A'}\nAddress: ${entity.address || 'N/A'}\n`;
      }
      if (riskReport) {
        contextString += `Risk Assessment:\nScore: ${riskReport.riskScore}/100 (${riskReport.riskLevel})\nFlags: ${riskReport.redFlags.join(', ')}\nRecommendation: ${riskReport.recommendation}\nSummary: ${riskReport.summary}`;
      }

      const responseText = await sendChatMessage(history, userMsg.text, contextString);

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "I couldn't process that request.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, I encountered an error connecting to the intelligence engine.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <div className="mb-4 w-80 sm:w-96 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl overflow-hidden flex flex-col h-[500px]">
          <div className="bg-brand-900 p-4 flex justify-between items-center border-b border-slate-700">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span className="bg-brand-500 w-2 h-2 rounded-full"></span>
              FoundLab Assistant
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-white">
              <X size={18} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900">
            {messages.length === 0 && (
              <div className="text-center text-slate-500 mt-10 p-4">
                <p className="mb-2">Ask about FATF regulations, specific entity risks, or KYC procedures.</p>
                {entity && (
                  <p className="text-xs text-brand-400">
                    Active Context: {entity.name}
                  </p>
                )}
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-3 text-sm ${
                  msg.role === 'user' 
                    ? 'bg-brand-600 text-white rounded-br-none' 
                    : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 p-3 rounded-lg rounded-bl-none border border-slate-700">
                  <Loader2 className="animate-spin h-4 w-4 text-brand-400" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 bg-slate-800 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Gemini..."
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-brand-600 hover:bg-brand-500 text-white p-2 rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-brand-600 hover:bg-brand-500 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-105"
      >
        <MessageSquare size={24} />
      </button>
    </div>
  );
};

export default ChatWidget;