import { Module } from '@nestjs/common';
import { PolicyService } from './policy.service';

/**
 * PolicyModule — provides the shared authorization layer. Feature modules that
 * need visibility checks (goals, cycles, submissions, dashboard) import this and
 * inject PolicyService. Kept non-global so each feature module is self-contained
 * and isolated authz e2e tests can boot it via its consuming module.
 */
@Module({
  providers: [PolicyService],
  exports: [PolicyService],
})
export class PolicyModule {}
