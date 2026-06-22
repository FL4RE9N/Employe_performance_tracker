import { z } from 'zod';
import { RoleSchema } from '../enums';
import type { Role } from '../enums';

// --- Admin: user management ---------------------------------------------------

export const createUserSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(200),
  role: RoleSchema,
  password: z.string().min(8).max(200),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    displayName: z.string().min(1).max(200).optional(),
    role: RoleSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'nothing to update' });
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// --- Admin: mentor↔mentee pairings (time-bounded edges) -----------------------

export const createPairingSchema = z
  .object({
    menteeId: z.string().uuid(),
    mentorId: z.string().uuid(),
    // ISO date (YYYY-MM-DD); server defaults to today when omitted.
    effectiveFrom: z.string().optional(),
  })
  .refine((d) => d.menteeId !== d.mentorId, {
    message: 'mentee and mentor must be different users',
  });
export type CreatePairingInput = z.infer<typeof createPairingSchema>;

// --- Response shapes ----------------------------------------------------------

/** Full user row as returned to admins (never includes passwordHash). */
export interface AdminUserDto {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

/** Minimal directory entry for @mention / feedback-target pickers. */
export interface DirectoryUserDto {
  id: string;
  displayName: string;
  email: string;
}

/** A current (or historical) mentor↔mentee edge. */
export interface PairingDto {
  id: string;
  menteeId: string;
  mentorId: string;
  menteeName: string;
  mentorName: string;
  effectiveFrom: string;
  effectiveTo: string | null;
}
