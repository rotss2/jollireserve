import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

export const BookingConfirmation = ({ bookingData, onNext, onPrevious, user }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [shareOptions, setShareOptions] = useState({
    email: false,
    sms: false,
    calendar: false
  });

  useEffect(() => {
    // Generate booking reference
    const reference = generateBookingReference();
    setBookingReference(reference);

    // Generate QR code
    generateQRCode(reference);

    // Start countdown for reservation time
    startCountdown();

    // Clear booking manager state
    clearBookingState();
  }, []);

  const generateBookingReference = () => {
    const prefix = 'JR'; // Jollibee Reserve
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const generateQRCode = async (reference) => {
    try {
      const qrData = `https://jollibee-reserve.com/booking/${reference}`;
      const url = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  const startCountdown = () => {
    if (!bookingData.date || !bookingData.time) return;

    const bookingDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
    
    const interval = setInterval(() => {
      const now = new Date();
      const timeUntilBooking = bookingDateTime - now;

      if (timeUntilBooking <= 0) {
        clearInterval(interval);
        setCountdown(0);
      } else {
        const hours = Math.floor(timeUntilBooking / (1000 * 60 * 60));
        const minutes = Math.floor((timeUntilBooking % (1000 * 60 * 60)) / (1000 * 60));
        const days = Math.floor(hours / 24);
        const remainingHours = hours % 24;

        if (days > 0) {
          setCountdown(`${days} day${days > 1 ? 's' : ''}, ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`);
        } else if (hours > 0) {
          setCountdown(`${hours} hour${hours > 1 ? 's' : ''}, ${minutes} minute${minutes > 1 ? 's' : ''}`);
        } else {
          setCountdown(`${minutes} minute${minutes > 1 ? 's' : ''}`);
        }
      }
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  };

  const clearBookingState = () => {
    try {
      // Clear the booking session from localStorage
      localStorage.removeItem('booking_session');
    } catch (error) {
      console.warn('Failed to clear booking session:', error);
    }
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

  const handleShareOption = (option) => {
    setShareOptions(prev => ({ ...prev, [option]: !prev[option] }));
  };

  const handleSendConfirmation = async () => {
    const confirmationData = {
      reference: bookingReference,
      email: user?.email,
      phone: user?.phone,
      bookingDetails: bookingData,
      shareOptions
    };

    try {
      // Simulate sending confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Show success message
      alert('Confirmation sent successfully!');
      
    } catch (error) {
      console.error('Failed to send confirmation:', error);
      alert('Failed to send confirmation. Please try again.');
    }
  };

  const handleAddToCalendar = () => {
    const bookingDateTime = new Date(`${bookingData.date}T${bookingData.time}`);
    const endTime = new Date(bookingDateTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

    const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=Jollibee%20Reservation&dates=${bookingDateTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z/${endTime.toISOString().replace(/[-:]/g, '').split('.')[0]}Z&details=Reservation%20for%20${bookingData.partySize}%20people%20at%20Jollibee%20Restaurant.%20Reference:%20${bookingReference}&location=Jollibee%20Restaurant`;
    
    window.open(calendarUrl, '_blank');
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.download = `jollibee-reservation-${bookingReference}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  const handleStartNewBooking = () => {
    // Clear all booking state and start fresh
    onNext({
      startNewBooking: true,
      clearState: true
    });
  };

  return (
    <div className="space-y-6">
      {/* Success Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Reservation Confirmed!
        </h2>
        <p className="text-gray-600">
          Your table has been successfully reserved
        </p>
      </div>

      {/* Booking Reference */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border border-green-200">
        <div className="text-center">
          <p className="text-sm font-medium text-green-800 mb-2">Booking Reference</p>
          <p className="text-3xl font-bold text-green-900 tracking-wider">
            {bookingReference}
          </p>
          <p className="text-sm text-green-700 mt-2">
            Please save this reference for your records
          </p>
        </div>
      </div>

      {/* Booking Details */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Reservation Details</h3>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Date</p>
                <p className="text-gray-700">{formatDate(bookingData.date)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Time</p>
                <p className="text-gray-700">{formatTime(bookingData.time)}</p>
                {countdown && (
                  <p className="text-sm text-blue-600 mt-1">
                    In {countdown}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Party Size</p>
                <p className="text-gray-700">{bookingData.partySize} {bookingData.partySize === 1 ? 'Guest' : 'Guests'}</p>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Dining Preference</p>
                <p className="text-gray-700 capitalize">{bookingData.diningPreference?.replace('_', ' ')}</p>
              </div>
              {bookingData.area && (
                <div>
                  <p className="text-sm font-medium text-gray-900">Preferred Area</p>
                  <p className="text-gray-700 capitalize">{bookingData.area}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">Payment Method</p>
                <p className="text-gray-700 capitalize">{bookingData.paymentMethod?.replace('_', ' ')}</p>
              </div>
            </div>
          </div>

          {bookingData.specialRequests && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium text-gray-900 mb-1">Special Requests</p>
              <p className="text-gray-700">{bookingData.specialRequests}</p>
            </div>
          )}
        </div>
      </div>

      {/* QR Code */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          Check-in QR Code
        </h3>
        <div className="flex flex-col items-center">
          {qrCodeUrl ? (
            <>
              <img src={qrCodeUrl} alt="Booking QR Code" className="mb-4" />
              <p className="text-sm text-gray-600 text-center mb-4">
                Scan this code when you arrive for faster check-in
              </p>
              <button
                onClick={handleDownloadQR}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Download QR Code
              </button>
            </>
          ) : (
            <div className="w-48 h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <p className="text-gray-500 text-center">Loading QR Code...</p>
            </div>
          )}
        </div>
      </div>

      {/* Share Options */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Share Your Reservation
        </h3>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={shareOptions.email}
              onChange={() => handleShareOption('email')}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <div>
              <p className="font-medium text-gray-900">Email Confirmation</p>
              <p className="text-sm text-gray-600">Send confirmation to {user?.email}</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={shareOptions.sms}
              onChange={() => handleShareOption('sms')}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <div>
              <p className="font-medium text-gray-900">SMS Reminder</p>
              <p className="text-sm text-gray-600">Get text reminder before your reservation</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={shareOptions.calendar}
              onChange={() => handleShareOption('calendar')}
              className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
            />
            <div>
              <p className="font-medium text-gray-900">Calendar Event</p>
              <p className="text-sm text-gray-600">Add to your calendar</p>
            </div>
          </label>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSendConfirmation}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Send Confirmation
          </button>
          
          <button
            onClick={handleAddToCalendar}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Add to Calendar
          </button>
        </div>
      </div>

      {/* Important Information */}
      <div className="bg-yellow-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-900 mb-3">
          Important Information
        </h3>
        
        <div className="space-y-2 text-sm text-yellow-800">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p>Please arrive 5-10 minutes before your reservation time.</p>
          </div>
          
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p>Free cancellation up to 2 hours before your reservation.</p>
          </div>
          
          <div className="flex items-start">
            <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p>Bring your booking reference or QR code for faster check-in.</p>
          </div>
        </div>
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
          onClick={handleStartNewBooking}
          className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Make Another Reservation
        </button>
      </div>
    </div>
  );
};
