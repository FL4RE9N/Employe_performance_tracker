import { SetMetadata } from '@nestjs/common';
import type { Role } from '@perf-tracker/shared';

export const ROLES_KEY = 'roles';

/**
 * Restrict a route to one or more roles.
 * RolesGuard reads this metadata and compares it against req.user.role.
 *
 * Usage:
 *   @Roles('admin')
 *   @Roles('admin', 'user')
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
