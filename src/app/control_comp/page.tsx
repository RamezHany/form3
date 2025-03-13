'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface Event {
  id: string;
  name: string;
  image: string | null;
  registrations: number;
}

export default function CompanyDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchEvents = useCallback(async () => {
    if (!session?.user?.name) return;
    
    try {
      setLoading(true);
      const response = await fetch(`/api/events?company=${session.user.name}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load events');
    } finally {
      setLoading(false);
    }
  }, [session]);

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

    // Fetch events
    if (status === 'authenticated') {
      fetchEvents();
    }
  }, [status, session, router, fetchEvents]);

  const handleDeleteEvent = async (eventId: string) => {
    if (!session?.user?.name) return;
    
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }
    
    try {
      const response = await fetch(
        `/api/events?company=${session.user.name}&event=${eventId}`,
        {
          method: 'DELETE',
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to delete event');
      }
      
      // Refresh events list
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event');
    }
  };

  const handleViewRegistrations = (eventId: string) => {
    router.push(`/control_comp/event/${eventId}`);
  };

  if (status === 'loading') {
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
          <div className="flex items-center">
            {session?.user?.image ? (
              <div className="h-12 w-12 mr-4 relative">
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'Company'}
                  fill
                  className="rounded-full object-cover"
                />
              </div>
            ) : (
              <div className="h-12 w-12 mr-4 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-gray-500 text-lg">
                  {session?.user?.name?.charAt(0).toUpperCase() || 'C'}
                </span>
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900">
              {session?.user?.name} Dashboard
            </h1>
          </div>
          <button
            onClick={() => router.push('/api/auth/signout')}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Logout
          </button>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-800">Events</h2>
            <Link
              href="/control_comp/add-event"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Add Event
            </Link>
          </div>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="text-center py-10">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
              <p className="text-gray-500">No events found. Create your first event!</p>
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
                        <p className="text-sm text-blue-500">
                          {`${process.env.NEXT_PUBLIC_URL || window.location.origin}/${session?.user?.name}/${event.id}`}
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