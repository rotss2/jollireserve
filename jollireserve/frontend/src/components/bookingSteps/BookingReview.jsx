import React, { useState } from 'react';
import { Icon } from '../Icon';

export const BookingReview = ({ bookingData, onNext, onPrevious, loading }) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [specialRequests, setSpecialRequests] = useState(bookingData.specialRequests || '');
  const [errors, setErrors] = useState({});

  const handleSpecialRequestsChange = (value) => {
    setSpecialRequests(value);
    if (errors.specialRequests) {
      setErrors(prev => ({ ...prev, specialRequests: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!agreedToTerms) {
      newErrors.terms = 'You must agree to the terms and conditions';
    }
    
    if (specialRequests.length > 500) {
      newErrors.specialRequests = 'Special requests must be less than 500 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    onNext({
      ...bookingData,
      specialRequests,
      termsAccepted: true,
      termsAcceptedAt: new Date().toISOString()
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getAreaName = (areaId) => {
    const areas = {
      indoor: 'Indoor Dining',
      outdoor: 'Outdoor Patio',
      private: 'Private Room',
      bar: 'Bar Area'
    };
    return areas[areaId] || 'No Preference';
  };

  const getEstimatedTotal = () => {
    // Simple estimation: $25 per person for food + potential wait time cost
    const baseCost = bookingData.partySize * 25;
    const waitTimeCost = (bookingData.waitTime || 0) * 2; // $2 per minute of wait
    return baseCost + waitTimeCost;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Review Your Booking
        </h2>
        <p className="text-gray-600">
          Please review all details before confirming your reservation
        </p>
      </div>

      {/* Booking Details Card */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-red-50 px-6 py-4 border-b border-red-100">
          <h3 className="text-lg font-semibold text-red-900">Reservation Details</h3>
        </div>
        
        <div className="p-6 space-y-4">
          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Date</p>
                <p className="text-gray-700">{formatDate(bookingData.date)}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Time</p>
                <p className="text-gray-700">{formatTime(bookingData.time)}</p>
                {bookingData.waitTime > 0 && (
                  <p className="text-sm text-yellow-600">Estimated wait: {bookingData.waitTime} minutes</p>
                )}
              </div>
            </div>
          </div>

          {/* Party Size and Area */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Party Size</p>
                <p className="text-gray-700">{bookingData.partySize} {bookingData.partySize === 1 ? 'Guest' : 'Guests'}</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Preferred Area</p>
                <p className="text-gray-700">{getAreaName(bookingData.area)}</p>
              </div>
            </div>
          </div>

          {/* Dining Preference */}
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-[var(--color-brand-light)] rounded-full flex items-center justify-center">
                <Icon 
                  name={bookingData.diningPreference === 'dine_in' ? 'dineIn' : 
                        bookingData.diningPreference === 'takeaway' ? 'takeaway' : 'queue'} 
                  size={20} 
                  color="var(--color-brand)" 
                />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-primary)]">Dining Preference</p>
              <p className="text-[var(--color-text-secondary)] capitalize">{bookingData.diningPreference?.replace('_', ' ')}</p>
              {bookingData.occasions && bookingData.occasions.length > 0 && (
                <p className="text-sm text-[var(--color-text-muted)]">
                  Occasion: {bookingData.occasions.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Special Requests */}
          <div className="bg-gray-50 rounded-lg p-4">
            <label htmlFor="reviewSpecialRequests" className="block text-sm font-medium text-gray-900 mb-2">
              Special Requests
            </label>
            <textarea
              id="reviewSpecialRequests"
              value={specialRequests}
              onChange={(e) => handleSpecialRequestsChange(e.target.value)}
              placeholder="Any dietary restrictions, accessibility needs, or special requests..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              rows={3}
            />
            <div className="flex justify-between mt-1">
              <p className="text-sm text-gray-500">
                Optional - Let us know about any special requirements
              </p>
              <p className={`text-sm ${specialRequests.length > 500 ? 'text-red-600' : 'text-gray-500'}`}>
                {specialRequests.length}/500
              </p>
            </div>
            {errors.specialRequests && (
              <p className="mt-1 text-sm text-red-600">{errors.specialRequests}</p>
            )}
          </div>
        </div>
      </div>

      {/* Policies and Terms */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Important Policies</h3>
        
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p>
              <strong>Cancellation Policy:</strong> Free cancellation up to 2 hours before your reservation time.
            </p>
          </div>
          
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p>
              <strong>Late Arrival:</strong> We'll hold your table for 15 minutes past your reservation time.
            </p>
          </div>
          
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p>
              <strong>Payment:</strong> No payment required to book. Pay at the restaurant after your meal.
            </p>
          </div>
          
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <p>
              <strong>Health & Safety:</strong> We follow all local health guidelines for your safety.
            </p>
          </div>
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="border border-gray-200 rounded-lg p-4">
        <label className="flex items-start space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => {
              setAgreedToTerms(e.target.checked);
              if (errors.terms) {
                setErrors(prev => ({ ...prev, terms: '' }));
              }
            }}
            className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
          />
          <div className="text-sm text-gray-700">
            <span className="font-medium">I agree to the terms and conditions</span>
            <p className="text-gray-600 mt-1">
              By confirming this reservation, you agree to our cancellation policy, 
              late arrival policy, and restaurant terms of service.
            </p>
          </div>
        </label>
        {errors.terms && (
          <p className="mt-2 text-sm text-red-600">{errors.terms}</p>
        )}
      </div>

      {/* Estimated Cost */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Estimated Total (Food & Beverages)</span>
          <span className="text-lg font-semibold text-gray-900">
            ${getEstimatedTotal().toFixed(2)}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          *Estimated based on party size. Actual total will depend on your order.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          disabled={loading}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !agreedToTerms}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Confirm Reservation'}
        </button>
      </div>
    </div>
  );
};
