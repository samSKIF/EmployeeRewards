// User Repository - Data access layer for users
import { db, User, InsertUser, UpdateUser, users, departments, organizations, teams, teamMembers, auditLogs } from '../database/connection';
import { eq, and, or, like, sql, inArray, isNull } from 'drizzle-orm';
import { eventBus } from '../../../../shared/event-bus';

export interface UserFilters {
  organization_id?: number;
  department_id?: number;
  manager_id?: number;
  is_active?: boolean;
  is_admin?: boolean;
  role_type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface UserWithRelations extends User {
  department?: any;
  organization?: any;
  manager?: any;
}

export class UserRepository {
  /**
   * Get user by ID
   */
  async getUserById(id: number, includeRelations: boolean = false): Promise<UserWithRelations | null> {
    try {
      const query = db.select().from(users).where(eq(users.id, id));
      
      if (includeRelations) {
        // In production, use proper joins
        const [user] = await query;
        if (user) {
          // Fetch relations
          const [department] = user.department_id 
            ? await db.select().from(departments).where(eq(departments.id, user.department_id))
            : [null];
          const [organization] = user.organization_id
            ? await db.select().from(organizations).where(eq(organizations.id, user.organization_id))
            : [null];
          const [manager] = user.manager_id
            ? await db.select().from(users).where(eq(users.id, user.manager_id))
            : [null];
          
          return {
            ...user,
            department,
            organization,
            manager: manager ? { id: manager.id, username: manager.username, email: manager.email } : null,
          };
        }
      } else {
        const [user] = await query;
        return user || null;
      }
      
      return null;
    } catch (error: any) {
      console.error('[User Repository] Error getting user by ID:', error?.message);
      throw error;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email));
      
