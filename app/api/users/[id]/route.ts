import { NextResponse } from 'next/server';
import { db } from '@/lib/database';
import bcrypt from 'bcryptjs';
import type { User } from '@/lib/types';

// Superadmin emails
const SUPERADMIN_EMAILS = [
  'gabriel@elementscentral.com',
  'info@upstreamcreatives.co.za',
  'mains@elementscentral.com',
  'admin@eodsa.com'
];

async function isSuperadmin(email: string): Promise<boolean> {
  if (SUPERADMIN_EMAILS.includes(email.toLowerCase())) {
    return true;
  }
  const { getSql } = await import('@/lib/database');
  const sqlClient = getSql();
  const result = await sqlClient`SELECT role FROM judges WHERE email = ${email.toLowerCase()}` as any[];
  return result.length > 0 && result[0].role === 'superadmin';
}

async function getCurrentUser(request: Request): Promise<User | null> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return null;
    
    const userId = authHeader.replace('Bearer ', '');
    const { getSql } = await import('@/lib/database');
    const sqlClient = getSql();
    const result = await sqlClient`SELECT * FROM judges WHERE id = ${userId}` as any[];
    
    if (result.length === 0) return null;
    
    const row = result[0];
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
    
    let specialization;
    try {
      specialization = row.specialization 
        ? (typeof row.specialization === 'string' 
            ? JSON.parse(row.specialization) 
            : row.specialization)
        : [];
    } catch {
      specialization = [];
    }
    
    // Map role to userType for frontend
    const roleToUserType = (role: string, isAdmin: boolean): 'judge' | 'staff' | 'admin' | 'superadmin' => {
      if (role === 'superadmin') return 'superadmin';
      if (role === 'admin') return 'admin';
      if (['backstage_manager', 'announcer', 'registration', 'media'].includes(role)) return 'staff';
      return 'judge';
    };

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      password: row.password,
      userType: roleToUserType(row.role || 'judge', row.is_admin),
      isAdmin: row.is_admin,
      role: row.role || 'judge',
      specialization,
      staffPermissions,
      createdAt: row.created_at
    };
  } catch {
    return null;
  }
}

