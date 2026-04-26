import React, { useState } from 'react';
import { Icon } from '../Icon';

export const BookingPreference = ({ bookingData, onNext, user }) => {
  const [preference, setPreference] = useState(bookingData.diningPreference || '');
  const [occasions, setOccasions] = useState(bookingData.occasions || []);
  const [specialRequests, setSpecialRequests] = useState(bookingData.specialRequests || '');

  const diningOptions = [
    {
      id: 'dine_in',
      title: 'Dine In',
      description: 'Traditional restaurant experience',
      icon: 'dineIn',
      estimatedTime: '15-30 min wait'
    },
    {
      id: 'takeaway',
      title: 'Takeaway',
      description: 'Order ahead for pickup',
      icon: 'takeaway',
      estimatedTime: '10-20 min prep'
    },
    {
      id: 'queue',
      title: 'Join Queue',
      description: 'Get in line for next available table',
      icon: 'queue',
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
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
          How would you like to dine with us?
        </h2>
        <p className="text-[var(--color-text-secondary)]">
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
              p-6 rounded-[var(--radius-md)] border-2 transition-all text-left
              ${preference === option.id 
                ? 'border-[var(--color-brand)] bg-[var(--color-brand-light)]' 
                : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)]'
              }
            `}
            style={{ 
              boxShadow: preference === option.id ? 'var(--shadow-md)' : 'var(--shadow-sm)'
            }}
          >
            <div className="flex items-center mb-3">
              <div className="w-12 h-12 rounded-[var(--radius-md)] bg-[var(--color-brand-light)] flex items-center justify-center mr-3">
                <Icon name={option.icon} size={24} color="var(--color-brand)" />
              </div>
              <div>
                <h3 className="font-semibold text-[var(--color-text-primary)]">{option.title}</h3>
                <p className="text-sm text-[var(--color-text-muted)]">{option.estimatedTime}</p>
              </div>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">{option.description}</p>
            
            {preference === option.id && (
              <div className="mt-3 flex items-center text-[var(--color-brand)]">
                <Icon name="check" size={16} className="mr-1" />
                <span style={{ fontSize: 'var(--text-sm)' }}>Selected</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Occasion Selection */}
      <div>
        <h3 className="text-lg font-medium text-[var(--color-text-primary)] mb-3">
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
                  ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)] border-2 border-[var(--color-brand)]'
                  : 'bg-[var(--color-canvas-alt)] text-[var(--color-text-secondary)] border-2 border-[var(--color-border)] hover:bg-[var(--color-overlay)]'
                }
              `}
              style={{ fontSize: 'var(--text-sm)' }}
            >
              {occasion}
            </button>
          ))}
        </div>
      </div>

      {/* Special Requests */}
      <div>
        <label htmlFor="specialRequests" className="block text-lg font-medium text-[var(--color-text-primary)] mb-2">
          Special Requests (Optional)
        </label>
        <textarea
          id="specialRequests"
          value={specialRequests}
          onChange={(e) => setSpecialRequests(e.target.value)}
          placeholder="Any dietary restrictions, accessibility needs, or special requests..."
          className="w-full px-4 py-3 border border-[var(--color-border)] rounded-[var(--radius-md)] focus:ring-2 focus:ring-[var(--color-brand)] focus:border-[var(--color-brand)] resize-none"
          style={{ fontSize: 'var(--text-base)' }}
          rows={3}
        />
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {specialRequests.length}/500 characters
        </p>
      </div>

      {/* User Info Summary */}
      {user && (
        <div className="bg-[var(--color-canvas-alt)] rounded-[var(--radius-md)] p-4 border border-[var(--color-border)]">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Booking for:</h3>
          <div className="text-sm text-[var(--color-text-secondary)]">
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
          className={`btn-primary ${!canProceed ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          Continue to Recommendations
        </button>
      </div>
    </div>
  );
};
