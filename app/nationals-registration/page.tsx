'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  createdAt: string;
}

interface Dancer {
  id: string;
  eodsaId: string;
  name: string;
  age: number;
  approved: boolean;
}

// SoloItem interface removed - now using soloCount approach

interface ValidatedDancer {
  eodsaId: string;
  name: string;
  isValid: boolean;
  isLoading: boolean;
  error?: string;
}

export default function NationalsRegistration() {
  const [nationalsEvents, setNationalsEvents] = useState<NationalsEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { success, error, warning, info } = useToast();
  const { showAlert, showConfirm } = useAlert();
  const router = useRouter();
  
  // Get URL parameters for event pre-selection
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const preSelectedEventId = searchParams.get('eventId');

  // Registration form state - Updated for multiple participants
  const [registrationData, setRegistrationData] = useState({
    eodsaId: '' // For solo performances
  });

  // For group performances (duet, trio, groups)
  const [participantEodsaIds, setParticipantEodsaIds] = useState<string[]>(['']);
  
  // For Group - allow user to specify exact count
  const [groupMemberCount, setGroupMemberCount] = useState<number | null>(null);

  // For Solo performances - allow user to specify number of solos
  const [soloCount, setSoloCount] = useState<number>(1);

  // Validated dancers state
  const [validatedDancers, setValidatedDancers] = useState<{ [key: string]: ValidatedDancer }>({});

  // For single solo performance details
  const [soloPerformanceData, setSoloPerformanceData] = useState({
    itemName: '',
    choreographer: '',
    mastery: 'Beginner',
    itemStyle: 'Contemporary',
    estimatedDuration: 3,
    ageCategory: 'Junior',
    additionalNotes: ''
  });

  // For multiple solo performances - individual details for each solo
  const [individualSoloDetails, setIndividualSoloDetails] = useState<Array<{
    itemName: string;
    choreographer: string;
    mastery: string;
    itemStyle: string;
    estimatedDuration: number;
    ageCategory: string;
    additionalNotes: string;
  }>>([]);

  // Other performance types (for non-solo entries)
  const [otherPerformanceData, setOtherPerformanceData] = useState({
    participantIds: [] as string[],
    itemName: '',
    choreographer: '',
    mastery: 'Beginner',
    itemStyle: 'Contemporary',
    estimatedDuration: 3,
    ageCategory: 'Junior',
    musicFile: null as File | null,
    additionalNotes: ''
  });

  // Fee calculation
  const [calculatedFee, setCalculatedFee] = useState(0);
  const [registrationFee, setRegistrationFee] = useState(300);
  const [feeBreakdown, setFeeBreakdown] = useState<any>(null);

  // Initialize individual solo details when solo count changes
  useEffect(() => {
    if (soloCount > 1) {
      const newDetails = Array.from({ length: soloCount }, (_, index) => ({
        itemName: `Solo ${index + 1}`,
        choreographer: '',
        mastery: 'Beginner',
        itemStyle: 'Contemporary',
        estimatedDuration: 3,
        ageCategory: 'Junior',
        additionalNotes: ''
      }));
      setIndividualSoloDetails(newDetails);
    } else {
      setIndividualSoloDetails([]);
    }
  }, [soloCount]);

  // Update individual solo detail
  const updateIndividualSolo = (index: number, field: string, value: string | number) => {
    setIndividualSoloDetails(prev => 
      prev.map((solo, i) => 
        i === index ? { ...solo, [field]: value } : solo
      )
    );
  };

  // Debounced EODSA ID validation
  const validateEodsaId = useCallback(async (eodsaId: string) => {
    if (!eodsaId.trim()) {
      setValidatedDancers(prev => ({
        ...prev,
        [eodsaId]: { eodsaId, name: '', isValid: false, isLoading: false }
      }));
      return;
    }

    // Set loading state
    setValidatedDancers(prev => ({
      ...prev,
      [eodsaId]: { eodsaId, name: '', isValid: false, isLoading: true }
    }));

    try {
      const response = await fetch(`/api/dancers/by-eodsa-id/${eodsaId}`);
      
      if (response.ok) {
        const data = await response.json();
        setValidatedDancers(prev => ({
          ...prev,
          [eodsaId]: {
            eodsaId,
            name: data.dancer.name,
            isValid: true,
            isLoading: false
          }
        }));
      } else {
        setValidatedDancers(prev => ({
          ...prev,
          [eodsaId]: {
            eodsaId,
            name: '',
            isValid: false,
            isLoading: false,
            error: 'EODSA ID not found'
          }
        }));
      }
    } catch (error) {
      setValidatedDancers(prev => ({
        ...prev,
        [eodsaId]: {
          eodsaId,
          name: '',
          isValid: false,
          isLoading: false,
          error: 'Error validating EODSA ID'
        }
      }));
    }
  }, []);

  // Debounce function
  const useDebounce = (callback: Function, delay: number) => {
    const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

    return useCallback((...args: any[]) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      const timer = setTimeout(() => {
        callback(...args);
      }, delay);

      setDebounceTimer(timer);
    }, [callback, delay, debounceTimer]);
  };

  const debouncedValidateEodsaId = useDebounce(validateEodsaId, 800);

  // Extract performance type from event name
  const getPerformanceTypeFromEvent = (eventName: string): string => {
    // Event names are in format: "Event Name - PerformanceType - Date"
    const parts = eventName.split(' - ');
    if (parts.length >= 2) {
      return parts[1].trim();
    }
    return 'Solo'; // Default fallback
  };

  const selectedEventData = nationalsEvents.find(event => event.id === selectedEvent);
  const performanceType = selectedEventData ? getPerformanceTypeFromEvent(selectedEventData.name) : 'Solo';

  useEffect(() => {
    fetchNationalsEvents();
  }, []);

  // Pre-select event from URL parameter
  useEffect(() => {
    if (preSelectedEventId && nationalsEvents.length > 0) {
      const eventExists = nationalsEvents.some(event => event.id === preSelectedEventId);
      if (eventExists) {
        setSelectedEvent(preSelectedEventId);
      }
    }
  }, [preSelectedEventId, nationalsEvents]);

  useEffect(() => {
    if (selectedEvent) {
      calculateFee();
    }
  }, [selectedEvent, soloCount, participantEodsaIds, groupMemberCount, soloPerformanceData, individualSoloDetails]);

  // Reset participant EODSA IDs when performance type changes
  useEffect(() => {
    if (performanceType) {
      // Reset group member count when performance type changes
      if (performanceType === 'Group') {
        setGroupMemberCount(null);
        setParticipantEodsaIds(['']); // Start with one empty field until count is selected
      } else {
        setGroupMemberCount(null);
        const expectedCount = getExpectedParticipantCount(performanceType);
        if (performanceType === 'Solo') {
          // For solo, we don't need participant EODSA IDs
          setParticipantEodsaIds(['']);
        } else {
          // For fixed-size groups (duet, trio)
          const initialCount = Math.max(expectedCount.min, 1);
          setParticipantEodsaIds(Array(initialCount).fill(''));
        }
      }
    }
  }, [performanceType]);

  // Update participant EODSA IDs when group member count changes
  useEffect(() => {
    if (groupMemberCount !== null && performanceType === 'Group') {
      setParticipantEodsaIds(Array(groupMemberCount).fill(''));
    }
  }, [groupMemberCount, performanceType]);

  // Handle solo EODSA ID changes
  const handleSoloEodsaIdChange = (newEodsaId: string) => {
    setRegistrationData({ ...registrationData, eodsaId: newEodsaId });
    debouncedValidateEodsaId(newEodsaId);
  };

  // Handle participant EODSA ID changes
  const handleParticipantEodsaIdChange = (index: number, newEodsaId: string) => {
    updateParticipant(index, newEodsaId);
    debouncedValidateEodsaId(newEodsaId);
  };

  const fetchNationalsEvents = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/nationals/events');
      if (response.ok) {
        const data = await response.json();
        const openEvents = data.events.filter((event: NationalsEvent) => 
          event.status === 'registration_open'
        );
        setNationalsEvents(openEvents);
      }
    } catch (err) {
      console.error('Error fetching nationals events:', err);
      error('Failed to load nationals events');
    } finally {
      setIsLoading(false);
    }
  };

  // Solo functions removed - now using soloCount dropdown approach

  // Functions for managing participant EODSA IDs
  const addParticipant = () => {
    setParticipantEodsaIds([...participantEodsaIds, '']);
  };

  const updateParticipant = (index: number, eodsaId: string) => {
    const updated = [...participantEodsaIds];
    updated[index] = eodsaId;
    setParticipantEodsaIds(updated);
  };

  const removeParticipant = (index: number) => {
    if (participantEodsaIds.length > 1) {
      setParticipantEodsaIds(participantEodsaIds.filter((_, i) => i !== index));
    }
  };

  // Get expected participant count based on performance type
  const getExpectedParticipantCount = (type: string): { min: number; max: number } => {
    switch (type) {
      case 'Solo': return { min: 1, max: 1 };
      case 'Duet': return { min: 2, max: 2 };
      case 'Trio': return { min: 3, max: 3 };
      case 'Group': 
        // Use user-specified count if available, otherwise return range
        if (groupMemberCount !== null) {
          return { min: groupMemberCount, max: groupMemberCount };
        }
        return { min: 4, max: 50 };
      default: return { min: 1, max: 1 };
    }
  };

  const calculateFee = async () => {
    try {
      let currentSoloCount = 0;
      let participantCount = 1;
      let participantIds: string[] = [];

      if (performanceType === 'Solo') {
        currentSoloCount = soloCount;
        // Get the current dancer's ID for solo performances
        if (registrationData.eodsaId) {
          try {
            const dancerResponse = await fetch(`/api/dancers/by-eodsa-id/${registrationData.eodsaId}`);
            if (dancerResponse.ok) {
              const dancerData = await dancerResponse.json();
              participantIds = [dancerData.dancer.id];
            }
          } catch (error) {
            console.log('Could not fetch dancer for fee calculation');
          }
        }
      } else {
        // For group performances, use participantEodsaIds to get participant IDs
        const validEodsaIds = participantEodsaIds.filter(id => id.trim() !== '');
        // Use group member count if available, otherwise use actual EODSA IDs count
        participantCount = groupMemberCount || validEodsaIds.length;
        
        // Try to get participant IDs from EODSA IDs
        for (const eodsaId of validEodsaIds) {
          try {
            const dancerResponse = await fetch(`/api/dancers/by-eodsa-id/${eodsaId}`);
            if (dancerResponse.ok) {
              const dancerData = await dancerResponse.json();
              participantIds.push(dancerData.dancer.id);
            }
          } catch (error) {
            console.log(`Could not fetch dancer for EODSA ID: ${eodsaId}`);
          }
        }
        
        // If we couldn't get all participant IDs, just use the count
        if (participantIds.length === 0) {
          participantIds = []; // Empty array, will use participantCount for fee calculation
        }
      }
      
      // Build the API URL with participant IDs
      const params = new URLSearchParams({
        performanceType: performanceType,
        soloCount: currentSoloCount.toString(),
        participantCount: participantCount.toString()
      });
      
      if (participantIds.length > 0) {
        params.append('participantIds', JSON.stringify(participantIds));
      }
      
      const response = await fetch(`/api/nationals/fee-calculation?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setCalculatedFee(data.performanceFee || data.fee || 0);
        setRegistrationFee(data.registrationFee || 300);
        setFeeBreakdown(data);
      }
    } catch (err) {
      console.error('Error calculating fee:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    if (!selectedEvent) {
      error('Please select a nationals event');
      return;
    }

    // Validate EODSA IDs based on performance type
    if (performanceType === 'Solo') {
      if (!registrationData.eodsaId) {
        error('Please enter your EODSA ID');
        return;
      }
    } else {
      // Check if group member count is selected for groups
      if (performanceType === 'Group' && groupMemberCount === null) {
        error(`Please select the number of members for your ${performanceType.toLowerCase()}.`);
        return;
      }
      
      const validEodsaIds = participantEodsaIds.filter(id => id.trim() !== '');
      const expectedCount = getExpectedParticipantCount(performanceType);
      
      if (validEodsaIds.length < expectedCount.min) {
        error(`${performanceType} requires at least ${expectedCount.min} participants. Please add ${expectedCount.min - validEodsaIds.length} more.`);
        return;
      }
      
      if (validEodsaIds.length > expectedCount.max) {
        error(`${performanceType} allows maximum ${expectedCount.max} participants. Please remove ${validEodsaIds.length - expectedCount.max}.`);
        return;
      }
      
      // Check for duplicate EODSA IDs
      const uniqueIds = new Set(validEodsaIds);
      if (uniqueIds.size !== validEodsaIds.length) {
        error('Each participant must have a unique EODSA ID. Please check for duplicates.');
        return;
      }
    }

    if (performanceType === 'Solo' && soloCount < 1) {
      error('Please select at least one solo');
      return;
    }

    if (performanceType === 'Solo' && soloCount === 1 && !soloPerformanceData.itemName) {
      error('Please fill in all required fields for your solo performance');
      return;
    }

    if (performanceType === 'Solo' && soloCount > 1) {
      // Validate all individual solo details
      const incompleteItems = individualSoloDetails.some(solo => 
        !solo.itemName || !solo.choreographer || !solo.itemStyle || !solo.mastery || !solo.ageCategory
      );
      if (incompleteItems) {
        error('Please fill in all required fields for each solo performance');
        return;
      }
    }

    if (performanceType !== 'Solo' && !otherPerformanceData.itemName) {
      error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      let primaryDancer = null;
      let allParticipantIds: string[] = [];
      
      if (performanceType === 'Solo') {
        // For solo performances, verify the single dancer
        const dancerResponse = await fetch(`/api/dancers/by-eodsa-id/${registrationData.eodsaId}`);
        if (!dancerResponse.ok) {
          throw new Error('Dancer not found or not approved');
        }

        const dancerData = await dancerResponse.json();
        if (!dancerData.dancer.approved) {
          throw new Error('Dancer account is not approved yet');
        }
        
        primaryDancer = dancerData.dancer;
        allParticipantIds = [primaryDancer.id];
      } else {
        // For group performances, verify all participants
        const validEodsaIds = participantEodsaIds.filter(id => id.trim() !== '');
        
        for (let i = 0; i < validEodsaIds.length; i++) {
          const eodsaId = validEodsaIds[i];
          const dancerResponse = await fetch(`/api/dancers/by-eodsa-id/${eodsaId}`);
          if (!dancerResponse.ok) {
            throw new Error(`Participant ${i + 1} (EODSA ID: ${eodsaId}) not found or not approved`);
          }

          const dancerData = await dancerResponse.json();
          if (!dancerData.dancer.approved) {
            throw new Error(`Participant ${i + 1} (${dancerData.dancer.name}) account is not approved yet`);
          }
          
          // Use the first participant as the primary dancer/contestant
          if (i === 0) {
            primaryDancer = dancerData.dancer;
          }
          
          allParticipantIds.push(dancerData.dancer.id);
        }
      }

      // Prepare solo details for submission
      let soloDetailsForSubmission = {};
      let primaryItemName = '';
      let primaryChoreographer = '';
      let primaryMastery = '';
      let primaryItemStyle = '';
      let primaryDuration = 3;
      let primaryAgeCategory = '';
      let primaryNotes = '';

      if (performanceType === 'Solo') {
        if (soloCount === 1) {
          // Single solo - use existing structure
          primaryItemName = soloPerformanceData.itemName;
          primaryChoreographer = soloPerformanceData.choreographer;
          primaryMastery = soloPerformanceData.mastery;
          primaryItemStyle = soloPerformanceData.itemStyle;
          primaryDuration = soloPerformanceData.estimatedDuration;
          primaryAgeCategory = soloPerformanceData.ageCategory;
          primaryNotes = soloPerformanceData.additionalNotes;
          soloDetailsForSubmission = {
            type: 'single',
            details: soloPerformanceData
          };
        } else {
          // Multiple solos - use structured data
          const styles = [...new Set(individualSoloDetails.map(s => s.itemStyle))];
          primaryItemName = `${soloCount} Solos (${styles.join(', ')})`;
          primaryChoreographer = [...new Set(individualSoloDetails.map(s => s.choreographer))].join(', ');
          primaryMastery = individualSoloDetails[0].mastery; // Use first solo's mastery
          primaryItemStyle = styles.length === 1 ? styles[0] : 'Mixed Styles';
          primaryDuration = Math.ceil(individualSoloDetails.reduce((sum, s) => sum + s.estimatedDuration, 0) / soloCount);
          primaryAgeCategory = individualSoloDetails[0].ageCategory; // Use first solo's age category
          primaryNotes = individualSoloDetails.map((s, i) => s.additionalNotes ? `Solo ${i+1}: ${s.additionalNotes}` : '').filter(n => n).join('; ');
          soloDetailsForSubmission = {
            type: 'multiple',
            count: soloCount,
            details: individualSoloDetails
          };
        }
      }

      // Find or create the correct contestant record for the primary dancer
      let contestantId = primaryDancer.id;
      
      // Try to find the contestant record by EODSA ID first
      try {
        const contestantResponse = await fetch(`/api/contestants/by-eodsa-id/${primaryDancer.eodsaId}`);
        if (contestantResponse.ok) {
          const contestantData = await contestantResponse.json();
          if (contestantData && contestantData.id) {
            contestantId = contestantData.id;
            console.log('Found existing contestant by EODSA ID:', contestantId);
          }
        } else {
          // EODSA ID not found, try by email
          console.log('Contestant not found by EODSA ID, trying by email:', primaryDancer.email);
          const emailResponse = await fetch(`/api/contestants/by-email/${encodeURIComponent(primaryDancer.email || '')}`);
          if (emailResponse.ok) {
            const emailData = await emailResponse.json();
            if (emailData && emailData.id) {
              contestantId = emailData.id;
              console.log('Found existing contestant by email:', contestantId);
            }
          } else {
            // No contestant found, create one for this dancer
            console.log('Creating new contestant record for dancer:', primaryDancer.name);
            
            // Check if guardian info is required (dancer under 18)
            const dancerAge = primaryDancer.age;
            const guardianInfo = dancerAge < 18 && primaryDancer.guardianName ? {
              name: primaryDancer.guardianName,
              email: primaryDancer.guardianEmail || '',
              cell: primaryDancer.guardianPhone || ''
            } : undefined;
            
            const newContestantResponse = await fetch('/api/contestants', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                name: primaryDancer.name,
                email: primaryDancer.email || '',
                phone: primaryDancer.phone || '',
                type: 'private',
                dateOfBirth: primaryDancer.dateOfBirth,
                privacyPolicyAccepted: true,
                guardianInfo: guardianInfo,
                dancers: [{
                  name: primaryDancer.name,
                  age: primaryDancer.age,
                  style: 'Dance',
                  nationalId: primaryDancer.nationalId,
                  dateOfBirth: primaryDancer.dateOfBirth
                }]
              }),
            });
            
            if (newContestantResponse.ok) {
              const newContestantData = await newContestantResponse.json();
              contestantId = newContestantData.contestant.id;
              console.log('Created new contestant with ID:', contestantId);
            } else {
              // Log the error details
              const errorData = await newContestantResponse.json();
              console.error('Failed to create contestant:', errorData);
              throw new Error(`Failed to create contestant: ${errorData.error || 'Unknown error'}`);
            }
          }
        }
      } catch (error) {
        console.error('Error finding or creating contestant:', error);
        throw new Error(`Could not find or create contestant record: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

      // Create the registration entry
      const registrationResponse = await fetch('/api/nationals/event-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nationalsEventId: selectedEvent,
          contestantId: contestantId,
          eodsaId: registrationData.eodsaId,
          participantIds: allParticipantIds,
          calculatedFee: registrationFee + calculatedFee,
          paymentStatus: 'pending',
          paymentMethod: 'invoice', // Phase 1: Invoice-based payment
          approved: false,
          qualifiedForNationals: false,
          itemNumber: null,
          itemName: performanceType === 'Solo' ? primaryItemName : otherPerformanceData.itemName,
          choreographer: performanceType === 'Solo' ? primaryChoreographer : otherPerformanceData.choreographer,
          mastery: performanceType === 'Solo' ? primaryMastery : otherPerformanceData.mastery,
          itemStyle: performanceType === 'Solo' ? primaryItemStyle : otherPerformanceData.itemStyle,
          estimatedDuration: performanceType === 'Solo' ? primaryDuration : otherPerformanceData.estimatedDuration,
          performanceType: performanceType,
          ageCategory: performanceType === 'Solo' ? primaryAgeCategory : otherPerformanceData.ageCategory,
          soloCount: performanceType === 'Solo' ? soloCount : 0,
          soloDetails: performanceType === 'Solo' ? soloDetailsForSubmission : null,
          additionalNotes: performanceType === 'Solo' ? primaryNotes : otherPerformanceData.additionalNotes
        }),
      });

      if (!registrationResponse.ok) {
        const errorData = await registrationResponse.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      // Entry successful - show confirmation screen
      setSubmitted(true);
    } catch (err) {
      console.error('Registration error:', err);
      error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsSubmitting(false);
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

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 flex items-center justify-center p-4">
        <div className="max-w-lg w-full bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-yellow-200/50 p-8 text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">Entry Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Your {performanceType === 'Solo' && soloCount > 1 
              ? `${soloCount} solo performance${soloCount > 1 ? 's' : ''}` 
              : performanceType === 'Solo' 
              ? `solo performance`
              : performanceType} entry for nationals has been submitted successfully.
          </p>
          
          {performanceType === 'Solo' && soloCount > 1 && submitted && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-blue-900 mb-2">Your Solo Registrations:</h4>
              <div className="text-sm text-blue-800">
                Successfully registered for {soloCount} solo performances with bundled pricing.
              </div>
            </div>
          )}
          
          {/* Fee Summary in Success */}
          <div className="bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-2xl p-6 mb-6">
            <p className="text-lg font-bold text-yellow-800 mb-4">📧 Expect an Email Invoice for:</p>
            <div className="space-y-2 text-yellow-700">
              <div className="flex justify-between">
                <span>Registration Fee:</span>
                <span className="font-semibold">R{registrationFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Performance Fee:</span>
                <span className="font-semibold">R{calculatedFee.toFixed(2)}</span>
              </div>
              <div className="border-t border-yellow-300 pt-2 mt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount:</span>
                  <span>R{(registrationFee + calculatedFee).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>⚠️ Important:</strong> Your entry requires admin approval before payment processing. 
              You'll receive an email invoice once approved.
            </p>
          </div>
          
          <div className="space-y-3">
            <button
              onClick={() => router.push('/nationals-dashboard')}
              className="w-full px-6 py-3 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 font-semibold shadow-lg"
            >
              Go to Nationals Dashboard
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                // Reset form
                setRegistrationData({ eodsaId: '' });
                setSoloCount(1);
                setSoloPerformanceData({
                  itemName: '',
                  choreographer: '',
                  mastery: 'Beginner',
                  itemStyle: 'Contemporary',
                  estimatedDuration: 3,
                  ageCategory: 'Junior',
                  additionalNotes: ''
                });
                setIndividualSoloDetails([]);
                setParticipantEodsaIds(['']);
                setOtherPerformanceData({
                  participantIds: [],
                  itemName: '',
                  choreographer: '',
                  mastery: 'Beginner',
                  itemStyle: 'Contemporary',
                  estimatedDuration: 3,
                  ageCategory: 'Junior',
                  musicFile: null,
                  additionalNotes: ''
                });
                setSelectedEvent('');
                setCalculatedFee(0);
              }}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
            >
              Submit Another Entry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-lg shadow-xl border-b border-yellow-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-xl">🏆</span>
              </div>
              <div>
                <h1 className="text-3xl font-black bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 bg-clip-text text-transparent">
                  Nationals Registration
                </h1>
                <p className="text-gray-600 text-sm">Register for EODSA National Championships</p>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              <a
                href="/nationals-dashboard"
                className="px-4 py-2 bg-white/80 border border-yellow-200 text-yellow-700 rounded-lg hover:bg-yellow-50 transition-colors"
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {nationalsEvents.length === 0 ? (
          <div className="text-center py-12 bg-white/80 rounded-2xl shadow-lg">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No Nationals Events Available</h2>
            <p className="text-gray-600">Registration is currently closed. Please check back later.</p>
          </div>
        ) : (
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-2xl overflow-hidden border border-yellow-100">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-600 px-8 py-6">
              <h2 className="text-2xl font-bold text-white">Register for Nationals</h2>
              <p className="text-yellow-100 mt-1">Complete your nationals registration below</p>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-8">
              {/* Selected Event Display */}
              {selectedEventData && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    🏆 Registering for: {selectedEventData.name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <span className="mr-2">📅</span>
                      <span>{new Date(selectedEventData.eventDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">📍</span>
                      <span>{selectedEventData.venue}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="mr-2">🎭</span>
                      <span>{performanceType}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* EODSA ID Section */}
              {performanceType === 'Solo' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    EODSA ID *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={registrationData.eodsaId}
                      onChange={(e) => handleSoloEodsaIdChange(e.target.value)}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 pr-10 ${
                        registrationData.eodsaId && validatedDancers[registrationData.eodsaId]
                          ? validatedDancers[registrationData.eodsaId].isValid
                            ? 'border-green-500 bg-green-50'
                            : validatedDancers[registrationData.eodsaId].isLoading
                            ? 'border-gray-300'
                            : 'border-red-500 bg-red-50'
                          : 'border-gray-300'
                      }`}
                      placeholder="Enter your EODSA ID"
                      required
                    />
                    {registrationData.eodsaId && validatedDancers[registrationData.eodsaId] && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        {validatedDancers[registrationData.eodsaId].isLoading ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-500"></div>
                        ) : validatedDancers[registrationData.eodsaId].isValid ? (
                          <span className="text-green-500 text-lg">✓</span>
                        ) : (
                          <span className="text-red-500 text-lg">✗</span>
                        )}
                      </div>
                    )}
                  </div>
                  {registrationData.eodsaId && validatedDancers[registrationData.eodsaId] && (
                    <div className="mt-2 text-sm">
                      {validatedDancers[registrationData.eodsaId].isValid ? (
                        <div className="text-green-700">
                          <span className="font-medium">Dancer Name: {validatedDancers[registrationData.eodsaId].name}</span>
                        </div>
                      ) : validatedDancers[registrationData.eodsaId].isLoading ? (
                        <div className="text-gray-500">
                          <span>Validating EODSA ID...</span>
                        </div>
                      ) : (
                        <div className="text-red-600">
                          <span>✗ {validatedDancers[registrationData.eodsaId].error || 'Invalid EODSA ID'}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Group Member Count Selector */}
                  {performanceType === 'Group' && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        How many members will be in your {performanceType.toLowerCase()}? *
                      </label>
                      <select
                        value={groupMemberCount || ''}
                        onChange={(e) => setGroupMemberCount(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        required
                      >
                        <option value="">Select number of members</option>
                        {performanceType === 'Group' && 
                          Array.from({length: 47}, (_, i) => i + 4).map(num => (
                            <option key={num} value={num}>{num} members</option>
                          ))
                        }
                      </select>
                      {groupMemberCount && (
                        <p className="text-sm text-gray-600 mt-2">
                          You'll need to enter EODSA IDs for all {groupMemberCount} members below.
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Participants ({(() => {
                        if (performanceType === 'Group') {
                          return groupMemberCount ? participantEodsaIds.length : 0;
                        }
                        return participantEodsaIds.length;
                      })()}/{(() => {
                        const expectedCount = getExpectedParticipantCount(performanceType);
                        if (performanceType === 'Group') {
                          return groupMemberCount ? groupMemberCount : `${expectedCount.min}-${expectedCount.max}`;
                        }
                        return expectedCount.min === expectedCount.max ? expectedCount.min : `${expectedCount.min}-${expectedCount.max}`;
                      })()})
                    </h3>
                    {participantEodsaIds.length < getExpectedParticipantCount(performanceType).max && 
                     performanceType !== 'Group' && (
                      <button
                        type="button"
                        onClick={addParticipant}
                        className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                      >
                        + Add Participant
                      </button>
                    )}
                  </div>

                  {participantEodsaIds.map((eodsaId, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Participant #{index + 1} EODSA ID *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={eodsaId}
                            onChange={(e) => handleParticipantEodsaIdChange(index, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 pr-10 ${
                              eodsaId && validatedDancers[eodsaId]
                                ? validatedDancers[eodsaId].isValid
                                  ? 'border-green-500 bg-green-50'
                                  : validatedDancers[eodsaId].isLoading
                                  ? 'border-gray-300'
                                  : 'border-red-500 bg-red-50'
                                : 'border-gray-300'
                            }`}
                            placeholder={`Enter EODSA ID for participant ${index + 1}`}
                            required
                          />
                          {eodsaId && validatedDancers[eodsaId] && (
                            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                              {validatedDancers[eodsaId].isLoading ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-500"></div>
                              ) : validatedDancers[eodsaId].isValid ? (
                                <span className="text-green-500 text-sm">✓</span>
                              ) : (
                                <span className="text-red-500 text-sm">✗</span>
                              )}
                            </div>
                          )}
                        </div>
                                                 {eodsaId && validatedDancers[eodsaId] && (
                           <div className="mt-1 text-xs">
                             {validatedDancers[eodsaId].isValid ? (
                               <div className="text-green-700">
                                 <span className="font-medium">Dancer Name: {validatedDancers[eodsaId].name}</span>
                               </div>
                             ) : validatedDancers[eodsaId].isLoading ? (
                               <div className="text-gray-500">
                                 <span>Validating...</span>
                               </div>
                             ) : (
                               <div className="text-red-600">
                                 <span>✗ {validatedDancers[eodsaId].error || 'Invalid EODSA ID'}</span>
                               </div>
                             )}
                           </div>
                         )}
                      </div>
                      {participantEodsaIds.length > 1 && 
                       performanceType !== 'Group' && (
                        <button
                          type="button"
                          onClick={() => removeParticipant(index)}
                          className="mt-6 px-3 py-2 text-red-600 hover:text-red-800 transition-colors"
                          title="Remove participant"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}

                  {participantEodsaIds.length < getExpectedParticipantCount(performanceType).min && (
                    <div className="text-sm text-orange-600 bg-orange-50 p-3 rounded-lg">
                      ⚠️ {performanceType} requires at least {getExpectedParticipantCount(performanceType).min} participants. Please add {getExpectedParticipantCount(performanceType).min - participantEodsaIds.length} more.
                    </div>
                  )}
                </div>
              )}

              {/* Solo Performance Section */}
              {performanceType === 'Solo' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">Solo Performance Details</h3>
                  
                  {/* Solo Count Selector */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      How many solos will you be performing? *
                    </label>
                    <select
                      value={soloCount}
                      onChange={(e) => setSoloCount(parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                      required
                    >
                      {Array.from({length: 10}, (_, i) => i + 1).map(num => (
                        <option key={num} value={num}>{num} solo{num > 1 ? 's' : ''}</option>
                      ))}
                    </select>
                    <p className="text-sm text-gray-600 mt-2">
                      All solos will be bundled together with optimized pricing. Current selection: {soloCount} solo{soloCount > 1 ? 's' : ''}
                    </p>
                  </div>

                  {/* Single Solo Form */}
                  {soloCount === 1 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Solo Performance Information</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Performance Name *</label>
                          <input
                            type="text"
                            value={soloPerformanceData.itemName}
                            onChange={(e) => setSoloPerformanceData({...soloPerformanceData, itemName: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                            placeholder="Enter performance name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Choreographer *</label>
                          <input
                            type="text"
                            value={soloPerformanceData.choreographer}
                            onChange={(e) => setSoloPerformanceData({...soloPerformanceData, choreographer: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                            placeholder="Enter choreographer name"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Age Category *</label>
                          <select
                            value={soloPerformanceData.ageCategory}
                            onChange={(e) => setSoloPerformanceData({...soloPerformanceData, ageCategory: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                            required
                          >
                            <option value="Mini">Mini (4-6 years)</option>
                            <option value="Junior">Junior (7-9 years)</option>
                            <option value="Intermediate">Intermediate (10-12 years)</option>
                            <option value="Senior">Senior (13-15 years)</option>
                            <option value="Youth">Youth (16-18 years)</option>
                            <option value="Adult">Adult (19+ years)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Mastery Level *</label>
                          <select
                            value={soloPerformanceData.mastery}
                            onChange={(e) => setSoloPerformanceData({...soloPerformanceData, mastery: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                            required
                          >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Dance Style *</label>
                          <select
                            value={soloPerformanceData.itemStyle}
                            onChange={(e) => setSoloPerformanceData({...soloPerformanceData, itemStyle: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                            required
                          >
                            <option value="Contemporary">Contemporary</option>
                            <option value="Ballet">Ballet</option>
                            <option value="Jazz">Jazz</option>
                            <option value="Hip Hop">Hip Hop</option>
                            <option value="Tap">Tap</option>
                            <option value="Lyrical">Lyrical</option>
                            <option value="Musical Theatre">Musical Theatre</option>
                            <option value="Commercial">Commercial</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                          <input
                            type="number"
                            value={soloPerformanceData.estimatedDuration}
                            onChange={(e) => setSoloPerformanceData({...soloPerformanceData, estimatedDuration: parseInt(e.target.value)})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                            min="1"
                            max="10"
                            required
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                        <textarea
                          value={soloPerformanceData.additionalNotes}
                          onChange={(e) => setSoloPerformanceData({...soloPerformanceData, additionalNotes: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                          rows={2}
                          placeholder="Any special requirements or notes..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Multiple Solos Form */}
                  {soloCount > 1 && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                        <p className="text-sm text-blue-800">
                          <strong>Multiple Solos:</strong> Please provide details for each of your {soloCount} solos. Each can have different dance styles, choreographers, and details while maintaining bundled pricing.
                        </p>
                      </div>
                      
                      {individualSoloDetails.map((solo, index) => (
                        <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                          <h4 className="text-lg font-medium text-gray-900 mb-4">Solo {index + 1} Details</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Performance Name *</label>
                              <input
                                type="text"
                                value={solo.itemName}
                                onChange={(e) => updateIndividualSolo(index, 'itemName', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                placeholder={`Enter name for Solo ${index + 1}`}
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Choreographer *</label>
                              <input
                                type="text"
                                value={solo.choreographer}
                                onChange={(e) => updateIndividualSolo(index, 'choreographer', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                placeholder="Enter choreographer name"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Dance Style *</label>
                              <select
                                value={solo.itemStyle}
                                onChange={(e) => updateIndividualSolo(index, 'itemStyle', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                required
                              >
                                <option value="Contemporary">Contemporary</option>
                                <option value="Ballet">Ballet</option>
                                <option value="Jazz">Jazz</option>
                                <option value="Hip Hop">Hip Hop</option>
                                <option value="Tap">Tap</option>
                                <option value="Lyrical">Lyrical</option>
                                <option value="Musical Theatre">Musical Theatre</option>
                                <option value="Commercial">Commercial</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Mastery Level *</label>
                              <select
                                value={solo.mastery}
                                onChange={(e) => updateIndividualSolo(index, 'mastery', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                required
                              >
                                <option value="Beginner">Beginner</option>
                                <option value="Intermediate">Intermediate</option>
                                <option value="Advanced">Advanced</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Age Category *</label>
                              <select
                                value={solo.ageCategory}
                                onChange={(e) => updateIndividualSolo(index, 'ageCategory', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                required
                              >
                                <option value="Mini">Mini (4-6 years)</option>
                                <option value="Junior">Junior (7-9 years)</option>
                                <option value="Intermediate">Intermediate (10-12 years)</option>
                                <option value="Senior">Senior (13-15 years)</option>
                                <option value="Youth">Youth (16-18 years)</option>
                                <option value="Adult">Adult (19+ years)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) *</label>
                              <input
                                type="number"
                                value={solo.estimatedDuration}
                                onChange={(e) => updateIndividualSolo(index, 'estimatedDuration', parseInt(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                                min="1"
                                max="10"
                                required
                              />
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                            <textarea
                              value={solo.additionalNotes}
                              onChange={(e) => updateIndividualSolo(index, 'additionalNotes', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                              rows={2}
                              placeholder="Any special requirements or notes for this solo..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Non-Solo Performance Details */}
              {performanceType !== 'Solo' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900">{performanceType} Details</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Item Name *</label>
                      <input
                        type="text"
                        value={otherPerformanceData.itemName}
                        onChange={(e) => setOtherPerformanceData({...otherPerformanceData, itemName: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="Enter performance name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Choreographer *</label>
                      <input
                        type="text"
                        value={otherPerformanceData.choreographer}
                        onChange={(e) => setOtherPerformanceData({...otherPerformanceData, choreographer: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        placeholder="Enter choreographer name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Age Category *</label>
                      <select
                        value={otherPerformanceData.ageCategory}
                        onChange={(e) => setOtherPerformanceData({...otherPerformanceData, ageCategory: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        required
                      >
                        <option value="Mini">Mini (4-6 years)</option>
                        <option value="Junior">Junior (7-9 years)</option>
                        <option value="Intermediate">Intermediate (10-12 years)</option>
                        <option value="Senior">Senior (13-15 years)</option>
                        <option value="Youth">Youth (16-18 years)</option>
                        <option value="Adult">Adult (19+ years)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mastery Level *</label>
                      <select
                        value={otherPerformanceData.mastery}
                        onChange={(e) => setOtherPerformanceData({...otherPerformanceData, mastery: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        required
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dance Style *</label>
                      <select
                        value={otherPerformanceData.itemStyle}
                        onChange={(e) => setOtherPerformanceData({...otherPerformanceData, itemStyle: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        required
                      >
                        <option value="Contemporary">Contemporary</option>
                        <option value="Ballet">Ballet</option>
                        <option value="Jazz">Jazz</option>
                        <option value="Hip Hop">Hip Hop</option>
                        <option value="Tap">Tap</option>
                        <option value="Lyrical">Lyrical</option>
                        <option value="Musical Theatre">Musical Theatre</option>
                        <option value="Commercial">Commercial</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes) *</label>
                      <input
                        type="number"
                        value={otherPerformanceData.estimatedDuration}
                        onChange={(e) => setOtherPerformanceData({...otherPerformanceData, estimatedDuration: parseInt(e.target.value)})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                        min="1"
                        max="10"
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Fee Summary */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-yellow-800 mb-4">Fee Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Registration Fee:</span>
                    <span className="font-medium">
                      R{registrationFee.toFixed(2)}
                      {registrationFee === 0 && (
                        <span className="text-green-600 ml-2">✓ Already paid</span>
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      Performance Fee ({performanceType}
                      {performanceType === 'Solo' && soloCount > 0 && ` - ${soloCount} performance${soloCount > 1 ? 's' : ''}`}):
                    </span>
                    <span className="font-medium">R{calculatedFee.toFixed(2)}</span>
                  </div>
                  
                  {performanceType === 'Solo' && (
                    <div className="text-xs text-yellow-700 italic bg-yellow-100 p-3 rounded-lg">
                      <div className="font-medium mb-1">💡 Solo Bundled Pricing:</div>
                      <div>1 solo: R400 • 2 solos: R750 • 3 solos: R1000 • 4 solos: R1200</div>
                      <div>5th solo: FREE • Additional solos: R100 each</div>
                      {soloCount > 0 && (
                        <div className="mt-2 font-medium text-yellow-800">
                          You're registering for {soloCount} solo{soloCount !== 1 ? 's' : ''} - getting bundled discount pricing! 🎉
                        </div>
                      )}
                    </div>
                  )}
                  
                  {performanceType === 'Group' && (
                    <div className="text-xs text-yellow-700 italic">
                      • Group pricing: Small (4-9): R220pp • Large (10+): R190pp
                    </div>
                  )}
                  {(performanceType === 'Duet' || performanceType === 'Trio') && (
                    <div className="text-xs text-yellow-700 italic">
                      • Duet/Trio pricing: R280 per person
                    </div>
                  )}
                  
                  <div className="border-t border-yellow-300 pt-3 mt-3">
                    <div className="flex justify-between text-lg font-bold text-yellow-800">
                      <span>Total:</span>
                      <span>R{(registrationFee + calculatedFee).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || 
                  (performanceType === 'Solo' && soloCount < 1) ||
                  (performanceType !== 'Solo' && participantEodsaIds.filter(id => id.trim() !== '').length < getExpectedParticipantCount(performanceType).min)
                }
                className="w-full px-6 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-xl hover:from-yellow-600 hover:to-orange-700 transition-all duration-300 font-semibold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Registering...' : 
                 performanceType === 'Solo' ? 
                   `Register ${soloCount} Solo${soloCount !== 1 ? 's' : ''} for Nationals` :
                   `Register ${performanceType} (${participantEodsaIds.filter(id => id.trim() !== '').length} participants) for Nationals`}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
} 