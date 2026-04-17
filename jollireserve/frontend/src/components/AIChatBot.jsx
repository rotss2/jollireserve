import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';

const MOCK_RESPONSES = {
  greeting: [
    "Hello! I'm JolliBot, your AI dining assistant! 🍗",
    "I can help you book tables, check queue status, or recommend menu items!",
    "What would you like to do today?"
  ],
  reservation: [
    "I'd be happy to help you make a reservation! 📅",
    "What date and time works best for you?",
    "Also, how many people will be joining?"
  ],
  queue: [
    "Let me check the current queue for you... 🔍",
    "Right now there are about 8 parties ahead.",
    "Estimated wait time: 20-25 minutes.",
    "Would you like me to add you to the queue?"
  ],
  menu: [
    "Our most popular items today are:",
    "🥇 2pc Chicken Joy with Spaghetti",
    "🥇 Peach Mango Pie (freshly baked!)",
    "🥇 Jolly Hotdog with Cheese",
    "Would you like to pre-order any of these?"
  ],
  payment: [
    "We accept GCash, Maya, GrabPay, and credit cards! 💳",
    "All payments are secure and encrypted.",
    "Would you like me to show you the payment options?"
  ],
  vip: [
    "You're currently a Silver member! 🥈",
    "You're only 150 points away from Gold status.",
    "Gold members get priority seating and exclusive menu previews!"
  ],
  help: [
    "Here's what I can do for you:",
    "• 📅 Make or modify reservations",
    "• 🐝 Join or check queue status",
    "• 🍗 Browse menu and pre-order",
    "• 💳 Process payments",
    "• 🏆 Check your loyalty status",
    "What can I help you with?"
  ],
  default: [
    "I understand! Let me help you with that. 🤔",
    "Could you provide a bit more detail so I can assist better?",
    "Or type 'help' to see what I can do!"
  ]
};

const KEYWORDS = {
  book: 'reservation',
  reserve: 'reservation',
  table: 'reservation',
  queue: 'queue',
  wait: 'queue',
  line: 'queue',
  menu: 'menu',
  food: 'menu',
  order: 'menu',
  chicken: 'menu',
  pay: 'payment',
  payment: 'payment',
  gcash: 'payment',
  points: 'vip',
  vip: 'vip',
  status: 'vip',
  loyalty: 'vip',
  help: 'help',
  hi: 'greeting',
  hello: 'greeting',
  hey: 'greeting'
};

function detectIntent(message) {
  const lower = message.toLowerCase();
  for (const [keyword, intent] of Object.entries(KEYWORDS)) {
    if (lower.includes(keyword)) return intent;
  }
  return 'default';
}

export default function AIChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setHasGreeted(true);
      sendBotMessage(MOCK_RESPONSES.greeting);
    }
  }, [isOpen, hasGreeted]);

  const sendBotMessage = async (responses, delay = 800) => {
    setIsTyping(true);
    for (const text of responses) {
      await new Promise(r => setTimeout(r, delay));
      setMessages(prev => [...prev, { type: 'bot', text, id: Date.now() + Math.random() }]);
    }
    setIsTyping(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setMessages(prev => [...prev, { type: 'user', text: userMessage, id: Date.now() }]);
    setInput('');

    // Simulate AI thinking
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 1000));

    const intent = detectIntent(userMessage);
    const responses = MOCK_RESPONSES[intent] || MOCK_RESPONSES.default;
    
    setIsTyping(false);
    sendBotMessage(responses, 600);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 ${
          isOpen 
            ? 'bg-[var(--text-muted)] rotate-90' 
            : 'bg-[var(--red)] hover:bg-[var(--red2)] glow-red'
        }`}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <div className="relative">
            <MessageCircle className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 card-premium animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[var(--red)] to-[var(--red2)] p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-6 h-6" />
                </div>
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-yellow-300" />
              </div>
              <div>
                <p className="font-bold">JolliBot AI</p>
                <p className="text-xs text-white/80 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Online • Ready to help
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-3 bg-[var(--bg-body)]">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.type === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-[var(--red)]/10 flex items-center justify-center mr-2 flex-shrink-0">
                    <Bot className="w-4 h-4 text-[var(--red)]" />
                  </div>
                )}
                <div className={`max-w-[80%] ${
                  msg.type === 'user' 
                    ? 'chat-bubble-user' 
                    : 'chat-bubble-bot'
                }`}>
                  <p className="text-sm">{msg.text}</p>
                </div>
                {msg.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[var(--bg-subtle)] flex items-center justify-center ml-2 flex-shrink-0">
                    <User className="w-4 h-4 text-[var(--text-muted)]" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-8 h-8 rounded-full bg-[var(--red)]/10 flex items-center justify-center mr-2">
                  <Bot className="w-4 h-4 text-[var(--red)]" />
                </div>
                <div className="chat-bubble-bot flex items-center gap-1 py-3">
                  <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-[var(--text-muted)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          {messages.length > 0 && messages.length < 4 && (
            <div className="px-4 py-2 bg-[var(--bg-subtle)] border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] mb-2">Quick Actions:</p>
              <div className="flex flex-wrap gap-2">
                {['Book a table', 'Check queue', 'View menu', 'My VIP status'].map((action) => (
                  <button
                    key={action}
                    onClick={() => {
                      setInput(action);
                      handleSend();
                    }}
                    className="text-xs px-3 py-1.5 bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-full hover:border-[var(--red)] hover:text-[var(--red)] transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 border-t border-[var(--border)] bg-[var(--bg-card)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="flex-1 px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border)] rounded-full text-sm focus:outline-none focus:border-[var(--red)] transition-colors"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim()}
                className="p-2.5 bg-[var(--red)] text-white rounded-full hover:bg-[var(--red2)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-faint)] text-center mt-2">
              AI responses are simulated for demo purposes
            </p>
          </div>
        </div>
      )}
    </>
  );
}
