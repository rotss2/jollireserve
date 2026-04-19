import { useState, useEffect } from 'react';

// Custom SVG components to replace lucide-react
const XIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path>
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path>
    <path d="M18 12a2 2 0 0 0 0 4h4v-4h-4z"></path>
  </svg>
);

const CreditCardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
    <line x1="1" y1="10" x2="23" y2="10"></line>
  </svg>
);

const SmartphoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
    <line x1="12" y1="18" x2="12.01" y2="18"></line>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
    <polyline points="22 4 12 14.01 9 11.01"></polyline>
  </svg>
);

const LoaderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 12a9 9 0 11-6.219-8.56"></path>
  </svg>
);

const PAYMENT_METHODS = [
  {
    id: 'gcash',
    name: 'GCash',
    icon: '📱',
    color: '#0078FF',
    description: 'Pay with GCash wallet',
    appScheme: 'gcash://',
    webUrl: 'https://www.gcash.com'
  },
  {
    id: 'maya',
    name: 'Maya',
    icon: '💜',
    color: '#8B5CF6',
    description: 'Pay with Maya wallet',
    appScheme: 'maya://',
    webUrl: 'https://www.maya.ph'
  },
  {
    id: 'grabpay',
    name: 'GrabPay',
    icon: '🟢',
    color: '#00B14F',
    description: 'Pay with GrabPay',
    appScheme: 'grab://',
    webUrl: 'https://www.grab.com/ph/pay'
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: '💳',
    color: '#1a0a08',
    description: 'Visa, Mastercard, JCB',
    appScheme: null,
    webUrl: null
  }
];

export default function PaymentModal({ isOpen, onClose, amount, itemName, onSuccess }) {
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [step, setStep] = useState('select'); // select, processing, success
  const [progress, setProgress] = useState(0);
  const [demoMode, setDemoMode] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setSelectedMethod(null);
      setProgress(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'processing') {
      const interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setTimeout(() => setStep('success'), 500);
            return 100;
          }
          return p + 2;
        });
      }, 50);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handlePayment = () => {
    if (!selectedMethod) return;
    
    const method = PAYMENT_METHODS.find(m => m.id === selectedMethod);
    
    // Try to open the app (this is the demo feature)
    if (method.appScheme && !demoMode) {
      window.location.href = method.appScheme;
    }
    
    setStep('processing');
  };

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step !== 'processing' ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md card-premium animate-scale-in">
        {/* Demo Badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="vip-badge text-xs">DEMO MODE - NO REAL PAYMENT</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <WalletIcon />
              <span className="text-[var(--red)]">Payment</span>
            </h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Complete your reservation
            </p>
          </div>
          {step === 'select' && (
            <button 
              onClick={onClose}
              className="p-2 hover:bg-[var(--bg-subtle)] rounded-full transition-colors"
            >
              <XIcon />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' && (
            <>
              {/* Amount Display */}
              <div className="text-center mb-6 p-4 bg-[var(--bg-subtle)] rounded-xl">
                <p className="text-sm text-[var(--text-muted)] mb-1">Total Amount</p>
                <p className="text-3xl font-black text-[var(--red)]">₱{amount?.toLocaleString()}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{itemName}</p>
              </div>

              {/* Demo Toggle */}
              <div className="flex items-center justify-between mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <span className="text-sm font-medium">🔒 Demo Mode (Safe)</span>
                <button
                  onClick={() => setDemoMode(!demoMode)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    demoMode ? 'bg-[var(--red)]' : 'bg-gray-300'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    demoMode ? 'translate-x-7' : 'translate-x-1'
                  }`} />
                </button>
              </div>

              {/* Payment Methods */}
              <p className="text-sm font-semibold mb-3">Select Payment Method</p>
              <div className="space-y-3">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethod(method.id)}
                    className={`payment-card w-full flex items-center gap-4 text-left ${
                      selectedMethod === method.id ? 'selected' : ''
                    }`}
                  >
                    <span className="text-3xl">{method.icon}</span>
                    <div className="flex-1">
                      <p className="font-bold">{method.name}</p>
                      <p className="text-xs text-[var(--text-muted)]">{method.description}</p>
                    </div>
                    {selectedMethod === method.id && (
                      <CheckCircleIcon />
                    )}
                  </button>
                ))}
              </div>

              {/* Pay Button */}
              <button
                onClick={handlePayment}
                disabled={!selectedMethod}
                className="btn btn-primary btn-lg w-full mt-6 btn-ripple"
              >
                {demoMode ? '🔒 Pay with Demo' : `Pay ₱${amount?.toLocaleString()}`}
              </button>

              <p className="text-xs text-center text-[var(--text-muted)] mt-4">
                {demoMode 
                  ? "This is a demo. No real money will be deducted."
                  : "You will be redirected to complete payment securely."
                }
              </p>
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-8 animate-fade-in">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <svg className="w-full h-full -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    fill="none"
                    stroke="var(--border)"
                    strokeWidth="6"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="44"
                    fill="none"
                    stroke="var(--red)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="276"
                    strokeDashoffset={276 - (276 * progress) / 100}
                    className="transition-all duration-100"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <LoaderIcon className="w-8 h-8 text-[var(--red)] animate-spin" />
                </div>
              </div>
              
              <p className="font-bold text-lg mb-2">
                {progress < 30 && "Connecting to payment gateway..."}
                {progress >= 30 && progress < 60 && "Verifying account..."}
                {progress >= 60 && progress < 90 && "Processing payment..."}
                {progress >= 90 && "Finalizing..."}
              </p>
              <p className="text-sm text-[var(--text-muted)]">
                {demoMode 
                  ? "Simulating payment flow..."
                  : "Please don't close this window"
                }
              </p>

              {/* Simulated GCash App Opening */}
              {selectedMethod === 'gcash' && progress > 20 && progress < 80 && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 animate-fade-in">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    📱 Opening GCash app...
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8 animate-scale-in">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-10 h-10 text-green-500" />
              </div>
              
              <p className="font-black text-2xl mb-2">Payment Successful!</p>
              <p className="text-[var(--text-muted)] mb-6">
                {demoMode 
                  ? "Demo payment completed. No real transaction occurred."
                  : "Your payment has been processed successfully."
                }
              </p>

              <div className="bg-[var(--bg-subtle)] rounded-xl p-4 mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[var(--text-muted)]">Amount Paid</span>
                  <span className="font-bold">₱{amount?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-[var(--text-muted)]">Method</span>
                  <span className="font-bold">
                    {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">Reference</span>
                  <span className="font-mono text-xs">REF-{Date.now().toString().slice(-8)}</span>
                </div>
              </div>

              <button
                onClick={handleSuccess}
                className="btn btn-primary btn-lg w-full"
              >
                Continue to Reservation
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
