'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useToast } from '@/components/ui/simple-toast';
import CountdownTimer from '@/app/components/CountdownTimer';

interface NationalsEvent {
  id: string;
  name: string;
  description: string;
  eventDate: string;
  eventEndDate?: string;
  registrationDeadline: string;
  venue: string;
  status: string;
  maxParticipants?: number;
  createdAt: string;
}

interface NationalsEventEntry {
  id: string;
  nationalsEventId: string;
  eodsaId: string;
  contestantName: string;
  itemName: string;
  performanceType: string;
  ageCategory: string;
  mastery: string;
  itemStyle: string;
  approved: boolean;
  paymentStatus: string;
  calculatedFee: number;
  submittedAt: string;
}

export default function NationalsDashboard() {
  const [nationalsEvents, setNationalsEvents] = useState<NationalsEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<NationalsEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<NationalsEvent | null>(null);
  const [eventEntries, setEventEntries] = useState<NationalsEventEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [eventsPerPage] = useState(6);
  const { success, error, warning, info } = useToast();

  useEffect(() => {
    fetchNationalsEvents();
  }, []);

  const fetchNationalsEvents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/nationals/events');
      if (response.ok) {
        const data = await response.json();
        setNationalsEvents(data.events || []);
        setFilteredEvents(data.events || []);
        
        // Auto-select the first upcoming event
        const upcomingEvents = data.events.filter((event: NationalsEvent) => 
          new Date(event.eventDate) >= new Date()
        );
        if (upcomingEvents.length > 0) {
          setSelectedEvent(upcomingEvents[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching nationals events:', err);
      error('Failed to load nationals events');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEventEntries = async (eventId: string) => {
    try {
      setIsLoadingEntries(true);
      const response = await fetch(`/api/nationals/event-entries?eventId=${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setEventEntries(data.entries.filter((entry: NationalsEventEntry) => entry.approved) || []);
      }
    } catch (err) {
      console.error('Error fetching event entries:', err);
      error('Failed to load event entries');
    } finally {
      setIsLoadingEntries(false);
    }
  };

  useEffect(() => {
    if (selectedEvent) {
      fetchEventEntries(selectedEvent.id);
    }
  }, [selectedEvent]);

  // Search functionality
  useEffect(() => {
    const filtered = nationalsEvents.filter(event =>
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.venue.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEvents(filtered);
    setCurrentPage(1); // Reset to first page when searching
  }, [searchTerm, nationalsEvents]);

  // Pagination calculations
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'registration_open':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'registration_closed':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPerformanceTypeIcon = (type: string) => {
    switch (type) {
      case 'Solo': return '👤';
      case 'Duet': return '👥';
      case 'Trio': return '👥';
              case 'Group': return '👥';
      default: return '🎭';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading nationals events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg shadow-xl border-b border-yellow-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-6 gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🏆</span>
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                  EODSA Nationals
                </h1>
                <p className="text-gray-700 font-medium">National Competition Events</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                href="/nationals-registration"
                className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 font-semibold shadow-lg"
              >
                🏆 Register for Nationals
              </Link>
              <Link 
                href="/event-dashboard"
                className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-semibold shadow-lg"
              >
                ← Regional Events
              </Link>
              <Link 
                href="/"
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg"
              >
                🏠 Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Selection */}
        <div className="bg-white/90 rounded-2xl shadow-xl overflow-hidden mb-8">
          <div className="px-6 py-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-100">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Nationals Events</h2>
                <p className="text-gray-600 mt-1">Select an event to view participants and details</p>
              </div>
              
              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full sm:w-80 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 bg-white"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <span className="text-gray-400">🔍</span>
                </div>
              </div>
            </div>
          </div>

          {filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏆</div>
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No events match your search' : 'No nationals events scheduled'}
              </p>
              <p className="text-gray-400 text-sm mt-2">
                {searchTerm ? 'Try a different search term' : 'Check back later for upcoming national competitions'}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {currentEvents.map((event) => (
                <div 
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`cursor-pointer rounded-xl p-6 border-2 transition-all duration-300 hover:shadow-lg ${
                    selectedEvent?.id === event.id 
                      ? 'border-yellow-500 bg-yellow-50 shadow-lg' 
                      : 'border-gray-200 bg-white hover:border-yellow-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-gray-900">{event.name}</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(event.status)}`}>
                      {event.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{event.description}</p>
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="mr-2">📅</span>
                      <span>{new Date(event.eventDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">📍</span>
                      <span>{event.venue}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">⏰</span>
                      <span>Reg. Deadline: {new Date(event.registrationDeadline).toLocaleDateString()}</span>
                    </div>
                    {event.maxParticipants && (
                      <div className="flex items-center">
                        <span className="mr-2">👥</span>
                        <span>Max: {event.maxParticipants} participants</span>
                      </div>
                    )}
                  </div>

                  {/* Registration Countdown */}
                  {event.status === 'registration_open' && new Date(event.registrationDeadline) > new Date() && (
                    <div className="mt-4 p-3 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg">
                      <p className="text-white text-sm font-medium mb-2 text-center">Registration Ends In:</p>
                      <CountdownTimer deadline={event.registrationDeadline} />
                    </div>
                  )}
                  
                  {/* Event-specific registration button */}
                  {event.status === 'registration_open' && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <Link
                        href={`/nationals-registration?eventId=${event.id}`}
                        className="w-full inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 font-semibold text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        🏆 Register for This Event
                      </Link>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Showing {indexOfFirstEvent + 1}-{Math.min(indexOfLastEvent, filteredEvents.length)} of {filteredEvents.length} events
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      }`}
                    >
                      Previous
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNumber) => (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          currentPage === pageNumber
                            ? 'bg-yellow-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className={`px-3 py-1 rounded-lg text-sm ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
            </>
          )}
        </div>

        {/* Selected Event Details */}
        {selectedEvent && (
          <div className="bg-white/90 rounded-2xl shadow-xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-b border-yellow-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedEvent.name}</h2>
                  <p className="text-gray-600 mt-1">Event Participants</p>
                </div>
                <div className="text-right">
                  <span className={`px-4 py-2 rounded-xl text-sm font-bold border ${getStatusColor(selectedEvent.status)}`}>
                    {selectedEvent.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {isLoadingEntries ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading participants...</p>
              </div>
            ) : eventEntries.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">👥</div>
                <p className="text-gray-500 text-lg">No participants registered yet</p>
                <p className="text-gray-400 text-sm mt-2">Participants will appear here once they register and are approved</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50/80">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Participant
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Performance
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Style
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                        Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {eventEntries.map((entry) => (
                      <tr key={entry.id} className="hover:bg-yellow-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{entry.contestantName}</div>
                            <div className="text-sm text-gray-500">EODSA ID: {entry.eodsaId}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{entry.itemName}</div>
                          <div className="text-sm text-gray-500">{entry.mastery}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="mr-2">{getPerformanceTypeIcon(entry.performanceType)}</span>
                            <span className="text-sm text-gray-900">{entry.performanceType}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.ageCategory}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {entry.itemStyle}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            entry.paymentStatus === 'completed' 
                              ? 'bg-green-100 text-green-800' 
                              : entry.paymentStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {entry.paymentStatus}
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            R{entry.calculatedFee.toFixed(2)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center space-x-4 px-6 py-3 bg-white/80 rounded-xl shadow-lg">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🏆</span>
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900">EODSA Nationals</p>
              <p className="text-xs text-gray-600">National Dance Competition</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 