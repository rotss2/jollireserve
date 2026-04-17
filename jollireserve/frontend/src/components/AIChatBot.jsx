import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';

// Enhanced AI Intent Detection System with scoring and context
const INTENT_PATTERNS = {
  greeting: {
    keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'yo', 'hola', 'howdy'],
    phrases: ['how are you', 'what\'s up', 'how is it going'],
    weight: 1
  },
  reservation: {
    keywords: ['book', 'reserve', 'table', 'booking', 'reservation', 'dine', 'dining', 'eat', 'seat', 'seating', 'table for'],
    phrases: ['make a reservation', 'book a table', 'reserve a spot', 'get a table', 'want to eat', 'like to dine', 'need a table'],
    weight: 1.2
  },
  queue: {
    keywords: ['queue', 'wait', 'line', 'waiting', 'turn', 'spot', 'walk in', 'walk-in', 'now', 'today', 'immediate'],
    phrases: ['join queue', 'get in line', 'waiting list', 'how long', 'current wait', 'walk in', 'available now'],
    weight: 1.2
  },
  menu: {
    keywords: ['menu', 'food', 'order', 'eat', 'meal', 'chicken', 'spaghetti', 'burger', 'drink', 'pie', 'price', 'cost', 'how much'],
    phrases: ['what do you have', 'what\'s on the menu', 'show me food', 'recommend', 'what is good', 'best seller', 'popular'],
    weight: 1
  },
  payment: {
    keywords: ['pay', 'payment', 'gcash', 'maya', 'grabpay', 'card', 'credit', 'debit', 'cash', 'money', 'price', 'cost', 'bill', 'checkout'],
    phrases: ['how to pay', 'payment method', 'can i pay', 'accept payment', 'payment options'],
    weight: 1.1
  },
  vip: {
    keywords: ['vip', 'points', 'loyalty', 'member', 'status', 'tier', 'gold', 'silver', 'platinum', 'reward', 'benefit', 'exclusive'],
    phrases: ['my points', 'membership status', 'loyalty program', 'vip benefits', 'check points', 'how many points'],
    weight: 1
  },
  cancel: {
    keywords: ['cancel', 'remove', 'delete', 'change', 'modify', 'update', 'edit', 'reschedule'],
    phrases: ['cancel reservation', 'change booking', 'modify order', 'want to cancel', 'need to change'],
    weight: 1.3
  },
  location: {
    keywords: ['location', 'address', 'where', 'find', 'direction', 'map', 'branch', 'store', 'restaurant'],
    phrases: ['where are you', 'how to get there', 'what is the address', 'location please'],
    weight: 0.9
  },
  hours: {
    keywords: ['hour', 'time', 'open', 'close', 'opening', 'closing', 'when', 'schedule', 'operating'],
    phrases: ['what time', 'when do you open', 'when do you close', 'business hours', 'opening hours'],
    weight: 0.9
  },
  help: {
    keywords: ['help', 'support', 'assist', 'question', 'how to', 'what can', 'guide', 'explain'],
    phrases: ['i need help', 'can you help', 'how do i', 'what should i', 'assistance'],
    weight: 1
  },
  complaint: {
    keywords: ['bad', 'terrible', 'awful', 'problem', 'issue', 'complaint', 'unhappy', 'disappointed', 'slow', 'rude'],
    phrases: ['not happy', 'very bad', 'not satisfied', 'poor service', 'waiting too long'],
    weight: 1.5
  },
  compliment: {
    keywords: ['good', 'great', 'excellent', 'amazing', 'love', 'awesome', 'best', 'perfect', 'wonderful', 'delicious'],
    phrases: ['so good', 'really great', 'love it', 'best experience', 'highly recommend'],
    weight: 1
  },
  goodbye: {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'thanks', 'thank you', 'cya'],
    phrases: ['thank you', 'thanks for', 'see you later', 'have a good', 'that\'s all'],
    weight: 0.8
  }
};

// Context-aware response system
const CONVERSATION_CONTEXT = {
  lastIntent: null,
  userName: null,
  reservationInProgress: false,
  lastTopic: null
};

