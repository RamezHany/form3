'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Event {
  id: string;
  name: string;
  image: string | null;
  registrations: number;
  enabled?: boolean;
}

interface Company {
  id: string;
  name: string;
  username: string;
  image: string | null;
  enabled?: boolean;
}

export default function CompanyEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  
  const [company, setCompany] = useState<Company | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [success, setSuccess] = useState('');

  const fetchCompanyAndEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch companies to find the current one
      const companiesResponse = await fetch('/api/companies');
      
      if (!companiesResponse.ok) {
        throw new Error('Failed to fetch companies');
      }
      
      const companiesData = await companiesResponse.json();
      const currentCompany = companiesData.companies.find(
        (c: Company) => c.id === companyId
      );
      
      if (!currentCompany) {
        throw new Error('Company not found');
      }
      
      setCompany(currentCompany);
      
      // Fetch events for this company
      const eventsResponse = await fetch(`/api/events?company=${currentCompany.name}`);
      
      if (!eventsResponse.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const eventsData = await eventsResponse.json();
      setEvents(eventsData.events || []);
    } catch (error) {
      console.error('Error fetching company and events:', error);
      setError('Failed to load company and events');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    // Redirect if not authenticated or not admin
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session.user.type !== 'admin') {
      router.push('/');
      return;
    }

    // Fetch company and events
    if (status === 'authenticated') {
      fetchCompanyAndEvents();
    }
  }, [status, session, router, fetchCompanyAndEvents]);

  const handleViewRegistrations = (eventId: string) => {
    if (!company) return;
    router.push(`/control_admin/company/${companyId}/event/${eventId}`);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!company) return;
    
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }
    
    try {
      const response = await fetch(
        `/api/events?company=${company.name}&event=${eventId}`,
        {
          method: 'DELETE',
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to delete event');
      }
      
      // Refresh events list
      fetchCompanyAndEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event');
    }
  };

  const handleToggleCompanyStatus = async () => {
    if (!company) return;
    
    try {
      setUpdating(true);
      setError('');
      setSuccess('');
      
      const response = await fetch('/api/companies', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: company.id,
          enabled: !company.enabled,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update company');
      }
      
      // Update local state
      setCompany({
        ...company,
        enabled: !company.enabled,
      });
      
      setSuccess(`Company ${!company.enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error updating company:', error);
      setError(error instanceof Error ? error.message : 'Failed to update company');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleEventStatus = async (eventId: string, currentEnabled: boolean) => {
    if (!company) return;
    
    try {
      setError('');
      
      const response = await fetch('/api/events', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyName: company.name,
          eventName: eventId,
          enabled: !currentEnabled,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update event');
      }
      
      // Update local state
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, enabled: !currentEnabled } 
          : event
      ));
      
      setSuccess(`Event ${eventId} ${!currentEnabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error updating event:', error);
      setError(error instanceof Error ? error.message : 'Failed to update event');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-red-500">Company not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            {company.image ? (
              <div className="h-12 w-12 mr-4 relative">
                <Image
                  src={company.image}
                  alt={company.name}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
            ) : (
              <div className="h-12 w-12 mr-4 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-500 text-lg">
                  {company.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900">{company.name} Events</h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleToggleCompanyStatus}
              disabled={updating}
              className={`${
                company.enabled
                  ? 'bg-red-100 hover:bg-red-200 text-red-800'
                  : 'bg-green-100 hover:bg-green-200 text-green-800'
              } font-semibold py-2 px-4 rounded ${
                updating ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {updating
                ? 'Updating...'
                : company.enabled
                ? 'Disable Company'
                : 'Enable Company'}
            </button>
            <Link
              href="/control_admin"
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
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
          
          {company.enabled === false && (
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
              This company is currently disabled. Users cannot register for any events.
            </div>
          )}
          
          {events.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
              <p className="text-gray-500">No events found for this company.</p>
            </div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <ul className="divide-y divide-gray-200">
                {events.map((event) => (
                  <li key={event.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      {event.image ? (
                        <div className="h-16 w-16 mr-4 relative">
                          <Image
                            src={event.image}
                            alt={event.name}
                            fill
                            className="rounded object-cover"
                          />
                        </div>
                      ) : (
                        <div className="h-16 w-16 mr-4 bg-gray-200 rounded flex items-center justify-center">
                          <span className="text-gray-500 text-lg">
                            {event.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">{event.name}</h3>
                        <p className="text-sm text-gray-500">
                          {event.registrations} registrations
                        </p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewRegistrations(event.id)}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-800 font-semibold py-2 px-4 rounded"
                      >
                        View Registrations
                      </button>
                      <button
                        onClick={() => handleToggleEventStatus(event.id, event.enabled !== false)}
                        className={`${
                          event.enabled !== false
                            ? 'bg-red-100 hover:bg-red-200 text-red-800'
                            : 'bg-green-100 hover:bg-green-200 text-green-800'
                        } font-semibold py-2 px-4 rounded`}
                      >
                        {event.enabled !== false ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="bg-red-100 hover:bg-red-200 text-red-800 font-semibold py-2 px-4 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 