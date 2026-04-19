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
    
    // Always try to open the app in demo mode (safe - no real payment)
    if (method.appScheme) {
      // Try to open the app
      window.location.href = method.appScheme;
      
      // Fallback to web if app doesn't open after 1 second
      setTimeout(() => {
        if (method.webUrl) {
          window.open(method.webUrl, '_blank');
        }
      }, 1000);
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
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={step !== 'processing' ? onClose : undefined}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-[var(--bg-card)] rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
        {/* Gradient Header */}
        <div className="relative bg-gradient-to-r from-[var(--red)] to-red-600 p-6 text-white">
          {/* Demo Badge */}
          <div className="absolute top-4 right-4">
            <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              🔒 DEMO MODE
            </span>
          </div>
          
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                  <WalletIcon />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Secure Payment</h2>
                  <p className="text-white/90 text-sm">Complete your reservation</p>
                </div>
              </div>
            </div>
            {step === 'select' && (
              <button 
                onClick={onClose}
                className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-sm"
              >
                <XIcon />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {step === 'select' && (
            <>
              {/* Amount Display */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-[var(--bg-subtle)] dark:to-[var(--bg-input)] rounded-2xl p-6 text-center border border-gray-200 dark:border-[var(--border)]">
                <p className="text-sm font-medium text-gray-600 dark:text-[var(--text-muted)] mb-2">Total Amount</p>
                <p className="text-4xl font-black text-gray-900 dark:text-[var(--text-main)] mb-1">
                  ₱{amount?.toLocaleString()}
                </p>
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <p className="text-sm text-gray-600 dark:text-[var(--text-muted)]">{itemName}</p>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-800/30 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-lg">🔒</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                      Secure Demo Mode
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-300">
                      No real money will be deducted. This is a simulation.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-[var(--text-main)] mb-4">
                  Choose Payment Method
                </p>
                <div className="grid gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setSelectedMethod(method.id)}
                      className={`group relative w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 ${
                        selectedMethod === method.id
                          ? 'border-[var(--red)] bg-[var(--red)]/5 shadow-lg scale-[1.02]'
                          : 'border-gray-200 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-card)] hover:border-gray-300 dark:hover:border-[var(--border)] hover:shadow-md'
                      }`}
                    >
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-all duration-200 ${
                        selectedMethod === method.id
                          ? 'bg-[var(--red)]/10 shadow-inner'
                          : 'bg-gray-100 dark:bg-[var(--bg-subtle)]'
                      }`}>
                        {method.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <p className={`font-bold text-base ${
                          selectedMethod === method.id
                            ? 'text-[var(--red)]'
                            : 'text-gray-900 dark:text-[var(--text-main)]'
                        }`}>
                          {method.name}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-[var(--text-muted)] mt-0.5">
                          {method.description}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                        selectedMethod === method.id
                          ? 'border-[var(--red)] bg-[var(--red)]'
                          : 'border-gray-300 dark:border-[var(--border)]'
                      }`}>
                        {selectedMethod === method.id && (
                          <div className="w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Pay Button */}
              <button
                onClick={handlePayment}
                disabled={!selectedMethod}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-200 flex items-center justify-center gap-3 ${
                  selectedMethod
                    ? 'bg-gradient-to-r from-[var(--red)] to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg hover:shadow-xl active:scale-[0.98]'
                    : 'bg-gray-200 dark:bg-[var(--bg-subtle)] text-gray-500 dark:text-[var(--text-muted)] cursor-not-allowed'
                }`}
              >
                {selectedMethod === 'gcash' && (
                  <>
                    <span className="text-xl">📱</span>
                    <span>Open GCash App (Demo)</span>
                  </>
                )}
                {selectedMethod === 'maya' && (
                  <>
                    <span className="text-xl">💜</span>
                    <span>Open Maya App (Demo)</span>
                  </>
                )}
                {selectedMethod === 'grabpay' && (
                  <>
                    <span className="text-xl">🟢</span>
                    <span>Open GrabPay App (Demo)</span>
                  </>
                )}
                {selectedMethod === 'card' && (
                  <>
                    <span className="text-xl">💳</span>
                    <span>Enter Card Details (Demo)</span>
                  </>
                )}
                {!selectedMethod && (
                  <>
                    <span className="text-xl">💳</span>
                    <span>Select Payment Method</span>
                  </>
                )}
              </button>

              {selectedMethod && (
                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-[var(--text-muted)]">
                    {selectedMethod !== 'card'
                      ? "We'll open the payment app for you. No real transaction will occur."
                      : "This is a demo. No real money will be deducted."
                    }
                  </p>
                </div>
              )}
            </>
          )}

          {step === 'processing' && (
            <div className="text-center py-8 animate-fade-in">
              {/* Enhanced Progress Circle */}
              <div className="relative w-32 h-32 mx-auto mb-8">
                <svg className="w-full h-full -rotate-90 transform-gpu">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="8"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="351.86"
                    strokeDashoffset={351.86 - (351.86 * progress) / 100}
                    className="transition-all duration-300 ease-out"
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="var(--red)" />
                      <stop offset="100%" stopColor="#dc2626" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <LoaderIcon className="w-10 h-10 text-[var(--red)] animate-spin mx-auto mb-1" />
                    <p className="text-2xl font-bold text-gray-900 dark:text-[var(--text-main)]">{progress}%</p>
                  </div>
                </div>
              </div>
              
              {/* Status Messages */}
              <div className="space-y-3">
                <p className="text-xl font-bold text-gray-900 dark:text-[var(--text-main)]">
                  {progress < 30 && "🔗 Connecting to payment gateway..."}
                  {progress >= 30 && progress < 60 && "🔍 Verifying account..."}
                  {progress >= 60 && progress < 90 && "💳 Processing payment..."}
                  {progress >= 90 && "✨ Finalizing..."}
                </p>
                <p className="text-sm text-gray-600 dark:text-[var(--text-muted)]">
                  {demoMode 
                    ? "Simulating secure payment flow..."
                    : "Please don't close this window"
                  }
                </p>
              </div>

              {/* App Opening Status */}
              {selectedMethod && selectedMethod !== 'card' && progress > 20 && progress < 80 && (
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800 animate-fade-in">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {selectedMethod === 'gcash' && '📱'}
                      {selectedMethod === 'maya' && '💜'}
                      {selectedMethod === 'grabpay' && '🟢'}
                    </span>
                    <div className="text-left">
                      <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                        Opening {PAYMENT_METHODS.find(m => m.id === selectedMethod)?.name} app...
                      </p>
                      <p className="text-xs text-blue-600 dark:text-blue-300">
                        Please switch to the app to complete (demo)
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8 animate-scale-in">
              {/* Success Animation */}
              <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-2 bg-white dark:bg-[var(--bg-card)] rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="w-12 h-12 text-green-500" />
                </div>
              </div>
              
              <div className="space-y-4">
                <p className="font-black text-3xl text-gray-900 dark:text-[var(--text-main)]">
                  Payment Successful!
                </p>
                <p className="text-gray-600 dark:text-[var(--text-muted)] px-4">
                  {demoMode 
                    ? "Demo payment completed successfully. No real transaction occurred."
                    : "Your payment has been processed successfully."
                  }
                </p>
                
                {/* Success Details */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 mx-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <p className="text-sm font-semibold text-green-800 dark:text-green-200">
                      Reservation Confirmed
                    </p>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-300">
                    ₱{amount?.toLocaleString()} paid • {itemName}
                  </p>
                </div>
                <div className="flex justify-between text-sm px-4">
                  <span className="text-[var(--text-muted)]">Reference</span>
                  <span className="font-mono text-xs">REF-{Date.now().toString().slice(-8)}</span>
                </div>
              </div>

              <button
                onClick={handleSuccess}
                className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 active:scale-[0.98]"
              >
                View Reservation Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
