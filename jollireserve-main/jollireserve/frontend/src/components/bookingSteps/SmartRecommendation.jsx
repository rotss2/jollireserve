import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { Icon } from '../Icon';

export const SmartRecommendation = ({ bookingData, onNext, onPrevious, user }) => {
  const [recommendation, setRecommendation] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState(null);

  useEffect(() => {
    generateRecommendations();
  }, [bookingData]);

  const generateRecommendations = async () => {
    try {
      setLoading(true);
      
      // Simulate AI recommendation logic
      const factors = {
        diningPreference: bookingData.diningPreference,
        occasions: bookingData.occasions || [],
        timeOfDay: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        partySize: 2, // Default, will be updated in next step
        userHistory: await getUserBookingHistory(user?.email),
      };

      // Generate primary recommendation
      const primary = await generatePrimaryRecommendation(factors);
      setRecommendation(primary);

      // Generate alternatives
      const altOptions = await generateAlternativeOptions(factors, primary);
      setAlternatives(altOptions);

      // Default select primary recommendation
      setSelectedOption(primary);
      
    } catch (error) {
      console.error('Recommendation generation failed:', error);
      // Fallback to basic options
      setRecommendation(getFallbackRecommendation());
    } finally {
      setLoading(false);
    }
  };

  const getUserBookingHistory = async (email) => {
    if (!email) return [];
    
    try {
      const history = await apiService.request(`/users/${email}/history`);
      return history || [];
    } catch (error) {
      console.warn('Failed to fetch user history:', error);
      return [];
    }
  };

  const generatePrimaryRecommendation = async (factors) => {
    const currentHour = new Date().getHours();
    const isPeakHours = currentHour >= 11 && currentHour <= 14 || currentHour >= 17 && currentHour <= 21;
    const isWeekend = factors.dayOfWeek === 0 || factors.dayOfWeek === 6;

    let recommendation = {
      type: factors.diningPreference,
      title: '',
      description: '',
      benefits: [],
      estimatedTime: '',
      confidence: 0,
      reasoning: ''
    };

    switch (factors.diningPreference) {
      case 'dine_in':
        if (isPeakHours && isWeekend) {
          recommendation = {
            ...recommendation,
            title: 'Reserve a Table for Later',
            description: 'Weekend peak hours - secure your spot in advance',
            benefits: [
              'Guaranteed table availability',
              'Skip the wait line',
              'Preferred seating options',
              'Pre-order available'
            ],
            estimatedTime: 'Book for 30-90 minutes from now',
            confidence: 90,
            reasoning: 'High demand during weekend peak hours',
            suggestedTime: getSuggestedTime(currentHour),
            suggestedPartySize: 2
          };
        } else {
          recommendation = {
            ...recommendation,
            title: 'Walk-in Available',
            description: 'Current wait times are manageable',
            benefits: [
              'Immediate seating possible',
              'No commitment required',
              'Flexible timing',
              'Full menu access'
            ],
            estimatedTime: '10-20 minute wait',
            confidence: 75,
            reasoning: 'Moderate demand with good availability',
            suggestedTime: 'Now',
            suggestedPartySize: 2
          };
        }
        break;

      case 'takeaway':
        recommendation = {
          ...recommendation,
          title: 'Order Ahead for Pickup',
          description: 'Skip the wait with mobile ordering',
          benefits: [
            'Skip the line completely',
            'Food ready when you arrive',
            'Contactless payment',
            'Earn loyalty points'
          ],
          estimatedTime: '15-25 minutes preparation',
          confidence: 85,
          reasoning: 'Fastest option for immediate food',
          suggestedTime: 'Ready in 20 minutes',
          suggestedPartySize: 2
        };
        break;

      case 'queue':
        recommendation = {
          ...recommendation,
          title: 'Join Virtual Queue',
          description: 'Get in line remotely and arrive when ready',
          benefits: [
            'Wait from anywhere',
            'Real-time position updates',
            'SMS notifications',
            'No physical waiting'
          ],
          estimatedTime: '25-40 minute wait',
          confidence: 70,
          reasoning: 'Good balance of convenience and availability',
          suggestedTime: 'Join now, arrive in 30 minutes',
          suggestedPartySize: 2
        };
        break;
    }

    // Adjust based on occasions
    if (factors.occasions.includes('Birthday') || factors.occasions.includes('Anniversary')) {
      recommendation.benefits.push('Special celebration arrangements');
      recommendation.confidence = Math.min(95, recommendation.confidence + 10);
    }

    return recommendation;
  };

  const generateAlternativeOptions = async (factors, primary) => {
    const alternatives = [];

    // Add alternatives based on primary recommendation
    if (primary.type !== 'dine_in') {
      alternatives.push({
        type: 'dine_in',
        title: 'Traditional Dining Experience',
        description: 'Full restaurant service with ambiance',
        benefits: ['Full service', 'Ambiance', 'Full menu', 'Staff assistance'],
        estimatedTime: '15-30 min wait',
        confidence: 60,
        isAlternative: true
      });
    }

    if (primary.type !== 'takeaway') {
      alternatives.push({
        type: 'takeaway',
        title: 'Quick Pickup Option',
        description: 'Fastest way to get your food',
        benefits: ['Fastest option', 'No wait', 'Mobile ordering', 'Contactless'],
        estimatedTime: '10-20 min prep',
        confidence: 65,
        isAlternative: true
      });
    }

    if (primary.type !== 'queue') {
      alternatives.push({
        type: 'queue',
        title: 'Join Live Queue',
        description: 'Be notified when table is ready',
        benefits: ['Wait remotely', 'Real-time updates', 'SMS alerts', 'Flexible'],
        estimatedTime: '20-35 min wait',
        confidence: 55,
        isAlternative: true
      });
    }

    return alternatives.slice(0, 2); // Limit to 2 alternatives
  };

  const getSuggestedTime = (currentHour) => {
    if (currentHour < 11) return '11:30 AM';
    if (currentHour < 14) return '1:00 PM';
    if (currentHour < 17) return '5:30 PM';
    if (currentHour < 20) return '7:30 PM';
    return '8:00 PM';
  };

  const getFallbackRecommendation = () => {
    return {
      type: 'dine_in',
      title: 'Standard Table Reservation',
      description: 'Book a table for your preferred time',
      benefits: ['Guaranteed seating', 'Full service', 'Flexible timing'],
      estimatedTime: '15-30 min wait',
      confidence: 50,
      reasoning: 'Standard recommendation based on availability',
      suggestedTime: 'Next available',
      suggestedPartySize: 2
    };
  };

  const handleSelectOption = (option) => {
    setSelectedOption(option);
  };

  const handleContinue = () => {
    if (!selectedOption) return;

    onNext({
      ...selectedOption,
      recommendationAccepted: true,
      recommendationTimestamp: new Date().toISOString()
    });
  };

  const handleChooseAlternative = () => {
    // Allow user to skip recommendation and go directly to booking
    onNext({
      skipRecommendation: true,
      directBooking: true,
      timestamp: new Date().toISOString()
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing preferences and generating recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Our Recommendation for You
        </h2>
        <p className="text-gray-600">
          Based on current conditions and your preferences
        </p>
      </div>

      {/* Primary Recommendation */}
      {recommendation && (
        <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-lg p-6 border border-red-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {recommendation.title}
              </h3>
              <p className="text-gray-600">{recommendation.description}</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="text-right">
                <div className="text-sm text-gray-500">Confidence</div>
                <div className="text-lg font-bold text-red-600">{recommendation.confidence}%</div>
              </div>
              <div className="w-12 h-12 bg-[var(--color-brand-light)] rounded-full flex items-center justify-center">
                <Icon 
                  name={recommendation.type === 'dine_in' ? 'dineIn' : 
                        recommendation.type === 'takeaway' ? 'takeaway' : 'queue'} 
                  size={24} 
                  color="var(--color-brand)" 
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-700 mb-2">
              <strong>Why we recommend this:</strong> {recommendation.reasoning}
            </p>
            <p className="text-sm font-medium text-gray-900">
              <strong>Estimated time:</strong> {recommendation.estimatedTime}
            </p>
          </div>

          <div className="mb-4">
            <h4 className="font-medium text-gray-900 mb-2">Benefits:</h4>
            <ul className="space-y-1">
              {recommendation.benefits.map((benefit, index) => (
                <li key={index} className="flex items-center text-sm text-gray-700">
                  <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <button
            onClick={() => handleSelectOption(recommendation)}
            className={`w-full py-3 rounded-lg font-medium transition-colors ${
              selectedOption?.type === recommendation.type
                ? 'bg-red-600 text-white'
                : 'bg-white text-red-600 border-2 border-red-300 hover:bg-red-50'
            }`}
          >
            {selectedOption?.type === recommendation.type ? 'Selected' : 'Choose This Option'}
          </button>
        </div>
      )}

      {/* Alternative Options */}
      {alternatives.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Other Options</h3>
          <div className="space-y-3">
            {alternatives.map((alternative, index) => (
              <div
                key={index}
                onClick={() => handleSelectOption(alternative)}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-all
                  ${selectedOption?.type === alternative.type
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{alternative.title}</h4>
                    <p className="text-sm text-gray-600">{alternative.description}</p>
                    <p className="text-sm text-gray-500 mt-1">{alternative.estimatedTime}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Confidence</div>
                    <div className="font-medium text-gray-900">{alternative.confidence}%</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skip Recommendation Option */}
      <div className="text-center">
        <button
          onClick={handleChooseAlternative}
          className="text-red-600 hover:text-red-700 text-sm font-medium underline"
        >
          Skip recommendations and choose my own options
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={onPrevious}
          className="px-6 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Previous
        </button>
        <button
          onClick={handleContinue}
          disabled={!selectedOption}
          className={`
            px-6 py-2 rounded-lg font-medium transition-colors
            ${selectedOption 
              ? 'bg-red-600 text-white hover:bg-red-700' 
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }
          `}
        >
          Continue to Details
        </button>
      </div>
    </div>
  );
};
