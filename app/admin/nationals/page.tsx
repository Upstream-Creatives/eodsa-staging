'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useToast } from '@/components/ui/simple-toast';
import { useAlert } from '@/components/ui/custom-alert';

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
  createdBy: string;
  createdAt: string;
}

interface Judge {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  specialization?: string[];
  createdAt: string;
}

interface NationalsJudgeAssignment {
  id: string;
  judgeId: string;
  nationalsEventId: string;
  assignedBy: string;
  assignedAt: string;
  judgeName: string;
  judgeEmail: string;
}

interface NationalsEventEntry {
  id: string;
  nationalsEventId: string;
  contestantId: string;
  eodsaId: string;
  participantIds: string[];
  calculatedFee: number;
  paymentStatus: string;
  paymentMethod?: string;
  submittedAt: string;
  approved: boolean;
  qualifiedForNationals: boolean;
  itemNumber?: number;
  itemName: string;
  choreographer: string;
  mastery: string;
  itemStyle: string;
  estimatedDuration: number;
  performanceType: string;
  ageCategory: string;
  soloCount: number;
  soloDetails?: any;
  additionalNotes?: string;
  createdAt: string;
  event: {
    name: string;
    eventDate: string;
    venue: string;
  };
  contestantName: string;
}

export default function NationalsAdminDashboard() {
  const [nationalsEvents, setNationalsEvents] = useState<NationalsEvent[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [judgeAssignments, setJudgeAssignments] = useState<NationalsJudgeAssignment[]>([]);
  const [selectedEventForJudges, setSelectedEventForJudges] = useState<string>('');
  const [judgeCount, setJudgeCount] = useState(0);
  const [nationalsEntries, setNationalsEntries] = useState<NationalsEventEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'events' | 'judges' | 'entries'>('events');
  const [isLoading, setIsLoading] = useState(true);
  const { success, error, warning, info } = useToast();
  const { showAlert, showConfirm, showPrompt } = useAlert();
  const router = useRouter();
  
  // Entry details modal state
  const [selectedEntry, setSelectedEntry] = useState<NationalsEventEntry | null>(null);
  const [showEntryModal, setShowEntryModal] = useState(false);
  
  // Item assignment state
  const [assigningItemNumbers, setAssigningItemNumbers] = useState<Set<string>>(new Set());
  const [editingItemNumber, setEditingItemNumber] = useState<string | null>(null);
  const [tempItemNumber, setTempItemNumber] = useState<string>('');
  
  // Performance type grouping state
  const [groupByPerformanceType, setGroupByPerformanceType] = useState(true);
  
  // Event creation state
  const [newEvent, setNewEvent] = useState({
    name: '',
    description: '',
    eventDate: '',
    eventEndDate: '',
    registrationDeadline: '',
    venue: '',
    maxParticipants: ''
  });
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);

  // Bulk event creation state
  const [showBulkEventModal, setShowBulkEventModal] = useState(false);
  const [bulkEventTemplate, setBulkEventTemplate] = useState({
    baseName: '',
    description: '',
    eventDate: '',
    eventEndDate: '',
    registrationDeadline: '',
    venue: '',
    selectedPerformanceTypes: [] as string[]
  });
  const [isCreatingBulkEvents, setIsCreatingBulkEvents] = useState(false);
  const [bulkCreationProgress, setBulkCreationProgress] = useState({ current: 0, total: 0 });

  // Judge assignment state
  const [assignment, setAssignment] = useState({
    judgeId: '',
    nationalsEventId: ''
  });
  const [isAssigning, setIsAssigning] = useState(false);
  const [showAssignJudgeModal, setShowAssignJudgeModal] = useState(false);

  useEffect(() => {
    // Check for admin session
    const session = localStorage.getItem('adminSession');
    if (!session) {
      router.push('/portal/admin');
      return;
    }

    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch nationals events
      const eventsResponse = await fetch('/api/nationals/events');
      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setNationalsEvents(eventsData.events || []);
      }

      // Fetch judges (reuse from regular admin)
      const judgesResponse = await fetch('/api/judges');
      if (judgesResponse.ok) {
        const judgesData = await judgesResponse.json();
        setJudges(judgesData.judges || []);
      }

      // Fetch nationals entries
      const entriesResponse = await fetch('/api/nationals/event-entries');
      if (entriesResponse.ok) {
        const entriesData = await entriesResponse.json();
        setNationalsEntries(entriesData.entries || []);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingEvent(true);

    try {
      const adminSession = JSON.parse(localStorage.getItem('adminSession') || '{}');
      
      const response = await fetch('/api/nationals/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newEvent,
          maxParticipants: newEvent.maxParticipants ? parseInt(newEvent.maxParticipants) : null,
          createdBy: adminSession.id
        }),
      });

      if (response.ok) {
        const result = await response.json();
        success('Nationals event created successfully!');
        setNewEvent({
          name: '',
          description: '',
          eventDate: '',
          eventEndDate: '',
          registrationDeadline: '',
          venue: '',
          maxParticipants: ''
        });
        setShowCreateEventModal(false);
        fetchData();
      } else {
        const result = await response.json();
        error(result.error || 'Failed to create event');
      }
    } catch (err) {
      console.error('Error creating event:', err);
      error('Failed to create event');
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const handleCreateBulkEvents = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isCreatingBulkEvents) {
      return;
    }

    if (bulkEventTemplate.selectedPerformanceTypes.length === 0) {
      showAlert('Please select at least one performance type', 'warning');
      return;
    }

    setIsCreatingBulkEvents(true);
    setBulkCreationProgress({ current: 0, total: bulkEventTemplate.selectedPerformanceTypes.length });

    try {
      const adminSession = JSON.parse(localStorage.getItem('adminSession') || '{}');
      const results = [];

      for (let i = 0; i < bulkEventTemplate.selectedPerformanceTypes.length; i++) {
        const performanceType = bulkEventTemplate.selectedPerformanceTypes[i];
        setBulkCreationProgress({ current: i + 1, total: bulkEventTemplate.selectedPerformanceTypes.length });

        const eventName = `${bulkEventTemplate.baseName} - ${performanceType}`;

        try {
          const response = await fetch('/api/nationals/events', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: eventName,
              description: bulkEventTemplate.description,
              eventDate: bulkEventTemplate.eventDate,
              eventEndDate: bulkEventTemplate.eventEndDate,
              registrationDeadline: bulkEventTemplate.registrationDeadline,
              venue: bulkEventTemplate.venue,
              maxParticipants: null,
              createdBy: adminSession.id
            }),
          });

          const data = await response.json();
          results.push({ performanceType, success: data.success, error: data.error });
        } catch (error) {
          results.push({ performanceType, success: false, error: 'Network error' });
        }
      }

      // Show results
      const successCount = results.filter(r => r.success).length;
      const failedResults = results.filter(r => !r.success);

      if (successCount === results.length) {
        success(`Successfully created ${successCount} nationals events!`);
        setShowBulkEventModal(false);
        setBulkEventTemplate({
          baseName: '',
          description: '',
          eventDate: '',
          eventEndDate: '',
          registrationDeadline: '',
          venue: '',
          selectedPerformanceTypes: []
        });
        fetchData();
      } else {
        let errorMessage = `Created ${successCount} out of ${results.length} events.\n\nFailed events:\n`;
        failedResults.forEach(r => {
          errorMessage += `- ${r.performanceType}: ${r.error || 'Unknown error'}\n`;
        });
        showAlert(errorMessage, 'warning');
      }
    } catch (error) {
      console.error('Error creating bulk events:', error);
      showAlert('Error creating events. Please check your connection and try again.', 'error');
    } finally {
      setIsCreatingBulkEvents(false);
      setBulkCreationProgress({ current: 0, total: 0 });
    }
  };

  const handleAssignJudge = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAssigning(true);

    try {
      const adminSession = JSON.parse(localStorage.getItem('adminSession') || '{}');
      
      const response = await fetch('/api/nationals/judge-assignments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          judgeId: assignment.judgeId,
          nationalsEventId: assignment.nationalsEventId,
          assignedBy: adminSession.id
        }),
      });

      const result = await response.json();

      if (response.ok) {
        success(result.message || 'Judge assigned to nationals event successfully!');
        setAssignment({ judgeId: '', nationalsEventId: '' });
        setShowAssignJudgeModal(false);
        
        // Refresh judge assignments for the selected event
        if (selectedEventForJudges) {
          fetchJudgeAssignments(selectedEventForJudges);
        }
      } else {
        error(result.error || 'Failed to assign judge');
      }
    } catch (err) {
      console.error('Error assigning judge:', err);
      error('Failed to assign judge');
    } finally {
      setIsAssigning(false);
    }
  };

  const fetchJudgeAssignments = async (eventId: string) => {
    try {
      const response = await fetch(`/api/nationals/judge-assignments?eventId=${eventId}`);
      if (response.ok) {
        const data = await response.json();
        setJudgeAssignments(data.assignments || []);
        setJudgeCount(data.judgeCount || 0);
      }
    } catch (err) {
      console.error('Error fetching judge assignments:', err);
    }
  };

  const handleRemoveJudgeAssignment = async (assignmentId: string) => {
    try {
      const response = await fetch(`/api/nationals/judge-assignments?assignmentId=${assignmentId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        success('Judge assignment removed successfully!');
        if (selectedEventForJudges) {
          fetchJudgeAssignments(selectedEventForJudges);
        }
      } else {
        const result = await response.json();
        error(result.error || 'Failed to remove judge assignment');
      }
    } catch (err) {
      console.error('Error removing judge assignment:', err);
      error('Failed to remove judge assignment');
    }
  };

  const handleEventSelectionForJudges = (eventId: string) => {
    setSelectedEventForJudges(eventId);
    if (eventId) {
      fetchJudgeAssignments(eventId);
    } else {
      setJudgeAssignments([]);
      setJudgeCount(0);
    }
  };

  const handleApproveEntry = async (entryId: string) => {
    try {
      const response = await fetch(`/api/nationals/event-entries/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved: true
        }),
      });

      if (response.ok) {
        success('Entry approved successfully!');
        fetchData(); // Refresh the data
      } else {
        const errorData = await response.json();
        error(errorData.error || 'Failed to approve entry');
      }
    } catch (err) {
      console.error('Error approving entry:', err);
      error('Failed to approve entry');
    }
  };

  const handleUnapproveEntry = async (entryId: string) => {
    try {
      const response = await fetch(`/api/nationals/event-entries/${entryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved: false
        }),
      });

      if (response.ok) {
        success('Entry unapproved successfully!');
        fetchData();
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Failed to unapprove entry');
      }
    } catch (err) {
      console.error('Error unapproving entry:', err);
      error(err instanceof Error ? err.message : 'Failed to unapprove entry');
    }
  };

  const handleApprovePayment = async (entryId: string) => {
    try {
      const response = await fetch(`/api/nationals/event-entries/${entryId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          paymentStatus: 'paid'
        }),
      });

      if (response.ok) {
        success('Payment approved successfully!');
        fetchData();
      } else {
        const result = await response.json();
        throw new Error(result.error || 'Failed to approve payment');
      }
    } catch (err) {
      console.error('Error approving payment:', err);
      error(err instanceof Error ? err.message : 'Failed to approve payment');
    }
  };

  const assignItemNumber = async (entryId: string, itemNumber: number) => {
    if (assigningItemNumbers.has(entryId)) return;

    setAssigningItemNumbers(prev => new Set(prev).add(entryId));

    try {
      const response = await fetch(`/api/nationals/event-entries/${entryId}/assign-item-number`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemNumber }),
      });

      if (response.ok) {
        success('Item number assigned successfully!');
        setEditingItemNumber(null);
        setTempItemNumber('');
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign item number');
      }
    } catch (error: any) {
      console.error('Error assigning item number:', error);
      throw new Error(error.message || 'Failed to assign item number');
    } finally {
      setAssigningItemNumbers(prev => {
        const newSet = new Set(prev);
        newSet.delete(entryId);
        return newSet;
      });
    }
  };

  const handleItemNumberEdit = (entryId: string, currentNumber?: number) => {
    setEditingItemNumber(entryId);
    setTempItemNumber(currentNumber ? currentNumber.toString() : '');
  };

  const handleItemNumberSave = (entryId: string) => {
    const itemNumber = parseInt(tempItemNumber);
    if (isNaN(itemNumber) || itemNumber < 1) {
      warning('Please enter a valid item number (positive integer)');
      return;
    }
    assignItemNumber(entryId, itemNumber);
  };

  const handleItemNumberCancel = () => {
    setEditingItemNumber(null);
    setTempItemNumber('');
  };

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    router.push('/portal/admin');
  };

  // Group entries by performance type
  const groupEntriesByPerformanceType = (entries: NationalsEventEntry[]) => {
    const groups = entries.reduce((acc, entry) => {
      const type = entry.performanceType;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(entry);
      return acc;
    }, {} as Record<string, NationalsEventEntry[]>);

    // Sort each group by item number (assigned items first, then by number, then unassigned)
    Object.keys(groups).forEach(type => {
      groups[type].sort((a, b) => {
        if (a.itemNumber && b.itemNumber) {
          return a.itemNumber - b.itemNumber;
        }
        if (a.itemNumber && !b.itemNumber) return -1;
        if (!a.itemNumber && b.itemNumber) return 1;
        return 0;
      });
    });

    return groups;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading nationals dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg shadow-xl border-b border-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-6 gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🏆</span>
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                  Nationals Administration
                </h1>
                <p className="text-gray-700 font-medium">Manage national competition events</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link 
                href="/admin"
                className="px-4 py-2 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 font-semibold shadow-lg"
              >
                ← Regional Admin
              </Link>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 font-semibold shadow-lg"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex space-x-1 bg-white/80 rounded-2xl p-1 shadow-lg">
          {(['events', 'judges', 'entries'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 px-6 rounded-xl font-semibold transition-all duration-300 ${
                activeTab === tab
                  ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {tab === 'events' && '🏆 Nationals Events'}
              {tab === 'judges' && '👨‍⚖️ Judge Assignments'}
              {tab === 'entries' && '📝 Event Entries'}
              <span className="ml-2 text-xs opacity-75">
                ({tab === 'events' && nationalsEvents.length}
                {tab === 'judges' && judges.filter(j => !j.isAdmin).length}
                {tab === 'entries' && '0'})
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="mt-8">
          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-900">Nationals Events</h2>
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => setShowBulkEventModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 font-semibold shadow-lg"
                  >
                    📦 Bulk Create
                  </button>
                  <button
                    onClick={() => setShowCreateEventModal(true)}
                    className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 font-semibold shadow-lg"
                  >
                    + Create Event
                  </button>
                </div>
              </div>

              {nationalsEvents.length === 0 ? (
                <div className="text-center py-12 bg-white/80 rounded-2xl shadow-lg">
                  <div className="text-6xl mb-4">🏆</div>
                  <p className="text-gray-500 text-lg">No nationals events created yet</p>
                  <p className="text-gray-400 text-sm mt-2">Create your first nationals event to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {nationalsEvents.map((event) => (
                    <div key={event.id} className="bg-white/90 rounded-2xl shadow-lg border border-yellow-100 overflow-hidden">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-gray-900">{event.name}</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            event.status === 'registration_open' 
                              ? 'bg-green-100 text-green-800' 
                              : event.status === 'registration_closed'
                              ? 'bg-yellow-100 text-yellow-800'
                              : event.status === 'completed'
                              ? 'bg-gray-100 text-gray-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {event.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-4">{event.description}</p>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div>📅 {new Date(event.eventDate).toLocaleDateString()}</div>
                          <div>📍 {event.venue}</div>
                          <div>⏰ Registration Deadline: {new Date(event.registrationDeadline).toLocaleDateString()}</div>
                          {event.maxParticipants && (
                            <div>👥 Max Participants: {event.maxParticipants}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Judges Tab */}
          {activeTab === 'judges' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Judge Assignments</h2>
                  <p className="text-gray-600 text-sm mt-1">Each nationals event requires exactly 4 judges</p>
                </div>
                <button
                  onClick={() => setShowAssignJudgeModal(true)}
                  className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all duration-300 font-semibold shadow-lg"
                >
                  + Assign Judge
                </button>
              </div>

              {/* Event Selection for Judge Assignments */}
              <div className="bg-white/90 rounded-2xl shadow-lg p-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Event to View/Manage Judge Assignments
                </label>
                <select
                  value={selectedEventForJudges}
                  onChange={(e) => handleEventSelectionForJudges(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Choose an event...</option>
                  {nationalsEvents.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} - {new Date(event.eventDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>
              </div>

              {/* Judge Assignments Display */}
              {selectedEventForJudges && (
                <div className="bg-white/90 rounded-2xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-b border-purple-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-gray-900">
                        Judge Assignments
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                          judgeCount === 4 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : judgeCount > 4
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {judgeCount}/4 Judges
                        </span>
                        {judgeCount === 4 && (
                          <span className="text-green-600 text-sm">✓ Ready</span>
                        )}
                        {judgeCount < 4 && (
                          <span className="text-yellow-600 text-sm">⚠ Needs {4 - judgeCount} more</span>
                        )}
                        {judgeCount > 4 && (
                          <span className="text-red-600 text-sm">⚠ Too many judges</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {judgeAssignments.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">👨‍⚖️</div>
                      <p className="text-gray-500 text-lg">No judges assigned yet</p>
                      <p className="text-gray-400 text-sm mt-2">Assign judges to this nationals event to get started</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50/80">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Judge
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Email
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Assigned Date
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {judgeAssignments.map((assignment) => (
                            <tr key={assignment.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{assignment.judgeName}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-500">{assignment.judgeEmail}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">
                                  {new Date(assignment.assignedAt).toLocaleDateString()}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <button
                                  onClick={() => handleRemoveJudgeAssignment(assignment.id)}
                                  className="px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* All Judge Assignments Summary */}
              {!selectedEventForJudges && (
                <div className="bg-white/90 rounded-2xl shadow-lg overflow-hidden">
                  <div className="px-6 py-4 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border-b border-purple-100">
                    <h3 className="text-lg font-bold text-gray-900">All Judge Assignments</h3>
                    <p className="text-gray-600 text-sm mt-1">Select an event above to view and manage specific assignments</p>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {nationalsEvents.map((event) => (
                        <div key={event.id} className="border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
                          <h4 className="font-semibold text-gray-900 mb-2">{event.name}</h4>
                          <div className="text-sm text-gray-600 mb-2">
                            {new Date(event.eventDate).toLocaleDateString()}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Judges: </span>
                            <span className="text-gray-600">To be loaded</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Entries Tab */}
          {activeTab === 'entries' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Nationals Event Entries</h2>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={groupByPerformanceType}
                      onChange={(e) => setGroupByPerformanceType(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Group by Performance Type</span>
                  </label>
                </div>
              </div>

              {nationalsEntries.length === 0 ? (
                <div className="text-center py-12 bg-white/80 rounded-2xl shadow-lg">
                  <div className="text-6xl mb-4">📝</div>
                  <p className="text-gray-500 text-lg">No nationals entries yet</p>
                  <p className="text-gray-400 text-sm mt-2">Entries will appear here once dancers register for nationals events</p>
                </div>
              ) : groupByPerformanceType ? (
                <div className="space-y-8">
                  {Object.entries(groupEntriesByPerformanceType(nationalsEntries)).map(([performanceType, entries]) => (
                    <div key={performanceType} className="bg-white/90 rounded-2xl shadow-lg overflow-hidden">
                      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4">
                        <h3 className="text-xl font-bold flex items-center">
                          <span className="text-2xl mr-3">
                            {performanceType === 'Solo' ? '👤' : 
                             performanceType === 'Duet' ? '👥' : 
                             performanceType === 'Trio' ? '👨‍👩‍👧' : '👨‍👩‍👧‍👦'}
                          </span>
                          {performanceType} ({entries.length} entries)
                        </h3>
                      </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50/80">
                        <tr>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Item #
                              </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Contestant
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Event
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Performance
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Fee
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Approval
                              </th>
                              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                                Payment
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                            {entries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap">
                                  {editingItemNumber === entry.id ? (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="number"
                                        min="1"
                                        value={tempItemNumber}
                                        onChange={(e) => setTempItemNumber(e.target.value)}
                                        className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') handleItemNumberSave(entry.id);
                                          if (e.key === 'Escape') handleItemNumberCancel();
                                        }}
                                        autoFocus
                                      />
                                      <button
                                        onClick={() => handleItemNumberSave(entry.id)}
                                        disabled={assigningItemNumbers.has(entry.id)}
                                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                      >
                                        {assigningItemNumbers.has(entry.id) ? '...' : '✓'}
                                      </button>
                                      <button
                                        onClick={handleItemNumberCancel}
                                        className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => handleItemNumberEdit(entry.id, entry.itemNumber)}
                                      className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                    >
                                      {entry.itemNumber || 'Click to assign'}
                                    </button>
                                  )}
                                </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{entry.contestantName}</div>
                                <div className="text-sm text-gray-500">EODSA ID: {entry.eodsaId}</div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{entry.event.name}</div>
                              <div className="text-sm text-gray-500">{new Date(entry.event.eventDate).toLocaleDateString()}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{entry.itemName}</div>
                              <div className="text-sm text-gray-500">
                                    {entry.performanceType === 'Solo' && entry.soloCount > 1 ? (
                                      `${entry.performanceType} (${entry.soloCount} solos) • ${entry.ageCategory}`
                                    ) : (
                                      `${entry.performanceType} • ${entry.ageCategory}`
                                    )}
                                          </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  R{entry.calculatedFee.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    entry.approved 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-yellow-100 text-yellow-800'
                                  }`}>
                                    {entry.approved ? 'Approved' : 'Pending'}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                    entry.paymentStatus === 'paid' 
                                      ? 'bg-green-100 text-green-800' 
                                      : entry.paymentStatus === 'pending'
                                      ? 'bg-yellow-100 text-yellow-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {entry.paymentStatus.charAt(0).toUpperCase() + entry.paymentStatus.slice(1)}
                                  </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                  <div className="flex space-x-2">
                                    {!entry.approved ? (
                                      <button
                                        onClick={() => handleApproveEntry(entry.id)}
                                        className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs"
                                      >
                                        Approve
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleUnapproveEntry(entry.id)}
                                        className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs"
                                      >
                                        Revoke
                                      </button>
                                    )}
                                    {entry.paymentStatus === 'pending' && (
                                      <button
                                        onClick={() => handleApprovePayment(entry.id)}
                                        className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
                                      >
                                        Mark as Paid
                                      </button>
                                    )}
                                    <button
                                      onClick={() => {
                                        setSelectedEntry(entry);
                                        setShowEntryModal(true);
                                      }}
                                      className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs"
                                    >
                                      Details
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/90 rounded-2xl shadow-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50/80">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Item #
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Contestant
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Event
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Performance
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Fee
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Approval
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Payment
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {nationalsEntries.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              {editingItemNumber === entry.id ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    min="1"
                                    value={tempItemNumber}
                                    onChange={(e) => setTempItemNumber(e.target.value)}
                                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleItemNumberSave(entry.id);
                                      if (e.key === 'Escape') handleItemNumberCancel();
                                    }}
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleItemNumberSave(entry.id)}
                                    disabled={assigningItemNumbers.has(entry.id)}
                                    className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                                  >
                                    {assigningItemNumbers.has(entry.id) ? '...' : '✓'}
                                  </button>
                                  <button
                                    onClick={handleItemNumberCancel}
                                    className="px-2 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleItemNumberEdit(entry.id, entry.itemNumber)}
                                  className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                                >
                                  {entry.itemNumber || 'Click to assign'}
                                </button>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900">{entry.contestantName}</div>
                                <div className="text-sm text-gray-500">EODSA ID: {entry.eodsaId}</div>
                                  </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{entry.event.name}</div>
                              <div className="text-sm text-gray-500">{new Date(entry.event.eventDate).toLocaleDateString()}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{entry.itemName}</div>
                              <div className="text-sm text-gray-500">
                                {entry.performanceType === 'Solo' && entry.soloCount > 1 ? (
                                  `${entry.performanceType} (${entry.soloCount} solos) • ${entry.ageCategory}`
                                ) : (
                                  `${entry.performanceType} • ${entry.ageCategory}`
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              R{entry.calculatedFee.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                entry.approved 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {entry.approved ? 'Approved' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                entry.paymentStatus === 'paid' 
                                  ? 'bg-green-100 text-green-800' 
                                  : entry.paymentStatus === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {entry.paymentStatus.charAt(0).toUpperCase() + entry.paymentStatus.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                              {!entry.approved ? (
                                <button
                                  onClick={() => handleApproveEntry(entry.id)}
                                    className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs"
                                >
                                  Approve
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleUnapproveEntry(entry.id)}
                                    className="px-3 py-1 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-xs"
                                >
                                    Revoke
                                </button>
                              )}
                                {entry.paymentStatus === 'pending' && (
                                  <button
                                    onClick={() => handleApprovePayment(entry.id)}
                                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs"
                                  >
                                    Mark as Paid
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedEntry(entry);
                                    setShowEntryModal(true);
                                  }}
                                  className="px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-xs"
                                >
                                  Details
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Event Modal */}
      {showCreateEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Create Nationals Event</h3>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    rows={3}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.eventDate}
                    onChange={(e) => setNewEvent({...newEvent, eventDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event End Date
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.eventEndDate}
                    onChange={(e) => setNewEvent({...newEvent, eventEndDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Deadline *
                  </label>
                  <input
                    type="datetime-local"
                    value={newEvent.registrationDeadline}
                    onChange={(e) => setNewEvent({...newEvent, registrationDeadline: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Venue *
                  </label>
                  <input
                    type="text"
                    value={newEvent.venue}
                    onChange={(e) => setNewEvent({...newEvent, venue: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Participants
                  </label>
                  <input
                    type="number"
                    value={newEvent.maxParticipants}
                    onChange={(e) => setNewEvent({...newEvent, maxParticipants: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    min="1"
                  />
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateEventModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingEvent}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50"
                  >
                    {isCreatingEvent ? 'Creating...' : 'Create Event'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Judge Modal */}
      {showAssignJudgeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Assign Judge to Nationals Event</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Judge *
                  </label>
                  <select
                    value={assignment.judgeId}
                    onChange={(e) => setAssignment({...assignment, judgeId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="">Choose a judge...</option>
                    {judges.filter(j => !j.isAdmin).map((judge) => (
                      <option key={judge.id} value={judge.id}>
                        {judge.name} ({judge.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Nationals Event *
                  </label>
                  <select
                    value={assignment.nationalsEventId}
                    onChange={(e) => setAssignment({...assignment, nationalsEventId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  >
                    <option value="">Choose an event...</option>
                    {nationalsEvents.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.name} - {new Date(event.eventDate).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ Each nationals event requires exactly 4 judges. Make sure not to exceed this limit.
                  </p>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAssignJudgeModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAssignJudge}
                    type="button"
                    disabled={isAssigning}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50"
                  >
                    {isAssigning ? 'Assigning...' : 'Assign Judge'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Event Creation Modal */}
      {showBulkEventModal && (
        <div className="fixed inset-0 bg-white/20 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-white/30">
            <div className="p-6 border-b border-gray-200/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">📦</span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">Bulk Create Nationals Events</h2>
                </div>
                <button
                  onClick={() => setShowBulkEventModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100/50 transition-colors"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateBulkEvents} className="p-6">
              <div className="mb-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <h3 className="text-sm font-semibold text-emerald-800 mb-2">💡 How Bulk Creation Works:</h3>
                <p className="text-sm text-emerald-700">Create multiple nationals events at once, one for each performance type you select. Perfect for setting up comprehensive nationals competitions.</p>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Base Event Name</label>
                  <input
                    type="text"
                    value={bulkEventTemplate.baseName}
                    onChange={(e) => setBulkEventTemplate(prev => ({ ...prev, baseName: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-base font-medium text-gray-900 placeholder-gray-400"
                    required
                    placeholder="e.g. EODSA Nationals 2024"
                  />
                  <p className="text-xs text-gray-500 mt-1">Performance type will be appended automatically (e.g. "EODSA Nationals 2024 - Solo")</p>
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Description</label>
                  <textarea
                    value={bulkEventTemplate.description}
                    onChange={(e) => setBulkEventTemplate(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-base font-medium text-gray-900 placeholder-gray-400"
                    rows={3}
                    required
                    placeholder="Describe the nationals event..."
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Event Date</label>
                  <input
                    type="datetime-local"
                    value={bulkEventTemplate.eventDate}
                    onChange={(e) => setBulkEventTemplate(prev => ({ ...prev, eventDate: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-base font-medium text-gray-900"
                    required
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Event End Date</label>
                  <input
                    type="datetime-local"
                    value={bulkEventTemplate.eventEndDate}
                    onChange={(e) => setBulkEventTemplate(prev => ({ ...prev, eventEndDate: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-base font-medium text-gray-900"
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Registration Deadline</label>
                  <input
                    type="datetime-local"
                    value={bulkEventTemplate.registrationDeadline}
                    onChange={(e) => setBulkEventTemplate(prev => ({ ...prev, registrationDeadline: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-base font-medium text-gray-900"
                    required
                  />
                </div>

                <div className="lg:col-span-1">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Venue</label>
                  <input
                    type="text"
                    value={bulkEventTemplate.venue}
                    onChange={(e) => setBulkEventTemplate(prev => ({ ...prev, venue: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 text-base font-medium text-gray-900 placeholder-gray-400"
                    required
                    placeholder="e.g. Johannesburg Theatre"
                  />
                </div>

                <div className="lg:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Select Performance Types to Create</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['Solo', 'Duet', 'Trio', 'Group'].map(type => (
                      <div key={type} className="relative">
                        <input
                          type="checkbox"
                          id={`bulk-${type}`}
                          checked={bulkEventTemplate.selectedPerformanceTypes.includes(type)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkEventTemplate(prev => ({
                                ...prev,
                                selectedPerformanceTypes: [...prev.selectedPerformanceTypes, type]
                              }));
                            } else {
                              setBulkEventTemplate(prev => ({
                                ...prev,
                                selectedPerformanceTypes: prev.selectedPerformanceTypes.filter(t => t !== type)
                              }));
                            }
                          }}
                          className="sr-only"
                        />
                        <label
                          htmlFor={`bulk-${type}`}
                          className={`flex items-center justify-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                            bulkEventTemplate.selectedPerformanceTypes.includes(type)
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                              : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                          }`}
                        >
                          <span className="text-2xl mr-2">
                            {type === 'Solo' ? '👤' : type === 'Duet' ? '👥' : type === 'Trio' ? '👨‍👩‍👧' : '👨‍👩‍👧‍👦'}
                          </span>
                          <span className="font-medium">{type}</span>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {isCreatingBulkEvents && bulkCreationProgress.total > 0 && (
                <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-emerald-800">Creating events...</span>
                    <span className="text-sm text-emerald-700">{bulkCreationProgress.current} / {bulkCreationProgress.total}</span>
                  </div>
                  <div className="w-full bg-emerald-200 rounded-full h-2">
                    <div 
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(bulkCreationProgress.current / bulkCreationProgress.total) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowBulkEventModal(false)}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  disabled={isCreatingBulkEvents}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBulkEvents || bulkEventTemplate.selectedPerformanceTypes.length === 0}
                  className="inline-flex items-center space-x-3 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 shadow-lg font-semibold"
                >
                  {isCreatingBulkEvents ? (
                    <>
                      <div className="relative w-5 h-5">
                        <div className="absolute inset-0 border-2 border-white/30 rounded-full"></div>
                      </div>
                      <span>Creating {bulkCreationProgress.current}/{bulkCreationProgress.total}...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Create {bulkEventTemplate.selectedPerformanceTypes.length} Events</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Entry Details Modal */}
      {showEntryModal && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Entry Details</h3>
                <button
                  onClick={() => setShowEntryModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column - Contestant Info */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Contestant Information</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEntry.contestantName}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">EODSA ID</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEntry.eodsaId}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Submitted At</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {new Date(selectedEntry.submittedAt).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Right Column - Event Info */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Event Information</h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Event</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEntry.event.name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {new Date(selectedEntry.event.eventDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Venue</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEntry.event.venue}</div>
                  </div>
                </div>
              </div>

              {/* Performance Details */}
              <div className="mt-6 space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Performance Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEntry.itemName}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Choreographer</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEntry.choreographer}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Performance Type</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">
                      {selectedEntry.performanceType === 'Solo' && selectedEntry.soloCount > 1 
                        ? `${selectedEntry.performanceType} (${selectedEntry.soloCount} solos)`
                        : selectedEntry.performanceType}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Age Category</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEntry.ageCategory}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mastery Level</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEntry.mastery}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Style</label>
                    <div className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{selectedEntry.itemStyle}</div>
                  </div>
                </div>
              </div>

              {/* Status & Payment */}
              <div className="mt-6 space-y-4">
                <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Status & Payment</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Number</label>
                    <div className="text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedEntry.itemNumber 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedEntry.itemNumber || 'Not Assigned'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approval Status</label>
                    <div className="text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedEntry.approved 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {selectedEntry.approved ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                    <div className="text-sm">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        selectedEntry.paymentStatus === 'paid' 
                          ? 'bg-green-100 text-green-800' 
                          : selectedEntry.paymentStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedEntry.paymentStatus.charAt(0).toUpperCase() + selectedEntry.paymentStatus.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fee</label>
                    <div className="text-lg font-semibold text-gray-900">R{selectedEntry.calculatedFee.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              {/* Additional Notes */}
              {selectedEntry.additionalNotes && (
                <div className="mt-6 space-y-4">
                  <h4 className="text-lg font-semibold text-gray-900 border-b pb-2">Additional Notes</h4>
                  <div className="text-sm text-gray-900 bg-gray-50 p-3 rounded">
                    {selectedEntry.additionalNotes}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t">
                {!selectedEntry.approved ? (
                  <button
                    onClick={() => {
                      handleApproveEntry(selectedEntry.id);
                      setShowEntryModal(false);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Approve Entry
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      handleUnapproveEntry(selectedEntry.id);
                      setShowEntryModal(false);
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Revoke Approval
                  </button>
                )}
                
                {selectedEntry.paymentStatus === 'pending' && (
                  <button
                    onClick={() => {
                      handleApprovePayment(selectedEntry.id);
                      setShowEntryModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Mark as Paid
                  </button>
                )}

                {!selectedEntry.itemNumber && (
                  <button
                    onClick={() => {
                      handleItemNumberEdit(selectedEntry.id, selectedEntry.itemNumber);
                      setShowEntryModal(false);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Assign Item Number
                  </button>
                )}
                
                <button
                  onClick={() => setShowEntryModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 