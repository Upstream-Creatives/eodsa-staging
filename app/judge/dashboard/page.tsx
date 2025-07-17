'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAlert } from '@/components/ui/custom-alert';

interface Assignment {
  id: string;
  judgeId: string;
  eventId: string;
  assignedBy: string;
  assignedAt: string;
  status: string;
  event: {
  id: string;
  name: string;
    description: string;
    eventDate: string;
    venue: string;
  };
}

interface Performance {
  id: string;
  eventId: string;
  title: string;
  contestantName: string;
  participantNames: string[];
  duration: number;
  status: string;
  scheduledTime?: string;
  choreographer?: string;
  itemStyle?: string;
  mastery?: string;
  itemNumber?: number;
}

interface Score {
  technique: number;
  musicality: number;
  performance: number;
  styling: number;
  overallImpression: number;
  comments: string;
}

interface PerformanceWithScore extends Performance {
  hasScore?: boolean;
  judgeScore?: any;
  isFullyScored?: boolean;
  scoringStatus?: any;
}

export default function JudgeDashboard() {
  // Force black text for all inputs
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .force-black-text input,
      .force-black-text textarea,
      .force-black-text select,
      input,
      textarea,
      select {
        color: black !important;
        -webkit-text-fill-color: black !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [performances, setPerformances] = useState<PerformanceWithScore[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [selectedPerformance, setSelectedPerformance] = useState<PerformanceWithScore | null>(null);
  const [filteredPerformances, setFilteredPerformances] = useState<PerformanceWithScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [judgeName, setJudgeName] = useState('');
  const [judgeId, setJudgeId] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'scoring'>('list');
  const [currentScore, setCurrentScore] = useState<Score>({
    technique: 0,
    musicality: 0,
    performance: 0,
    styling: 0,
    overallImpression: 0,
    comments: ''
  });
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'not_scored' | 'scored'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [performancesPerPage] = useState(6);
  const [searchTerm, setSearchTerm] = useState('');
  const [itemNumberSearch, setItemNumberSearch] = useState('');
  const router = useRouter();
  const { showAlert } = useAlert();

  useEffect(() => {
    const session = localStorage.getItem('judgeSession');
    if (!session) {
      router.push('/portal/judge');
      return;
    }
    
    const judgeData = JSON.parse(session);
    if (judgeData.isAdmin) {
      router.push('/admin');
      return;
    }
    
    setJudgeName(judgeData.name);
    setJudgeId(judgeData.id);
    loadJudgeData(judgeData.id);
  }, [router]);

  useEffect(() => {
    // Filter performances when any filter changes
    filterAndLoadPerformances();
  }, [performances, filterStatus, searchTerm, itemNumberSearch]);

  const loadJudgeData = async (judgeId: string) => {
    setIsLoading(true);
    try {
      // Load nationals judge assignments
      const assignmentsResponse = await fetch(`/api/judges/${judgeId}/assignments`);
      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        setAssignments(assignmentsData.assignments || []);
        
        // Load ALL performances for all assigned nationals events
        const allPerformances: PerformanceWithScore[] = [];
        for (const assignment of assignmentsData.assignments || []) {
          const performancesResponse = await fetch(`/api/events/${assignment.eventId}/performances`);
          if (performancesResponse.ok) {
            const performancesData = await performancesResponse.json();
            
            // Check score status for each performance
            for (const performance of performancesData.performances || []) {
              // Check if this judge has scored this performance
              const scoreResponse = await fetch(`/api/scores/${performance.id}/${judgeId}`);
              const scoreData = await scoreResponse.json();
              
              // Check the complete scoring status (all judges)
              const scoringStatusResponse = await fetch(`/api/scores/performance/${performance.id}`);
              const scoringStatusData = await scoringStatusResponse.json();
              
              allPerformances.push({
                ...performance,
                hasScore: scoreData.success && scoreData.score, // Judge's individual score status
                judgeScore: scoreData.score,
                isFullyScored: scoringStatusData.success ? scoringStatusData.scoringStatus.isFullyScored : false, // All judges scored
                scoringStatus: scoringStatusData.success ? scoringStatusData.scoringStatus : null
              });
            }
          }
        }
        
        // Sort by item number for program order
        allPerformances.sort((a, b) => {
          if (a.itemNumber && b.itemNumber) {
            return a.itemNumber - b.itemNumber;
          } else if (a.itemNumber && !b.itemNumber) {
            return -1;
          } else if (!a.itemNumber && b.itemNumber) {
            return 1;
          } else {
            return a.title.localeCompare(b.title);
          }
        });
        
        setPerformances(allPerformances);
        setFilteredPerformances(allPerformances);
      }
    } catch (error) {
      console.error('Error loading judge data:', error);
      setErrorMessage('Failed to load judge data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndLoadPerformances = () => {
    // Start with ALL performances
    let filtered = [...performances];
    
    // Apply status filter
    if (filterStatus === 'scored') {
      filtered = filtered.filter(p => p.isFullyScored); // Only show fully scored performances
    } else if (filterStatus === 'not_scored') {
      filtered = filtered.filter(p => !p.hasScore); // Show performances this judge hasn't scored
    }

    // Apply search term filter (name, title)
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(lowerSearchTerm) ||
        p.contestantName.toLowerCase().includes(lowerSearchTerm) ||
        (p.participantNames && p.participantNames.some(name => name.toLowerCase().includes(lowerSearchTerm)))
      );
    }

    // Apply item number search
    if (itemNumberSearch) {
      const itemNum = parseInt(itemNumberSearch);
      if (!isNaN(itemNum)) {
        filtered = filtered.filter(p => p.itemNumber === itemNum);
      }
    }

    // Already sorted by item number in loadJudgeData - maintain program order
    setFilteredPerformances(filtered);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const loadPerformanceByItemNumber = (itemNumber: number) => {
      const performance = performances.find(p => p.itemNumber === itemNumber);
      if (performance) {
        handleStartScoring(performance);
      } else {
      showAlert(`No performance found with item number ${itemNumber}`, 'warning');
    }
  };

  const handleItemNumberSearchKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const itemNum = parseInt(itemNumberSearch);
      if (!isNaN(itemNum)) {
        loadPerformanceByItemNumber(itemNum);
      }
    }
  };

  const handleStartScoring = (performance: PerformanceWithScore) => {
    setSelectedPerformance(performance);
    setViewMode('scoring');
    
    // Pre-populate with existing score if available
    if (performance.judgeScore) {
      setCurrentScore({
        technique: performance.judgeScore.technicalScore || 0,
        musicality: performance.judgeScore.musicalScore || 0,
        performance: performance.judgeScore.performanceScore || 0,
        styling: performance.judgeScore.stylingScore || 0,
        overallImpression: performance.judgeScore.overallImpressionScore || 0,
        comments: performance.judgeScore.comments || ''
      });
    } else {
      setCurrentScore({
        technique: 0,
        musicality: 0,
        performance: 0,
        styling: 0,
        overallImpression: 0,
        comments: ''
      });
    }
  };

  const handleScoreChange = (category: keyof Score, value: number | string) => {
    setCurrentScore(prev => ({ ...prev, [category]: value }));
  };

  // Color theme based on mastery type
  const getMasteryColorTheme = (mastery: string | undefined) => {
    if (!mastery) return {
      primary: 'purple-500',
      secondary: 'pink-600',
      light: 'purple-100',
      ring: 'purple-500',
      gradient: 'from-purple-500 to-pink-600',
      bg: 'purple-50',
      border: 'purple-200'
    };

    if (mastery.includes('Water')) {
      return {
        primary: 'blue-500',
        secondary: 'cyan-600', 
        light: 'blue-100',
        ring: 'blue-500',
        gradient: 'from-blue-500 to-cyan-600',
        bg: 'blue-50',
        border: 'blue-200'
      };
    } else if (mastery.includes('Fire')) {
      return {
        primary: 'red-500',
        secondary: 'orange-600',
        light: 'red-100', 
        ring: 'red-500',
        gradient: 'from-red-500 to-orange-600',
        bg: 'red-50',
        border: 'red-200'
      };
    }

    // Default purple theme
    return {
      primary: 'purple-500',
      secondary: 'pink-600',
      light: 'purple-100',
      ring: 'purple-500', 
      gradient: 'from-purple-500 to-pink-600',
      bg: 'purple-50',
      border: 'purple-200'
    };
  };

  const handleSubmitScore = async () => {
    if (!selectedPerformance) return;
    
    setIsSubmittingScore(true);
    setErrorMessage('');
    
    try {
      const response = await fetch('/api/scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          performanceId: selectedPerformance.id,
          judgeId: judgeId,
          technique: currentScore.technique,
          musicality: currentScore.musicality,
          performance: currentScore.performance,
          styling: currentScore.styling,
          overallImpression: currentScore.overallImpression,
          comments: currentScore.comments
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setSuccessMessage(`Score ${selectedPerformance.hasScore ? 'updated' : 'submitted'} successfully for "${selectedPerformance.title}"`);
        setViewMode('list');
        setSelectedPerformance(null);
        
        // Refresh performances to update score status
        await loadJudgeData(judgeId);
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(''), 5000);
      } else {
        setErrorMessage(result.error || 'Failed to submit score. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting score:', error);
      setErrorMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmittingScore(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('judgeSession');
    router.push('/portal/judge');
  };

  // Pagination logic
  const indexOfLastPerformance = currentPage * performancesPerPage;
  const indexOfFirstPerformance = indexOfLastPerformance - performancesPerPage;
  const currentPerformances = filteredPerformances.slice(indexOfFirstPerformance, indexOfLastPerformance);
  const totalPages = Math.ceil(filteredPerformances.length / performancesPerPage);

  const getCompletionStats = () => {
      const scored = performances.filter(p => p.hasScore).length;
      const total = performances.length;
      return { scored, total, percentage: total > 0 ? Math.round((scored / total) * 100) : 0 };
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full mx-auto mb-6 flex items-center justify-center animate-pulse">
            <span className="text-white text-2xl">⚖️</span>
          </div>
          <p className="text-black text-lg">Loading judge dashboard...</p>
        </div>
      </div>
    );
  }

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
              <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
                <span className="text-white text-xl">⚖️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-black">Judge Dashboard</h1>
                <p className="text-sm text-black">Welcome back, {judgeName}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/portal/judge"
                className="px-4 py-2 text-black hover:text-gray-600 font-medium"
              >
                Portal
              </Link>
                <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                Logout
                </button>
                </div>
              </div>
              </div>
            </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
          </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">{errorMessage}</p>
                  </div>
                  </div>
                  </div>
                  </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Scoring Interface */}
        {viewMode === 'scoring' && selectedPerformance && (
          (() => {
            const colorTheme = getMasteryColorTheme(selectedPerformance.mastery);
            return (
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-4xl font-black text-black">
                    Score Performance
                  </h2>
                  <button
                    onClick={() => {
                      setViewMode('list');
                      setSelectedPerformance(null);
                    }}
                    className="px-8 py-4 bg-gray-600 text-white text-xl font-bold rounded-xl hover:bg-gray-700 transition-colors min-h-[60px] min-w-[180px]"
                  >
                    Back to List
                  </button>
                </div>

                {/* Performance Details */}
                <div className={`bg-gradient-to-r from-${colorTheme.bg} to-${colorTheme.light} rounded-xl p-8 mb-8 border-4 border-${colorTheme.border}`}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-6">
                      <div className={`w-24 h-24 rounded-full bg-gradient-to-br from-${colorTheme.primary} to-${colorTheme.secondary} flex items-center justify-center text-white font-black text-3xl shadow-xl border-4 border-white`}>
                        {selectedPerformance.itemNumber || '?'}
                      </div>
                <div>
                    <h3 className={`text-4xl font-black text-${colorTheme.primary} bg-${colorTheme.light} px-4 py-2 rounded-xl border-2 border-${colorTheme.border}`}>
                    {selectedPerformance.title}
                  </h3>
                    <p className="text-sm text-black font-medium">Item #{selectedPerformance.itemNumber || 'Unassigned'}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  {/* Solo indicator for multiple solos */}
                  {selectedPerformance.title.includes('(Solo ') && (
                    <div className={`inline-flex items-center px-8 py-4 rounded-full text-2xl font-black bg-${colorTheme.light} text-${colorTheme.primary} border-3 border-${colorTheme.border} shadow-xl mb-6`}>
                      🎵 Multiple Solo Performance
                    </div>
                  )}
                  
                  <div className="space-y-4 text-xl text-black">
                    <p><span className="font-black">Contestant:</span> <span className={`font-black text-2xl text-${colorTheme.primary} bg-${colorTheme.bg} px-3 py-1 rounded-lg border-2 border-${colorTheme.border}`}>{selectedPerformance.contestantName}</span></p>
                    <p><span className="font-black">Participants:</span> <span className={`font-black text-2xl text-${colorTheme.primary} bg-${colorTheme.bg} px-3 py-1 rounded-lg border-2 border-${colorTheme.border}`}>{selectedPerformance.participantNames.join(', ')}</span></p>
                    {selectedPerformance.choreographer && (
                      <p><span className="font-black">Choreographer:</span> <span className={`font-black text-2xl text-${colorTheme.primary} bg-${colorTheme.bg} px-3 py-1 rounded-lg border-2 border-${colorTheme.border}`}>{selectedPerformance.choreographer}</span></p>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xl text-black space-y-4">
                    {selectedPerformance.itemNumber && (
                      <p><span className="font-black">Item #:</span> <span className={`font-black text-3xl text-${colorTheme.primary} bg-${colorTheme.bg} px-4 py-2 rounded-lg border-2 border-${colorTheme.border} shadow-lg`}>#{selectedPerformance.itemNumber}</span></p>
                    )}
                    {selectedPerformance.itemStyle && (
                      <p><span className="font-black">Style:</span> <span className={`font-black text-2xl text-${colorTheme.primary} bg-${colorTheme.bg} px-3 py-1 rounded-lg border-2 border-${colorTheme.border}`}>{selectedPerformance.itemStyle}</span></p>
                    )}
                    {selectedPerformance.mastery && (
                      <p><span className="font-black">Mastery:</span> <span className={`font-black text-2xl text-${colorTheme.primary} bg-${colorTheme.bg} px-3 py-1 rounded-lg border-2 border-${colorTheme.border}`}>{selectedPerformance.mastery}</span></p>
                    )}
                    <p><span className="font-black">Duration:</span> <span className={`font-black text-2xl text-${colorTheme.primary} bg-${colorTheme.bg} px-3 py-1 rounded-lg border-2 border-${colorTheme.border}`}>{selectedPerformance.duration} minutes</span></p>
                    
                    {/* Solo number extraction for multiple solos */}
                    {selectedPerformance.title.includes('(Solo ') && (
                      <div className="mt-3 p-2 bg-purple-50 rounded-lg">
                        <p className="font-medium text-purple-800">
                          {selectedPerformance.title.match(/\(Solo (\d+)\)/)?.[0] || 'Solo Performance'}
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          This is part of a multiple solo entry
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Scoring Form */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-10">
                {/* Technique Score */}
                                            <div>
                  <label className="block text-2xl font-black text-black mb-4">
                    Technical Execution (0-20)
                        </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={currentScore.technique}
                    onChange={(e) => handleScoreChange('technique', parseFloat(e.target.value) || 0)}
                    className={`w-full px-6 py-6 border-4 border-gray-600 rounded-xl focus:ring-4 focus:ring-${colorTheme.ring} focus:border-${colorTheme.primary} text-3xl font-black text-center min-h-[80px] bg-white`}
                    style={{ 
                      color: '#000000 !important',
                      backgroundColor: '#ffffff !important',
                      WebkitTextFillColor: '#000000 !important'
                    }}
                  />
                      </div>
                      
                {/* Musicality Score */}
                <div>
                  <label className="block text-2xl font-black text-black mb-4">
                    Musical Interpretation (0-20)
                  </label>
                         <input
                           type="number"
                           min="0"
                    max="20"
                    step="0.1"
                    value={currentScore.musicality}
                    onChange={(e) => handleScoreChange('musicality', parseFloat(e.target.value) || 0)}
                    className={`w-full px-6 py-6 border-4 border-gray-600 rounded-xl focus:ring-4 focus:ring-${colorTheme.ring} focus:border-${colorTheme.primary} text-3xl font-black text-center min-h-[80px] bg-white`}
                    style={{ 
                      color: '#000000 !important',
                      backgroundColor: '#ffffff !important',
                      WebkitTextFillColor: '#000000 !important'
                    }}
                  />
                         </div>

                {/* Performance Score */}
                      <div>
                  <label className="block text-2xl font-black text-black mb-4">
                    Performance Quality (0-20)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={currentScore.performance}
                    onChange={(e) => handleScoreChange('performance', parseFloat(e.target.value) || 0)}
                    className={`w-full px-6 py-6 border-4 border-gray-600 rounded-xl focus:ring-4 focus:ring-${colorTheme.ring} focus:border-${colorTheme.primary} text-3xl font-black text-center min-h-[80px] bg-white`}
                    style={{ 
                      color: '#000000 !important',
                      backgroundColor: '#ffffff !important',
                      WebkitTextFillColor: '#000000 !important'
                    }}
                  />
                        </div>
                      </div>

              <div className="space-y-10">
                {/* Styling Score */}
                      <div>
                  <label className="block text-2xl font-black text-black mb-4">
                    Styling & Presentation (0-20)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={currentScore.styling}
                    onChange={(e) => handleScoreChange('styling', parseFloat(e.target.value) || 0)}
                    className={`w-full px-6 py-6 border-4 border-gray-600 rounded-xl focus:ring-4 focus:ring-${colorTheme.ring} focus:border-${colorTheme.primary} text-3xl font-black text-center min-h-[80px] bg-white`}
                    style={{ 
                      color: '#000000 !important',
                      backgroundColor: '#ffffff !important',
                      WebkitTextFillColor: '#000000 !important'
                    }}
                  />
                        </div>

                {/* Overall Impression Score */}
                <div>
                  <label className="block text-2xl font-black text-black mb-4">
                    Overall Impression (0-20)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.1"
                    value={currentScore.overallImpression}
                    onChange={(e) => handleScoreChange('overallImpression', parseFloat(e.target.value) || 0)}
                    className={`w-full px-6 py-6 border-4 border-gray-600 rounded-xl focus:ring-4 focus:ring-${colorTheme.ring} focus:border-${colorTheme.primary} text-3xl font-black text-center min-h-[80px] bg-white`}
                    style={{ 
                      color: '#000000 !important',
                      backgroundColor: '#ffffff !important',
                      WebkitTextFillColor: '#000000 !important'
                    }}
                  />
                  </div>

                  {/* Comments */}
                  <div>
                  <label className="block text-2xl font-black text-black mb-4">
                      Comments (Optional)
                    </label>
                    <textarea
                      value={currentScore.comments}
                      onChange={(e) => handleScoreChange('comments', e.target.value)}
                    rows={6}
                    className={`w-full px-6 py-6 border-4 border-gray-600 rounded-xl focus:ring-4 focus:ring-${colorTheme.ring} focus:border-${colorTheme.primary} text-xl font-bold min-h-[120px] bg-white`}
                    style={{ 
                      color: '#000000 !important',
                      backgroundColor: '#ffffff !important',
                      WebkitTextFillColor: '#000000 !important'
                    }}
                    placeholder="Add any additional comments about the performance..."
                  />
                </div>
              </div>
                  </div>
          
            {/* Total Score Display */}
            <div className={`mt-10 p-8 bg-${colorTheme.bg} rounded-2xl border-4 border-${colorTheme.border} shadow-xl`}>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black text-black">Total Score:</span>
                <span className={`text-5xl font-black text-${colorTheme.primary}`}>
                  {(currentScore.technique + currentScore.musicality + currentScore.performance + currentScore.styling + currentScore.overallImpression).toFixed(1)}/100
                </span>
                    </div>
              <div className="mt-4 text-2xl font-bold text-black">
                Percentage: {((currentScore.technique + currentScore.musicality + currentScore.performance + currentScore.styling + currentScore.overallImpression)).toFixed(1)}%
                    </div>
            </div>

                  {/* Submit Button */}
            <div className="mt-10 flex justify-center">
                  <button
                    onClick={handleSubmitScore}
                disabled={isSubmittingScore}
                className={`px-12 py-6 bg-gradient-to-r from-${colorTheme.primary} to-${colorTheme.secondary} text-white text-2xl font-black rounded-2xl hover:from-${colorTheme.primary} hover:to-${colorTheme.secondary} hover:opacity-90 disabled:opacity-50 transition-all duration-200 min-h-[80px] min-w-[300px] shadow-xl border-4 border-white`}
              >
                {isSubmittingScore ? 'Submitting...' : (selectedPerformance.hasScore ? 'Update Score' : 'Submit Score')}
                  </button>
                </div>
              </div>
            );
          })()
        )}

        {/* Main Dashboard */}
        {viewMode === 'list' && (
          <>
            {/* Assignment Overview */}
            <div className="bg-white rounded-2xl shadow-xl p-8 mb-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-4xl font-black text-black">Your Event Assignments</h2>
            <div className="flex items-center space-x-4">
                  <span className="text-xl font-bold text-black">
                    {getCompletionStats().scored} of {getCompletionStats().total} scored ({getCompletionStats().percentage}%)
                  </span>
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-600 transition-all duration-300"
                      style={{ width: `${getCompletionStats().percentage}%` }}
                    />
              </div>
              </div>
          </div>

          {assignments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map((assignment) => (
                    <div key={assignment.eventId} className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{assignment.event.name}</h3>
                        <span className="text-2xl">🎭</span>
                      </div>
                      <div className="space-y-2 text-sm text-black">
                        <p><span className="font-medium">Date:</span> {new Date(assignment.event.eventDate).toLocaleDateString()}</p>
                        <p><span className="font-medium">Venue:</span> {assignment.event.venue}</p>
                        <p><span className="font-medium">Region:</span> Nationals Competition</p>
                        <p><span className="font-medium">Status:</span> <span className="text-green-600 font-medium">Active</span></p>
                      </div>
                </div>
              ))}
            </div>
          ) : (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📋</div>
                  <p className="text-black text-lg">No assignments yet</p>
                  <p className="text-black text-sm mt-2">You'll see your assigned events here once they're assigned by an admin</p>
            </div>
          )}
        </div>
            
                        {/* Simple Controls - Collapsed by default for clean UI */}
            <details className="bg-white rounded-2xl shadow-xl mb-8">
              <summary className="p-6 cursor-pointer text-xl font-bold text-gray-600 hover:text-black transition-colors border-b border-gray-200">
                ⚙️ Advanced Options (tap to expand)
              </summary>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="flex items-center space-x-4">
                    <label className="text-lg font-bold text-black">Jump to Item #:</label>
                    <input
                      type="number"
                      value={itemNumberSearch}
                      onChange={(e) => setItemNumberSearch(e.target.value)}
                      onKeyPress={handleItemNumberSearchKeyPress}
                      placeholder="Item #"
                      className="px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-purple-500 text-lg font-bold"
                    />
                    <button
                      onClick={() => {
                        const itemNum = parseInt(itemNumberSearch);
                        if (!isNaN(itemNum)) {
                          loadPerformanceByItemNumber(itemNum);
                        }
                      }}
                      className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700"
                    >
                      Go
                    </button>
                  </div>
                  <div className="flex items-center space-x-4">
                    <label className="text-lg font-bold text-black">Filter:</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value as 'all' | 'not_scored' | 'scored')}
                      className="px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-purple-500 text-lg font-bold"
                    >
                      <option value="all">All Performances</option>
                      <option value="not_scored">Not Scored</option>
                      <option value="scored">Completed</option>
                    </select>
                  </div>
                </div>
                <input 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or title..."
                  className="w-full px-4 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-purple-500 text-lg font-bold mb-4"
                />
                <button
                  onClick={() => {
                    setFilterStatus('all');
                    setSearchTerm('');
                    setItemNumberSearch('');
                  }}
                  className="px-6 py-2 bg-gray-500 text-white font-bold rounded-lg hover:bg-gray-600"
                >
                  Clear All
                </button>
              </div>
            </details>

            {/* Performances List */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-4xl font-black text-black">Performances to Score</h2>
                <span className="text-xl font-bold text-black">
                  {filteredPerformances.length} performance{filteredPerformances.length !== 1 ? 's' : ''}
                </span>
                  </div>

              {filteredPerformances.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 gap-8">
                    {currentPerformances.map((performance) => {
                      // Check if this is part of a multiple solo performance
                      const isMultipleSolo = performance.title.includes('(Solo ');
                      const soloMatch = performance.title.match(/\(Solo (\d+)\)/);
                      const soloNumber = soloMatch ? soloMatch[1] : null;
                      
                      // Count how many solos this contestant has in total
                      const sameContestantSolos = filteredPerformances.filter(p => 
                        p.contestantName === performance.contestantName && 
                        p.title.includes('(Solo ')
                      ).length;
                      
                      const colorTheme = getMasteryColorTheme(performance.mastery);
                      
                      return (
                        <div 
                          key={performance.id} 
                          className={`border-4 rounded-2xl p-8 hover:shadow-xl transition-shadow ${
                            isMultipleSolo 
                              ? `border-${colorTheme.border} bg-gradient-to-r from-${colorTheme.bg}/50 to-${colorTheme.light}/50` 
                              : `border-${colorTheme.border} hover:bg-${colorTheme.bg}/30`
                          }`}
                        >
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-6">
                              <div className={`w-20 h-20 rounded-full flex items-center justify-center text-white font-black text-2xl bg-gradient-to-br from-${colorTheme.primary} to-${colorTheme.secondary} shadow-xl border-4 border-white`}>
                                {performance.itemNumber || '?'}
                              </div>
                              <div>
                                <div className="flex items-center gap-4 mb-3">
                                  <h3 className={`text-3xl font-black text-${colorTheme.primary} bg-${colorTheme.light} px-4 py-2 rounded-xl border-3 border-${colorTheme.border} shadow-lg`}>
                                    {isMultipleSolo 
                                      ? performance.title.replace(/ \(Solo \d+\)/, '') 
                                      : performance.title
                                    }
                                  </h3>
                                  {isMultipleSolo && (
                                    <span className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-bold bg-${colorTheme.light} text-${colorTheme.primary} border-2 border-${colorTheme.border}`}>
                                      Solo {soloNumber}
                                    </span>
                                  )}
                                </div>
                                <p className={`text-2xl font-black text-${colorTheme.primary} bg-${colorTheme.bg} px-4 py-2 rounded-lg border-2 border-${colorTheme.border} inline-block`}>{performance.contestantName}</p>
                                {isMultipleSolo && sameContestantSolos > 1 && (
                                  <p className="text-lg text-purple-600 font-bold mt-1">
                                    Part of {sameContestantSolos} solo performance set
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              {performance.hasScore ? (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                                  ✓ Scored
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                                  ⏳ Pending
                                </span>
                              )}
                              <button
                                onClick={() => handleStartScoring(performance)}
                                className={`px-8 py-4 text-white text-xl font-black rounded-xl transition-all duration-200 min-h-[60px] min-w-[200px] shadow-lg border-2 border-white bg-gradient-to-r from-${colorTheme.primary} to-${colorTheme.secondary} hover:opacity-90`}
                              >
                                {performance.hasScore ? 'Update Score' : 'Score Performance'}
                              </button>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-lg text-black">
                            <div>
                              <span className="font-black">Participants:</span> 
                              <div className={`font-black text-xl text-${colorTheme.primary} bg-${colorTheme.bg} px-3 py-2 rounded-lg border-2 border-${colorTheme.border} mt-2 inline-block`}>
                                {performance.participantNames.join(', ')}
                              </div>
                            </div>
                            <div>
                              <span className="font-black">Duration:</span> <span className="font-medium">{performance.duration} minutes</span>
                            </div>
                            <div>
                              <span className="font-black">Status:</span> <span className="font-medium">{performance.isFullyScored ? 'Fully Scored' : 'In Progress'}</span>
                              {isMultipleSolo && (
                                <span className="ml-2 text-purple-600 font-bold">• Multi-Solo</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-8 flex justify-center">
                      <nav className="flex items-center space-x-2">
                      <button
                          onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                          className="px-3 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                            >
                        Previous
                      </button>
                        {[...Array(totalPages)].map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentPage(index + 1)}
                            className={`px-3 py-2 text-sm font-medium rounded-lg ${
                              currentPage === index + 1
                                ? 'bg-purple-500 text-white'
                                : 'text-black bg-white border border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            {index + 1}
                        </button>
                      ))}
                      <button
                          onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                          className="px-3 py-2 text-sm font-medium text-black bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                      >
                        Next
                      </button>
                      </nav>
                </div>
                  )}
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎯</div>
                  <p className="text-black text-lg">No performances to score</p>
                  <p className="text-black text-sm mt-2">
                    {filterStatus === 'not_scored' ? 'All performances have been scored!' : 'Performances will appear here once events are created'}
                  </p>
                </div>
            )}
          </div>
          </>
        )}
      </div>
    </div>
  );
} 