// Smart response generator with context
const generateSmartResponse = (intent, message, context) => {
  const lowerMsg = message.toLowerCase();
  
  // Check for specific concerns/issues
  if (intent === 'complaint') {
    return [
      "I'm sorry to hear about your experience. �",
      "Let me help resolve this issue for you right away.",
      "Would you like me to connect you with a manager, or is there something specific I can help fix?"
    ];
  }
  
  if (intent === 'cancel') {
    return [
      "I can help you cancel or modify your booking. 📝",
      "Are you looking to cancel a reservation or leave the queue?",
      "Just let me know which one and I'll guide you through it!"
    ];
  }
  
  if (intent === 'reservation') {
    // Check if they mentioned date/time/party size
    const hasDate = /\d{1,2}\/\d{1,2}|tomorrow|today|next|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i.test(message);
    const hasTime = /\d{1,2}:\d{2}|am|pm|noon|morning|evening/i.test(message);
    const hasParty = /\d+\s*(people|person|guest|pax)/i.test(message);
    
    if (hasDate && hasTime && hasParty) {
      return [
        "Perfect! I have all the details for your reservation. 📅",
        "Let me confirm: You want a table for the date and time you mentioned, right?",
        "Click the 'Book a Table' button below to complete your reservation!"
      ];
    } else if (hasDate || hasTime || hasParty) {
      const missing = [];
      if (!hasDate) missing.push("date");
      if (!hasTime) missing.push("time");
      if (!hasParty) missing.push("party size");
      
      return [
        `Great start! I see you mentioned some details. 👍`,
        `I still need the ${missing.join(' and ')} to complete your reservation.`,
        "What would those be?"
      ];
    }
    
    return [
      "I'd love to help you make a reservation! 📅",
      "To get started, I'll need:",
      "• Date (e.g., today, tomorrow, or specific date)",
      "• Time (e.g., 7:00 PM)",
      "• Party size (e.g., 4 people)",
      "What works for you?"
    ];
  }
  
  if (intent === 'queue') {
    // Check if asking about current wait time
    if (/how long|wait time|how many|current/i.test(lowerMsg)) {
      return [
        "Let me check the current queue status for you... 🔍",
        "Right now there are about 8 parties ahead of you.",
        "Estimated wait time: 20-25 minutes.",
        "Would you like me to add you to the queue so you don't have to wait at the restaurant?"
      ];
    }
    
    return [
      "I can help you join our virtual queue! 🐝",
      "Just provide your party size and I'll add you to the line.",
      "You'll get real-time updates on your position via SMS.",
      "How many people are in your party?"
    ];
  }
  
  if (intent === 'menu') {
    // Check for specific food queries
    if (/chicken|spaghetti|burger|pie|drink|dessert/i.test(lowerMsg)) {
      return [
        "Great choice! 🍽️",
        "That item is one of our best sellers!",
        "Would you like to pre-order this when making your reservation?",
        "Click 'View Menu' to see all our delicious options!"
      ];
    }
    
    return [
      "Here's what our customers love most: 🌟",
      "🥇 2pc Chicken Joy with Rice - ₱150",
      "🥇 Jolly Spaghetti - ₱120", 
      "🥇 Peach Mango Pie - ₱45",
      "🥇 Yumburger - ₱85",
      "Would you like to see the full menu or pre-order something?"
    ];
  }
  
  if (intent === 'payment') {
    return [
      "We accept multiple payment options! 💳",
      "• GCash - Most popular, instant confirmation",
      "• Maya - Quick and secure",
      "• GrabPay - Earn GrabRewards",
      "• Credit/Debit Card - Visa, Mastercard",
      "• Cash - Pay at the counter",
      "Which payment method would you prefer?"
    ];
  }
  
  if (intent === 'vip') {
    return [
      "You're currently a Silver Member! 🥈",
      "Points: 350/500 (150 more to Gold!)",
      "",
      "Your current benefits:",
      "⚡ Priority seating (skip 2 queue spots)",
      "🎁 Free Peach Mango Pie on your birthday",
      "",
      "Gold benefits you'll unlock:",
      "👑 10% discount on all orders",
      "🍽️ Exclusive menu previews",
      "Keep dining with us to level up!"
    ];
  }
  
  if (intent === 'hours') {
    return [
      "Our operating hours are:",
      "📅 Monday - Friday: 9:00 AM - 10:00 PM",
      "📅 Saturday - Sunday: 8:00 AM - 11:00 PM",
      "📅 Holidays: 9:00 AM - 9:00 PM",
      "",
      "Peak hours are usually 12:00-2:00 PM and 6:00-8:00 PM",
      "I recommend booking in advance during these times!"
    ];
  }
  
  if (intent === 'location') {
    return [
      "📍 Jollibee Main Branch",
      "123 Main Street, City Center",
      "Near the Central Park Mall",
      "",
      "Landmarks: Next to Starbucks, across from City Hall",
      "Parking available at the mall (validated for diners)",
      "",
      "Need directions? I can help you find the best route!"
    ];
  }
  
  if (intent === 'help') {
    return [
      "Here's everything I can help you with! �",
      "",
      "📅 Reservations - Book a table in advance",
      "🐝 Queue - Join our virtual waiting line",
      "🍗 Menu - Browse food and pre-order",
      "💳 Payment - Payment methods and processing",
      "🏆 VIP - Check your loyalty status and points",
      "⏰ Hours - Operating hours and peak times",
      "📍 Location - Find us and get directions",
      "",
      "What would you like to know more about?"
    ];
  }
  
  if (intent === 'goodbye') {
    return [
      "You're welcome! 🌟",
      "Thanks for choosing Jollibee!",
      "Have a great day and we look forward to serving you! 🍗"
    ];
  }
  
  // Default contextual response
  return [
    "I'm here to help! 🤔",
    "I can assist with reservations, queue, menu, payments, or VIP status.",
    "What would you like to do? (Type 'help' for all options)"
  ];
};

