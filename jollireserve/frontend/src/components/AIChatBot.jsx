import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

// ═══════════════════════════════════════════════════════════
// JOLLIRESERVE AI CHATBOT - Restaurant Manager Assistant
// Natural, warm, professional conversation like a real manager
// ═══════════════════════════════════════════════════════════

// Intent Detection Patterns - Comprehensive
const INTENT_PATTERNS = {
  greeting: {
    keywords: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'sup', 'yo', 'hola', 'howdy', 'greetings'],
    phrases: ['how are you', 'how\'s it going', 'nice to meet you', 'pleased to meet'],
    weight: 1
  },
  reservation: {
    keywords: ['book', 'reserve', 'table', 'booking', 'reservation', 'dine', 'dining', 'seat', 'seating', 'table for', 'party'],
    phrases: ['make a reservation', 'book a table', 'reserve a spot', 'get a table', 'like to dine', 'need a table', 'want to book'],
    weight: 1.2
  },
  queue: {
    keywords: ['queue', 'wait', 'line', 'waiting', 'turn', 'spot', 'walk in', 'walk-in', 'immediate', 'now', 'today'],
    phrases: ['join queue', 'get in line', 'waiting list', 'how long', 'current wait', 'available now', 'walk in'],
    weight: 1.2
  },
  menu: {
    keywords: ['menu', 'food', 'order', 'meal', 'chicken', 'spaghetti', 'burger', 'drink', 'pie', 'price', 'cost', 'dish', 'meal'],
    phrases: ['what do you have', 'what\'s on the menu', 'show me food', 'recommend', 'what is good', 'best seller', 'popular', 'favorites'],
    weight: 1
  },
  payment: {
    keywords: ['pay', 'payment', 'gcash', 'maya', 'grabpay', 'card', 'credit', 'debit', 'cash', 'money', 'bill', 'checkout', 'price'],
    phrases: ['how to pay', 'payment method', 'can i pay', 'accept payment', 'payment options', 'how much'],
    weight: 1.1
  },
  vip: {
    keywords: ['vip', 'points', 'loyalty', 'member', 'status', 'tier', 'gold', 'silver', 'platinum', 'reward', 'benefit'],
    phrases: ['my points', 'membership status', 'loyalty program', 'vip benefits', 'check points', 'how many points', 'rewards'],
    weight: 1
  },
  cancel: {
    keywords: ['cancel', 'remove', 'delete', 'change', 'modify', 'update', 'edit', 'reschedule'],
    phrases: ['cancel reservation', 'change booking', 'modify order', 'want to cancel', 'need to change', 'delete booking'],
    weight: 1.3
  },
  location: {
    keywords: ['location', 'address', 'where', 'find', 'direction', 'map', 'branch', 'store', 'restaurant', 'place'],
    phrases: ['where are you', 'how to get there', 'what is the address', 'location please', 'find you'],
    weight: 0.9
  },
  hours: {
    keywords: ['hour', 'time', 'open', 'close', 'opening', 'closing', 'when', 'schedule', 'operating', 'available'],
    phrases: ['what time', 'when do you open', 'when do you close', 'business hours', 'opening hours', 'what are your hours'],
    weight: 0.9
  },
  help: {
    keywords: ['help', 'support', 'assist', 'question', 'how to', 'what can', 'guide', 'explain', 'info', 'information'],
    phrases: ['i need help', 'can you help', 'how do i', 'what should i', 'assistance', 'what can you do'],
    weight: 1
  },
  complaint: {
    keywords: ['bad', 'terrible', 'awful', 'problem', 'issue', 'complaint', 'unhappy', 'disappointed', 'slow', 'rude', 'angry', 'mad'],
    phrases: ['not happy', 'very bad', 'not satisfied', 'poor service', 'waiting too long', 'terrible experience'],
    weight: 1.5
  },
  compliment: {
    keywords: ['good', 'great', 'excellent', 'amazing', 'love', 'awesome', 'best', 'perfect', 'wonderful', 'delicious', 'tasty'],
    phrases: ['so good', 'really great', 'love it', 'best experience', 'highly recommend', 'will come back'],
    weight: 1
  },
  goodbye: {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'thanks', 'thank you', 'cya', 'take care'],
    phrases: ['thank you', 'thanks for', 'see you later', 'have a good', 'that\'s all', 'appreciate it'],
    weight: 0.8
  },
  feedback: {
    keywords: ['review', 'feedback', 'rate', 'rating', 'experience', 'suggestion', 'improve'],
    phrases: ['how was your', 'leave a review', 'give feedback', 'rate your', 'suggestion for'],
    weight: 1
  },
  allergy: {
    keywords: ['allergy', 'allergic', 'dietary', 'vegan', 'vegetarian', 'gluten', 'dairy', 'nut', 'restriction'],
    phrases: ['i am allergic', 'dietary restriction', 'food allergy', 'cannot eat', 'special diet'],
    weight: 1.2
  }
};

