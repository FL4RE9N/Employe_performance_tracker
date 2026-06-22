import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Mark a route handler (or controller) as publicly accessible.
 * SessionGuard will skip authentication for routes decorated with @Public().
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