// Advanced intent detection with scoring
function detectIntentAdvanced(message) {
  const lower = message.toLowerCase();
  const scores = {};
  
  // Score each intent based on keyword matches
  for (const [intent, data] of Object.entries(INTENT_PATTERNS)) {
    let score = 0;
    
    // Check keywords
    for (const keyword of data.keywords) {
      if (lower.includes(keyword)) {
        score += data.weight;
        // Bonus for exact word match (not substring)
        const wordBoundary = new RegExp(`\\b${keyword}\\b`, 'i');
        if (wordBoundary.test(lower)) {
          score += 0.5;
        }
      }
    }
    
    // Check phrases (higher weight)
    for (const phrase of data.phrases) {
      if (lower.includes(phrase)) {
        score += data.weight * 2;
      }
    }
    
    scores[intent] = score;
  }
  
  // Find highest scoring intent
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topIntent, topScore] = sorted[0];
  
  // Only return intent if score is meaningful
  if (topScore >= 0.5) {
    return topIntent;
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

    const intent = detectIntentAdvanced(userMessage);
    const responses = generateSmartResponse(intent, userMessage, CONVERSATION_CONTEXT);
    
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
          <span className="text-2xl">✕</span>
        ) : (
          <div className="relative">
            <span className="text-2xl">💬</span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 card-premium animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="ai-chatbot-header">
            <div className="flex items-center gap-2">
              <div className="ai-chatbot-avatar">
                <span className="text-lg">🤖</span>
              </div>
              <div>
                <h3 className="font-bold text-sm">JolliBot AI</h3>
                <p className="text-[10px] opacity-90 flex items-center gap-1">
                  <span>✨</span>
                  Premium Assistant
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close chat"
            >
              <span className="text-xl">✕</span>
            </button>
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
                    <span className="text-sm">🤖</span>
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
                    <span className="text-sm">👨</span>
                  </div>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="ai-chatbot-message bot">
                <div className="flex items-start gap-2">
                  <div className="ai-chatbot-avatar flex-shrink-0">
                    <span className="text-sm">🤖</span>
                  </div>
                  <div className="ai-chatbot-bubble bot">
                    <div className="ai-chatbot-typing">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
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
          <div className="ai-chatbot-input">
            <form onSubmit={(e) => e.preventDefault()} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type a message..."
                className="w-full pl-4 pr-12 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--red)] transition-colors"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-[var(--red)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--red-hover)] transition-colors"
                aria-label="Send message"
              >
                <span className="text-sm">➤</span>
              </button>
            </form>
            <p className="text-[10px] text-[var(--text-faint)] text-center mt-2">
              AI responses are simulated for demo purposes
            </p>
          </div>
        </div>
      )}
    </>
  );
}
