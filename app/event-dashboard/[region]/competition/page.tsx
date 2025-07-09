'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PERFORMANCE_TYPES } from '@/lib/types';
import { CountdownTimer } from '@/components/CountdownTimer';

interface Event {
  id: string;
  name: string;
  description: string;
  region: string;
  ageCategory: string;
  performanceType: string;
  eventDate: string;
  registrationDeadline: string;
  venue: string;
  status: string;
  maxParticipants?: number;
  entryFee: number;
}

interface Contestant {
  id: string;
  eodsaId: string;
  name: string;
  email: string;
  phone: string;
  type: 'studio' | 'private';
  studioName?: string;
  dancers: {
    id: string;
    name: string;
    age: number;
    style: string;
    nationalId: string;
  }[];
}

interface StudioSession {
  id: string;
  name: string;
  email: string;
  registrationNumber: string;
}

export default function CompetitionEntryPage() {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const region = decodeURIComponent(params?.region as string || '');
  const eodsaId = searchParams?.get('eodsaId') || '';
  const studioId = searchParams?.get('studioId') || '';
  const eventId = searchParams?.get('eventId') || '';
  
  const [contestant, setContestant] = useState<Contestant | null>(null);
  const [studioInfo, setStudioInfo] = useState<StudioSession | null>(null);
  const [availableDancers, setAvailableDancers] = useState<any[]>([]);
  const [isStudioMode, setIsStudioMode] = useState(false);
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (region && eventId) {
      if (eodsaId) {
        setIsStudioMode(false);
        loadContestant(eodsaId);
      } else if (studioId) {
        setIsStudioMode(true);
        loadStudioData(studioId);
      }
      loadEvent(eventId);
    }
  }, [region, eodsaId, studioId, eventId]);

  const loadContestant = async (id: string) => {
    try {
      // Try unified system first (new dancers)
      const unifiedResponse = await fetch(`/api/dancers/by-eodsa-id/${id}`);
      if (unifiedResponse.ok) {
        const unifiedData = await unifiedResponse.json();
        if (unifiedData.success && unifiedData.dancer) {
          const dancer = unifiedData.dancer;
          const isStudioLinked = dancer.studioAssociation !== null;
          setContestant({
            id: dancer.id,
            eodsaId: dancer.eodsaId,
            name: dancer.name,
            email: dancer.email || '',
            phone: dancer.phone || '',
            type: isStudioLinked ? ('studio' as const) : ('private' as const),
            studioName: dancer.studioAssociation?.studioName,
            dancers: [{
              id: dancer.id,
              name: dancer.name,
              age: dancer.age,
              style: '',
              nationalId: dancer.nationalId
            }]
          });
          return;
        }
      }
      
      // Fallback to legacy system (contestants)
      const legacyResponse = await fetch(`/api/contestants/by-eodsa-id/${id}`);
      if (legacyResponse.ok) {
        const legacyData = await legacyResponse.json();
        setContestant(legacyData);
      }
    } catch (error) {
      console.error('Failed to load contestant:', error);
    }
  };

  const loadStudioData = async (id: string) => {
    try {
      const studioSession = localStorage.getItem('studioSession');
      if (!studioSession) {
        router.push('/studio-login');
        return;
      }

      const parsedSession = JSON.parse(studioSession);
      if (parsedSession.id !== id) {
        router.push('/studio-login');
        return;
      }

      const response = await fetch(`/api/studios/dancers-new?studioId=${id}`);
      const data = await response.json();
      
      if (data.success) {
        setStudioInfo(parsedSession);
        setAvailableDancers(data.dancers);
      }
    } catch (error) {
      console.error('Failed to load studio data:', error);
    }
  };

  const loadEvent = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/events');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const selectedEvent = data.events.find((e: Event) => e.id === id);
          setEvent(selectedEvent || null);
        }
      }
    } catch (error) {
      console.error('Failed to load event:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getParticipantRequirements = (performanceType: string) => {
    const typeInfo = PERFORMANCE_TYPES[performanceType as keyof typeof PERFORMANCE_TYPES];
    if (typeInfo) {
      return { description: typeInfo.description };
    }
    switch (performanceType) {
      case 'Solo': return { description: 'Individual performance' };
      case 'Duet': return { description: 'Two dancers together' };
      case 'Trio': return { description: 'Three dancers together' };
      case 'Group': return { description: '4+ dancers together' };
      default: return { description: 'Performance' };
    }
  };

  const getStartingFee = (performanceType: string) => {
    if (performanceType === 'Solo') {
      return 400; // R400 for 1 solo (plus R300 registration)
    } else if (performanceType === 'Duet' || performanceType === 'Trio') {
      return 280; // R280 per person (plus R300 registration each)
    } else if (performanceType === 'Group') {
      return 220; // R220 per person for small groups (plus R300 registration each)
    }
    return 0;
  };

  const getFeeExplanation = (performanceType: string) => {
    if (performanceType === 'Solo') {
      return 'Solo packages: 1 solo R400, 2 solos R750, 3 solos R1000, 4 solos R1200, 5th FREE. Plus R300 registration.';
    } else if (performanceType === 'Duet' || performanceType === 'Trio') {
      return 'R280 per person + R300 registration each';
    } else if (performanceType === 'Group') {
      return 'Small groups (4-9): R220pp, Large groups (10+): R190pp. Plus R300 registration each.';
    }
    return 'Per person + R300 registration each';
  };

  if (!region || (!eodsaId && !studioId) || !eventId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-700/20 p-8 text-center">
          <div className="text-6xl mb-6">❌</div>
          <h2 className="text-2xl font-bold text-white mb-4">Missing Information</h2>
          <p className="text-gray-300 mb-6">Authentication or event information not provided.</p>
          <Link 
            href="/"
            className="block w-full px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 transition-all duration-300 font-semibold"
          >
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-4 border-purple-500/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-purple-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-pink-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🎭</span>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-white">Loading Competition</h3>
            <p className="text-slate-400 text-sm">Preparing performance options...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-lg border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Back Navigation */}
          <div className="mb-4">
            <Link 
              href={`/event-dashboard/${region}?${isStudioMode ? `studioId=${studioId}` : `eodsaId=${eodsaId}`}`}
              className="inline-flex items-center space-x-2 px-3 py-2 bg-slate-800/80 text-slate-300 rounded-lg hover:bg-slate-700 transition-all duration-300 group text-sm"
            >
              <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Events</span>
            </Link>
          </div>

          {/* Event Header */}
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">
              {event.name}
            </h1>
            <p className="text-slate-400 text-sm sm:text-base mb-4">Choose your performance category</p>
            
            {/* User Info */}
            {(contestant || studioInfo) && (
              <div className="bg-slate-800/60 backdrop-blur rounded-xl p-3 sm:p-4 inline-block max-w-full">
                {isStudioMode ? (
                  <div className="text-center sm:text-left">
                    <p className="text-slate-300 text-sm sm:text-base">
                      <span className="text-emerald-400 font-semibold">{studioInfo?.name}</span>
                    </p>
                    <p className="text-xs sm:text-sm text-slate-400">
                      Reg: {studioInfo?.registrationNumber} • {availableDancers.length} dancers
                    </p>
                  </div>
                ) : (
                  <div className="text-center sm:text-left">
                    <p className="text-slate-300 text-sm sm:text-base">
                      Welcome, <span className="text-purple-400 font-semibold">{contestant?.name}</span>
                    </p>
                    <p className="text-xs sm:text-sm text-slate-400">
                      ID: {contestant?.eodsaId}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="bg-slate-800/60 backdrop-blur-xl rounded-2xl border border-slate-700/50 p-6 sm:p-8">
          <h3 className="text-xl sm:text-2xl font-bold text-white mb-6 text-center">Register for Competition</h3>
          
          {/* Performance Types Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {['Duet', 'Trio', 'Solo', 'Group'].map((performanceType) => (
              <div key={performanceType} className="group/type">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-purple-500/10 rounded-xl blur-lg opacity-0 group-hover/type:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative bg-slate-700/50 backdrop-blur-xl rounded-xl p-4 sm:p-6 border border-slate-600/50 hover:border-purple-500/30 transition-all duration-300">
                    {/* Performance Type Header */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                        <span className="text-lg">
                          {performanceType === 'Solo' && '💃'}
                          {performanceType === 'Duet' && '👯'}
                          {performanceType === 'Trio' && '👥'}
                          {performanceType === 'Group' && '🎭'}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-white">{performanceType}s</h4>
                        <p className="text-slate-400 text-sm">{getParticipantRequirements(performanceType).description}</p>
                      </div>
                    </div>

                    {/* Fee Info */}
                    <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/30">
                      <p className="text-emerald-400 text-sm font-medium mb-1">
                        From R{getStartingFee(performanceType)}
                      </p>
                      <p className="text-slate-300 text-xs">
                        {getFeeExplanation(performanceType)}
                      </p>
                    </div>

                    {/* Existing Dancers (for studios) */}
                    {isStudioMode && availableDancers.length > 0 && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium text-slate-300 mb-2">Available Dancers:</h5>
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {availableDancers.slice(0, 3).map((dancer) => (
                            <div key={dancer.id} className="flex items-center space-x-2 text-xs">
                              <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                              <span className="text-slate-300">{dancer.name}</span>
                              <span className="text-slate-500">({dancer.eodsaId})</span>
                            </div>
                          ))}
                          {availableDancers.length > 3 && (
                            <p className="text-xs text-slate-400">+{availableDancers.length - 3} more</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Action Button */}
                    <button
                      onClick={() => router.push(`/event-dashboard/${region}/${performanceType.toLowerCase()}?${isStudioMode ? `studioId=${studioId}` : `eodsaId=${eodsaId}`}&eventId=${event.id}`)}
                      className="w-full group/btn relative overflow-hidden px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-medium transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl hover:shadow-purple-500/25"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700"></div>
                      <div className="relative flex items-center justify-center space-x-2">
                        <span className="text-sm">Add {performanceType}</span>
                        <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Registration Deadline */}
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"></path>
              </svg>
              <span className="text-amber-300 font-medium">Registration Deadline</span>
            </div>
            <p className="text-amber-200 mb-2">
              {new Date(event.registrationDeadline).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
            <CountdownTimer deadline={event.registrationDeadline} />
          </div>
        </div>
      </div>
    </div>
  );
} 