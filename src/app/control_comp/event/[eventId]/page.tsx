'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { exportToPDF, exportToCSV } from '@/utils/export';

interface Registration {
  Name: string;
  Phone: string;
  Email: string;
  Gender: string;
  College: string;
  Status: string;
  'Registration Date': string;
  [key: string]: string | undefined;
}

interface Event {
  id: string;
  name: string;
  image: string | null;
  enabled: boolean;
}

export default function EventRegistrationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const eventId = params.eventId as string;
  
  const [eventName, setEventName] = useState('');
  const [eventDetails, setEventDetails] = useState<Event | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchEventDetails = useCallback(async () => {
    if (!session?.user?.name) return;
    
    try {
      // Fetch all events to find this one
      const response = await fetch(`/api/events?company=${session.user.name}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      const event = data.events.find((e: Event) => e.id === eventId);
      
      if (event) {
        setEventDetails(event);
        setEventName(event.name);
      }
    } catch (error) {
      console.error('Error fetching event details:', error);
      setError('Failed to load event details');
    }
  }, [session, eventId]);

  const fetchRegistrations = useCallback(async () => {
    if (!session?.user?.name) return;
    
    try {
      setLoading(true);
      
      // Fetch registrations for this event
      const response = await fetch(
        `/api/events/registrations?company=${session.user.name}&event=${eventId}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch registrations');
      }
      
      const data = await response.json();
      setRegistrations(data.registrations || []);
      setHeaders(data.headers || []);
      setEventName(eventId);
    } catch (error) {
      console.error('Error fetching registrations:', error);
      setError('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  }, [session, eventId]);

  useEffect(() => {
    // Redirect if not authenticated or not company
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session.user.type !== 'company') {
      router.push('/');
      return;
    }

    // Fetch event details and registrations
    if (status === 'authenticated' && session.user.name) {
      fetchEventDetails();
      fetchRegistrations();
    }
  }, [status, session, router, fetchEventDetails, fetchRegistrations]);

  const handleToggleEventStatus = async () => {
    if (!session?.user?.name || !eventDetails) return;
    
    try {
      setUpdating(true);
      setError('');
      setSuccess('');
      
      const response = await fetch('/api/events', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: session.user.name,
          eventName: eventId,
          enabled: !eventDetails.enabled,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }
      
      // Update local state
      setEventDetails({
        ...eventDetails,
        enabled: !eventDetails.enabled,
      });
      
      setSuccess(`Event ${!eventDetails.enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error updating event:', error);
      setError(error instanceof Error ? error.message : 'Failed to update event');
    } finally {
      setUpdating(false);
    }
  };

  const handleExportPDF = () => {
    if (!session?.user?.name || !registrations.length) return;
    
    // Convert registrations to array format for PDF export
    const data = registrations.map((reg) => {
      return headers.map((header) => reg[header] || '');
    });
    
    exportToPDF(
      data,
      headers,
      `${session.user.name} - ${eventName} Registrations`,
      `${session.user.name}_${eventName}_registrations.pdf`
    );
  };

  const handleExportCSV = () => {
    if (!session?.user?.name || !registrations.length) return;
    
    // Convert registrations to array format for CSV export
    const data = registrations.map((reg) => {
      return headers.map((header) => reg[header] || '');
    });
    
    exportToCSV(
      data,
      headers,
      `${session.user.name}_${eventName}_registrations.csv`
    );
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Event Registrations</h1>
          <div className="flex items-center space-x-4">
            <Link
              href="/control_comp"
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">{eventName}</h2>
            
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                {success}
              </div>
            )}
            
            <div className="flex justify-between items-center mb-4">
              <div className="flex space-x-2">
                <button
                  onClick={handleExportPDF}
                  disabled={!registrations.length}
                  className={`bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded ${
                    !registrations.length ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Export to PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={!registrations.length}
                  className={`bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded ${
                    !registrations.length ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  Export to CSV
                </button>
              </div>
              
              {eventDetails && (
                <button
                  onClick={handleToggleEventStatus}
                  disabled={updating}
                  className={`${
                    eventDetails.enabled
                      ? 'bg-red-100 hover:bg-red-200 text-red-800'
                      : 'bg-green-100 hover:bg-green-200 text-green-800'
                  } font-semibold py-2 px-4 rounded ${
                    updating ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {updating
                    ? 'Updating...'
                    : eventDetails.enabled
                    ? 'Disable Event'
                    : 'Enable Event'}
                </button>
              )}
            </div>
            
            {eventDetails && (
              <div className={`mb-4 p-3 rounded ${
                eventDetails.enabled
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                <p className="text-sm">
                  <strong>Status:</strong> {eventDetails.enabled ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-sm mt-1">
                  {eventDetails.enabled
                    ? 'Users can register for this event.'
                    : 'Registration is closed for this event.'}
                </p>
              </div>
            )}
            
            {loading ? (
              <div className="text-center py-10">Loading registrations...</div>
            ) : registrations.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500">No registrations found for this event.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {headers.map((header) => (
                        <th
                          key={header}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {registrations.map((registration, index) => (
                      <tr key={index}>
                        {headers.map((header) => (
                          <td
                            key={`${index}-${header}`}
                            className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"
                          >
                            {registration[header] || ''}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 