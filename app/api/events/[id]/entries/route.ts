import { NextResponse } from 'next/server';
import { db, unifiedDb } from '@/lib/database';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const eventId = id;
    
    // First check if the event exists
    const event = await db.getEventById(eventId);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // Get all event entries for this event
    const allEntries = await db.getAllEventEntries();
    const eventEntries = allEntries.filter(entry => entry.eventId === eventId);
    
    // Enhance entries with contestant/dancer information
    const enhancedEntries = await Promise.all(
      eventEntries.map(async (entry) => {
        try {
          // First try to get as unified system dancer
          const dancer = await unifiedDb.getDancerById(entry.contestantId);
          
          if (dancer) {
            // This is a unified system dancer
            console.log(`Found unified dancer: ${dancer.name} (${dancer.eodsaId})`);
            
            // Get studio information for the main contestant
            const allDancers = await unifiedDb.getAllDancers();
            const dancerWithStudio = allDancers.find(d => d.id === entry.contestantId);
            
            // Get all participant names and studio info for this entry
            const participantDetails = await Promise.all(
              entry.participantIds.map(async (participantId) => {
                try {
                  const participant = await unifiedDb.getDancerById(participantId);
                  const participantWithStudio = allDancers.find(d => d.id === participantId);
                  return {
                    name: participant ? participant.name : 'Unknown Dancer',
                    studioName: participantWithStudio?.studioName || null
                  };
                } catch (error) {
                  console.error(`Error fetching participant ${participantId}:`, error);
                  return {
                    name: 'Unknown Dancer',
                    studioName: null
                  };
                }
              })
            );
            
            return {
              ...entry,
              contestantName: dancer.name,
              contestantEmail: dancer.email || '',
              participantNames: participantDetails.map(p => p.name),
              // Add studio information
              studioName: dancerWithStudio?.studioName || 'Independent',
              studioId: dancerWithStudio?.studioId || null,
              studioEmail: dancerWithStudio?.studioEmail || null,
              participantStudios: participantDetails.map(p => p.studioName || 'Independent')
            };
          } else {
            // Try legacy contestant system
            const contestant = await db.getContestantById(entry.contestantId);
            if (contestant) {
              console.log(`Found legacy contestant: ${contestant.name} (${contestant.eodsaId})`);
              return {
                ...entry,
                contestantName: contestant.name,
                contestantEmail: contestant.email || '',
                participantNames: entry.participantIds.map(id => {
                  const dancer = contestant.dancers.find(d => d.id === id);
                  return dancer?.name || 'Unknown Dancer';
                }),
                // Legacy system - studio info may not be available
                studioName: 'Legacy Entry',
                studioId: null,
                studioEmail: null,
                participantStudios: entry.participantIds.map(() => 'Legacy Entry')
              };
            } else {
              console.error(`Could not find contestant or dancer for ID: ${entry.contestantId}`);
              return {
                ...entry,
                contestantName: 'Unknown (Not Found)',
                contestantEmail: '',
                participantNames: ['Unknown Dancer'],
                studioName: 'Unknown',
                studioId: null,
                studioEmail: null,
                participantStudios: ['Unknown']
              };
            }
          }
        } catch (error) {
          console.error(`Error loading contestant/dancer ${entry.contestantId}:`, error);
          return {
            ...entry,
            contestantName: 'Error loading',
            contestantEmail: '',
            participantNames: ['Error loading dancers'],
            studioName: 'Error loading',
            studioId: null,
            studioEmail: null,
            participantStudios: ['Error loading']
          };
        }
      })
    );

    console.log(`Enhanced ${enhancedEntries.length} entries for event ${eventId}`);
    
    return NextResponse.json({
      success: true,
      entries: enhancedEntries
    });
  } catch (error) {
    console.error('Error fetching event entries:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch event entries' },
      { status: 500 }
    );
  }
} 