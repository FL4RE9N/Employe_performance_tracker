import { z } from 'zod';
import type { Role } from '../enums';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export type LoginInput = z.infer<typeof loginSchema>;

export interface SessionUser {
  id: string;
  email: string;
  displayName: string;
  role: Role;
}
