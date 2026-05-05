import React, { useState } from 'react';
import { Icon } from '../Icon';

export const PaymentFlow = ({ bookingData, onNext, onPrevious, loading }) => {
  const [paymentMethod, setPaymentMethod] = useState(bookingData.paymentMethod || 'pay_at_restaurant');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardName: '',
    expiryDate: '',
    cvv: '',
    saveCard: false
  });
  const [errors, setErrors] = useState({});
  const [processingPayment, setProcessingPayment] = useState(false);

  const paymentMethods = [
    {
      id: 'pay_at_restaurant',
      title: 'Pay at Restaurant',
      description: 'Pay after your meal with cash, card, or mobile',
      icon: 'payment',
      recommended: true
    },
    {
      id: 'card_online',
      title: 'Pay Online Now',
      description: 'Secure online payment with credit/debit card',
      icon: 'secure',
      recommended: false
    },
    {
      id: 'mobile_payment',
      title: 'Mobile Payment',
      description: 'Pay with Apple Pay, Google Pay, or other mobile wallets',
      icon: 'smartphone',
      recommended: false
    }
  ];

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method);
    setErrors({});
  };

  const handleCardDetailsChange = (field, value) => {
    setCardDetails(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCardNumber = (value) => {
    const cleaned = value.replace(/\s/g, '');
    const chunks = cleaned.match(/.{1,4}/g) || [];
    return chunks.join(' ');
  };

  const formatExpiryDate = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const validatePayment = () => {
    const newErrors = {};

    if (!paymentMethod) {
      newErrors.paymentMethod = 'Please select a payment method';
    }

    if (paymentMethod === 'card_online') {
      if (!cardDetails.cardNumber || cardDetails.cardNumber.replace(/\s/g, '').length !== 16) {
        newErrors.cardNumber = 'Please enter a valid 16-digit card number';
      }
      if (!cardDetails.cardName.trim()) {
        newErrors.cardName = 'Please enter the cardholder name';
      }
      if (!cardDetails.expiryDate || !/^\d{2}\/\d{2}$/.test(cardDetails.expiryDate)) {
        newErrors.expiryDate = 'Please enter a valid expiry date (MM/YY)';
      }
      if (!cardDetails.cvv || !/^\d{3,4}$/.test(cardDetails.cvv)) {
        newErrors.cvv = 'Please enter a valid CVV';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePaymentSubmit = async () => {
    if (!validatePayment()) {
      return;
    }

    setProcessingPayment(true);

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      const paymentData = {
        paymentMethod,
        paymentStatus: paymentMethod === 'pay_at_restaurant' ? 'pending' : 'completed',
        paymentTimestamp: new Date().toISOString()
      };

      if (paymentMethod === 'card_online') {
        paymentData.cardDetails = {
          ...cardDetails,
          cardNumber: '****-****-****-' + cardDetails.cardNumber.slice(-4)
        };
      }

      onNext(paymentData);

    } catch (error) {
      setErrors({ submit: 'Payment processing failed. Please try again.' });
    } finally {
      setProcessingPayment(false);
    }
  };

  const getTotalAmount = () => {
    // For demo purposes, calculate estimated total
    const baseAmount = bookingData.partySize * 25;
    const tax = baseAmount * 0.08;
    const service = baseAmount * 0.15;
    return baseAmount + tax + service;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Payment Information
        </h2>
        <p className="text-gray-600">
          Choose how you'd like to pay for your reservation
        </p>
      </div>

      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal (Estimated)</span>
            <span className="font-medium">${(bookingData.partySize * 25).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Tax (8%)</span>
            <span className="font-medium">${((bookingData.partySize * 25) * 0.08).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Service Charge (15%)</span>
            <span className="font-medium">${((bookingData.partySize * 25) * 0.15).toFixed(2)}</span>
          </div>
          {bookingData.waitTime > 0 && (
            <div className="flex justify-between text-sm text-yellow-600">
              <span>Wait Time Adjustment</span>
              <span className="font-medium">-${(bookingData.waitTime * 2).toFixed(2)}</span>
            </div>
          )}
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between">
              <span className="text-lg font-semibold">Estimated Total</span>
              <span className="text-lg font-bold text-red-600">${getTotalAmount().toFixed(2)}</span>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-gray-500 mt-3">
          *This is an estimate. Actual total will depend on your order.
        </p>
      </div>

      {/* Payment Method Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">Select Payment Method</h3>
        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => handlePaymentMethodSelect(method.id)}
              className={`
                w-full p-4 rounded-lg border-2 text-left transition-all
                ${paymentMethod === method.id
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
            >
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-brand-light)] flex items-center justify-center mr-3">
                  <Icon name={method.icon} size={20} color="var(--color-brand)" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center">
                    <h4 className="font-medium text-gray-900">{method.title}</h4>
                    {method.recommended && (
                      <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{method.description}</p>
                </div>
                <div className="ml-3">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    paymentMethod === method.id
                      ? 'border-red-500 bg-red-500'
                      : 'border-gray-300'
                  }`}>
                    {paymentMethod === method.id && (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
        {errors.paymentMethod && (
          <p className="mt-2 text-sm text-red-600">{errors.paymentMethod}</p>
        )}
      </div>

      {/* Card Details Form */}
      {paymentMethod === 'card_online' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Card Details</h3>
          
          <div className="space-y-4">
            {/* Card Number */}
            <div>
              <label htmlFor="cardNumber" className="block text-sm font-medium text-gray-900 mb-1">
                Card Number
              </label>
              <input
                type="text"
                id="cardNumber"
                value={cardDetails.cardNumber}
                onChange={(e) => handleCardDetailsChange('cardNumber', formatCardNumber(e.target.value))}
                placeholder="1234 5678 9012 3456"
                maxLength={19}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.cardNumber ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.cardNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.cardNumber}</p>
              )}
            </div>

            {/* Cardholder Name */}
            <div>
              <label htmlFor="cardName" className="block text-sm font-medium text-gray-900 mb-1">
                Cardholder Name
              </label>
              <input
                type="text"
                id="cardName"
                value={cardDetails.cardName}
                onChange={(e) => handleCardDetailsChange('cardName', e.target.value)}
                placeholder="John Doe"
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                  errors.cardName ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.cardName && (
                <p className="mt-1 text-sm text-red-600">{errors.cardName}</p>
              )}
            </div>

            {/* Expiry Date and CVV */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="expiryDate" className="block text-sm font-medium text-gray-900 mb-1">
                  Expiry Date
                </label>
                <input
                  type="text"
                  id="expiryDate"
                  value={cardDetails.expiryDate}
                  onChange={(e) => handleCardDetailsChange('expiryDate', formatExpiryDate(e.target.value))}
                  placeholder="MM/YY"
                  maxLength={5}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.expiryDate ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.expiryDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.expiryDate}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="cvv" className="block text-sm font-medium text-gray-900 mb-1">
                  CVV
                </label>
                <input
                  type="text"
                  id="cvv"
                  value={cardDetails.cvv}
                  onChange={(e) => handleCardDetailsChange('cvv', e.target.value.replace(/\D/g, ''))}
                  placeholder="123"
                  maxLength={4}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
                    errors.cvv ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.cvv && (
                  <p className="mt-1 text-sm text-red-600">{errors.cvv}</p>
                )}
              </div>
            </div>

            {/* Save Card */}
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={cardDetails.saveCard}
                onChange={(e) => handleCardDetailsChange('saveCard', e.target.checked)}
                className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              />
              <span className="text-sm text-gray-700">Save card for future orders</span>
            </label>
          </div>
        </div>
      )}

      {/* Mobile Payment Options */}
      {paymentMethod === 'mobile_payment' && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Mobile Payment</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 border-2 border-[var(--color-border)] rounded-[var(--radius-md)] hover:border-[var(--color-border-strong)] transition-colors">
              <div className="text-center">
                <Icon name="smartphone" size={24} className="mx-auto mb-2" color="var(--color-brand)" />
                <p className="text-sm font-medium">Apple Pay</p>
              </div>
            </button>
            <button className="p-4 border-2 border-[var(--color-border)] rounded-[var(--radius-md)] hover:border-[var(--color-border-strong)] transition-colors">
              <div className="text-center">
                <Icon name="smartphone" size={24} className="mx-auto mb-2" color="var(--color-brand)" />
                <p className="text-sm font-medium">Google Pay</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="bg-green-50 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-5 h-5 text-green-600 mt-0.5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <h4 className="text-sm font-medium text-green-900">Secure Payment</h4>
            <p className="text-sm text-green-700 mt-1">
              Your payment information is encrypted and secure. We never store your card details.
            </p>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errors.submit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{errors.submit}</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          disabled={processingPayment}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={handlePaymentSubmit}
          disabled={processingPayment || !paymentMethod}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {processingPayment && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          {processingPayment ? 'Processing...' : 'Complete Booking'}
        </button>
      </div>
    </div>
  );
};