// Conversation Memory & Context Manager
class ConversationManager {
  constructor() {
    this.context = {
      lastIntent: null,
      userName: null,
      conversationStage: 'new', // new, greeting, helping, closing
      lastTopic: null,
      userMood: 'neutral', // happy, neutral, frustrated
      askedAbout: new Set(),
      reservationDetails: {},
      messageCount: 0
    };
  }

  updateContext(intent, message) {
    this.context.lastIntent = intent;
    this.context.messageCount++;
    this.context.askedAbout.add(intent);
    
    // Detect mood from message
    if (intent === 'complaint') this.context.userMood = 'frustrated';
    if (intent === 'compliment') this.context.userMood = 'happy';
    
    // Update conversation stage
    if (this.context.messageCount === 1) this.context.conversationStage = 'greeting';
    else if (intent === 'goodbye') this.context.conversationStage = 'closing';
    else this.context.conversationStage = 'helping';
    
    return this.context;
  }

  getContext() {
    return this.context;
  }

  reset() {
    this.context = {
      lastIntent: null,
      userName: null,
      conversationStage: 'new',
      lastTopic: null,
      userMood: 'neutral',
      askedAbout: new Set(),
      reservationDetails: {},
      messageCount: 0
    };
  }
}

// Manager-like Response Generator - Warm, Professional, Natural
const generateManagerResponse = (intent, message, context) => {
  const lowerMsg = message.toLowerCase();
  const { userMood, messageCount, askedAbout, lastIntent } = context;
  
  // Personalization based on conversation history
  const personalization = messageCount > 2 ? " Again, " : " ";
  const followUp = messageCount > 3 && userMood === 'happy' 
    ? " It's always a pleasure helping you! " 
    : " ";

  // COMPLAINT - Empathetic and solution-focused
  if (intent === 'complaint') {
    return [
      "I sincerely apologize for that experience. 😔",
      "As your restaurant manager, I want to make this right immediately.",
      "Could you share a bit more detail about what happened? I'm here to find the best solution for you, whether that's a refund, a remake of your order, or speaking with our head chef directly."
    ];
  }
  
  // COMPLIMENT - Grateful and welcoming
  if (intent === 'compliment') {
    return [
      `Thank you so much for sharing that!${followUp}🌟`,
      "Comments like yours truly make our day and inspire our team to keep delivering great experiences.",
      "We'd love to welcome you back soon! Would you like me to help you make a reservation for your next visit?"
    ];
  }
  
  // GREETING - Warm and inviting
  if (intent === 'greeting') {
    const greetings = [
      ["Hello and welcome to Jollibee! 🍗", "I'm your virtual restaurant manager, here to make your dining experience smooth and enjoyable.", "How may I assist you today? Are you looking to make a reservation, check our menu, or perhaps join our queue?"],
      ["Hi there! Great to see you! 👋", "Welcome to Jollibee - where every meal is a celebration.", "What brings you in today? I'm here to help with reservations, menu questions, or anything else you need!"],
      ["Good day! Welcome to our Jollibee family! 🌟", "I'm here to ensure you have a wonderful experience with us.", "Would you like to book a table, browse our popular dishes, or learn about our VIP program?"]
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }
  
  // RESERVATION - Helpful and detail-oriented
  if (intent === 'reservation') {
    const hasDate = /\d{1,2}[\/\-]\d{1,2}|tomorrow|today|next|monday|tuesday|wednesday|thursday|friday|saturday|sunday|jan|feb|mar|apr|may|jun/i.test(lowerMsg);
    const hasTime = /\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)|noon|morning|evening|afternoon/i.test(lowerMsg);
    const hasParty = /\d+\s*(people|person|guest|pax|diners)/i.test(lowerMsg) || /party of/i.test(lowerMsg);
    
    if (hasDate && hasTime && hasParty) {
      return [
        "Wonderful! I have all the details I need for your reservation. 📅✨",
        "Let me confirm: You're looking for a table with the information you provided, correct?",
        "Click the 'Book a Table' button below and I'll ensure everything is set up perfectly for your visit!"
      ];
    }
    
    if (hasDate || hasTime || hasParty) {
      const missing = [];
      if (!hasDate) missing.push("which date");
      if (!hasTime) missing.push("what time");
      if (!hasParty) missing.push("how many guests");
      
      return [
        "Great start! I can see you have some details in mind. 👍",
        `To secure the perfect table for you, I just need to know ${missing.join(' and ')}.`,
        "This helps us prepare everything so your dining experience is seamless from the moment you arrive!"
      ];
    }
    
    return [
      "I'd be delighted to help you make a reservation! 📅",
      "To find you the perfect table, I'll need just a few details:",
      "• What date would you prefer? (today, tomorrow, or a specific date)",
      "• What time works best? (we're open 9 AM - 10 PM)",
      "• How many guests will be joining you?",
      "Once I have these details, I can check availability and get you booked right away!"
    ];
  }
  
  // QUEUE - Efficient and informative
  if (intent === 'queue') {
    const askingWaitTime = /how long|wait time|how many|current wait|busy/i.test(lowerMsg);
    
    if (askingWaitTime) {
      return [
        "Let me check our current queue status for you right now... 🔍",
        "Currently, we have about 8 parties waiting ahead, with an estimated wait time of 20-25 minutes.",
        "The good news? You can join our virtual queue from wherever you are! Would you like me to add your party to the list? Just let me know how many people are in your group."
      ];
    }
    
    return [
      "Absolutely! Our virtual queue system is perfect for busy days. 🐝",
      "Just tell me how many people are in your party, and I'll add you to the queue immediately.",
      "You'll receive real-time updates on your phone as your table gets closer. No need to wait at the restaurant - you can run errands or relax nearby!",
      "How many guests should I add to the queue?"
    ];
  }
  
  // MENU - Enthusiastic and descriptive
  if (intent === 'menu') {
    const askingSpecific = /chicken|spaghetti|burger|pie|palabok|burger|steak|hotdog/i.test(lowerMsg);
    
    if (askingSpecific) {
      return [
        "Excellent taste! 🍽️ That's one of our most popular items for good reason.",
        "Our customers consistently rave about it! Would you like to pre-order this when making your reservation? It'll be ready right when you arrive.",
        "Or would you like to see our full menu? I can recommend some perfect pairings with that dish!"
      ];
    }
    
    return [
      "I'm excited to share our customer favorites with you! 🌟",
      "",
      "🥇 Chicken Joy (2pc) with Rice - Our signature! Crispy, juicy, absolutely delicious - ₱150",
      "🥇 Jolly Spaghetti - Sweet-style sauce with hotdog slices - ₱120", 
      "🥇 Peach Mango Pie - Freshly baked daily, the perfect finish - ₱45",
      "🥇 Yumburger - Classic comfort in every bite - ₱85",
      "🥇 Palabok Fiesta - Traditional Filipino flavors - ₱140",
      "",
      "Would you like details on any of these, or shall I show you our complete menu?"
    ];
  }
  
  // ALLERGY - Caring and thorough
  if (intent === 'allergy') {
    return [
      "Thank you for letting me know about your dietary needs - your safety is our top priority. 🛡️",
      "",
      "We take allergies very seriously. Here's what I can share:",
      "• All our fried chicken is gluten-free (no breading with wheat)",
      "• Our steamed rice and vegetables are allergen-friendly",
      "• We can prepare meals without common allergens upon request",
      "• Please inform your server about any severe allergies when you arrive",
      "",
      "Would you like me to help you find specific menu items that fit your dietary requirements?"
    ];
  }
  
  // PAYMENT - Clear and helpful
  if (intent === 'payment') {
    return [
      "Great question! We want to make paying as convenient as possible for you. 💳",
      "",
      "We gladly accept:",
      "• 💚 GCash - Most popular choice, instant confirmation",
      "• 💜 Maya - Secure and quick processing", 
      "• 🚗 GrabPay - Earn rewards while you pay",
      "• 💳 Credit/Debit Cards - Visa, Mastercard accepted",
      "• 💵 Cash - Always welcome at the counter",
      "",
      "For reservations, you can pay when you arrive. For pre-orders, we process payment when confirming your order.",
      "Is there a specific payment method you'd prefer to use?"
    ];
  }
  
  // VIP - Encouraging and informative
  if (intent === 'vip') {
    return [
      "Let me check your VIP status for you! 🏆",
      "",
      "You currently have 350 points - you're doing great!",
      "Just 150 more points and you'll reach Gold Member status! 🥇",
      "",
      "Your Silver Member Benefits:",
      "⚡ Priority seating (skip 2 spots in queue)",
      "� Free Peach Mango Pie on your birthday",
      "📧 Early access to special promotions",
      "",
      "Gold Benefits coming your way:",
      "👑 10% discount on all orders",
      "🍽️ Exclusive menu previews and tastings",
      "🎁 Surprise gifts on random visits",
      "",
      "Keep enjoying our meals - every peso spent earns you points toward even more perks!"
    ];
  }
  
  // HOURS - Detailed and helpful
  if (intent === 'hours') {
    return [
      "Here are our operating hours - we look forward to welcoming you! 📅",
      "",
      "� Monday - Friday: 9:00 AM - 10:00 PM",
      "� Saturday - Sunday: 8:00 AM - 11:00 PM", 
      "� Holidays: 9:00 AM - 9:00 PM",
      "",
      "💡 Pro tip from your restaurant manager:",
      "Our peak hours are typically 12:00-2:00 PM and 6:00-8:00 PM.",
      "For the most relaxed dining experience, consider visiting during our off-peak hours (2-5 PM or after 8 PM).",
      "Or make a reservation to secure your preferred time!"
    ];
  }
  
  // LOCATION - Detailed with landmarks
  if (intent === 'location') {
    return [
      "We're easy to find! Here's everything you need: 📍",
      "",
      "📍 Jollibee Main Branch",
      "123 Main Street, City Center",
      "Located inside Central Park Mall",
      "",
      "🎯 Landmarks to help you find us:",
      "• Right next to Starbucks Coffee",
      "• Across from City Hall building", 
      "• Ground floor, near the main entrance",
      "",
      "🚗 Parking:",
      "Free parking available at the mall! Just get your ticket validated at our counter when you dine with us.",
      "",
      "Need specific directions from your location? I'm happy to help guide you!"
    ];
  }
  
  // CANCEL - Supportive and solution-oriented
  if (intent === 'cancel') {
    return [
      "I completely understand - plans change, and that's okay! 📝",
      "I'm here to help you cancel or modify your booking with no hassle.",
      "",
      "Are you looking to:",
      "• Cancel a reservation?",
      "• Leave the queue?", 
      "• Or just modify the details (time, party size)?",
      "",
      "Just let me know which one, and I'll take care of it immediately. No penalties for changes made in advance!"
    ];
  }
  
  // FEEDBACK - Appreciative
  if (intent === 'feedback') {
    return [
      "Your feedback means the world to us! 📝",
      "We're constantly working to improve, and your thoughts help us serve you better.",
      "",
      "Would you like to:",
      "• Share a quick review of your recent visit?",
      "• Suggest something new you'd like to see on our menu?",
      "• Tell us about something we did exceptionally well?",
      "",
      "I'm all ears and ready to pass your feedback to our team!"
    ];
  }
  
  // HELP - Comprehensive and organized
  if (intent === 'help') {
    return [
      "I'm here to make your Jollibee experience wonderful! Here's how I can help: 🌟",
      "",
      "📅 Reservations - Book your table in advance (recommended for weekends!)",
      "🐝 Virtual Queue - Join the line remotely and get real-time updates",
      "🍗 Menu & Ordering - Browse dishes, get recommendations, pre-order",
      "💳 Payment Info - Learn about accepted payment methods",
      "🏆 VIP Program - Check points, benefits, and tier status",
      "⏰ Hours & Location - Operating times and directions",
      "�️ Dietary Needs - Allergies, restrictions, special requests",
      "",
      "Just ask me anything naturally - I'm here to chat like a real restaurant manager would! What can I help you with?"
    ];
  }
  
  // GOODBYE - Warm and inviting return
  if (intent === 'goodbye') {
    const goodbyes = [
      ["It was my pleasure helping you today! 🌟", "Thank you for choosing Jollibee - we truly appreciate your trust in us.", "We can't wait to welcome you in person soon. Have a fantastic day! 🍗"],
      ["You're very welcome! 😊", "Remember, I'm always here if you need anything else - reservations, questions, or just a quick chat about our menu!", "Take care and see you at Jollibee soon!"],
      ["Thanks for stopping by to chat! 🙏", "Whether you're dining in or taking out, we're ready to serve you with a smile.", "Have a wonderful day, and come back anytime!"]
    ];
    return goodbyes[Math.floor(Math.random() * goodbyes.length)];
  }
  
  // DEFAULT - Friendly redirect with context awareness
  const previousTopics = Array.from(askedAbout).slice(-2);
  const contextHint = previousTopics.length > 0 
    ? ` We've been chatting about ${previousTopics.join(' and ')}, but I'm happy to discuss anything else!`
    : '';
  
  return [
    "I'm here to help however I can! 🤔",
    `${contextHint}`,
    "I can assist with reservations, our menu, queue status, payment options, VIP benefits, hours, location, or any other questions you might have.",
    "What would be most helpful for you right now? (Or type 'help' to see all options!)"
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
  
  // Conversation memory that persists during chat session
  const conversationManager = useRef(new ConversationManager()).current;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Reset conversation when chat is closed
  useEffect(() => {
    if (!isOpen) {
      setHasGreeted(false);
      conversationManager.reset();
    }
  }, [isOpen, conversationManager]);

  useEffect(() => {
    if (isOpen && !hasGreeted) {
      setHasGreeted(true);
      const greeting = generateManagerResponse('greeting', '', conversationManager.getContext());
      sendBotMessage(greeting);
    }
  }, [isOpen, hasGreeted, conversationManager]);

  const sendBotMessage = useCallback(async (responses, delay = 700) => {
    setIsTyping(true);
    for (const text of responses) {
      if (text.trim()) { // Only send non-empty messages
        await new Promise(r => setTimeout(r, delay));
        setMessages(prev => [...prev, { type: 'bot', text, id: Date.now() + Math.random() }]);
      }
    }
    setIsTyping(false);
  }, []);

  const handleSend = useCallback(async (textToSend = null) => {
    const messageText = textToSend || input.trim();
    if (!messageText) return;

    // Add user message
    setMessages(prev => [...prev, { type: 'user', text: messageText, id: Date.now() }]);
    setInput('');

    // Simulate AI thinking
    setIsTyping(true);
    await new Promise(r => setTimeout(r, 800));

    // Detect intent and generate response with context
    const intent = detectIntentAdvanced(messageText);
    conversationManager.updateContext(intent, messageText);
    const responses = generateManagerResponse(intent, messageText, conversationManager.getContext());
    
    setIsTyping(false);
    sendBotMessage(responses, 500);
  }, [input, conversationManager, sendBotMessage]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Toggle Button - Manager Chat */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 p-4 rounded-full shadow-xl transition-all duration-300 hover:scale-110 hover:shadow-2xl ${
          isOpen 
            ? 'bg-[var(--text-muted)] rotate-90' 
            : 'bg-[var(--red)] hover:bg-[var(--red-hover)] glow-red'
        }`}
        aria-label={isOpen ? "Close chat" : "Chat with restaurant manager"}
      >
        {isOpen ? (
          <span className="text-2xl">✕</span>
        ) : (
          <div className="relative">
            <span className="text-2xl">👨‍�</span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse" />
            <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-2 py-1 rounded-full whitespace-nowrap opacity-0 hover:opacity-100 transition-opacity">
              Chat with us
            </span>
          </div>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-40 w-80 sm:w-96 card-premium animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="ai-chatbot-header">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <span className="text-xl">👨‍💼</span>
              </div>
              <div>
                <h3 className="font-bold text-sm">Restaurant Manager</h3>
                <p className="text-[10px] opacity-90 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  Online now
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
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

          {/* Quick Actions - Suggestion Chips */}
          {!isTyping && (
            <div className="px-4 py-3 bg-[var(--bg-subtle)] border-t border-[var(--border)]">
              <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">Quick Questions:</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: '📅 Book a table', value: 'I want to make a reservation' },
                  { label: '🐝 Check queue', value: 'How long is the wait right now?' },
                  { label: '🍗 View menu', value: 'What are your most popular dishes?' },
                  { label: '🏆 My VIP status', value: 'Check my loyalty points' }
                ].map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSend(action.value)}
                    className="text-xs px-3 py-2 bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] rounded-full hover:border-[var(--red)] hover:text-[var(--red)] hover:shadow-md transition-all duration-200 active:scale-95"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="p-4 bg-[var(--bg-card)] border-t border-[var(--border)]">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }} 
              className="relative flex gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message here..."
                className="flex-1 pl-4 pr-4 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--bg-input)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--red)] transition-colors"
                disabled={isTyping}
              />
              <button
                type="submit"
                disabled={!input.trim() || isTyping}
                className="px-4 py-3 bg-[var(--red)] text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[var(--red-hover)] active:scale-95 transition-all duration-200 flex items-center gap-1"
                aria-label="Send message"
              >
                <span>Send</span>
                <span>➤</span>
              </button>
            </form>
            <p className="text-[10px] text-[var(--text-faint)] text-center mt-2">
              Your restaurant manager is here to help • Typical response time: under a minute
            </p>
          </div>
        </div>
      )}
    </>
  );
}
