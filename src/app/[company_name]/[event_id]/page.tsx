'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

interface FormData {
  name: string;
  phone: string;
  email: string;
  gender: 'male' | 'female';
  college: string;
  status: 'student' | 'graduate';
  nationalId: string;
}

interface Event {
  id: string;
  name: string;
  image: string | null;
  enabled: boolean;
}

export default function EventRegistrationPage() {
  const params = useParams();
  // Decode URL-encoded parameters
  const companyName = decodeURIComponent(params.company_name as string);
  const eventId = decodeURIComponent(params.event_id as string);
  
  const [formData, setFormData] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    gender: 'male',
    college: '',
    status: 'student',
    nationalId: '',
  });
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [eventImage, setEventImage] = useState<string | null>(null);
  const [exactEventName, setExactEventName] = useState<string | null>(null);
  const [eventEnabled, setEventEnabled] = useState<boolean>(true);

  useEffect(() => {
    // Fetch event details to verify it exists and get the image
    const fetchEventDetails = async () => {
      try {
        setLoading(true);
        console.log('Fetching events for company:', companyName);
        const response = await fetch(`/api/events?company=${encodeURIComponent(companyName)}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch event details');
        }
        
        const data = await response.json();
        console.log('Events received:', data.events);
        
        // Find the event that matches (case insensitive)
        const normalizedEventId = eventId.trim().toLowerCase();
        const event = data.events.find(
          (e: Event) => e.id.trim().toLowerCase() === normalizedEventId
        );
        
        if (!event) {
          console.error('Event not found:', { eventId, availableEvents: data.events.map((e: Event) => e.id) });
          throw new Error('Event not found');
        }
        
        console.log('Found matching event:', event);
        setExactEventName(event.id); // Store the exact event name from the API
        setEventEnabled(event.enabled !== false); // Set event enabled status
        
        if (event.image) {
          setEventImage(event.image);
        }
      } catch (error) {
        console.error('Error fetching event details:', error);
        setError('Event not found or no longer available');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEventDetails();
  }, [companyName, eventId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!exactEventName) {
      setError('Event information is missing. Please refresh the page and try again.');
      return;
    }
    
    // Validate form
    if (
      !formData.name ||
      !formData.phone ||
      !formData.email ||
      !formData.gender ||
      !formData.college ||
      !formData.status ||
      !formData.nationalId
    ) {
      setError('All fields are required');
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Invalid email format');
      return;
    }
    
    // Validate phone number (simple validation)
    const phoneRegex = /^\d{10,15}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError('Invalid phone number format');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      console.log('Submitting registration with:', {
        companyName,
        eventName: exactEventName, // Use the exact event name from the API
      });
      
      const response = await fetch('/api/events/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName,
          eventName: exactEventName, // Use the exact event name from the API
          ...formData,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register for event');
      }
      
      // Show success message
      setSuccess(true);
      
      // Reset form
      setFormData({
        name: '',
        phone: '',
        email: '',
        gender: 'male',
        college: '',
        status: 'student',
        nationalId: '',
      });
    } catch (error) {
      console.error('Error registering for event:', error);
      setError(error instanceof Error ? error.message : 'Failed to register for event');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (error && !submitting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="text-red-500 text-xl mb-4">{error}</div>
          <Link href="/" className="text-blue-500 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }
  
  if (!eventEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="text-red-500 text-xl mb-4">Registration has ended for this event.</div>
          <Link href="/" className="text-blue-500 hover:underline">
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
        {eventImage && (
          <div className="w-full h-64 relative">
            <Image
              src={eventImage}
              alt={`${companyName} - ${eventId} Event`}
              fill
              className="object-cover"
            />
          </div>
        )}
        
        <div className="p-8">
          <h1 className="text-3xl font-bold text-center mb-2">
            {eventId}
          </h1>
          <h2 className="text-xl text-gray-600 text-center mb-8">
            Hosted by {companyName}
          </h2>
          
          {success ? (
            <div className="text-center">
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-6">
                <p className="font-bold">Registration Successful!</p>
                <p>Thank you for registering for this event.</p>
              </div>
              <button
                onClick={() => setSuccess(false)}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Register Another Person
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
                  {error}
                </div>
              )}
              
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-gray-700 text-sm font-bold mb-2"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={submitting}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label
                  htmlFor="phone"
                  className="block text-gray-700 text-sm font-bold mb-2"
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={submitting}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label
                  htmlFor="email"
                  className="block text-gray-700 text-sm font-bold mb-2"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={submitting}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label
                  htmlFor="gender"
                  className="block text-gray-700 text-sm font-bold mb-2"
                >
                  Gender
                </label>
                <select
                  id="gender"
                  name="gender"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={submitting}
                  required
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label
                  htmlFor="college"
                  className="block text-gray-700 text-sm font-bold mb-2"
                >
                  College
                </label>
                <input
                  type="text"
                  id="college"
                  name="college"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.college}
                  onChange={handleChange}
                  disabled={submitting}
                  required
                />
              </div>
              
              <div className="mb-4">
                <label
                  htmlFor="status"
                  className="block text-gray-700 text-sm font-bold mb-2"
                >
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.status}
                  onChange={handleChange}
                  disabled={submitting}
                  required
                >
                  <option value="student">Student</option>
                  <option value="graduate">Graduate</option>
                </select>
              </div>
              
              <div className="mb-6">
                <label
                  htmlFor="nationalId"
                  className="block text-gray-700 text-sm font-bold mb-2"
                >
                  National ID
                </label>
                <input
                  type="text"
                  id="nationalId"
                  name="nationalId"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  value={formData.nationalId}
                  onChange={handleChange}
                  disabled={submitting}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your National ID will only be visible to administrators.
                </p>
              </div>
              
              <div className="flex items-center justify-center">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-full focus:outline-none focus:shadow-outline w-full max-w-xs"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Register for Event'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 