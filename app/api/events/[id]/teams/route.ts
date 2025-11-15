import { NextResponse } from 'next/server';
import { getSql } from '@/lib/database';

// GET /api/events/[id]/teams - Get all teams (judges, staff, admins) for an event
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const sqlClient = getSql();
    
    // Get judges assigned to this event (ordered by display_order)
    // Judges have role = 'judge'
    // Note: Treat NULL status as active for backward compatibility
    const judgesResult = await sqlClient`
      SELECT 
        j.id,
        j.name,
        j.email,
        j.phone,
        j.role,
        jea.id as assignment_id,
        jea.display_order,
        jea.status as assignment_status
      FROM judge_event_assignments jea
      JOIN judges j ON jea.judge_id = j.id
      WHERE jea.event_id = ${eventId} 
        AND (jea.status = 'active' OR jea.status IS NULL)
        AND (j.role = 'judge' OR j.role IS NULL)
      ORDER BY jea.display_order ASC NULLS LAST, jea.assigned_at ASC
    ` as any[];
    
    console.log(`[Teams API] Event ${eventId}: Found ${judgesResult.length} judges`);
    
    // Get staff assigned to this event with their event roles
    // Staff have roles like 'backstage_manager', 'announcer', 'registration', 'media'
    const staffResult = await sqlClient`
      SELECT 
        j.id,
        j.name,
        j.email,
        j.phone,
        j.role,
        j.staff_permissions,
        esa.id as assignment_id,
        esa.event_role,
        esa.assigned_at
      FROM event_staff_assignments esa
      JOIN judges j ON esa.staff_id = j.id
      WHERE esa.event_id = ${eventId}
        AND j.role IN ('backstage_manager', 'announcer', 'registration', 'media')
      ORDER BY esa.assigned_at ASC
    ` as any[];
    
    // Get all admins (they have automatic access)
    // Admins have role = 'admin' or 'superadmin'
    const adminsResult = await sqlClient`
      SELECT 
        id,
        name,
        email,
        phone,
        role
      FROM judges
      WHERE role IN ('admin', 'superadmin')
      ORDER BY name ASC
    ` as any[];
    
    // Map role to userType for frontend
    const roleToUserType = (role: string): 'judge' | 'staff' | 'admin' | 'superadmin' => {
      if (role === 'superadmin') return 'superadmin';
      if (role === 'admin') return 'admin';
      if (['backstage_manager', 'announcer', 'registration', 'media'].includes(role)) return 'staff';
      return 'judge';
    };
    
    const judges = judgesResult.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      assignmentId: row.assignment_id,
      displayOrder: row.display_order || 0
    }));
    
    const staff = staffResult.map((row: any) => {
      let staffPermissions;
      try {
        staffPermissions = row.staff_permissions 
          ? (typeof row.staff_permissions === 'string' 
              ? JSON.parse(row.staff_permissions) 
              : row.staff_permissions)
          : undefined;
      } catch {
        staffPermissions = undefined;
      }
      
      return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || undefined,
        assignmentId: row.assignment_id,
        eventRole: row.event_role,
        staffPermissions
      };
    });
    
    const admins = adminsResult.map((row: any) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      userType: roleToUserType(row.role)
    }));
    
    return NextResponse.json({
      success: true,
      teams: {
        judges,
        staff,
        admins
      }
    });
  } catch (error) {
    console.error('Error fetching event teams:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch event teams' },
      { status: 500 }
    );
  }
}

