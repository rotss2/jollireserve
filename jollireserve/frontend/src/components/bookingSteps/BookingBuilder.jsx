import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';

export const BookingBuilder = ({ bookingData, onNext, onPrevious, loading }) => {
  const [formData, setFormData] = useState({
    date: bookingData.date || '',
    time: bookingData.time || '',
    partySize: bookingData.partySize || 2,
    area: bookingData.area || '',
    specialRequests: bookingData.specialRequests || ''
  });
  
  const [availableTimes, setAvailableTimes] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loadingTimes, setLoadingTimes] = useState(false);
  const [errors, setErrors] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);

  useEffect(() => {
    // Initialize areas
    setAreas([
      { id: 'indoor', name: 'Indoor Dining', capacity: 60, available: true },
      { id: 'outdoor', name: 'Outdoor Patio', capacity: 30, available: true },
      { id: 'private', name: 'Private Room', capacity: 12, available: true },
      { id: 'bar', name: 'Bar Area', capacity: 20, available: true }
    ]);

    // Generate time slots
    generateTimeSlots();
  }, []);

  useEffect(() => {
    if (formData.date) {
      loadAvailableTimes();
    }
  }, [formData.date]);

  const generateTimeSlots = () => {
    const slots = [];
    const startHour = 11; // 11 AM
    const endHour = 22; // 10 PM
    
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(time);
      }
    }
    
    setTimeSlots(slots);
  };

  const loadAvailableTimes = async () => {
    if (!formData.date) return;
    
    try {
      setLoadingTimes(true);
      
      // Simulate API call to get available times
      const response = await apiService.request(`/availability?date=${formData.date}&partySize=${formData.partySize}`);
      
      if (response.availableTimes) {
        setAvailableTimes(response.availableTimes);
      } else {
        // Fallback: show all times with some unavailable
        const timesWithAvailability = timeSlots.map(time => ({
          time,
          available: Math.random() > 0.3, // 70% availability for demo
          waitTime: Math.random() > 0.7 ? Math.floor(Math.random() * 30) + 5 : 0
        }));
        setAvailableTimes(timesWithAvailability);
      }
      
    } catch (error) {
      console.error('Failed to load available times:', error);
      // Fallback to all times available
      setAvailableTimes(timeSlots.map(time => ({
        time,
        available: true,
        waitTime: 0
      })));
    } finally {
      setLoadingTimes(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, date, time: '' }));
    setAvailableTimes([]);
  };

  const handlePartySizeChange = (size) => {
    setFormData(prev => ({ ...prev, partySize: size }));
    // Reload times for new party size
    if (formData.date) {
      loadAvailableTimes();
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.date) {
      newErrors.date = 'Please select a date';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDate < today) {
        newErrors.date = 'Date cannot be in the past';
      }
    }
    
    if (!formData.time) {
      newErrors.time = 'Please select a time';
    }
    
    if (!formData.partySize || formData.partySize < 1 || formData.partySize > 12) {
      newErrors.partySize = 'Party size must be between 1 and 12';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const selectedTimeSlot = availableTimes.find(slot => slot.time === formData.time);
    
    onNext({
      ...formData,
      waitTime: selectedTimeSlot?.waitTime || 0,
      bookingTimestamp: new Date().toISOString()
    });
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // 30 days from now
    return maxDate.toISOString().split('T')[0];
  };

  const getTimeSlotStatus = (slot) => {
    if (!slot.available) return 'unavailable';
    if (slot.waitTime > 0) return 'wait';
    return 'available';
  };

  const getTimeSlotClasses = (slot) => {
    const status = getTimeSlotStatus(slot);
    const isSelected = formData.time === slot.time;
    
    const baseClasses = 'px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ';
    
    if (isSelected) {
      return baseClasses + 'bg-red-600 text-white';
    }
    
    switch (status) {
      case 'available':
        return baseClasses + 'bg-green-100 text-green-800 hover:bg-green-200';
      case 'wait':
        return baseClasses + 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200';
      case 'unavailable':
        return baseClasses + 'bg-gray-100 text-gray-400 cursor-not-allowed';
      default:
        return baseClasses + 'bg-gray-100 text-gray-800 hover:bg-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Booking Details
        </h2>
        <p className="text-gray-600">
          Tell us when and how many people will be dining
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Date Selection */}
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-900 mb-2">
            Date *
          </label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => handleDateChange(e.target.value)}
            min={getMinDate()}
            max={getMaxDate()}
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 ${
              errors.date ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date}</p>
          )}
        </div>

        {/* Party Size */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Party Size *
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(size => (
              <button
                key={size}
                type="button"
                onClick={() => handlePartySizeChange(size)}
                className={`
                  py-2 px-3 rounded-lg font-medium transition-colors
                  ${formData.partySize === size
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }
                `}
              >
                {size}
              </button>
            ))}
          </div>
          <div className="mt-2">
            <button
              type="button"
              onClick={() => handlePartySizeChange(9)}
              className={`py-2 px-3 rounded-lg font-medium transition-colors ${
                formData.partySize >= 9
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              9+
            </button>
            {formData.partySize >= 9 && (
              <input
                type="number"
                min="9"
                max="12"
                value={formData.partySize}
                onChange={(e) => handlePartySizeChange(parseInt(e.target.value) || 9)}
                className="ml-2 w-16 px-2 py-1 border border-gray-300 rounded"
              />
            )}
          </div>
          {errors.partySize && (
            <p className="mt-1 text-sm text-red-600">{errors.partySize}</p>
          )}
        </div>
      </div>

      {/* Time Selection */}
      {formData.date && (
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Preferred Time *
          </label>
          {loadingTimes ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-500"></div>
              <span className="ml-2 text-gray-600">Loading available times...</span>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {availableTimes.map((slot, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => slot.available && handleInputChange('time', slot.time)}
                  disabled={!slot.available}
                  className={getTimeSlotClasses(slot)}
                  title={slot.waitTime > 0 ? `Estimated wait: ${slot.waitTime} min` : 'Available'}
                >
                  <div className="text-center">
                    <div>{slot.time}</div>
                    {slot.waitTime > 0 && (
                      <div className="text-xs">+{slot.waitTime}m</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          {errors.time && (
            <p className="mt-1 text-sm text-red-600">{errors.time}</p>
          )}
          
          {/* Time Legend */}
          <div className="mt-3 flex flex-wrap gap-4 text-xs">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-100 rounded mr-1"></div>
              <span>Available</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-100 rounded mr-1"></div>
              <span>Wait Time</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-gray-100 rounded mr-1"></div>
              <span>Unavailable</span>
            </div>
          </div>
        </div>
      )}

      {/* Area Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-900 mb-2">
          Preferred Area (Optional)
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {areas.map(area => (
            <button
              key={area.id}
              type="button"
              onClick={() => handleInputChange('area', area.id)}
              disabled={!area.available}
              className={`
                p-3 rounded-lg border-2 text-left transition-all
                ${formData.area === area.id
                  ? 'border-red-500 bg-red-50'
                  : area.available
                    ? 'border-gray-200 hover:border-gray-300'
                    : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-gray-900">{area.name}</h4>
                  <p className="text-sm text-gray-600">Capacity: {area.capacity}</p>
                </div>
                {!area.available && (
                  <span className="text-xs text-red-600">Unavailable</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Special Requests */}
      <div>
        <label htmlFor="specialRequests" className="block text-sm font-medium text-gray-900 mb-2">
          Special Requests (Optional)
        </label>
        <textarea
          id="specialRequests"
          value={formData.specialRequests}
          onChange={(e) => handleInputChange('specialRequests', e.target.value)}
          placeholder="Any dietary restrictions, accessibility needs, or special requests..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
          rows={3}
        />
      </div>

      {/* Summary */}
      {formData.date && formData.time && formData.partySize && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Booking Summary</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-600">Date:</span>
              <span className="ml-2 font-medium">
                {new Date(formData.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Time:</span>
              <span className="ml-2 font-medium">{formData.time}</span>
            </div>
            <div>
              <span className="text-gray-600">Party Size:</span>
              <span className="ml-2 font-medium">{formData.partySize} {formData.partySize === 1 ? 'Guest' : 'Guests'}</span>
            </div>
            {formData.area && (
              <div>
                <span className="text-gray-600">Area:</span>
                <span className="ml-2 font-medium">
                  {areas.find(a => a.id === formData.area)?.name}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

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
          disabled={loading || !formData.date || !formData.time || !formData.partySize}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Continue to Review'}
        </button>
      </div>
    </div>
  );
};
