import React, { useState } from 'react';

export const BookingPreference = ({ bookingData, onNext, user }) => {
  const [preference, setPreference] = useState(bookingData.diningPreference || '');
  const [occasions, setOccasions] = useState(bookingData.occasions || []);
  const [specialRequests, setSpecialRequests] = useState(bookingData.specialRequests || '');

  const diningOptions = [
    {
      id: 'dine_in',
      title: 'Dine In',
      description: 'Traditional restaurant experience',
      icon: '🍽️',
      estimatedTime: '15-30 min wait'
    },
    {
      id: 'takeaway',
      title: 'Takeaway',
      description: 'Order ahead for pickup',
      icon: '🥡',
      estimatedTime: '10-20 min prep'
    },
    {
      id: 'queue',
      title: 'Join Queue',
      description: 'Get in line for next available table',
      icon: '🐝',
      estimatedTime: 'Live wait time'
    }
  ];

  const occasionOptions = [
    'Birthday', 'Anniversary', 'Date Night', 'Business Meeting', 
    'Family Dinner', 'Casual Meal', 'Celebration', 'Other'
  ];

  const handlePreferenceSelect = (selectedPreference) => {
    setPreference(selectedPreference);
  };

  const handleOccasionToggle = (occasion) => {
    setOccasions(prev => 
      prev.includes(occasion) 
        ? prev.filter(o => o !== occasion)
        : [...prev, occasion]
    );
  };

  const handleSubmit = () => {
    if (!preference) {
      return;
    }

    onNext({
      diningPreference: preference,
      occasions,
      specialRequests,
      preferenceTimestamp: new Date().toISOString()
    });
  };

  const canProceed = preference !== '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          How would you like to dine with us?
        </h2>
        <p className="text-gray-600">
          Select your preferred dining experience
        </p>
      </div>

      {/* Dining Preference Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {diningOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => handlePreferenceSelect(option.id)}
            className={`
              p-6 rounded-lg border-2 transition-all duration-200 text-left
              ${preference === option.id 
                ? 'border-red-500 bg-red-50 shadow-md' 
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
              }
            `}
          >
            <div className="flex items-center mb-3">
              <span className="text-3xl mr-3">{option.icon}</span>
              <div>
                <h3 className="font-semibold text-gray-900">{option.title}</h3>
                <p className="text-sm text-gray-600">{option.estimatedTime}</p>
              </div>
            </div>
            <p className="text-sm text-gray-700">{option.description}</p>
            
            {preference === option.id && (
              <div className="mt-3 flex items-center text-red-600">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Selected
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Occasion Selection */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          Any special occasion? (Optional)
        </h3>
        <div className="flex flex-wrap gap-2">
          {occasionOptions.map((occasion) => (
            <button
              key={occasion}
              onClick={() => handleOccasionToggle(occasion)}
              className={`
                px-4 py-2 rounded-full text-sm font-medium transition-colors
                ${occasions.includes(occasion)
                  ? 'bg-red-100 text-red-700 border-2 border-red-300'
                  : 'bg-gray-100 text-gray-700 border-2 border-gray-200 hover:bg-gray-200'
                }
              `}
            >
              {occasion}
            </button>
          ))}
        </div>
      </div>

      {/* Special Requests */}
      <div>
        <label htmlFor="specialRequests" className="block text-lg font-medium text-gray-900 mb-2">
          Special Requests (Optional)
        </label>
        <textarea
          id="specialRequests"
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="Any dietary restrictions, accessibility needs, or special requests..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
          rows={3}
        />
        <p className="text-sm text-gray-500 mt-1">
          {specialRequests.length}/500 characters
        </p>
      </div>

      {/* User Info Summary */}
      {user && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Booking for:</h3>
          <div className="text-sm text-gray-600">
            <p>{user.name || user.email}</p>
            {user.phone && <p>{user.phone}</p>}
          </div>
        </div>
      )}

      {/* Action Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!canProceed}
          className={`
            px-8 py-3 rounded-lg font-medium transition-colors
            ${canProceed 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Continue to Recommendations
        </button>
      </div>
    </div>
  );
};