// GET /api/users/[id] - Get user by ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { getSql } = await import('@/lib/database');
    const sqlClient = getSql();
    const result = await sqlClient`SELECT * FROM judges WHERE id = ${id}` as any[];
    
    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const row = result[0];
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
    
    let specialization;
    try {
      specialization = row.specialization 
        ? (typeof row.specialization === 'string' 
            ? JSON.parse(row.specialization) 
            : row.specialization)
        : [];
    } catch {
      specialization = [];
    }
    
    // Map role to userType for frontend
    const roleToUserType = (role: string, isAdmin: boolean): 'judge' | 'staff' | 'admin' | 'superadmin' => {
      if (role === 'superadmin') return 'superadmin';
      if (role === 'admin') return 'admin';
      if (['backstage_manager', 'announcer', 'registration', 'media'].includes(role)) return 'staff';
      return 'judge';
    };

    const user: User = {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      password: '', // Don't return password
      userType: roleToUserType(row.role || 'judge', row.is_admin),
      isAdmin: row.is_admin,
      role: row.role || 'judge',
      specialization,
      staffPermissions,
      createdAt: row.created_at
    };
    
    return NextResponse.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const body = await request.json();
    const { 
      name, 
      email, 
      password,
      phone,
      userType,
      staffPermissions 
    } = body;
    
    // Get existing user from database to check their current role
    const { getSql } = await import('@/lib/database');
    const sqlClient = getSql();
    const existingUserResult = await sqlClient`SELECT role, is_admin FROM judges WHERE id = ${id}` as any[];
    
    if (existingUserResult.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const existingUserRole = existingUserResult[0].role || 'judge';
    const existingUserIsAdmin = existingUserResult[0].is_admin || false;
    
    // Check if trying to change userType to admin/superadmin
    if (userType && (userType === 'admin' || userType === 'superadmin')) {
      const isSuper = await isSuperadmin(currentUser.email);
      if (!isSuper) {
        return NextResponse.json(
          { success: false, error: 'Only superadmins can promote users to admin or superadmin' },
          { status: 403 }
        );
      }
    }
    
    // Check if trying to demote an admin or superadmin
    if ((existingUserRole === 'admin' || existingUserRole === 'superadmin') && userType && userType !== 'admin' && userType !== 'superadmin') {
      const isSuper = await isSuperadmin(currentUser.email);
      if (!isSuper) {
        return NextResponse.json(
          { success: false, error: 'Only superadmins can demote admins or superadmins' },
          { status: 403 }
        );
      }
    }
    
    // Prevent non-superadmins from modifying superadmin accounts
    if (existingUserRole === 'superadmin') {
      const currentIsSuper = await isSuperadmin(currentUser.email);
      if (!currentIsSuper) {
        return NextResponse.json(
          { success: false, error: 'Only superadmins can modify superadmin accounts' },
          { status: 403 }
        );
      }
    }
    
    // Update user (sqlClient already imported above)
    
    // Build update query dynamically
    let hashedPassword: string | undefined;
    if (password !== undefined) {
      hashedPassword = await bcrypt.hash(password, 10);
    }
    
    // Build the update query using template literals
    if (name !== undefined) {
      await sqlClient`UPDATE judges SET name = ${name.trim()} WHERE id = ${id}`;
    }
    if (email !== undefined) {
      await sqlClient`UPDATE judges SET email = ${email.toLowerCase().trim()} WHERE id = ${id}`;
    }
    if (phone !== undefined) {
      await sqlClient`UPDATE judges SET phone = ${phone || null} WHERE id = ${id}`;
    }
    if (hashedPassword !== undefined) {
      await sqlClient`UPDATE judges SET password = ${hashedPassword} WHERE id = ${id}`;
    }
    if (userType !== undefined) {
      // Map userType to role
      let role: 'judge' | 'admin' | 'superadmin' | 'backstage_manager' = 'judge';
      if (userType === 'superadmin') {
        role = 'superadmin';
      } else if (userType === 'admin') {
        role = 'admin';
      } else if (userType === 'staff') {
        role = 'backstage_manager';
      } else {
        role = 'judge';
      }
      
      const isAdmin = userType === 'admin' || userType === 'superadmin';
      
      await sqlClient`
        UPDATE judges 
        SET role = ${role}, is_admin = ${isAdmin}
        WHERE id = ${id}
      `;
    }
    if (staffPermissions !== undefined) {
      await sqlClient`
        UPDATE judges 
        SET staff_permissions = ${JSON.stringify(staffPermissions)}::jsonb
        WHERE id = ${id}
      `;
    }
    
    // Fetch updated user
    const result = await sqlClient`SELECT * FROM judges WHERE id = ${id}` as any[];
    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const row = result[0];
    let parsedStaffPermissions;
    try {
      parsedStaffPermissions = row.staff_permissions 
        ? (typeof row.staff_permissions === 'string' 
            ? JSON.parse(row.staff_permissions) 
            : row.staff_permissions)
        : undefined;
    } catch {
      parsedStaffPermissions = undefined;
    }
    
    let specialization;
    try {
      specialization = row.specialization 
        ? (typeof row.specialization === 'string' 
            ? JSON.parse(row.specialization) 
            : row.specialization)
        : [];
    } catch {
      specialization = [];
    }
    
    // Map role to userType for frontend
    const roleToUserType = (role: string, isAdmin: boolean): 'judge' | 'staff' | 'admin' | 'superadmin' => {
      if (role === 'superadmin') return 'superadmin';
      if (role === 'admin') return 'admin';
      if (['backstage_manager', 'announcer', 'registration', 'media'].includes(role)) return 'staff';
      return 'judge';
    };
    
    const user: User = {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      password: '',
      userType: roleToUserType(row.role || 'judge', row.is_admin),
      isAdmin: row.is_admin,
      role: row.role || 'judge',
      specialization,
      staffPermissions: parsedStaffPermissions,
      createdAt: row.created_at
    };
    
    return NextResponse.json({
      success: true,
      user,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { id } = await params;
    const { getSql } = await import('@/lib/database');
    const sqlClient = getSql();
    const result = await sqlClient`SELECT * FROM judges WHERE id = ${id}` as any[];
    
    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }
    
    const userToDelete = result[0];
    
    // Check if trying to delete a superadmin or admin
    const userToDeleteRole = userToDelete.role || 'judge';
    if (userToDeleteRole === 'superadmin') {
      // Only other superadmins can delete superadmins
      const isSuper = await isSuperadmin(currentUser.email);
      if (!isSuper) {
        return NextResponse.json(
          { success: false, error: 'Only superadmins can delete superadmin accounts' },
          { status: 403 }
        );
      }
    } else if (userToDeleteRole === 'admin' || userToDelete.is_admin) {
      // Only superadmins can delete admin accounts
      const isSuper = await isSuperadmin(currentUser.email);
      if (!isSuper) {
        return NextResponse.json(
          { success: false, error: 'Only superadmins can delete admin accounts' },
          { status: 403 }
        );
      }
    }
    
    // Don't allow deleting yourself
    if (id === currentUser.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }
    
    // Prevent superadmin from deleting another superadmin without explicit check
    if (userToDeleteRole === 'superadmin' && currentUser.role !== 'superadmin') {
      const currentIsSuper = await isSuperadmin(currentUser.email);
      if (!currentIsSuper) {
        return NextResponse.json(
          { success: false, error: 'Only superadmins can delete superadmin accounts' },
          { status: 403 }
        );
      }
    }
    
    await db.deleteJudge(id);
    
    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

