import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validate } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { ProvidersModule } from './providers/providers.module';
import { JobsModule } from './jobs/jobs.module';
import { HealthModule } from './health/health.module';
// AuthModule is built by the api-auth agent; imported here per the module contract.
import { AuthModule } from './auth/auth.module';
import { AdminModule } from './admin/admin.module';
import { GoalsModule } from './goals/goals.module';
import { CyclesModule } from './cycles/cycles.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { NotificationModule } from './notifications/notification.module';
import { AppreciationModule } from './appreciation/appreciation.module';
import { FeedbackModule } from './feedback/feedback.module';
import { MeetingsModule } from './meetings/meetings.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
      validate,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    PrismaModule,
    ProvidersModule,
    AuthModule,
    AdminModule,
    GoalsModule,
    CyclesModule,
    SubmissionsModule,
    NotificationModule,
    AppreciationModule,
    FeedbackModule,
    MeetingsModule,
    DashboardModule,
    JobsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