      return user || null;
    } catch (error: any) {
      console.error('[User Repository] Error getting user by email:', error?.message);
      throw error;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | null> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.username, username));
      
      return user || null;
    } catch (error: any) {
      console.error('[User Repository] Error getting user by username:', error?.message);
      throw error;
    }
  }

  /**
   * Get users with filters
   */
  async getUsers(filters: UserFilters = {}): Promise<{ users: User[], total: number }> {
    try {
      let query = db.select().from(users);
      let countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
      
      // Build WHERE conditions
      const conditions = [];
      
      if (filters.organization_id) {
        conditions.push(eq(users.organization_id, filters.organization_id));
      }
      
      if (filters.department_id) {
        conditions.push(eq(users.department_id, filters.department_id));
      }
      
      if (filters.manager_id) {
        conditions.push(eq(users.manager_id, filters.manager_id));
      }
      
      if (filters.is_active !== undefined) {
        conditions.push(eq(users.is_active, filters.is_active));
      }
      
      if (filters.is_admin !== undefined) {
        conditions.push(eq(users.is_admin, filters.is_admin));
      }
      
      if (filters.role_type) {
        conditions.push(eq(users.role_type, filters.role_type));
      }
      
      if (filters.search) {
        conditions.push(
          or(
            like(users.username, `%${filters.search}%`),
            like(users.email, `%${filters.search}%`),
            like(users.first_name, `%${filters.search}%`),
            like(users.last_name, `%${filters.search}%`)
          )!
        );
      }
      
      // Apply conditions
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
        countQuery = countQuery.where(and(...conditions));
      }
      
      // Get total count
      const [{ count }] = await countQuery;
      
      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const offset = (page - 1) * limit;
      
      query = query.limit(limit).offset(offset);
      
      const userList = await query;
      
      return {
        users: userList,
        total: count,
      };
    } catch (error: any) {
      console.error('[User Repository] Error getting users:', error?.message);
      throw error;
    }
  }

  /**
   * Create user
   */
  async createUser(data: InsertUser, createdBy?: number): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values({
          ...data,
          created_by: createdBy,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();
      
      // Audit log
      await this.createAuditLog('CREATE', 'user', user.id, null, user, createdBy);
      
      // Publish event
      await eventBus.publish({
        type: 'employee.created',
        version: '1.0',
        source: 'employee-core',
        data: {
          user_id: user.id,
          username: user.username,
          email: user.email,
          organization_id: user.organization_id,
          department_id: user.department_id,
          created_by: createdBy,
        },
      });
      
      return user;
    } catch (error: any) {
      console.error('[User Repository] Error creating user:', error?.message);
      throw error;
    }
  }

  /**
   * Update user
   */
  async updateUser(id: number, data: UpdateUser, updatedBy?: number): Promise<User | null> {
    try {
      // Get current user for audit
      const [currentUser] = await db.select().from(users).where(eq(users.id, id));
      if (!currentUser) {
        return null;
      }
      
      // Update user
      const [updatedUser] = await db
        .update(users)
        .set({
          ...data,
          updated_at: new Date(),
        })
        .where(eq(users.id, id))
        .returning();
      
      // Audit log
      await this.createAuditLog('UPDATE', 'user', id, currentUser, updatedUser, updatedBy);
      
      // Publish event
      await eventBus.publish({
        type: 'employee.updated',
        version: '1.0',
        source: 'employee-core',
        data: {
          user_id: updatedUser.id,
          changes: Object.keys(data),
          updated_by: updatedBy,
        },
      });
      
      // Check for department change
      if (data.department_id && data.department_id !== currentUser.department_id) {
        await eventBus.publish({
          type: 'employee.department_changed',
          version: '1.0',
          source: 'employee-core',
          data: {
            user_id: id,
            old_department_id: currentUser.department_id,
            new_department_id: data.department_id,
            changed_by: updatedBy,
          },
        });
      }
      
      return updatedUser;
    } catch (error: any) {
      console.error('[User Repository] Error updating user:', error?.message);
      throw error;
    }
  }

  /**
   * Soft delete user
   */
  async deleteUser(id: number, deletedBy?: number): Promise<boolean> {
    try {
      // Get current user for audit
      const [currentUser] = await db.select().from(users).where(eq(users.id, id));
      if (!currentUser) {
        return false;
      }
      
      // Soft delete
      await db
        .update(users)
        .set({
          is_active: false,
          deleted_at: new Date(),
          deleted_by: deletedBy,
          updated_at: new Date(),
        })
        .where(eq(users.id, id));
      
      // Audit log
      await this.createAuditLog('DELETE', 'user', id, currentUser, null, deletedBy);
      
      // Publish event
      await eventBus.publish({
        type: 'employee.deleted',
        version: '1.0',
        source: 'employee-core',
        data: {
          user_id: id,
          deleted_by: deletedBy,
        },
      });
      
      return true;
    } catch (error: any) {
      console.error('[User Repository] Error deleting user:', error?.message);
      throw error;
    }
  }

  /**
   * Get subordinates
   */
  async getSubordinates(managerId: number): Promise<User[]> {
    try {
      return await db
        .select()
        .from(users)
        .where(and(
          eq(users.manager_id, managerId),
          eq(users.is_active, true)
        ));
    } catch (error: any) {
      console.error('[User Repository] Error getting subordinates:', error?.message);
      throw error;
    }
  }

  /**
   * Get organization user count
   */
  async getOrganizationUserCount(organizationId: number): Promise<number> {
    try {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(
          eq(users.organization_id, organizationId),
          eq(users.is_active, true)
        ));
      
      return count;
    } catch (error: any) {
      console.error('[User Repository] Error getting organization user count:', error?.message);
      throw error;
    }
  }

  /**
   * Create audit log
   */
  private async createAuditLog(
    action: string,
    entityType: string,
    entityId: number,
    oldValues: any,
    newValues: any,
    userId?: number
  ): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        user_id: userId || null,
        action,
        entity_type: entityType,
        entity_id: entityId,
        old_values: oldValues ? JSON.stringify(oldValues) : null,
        new_values: newValues ? JSON.stringify(newValues) : null,
        organization_id: newValues?.organization_id || oldValues?.organization_id,
        created_at: new Date(),
      });
    } catch (error: any) {
      console.error('[User Repository] Error creating audit log:', error?.message);
      // Don't throw - audit logging shouldn't break operations
    }
  }
}