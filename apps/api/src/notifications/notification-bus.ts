import { Injectable } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import type { NotificationDto } from '@perf-tracker/shared';

export interface NotificationEvent {
  recipientUserId: string;
  dto: NotificationDto;
}

/**
 * In-process notification bus. A single hot Subject + per-subscriber filter:
 * leak-free (RxJS unsubscribes when the SSE response tears down on disconnect)
 * and multi-tab safe (each EventSource gets its own filtered subscription).
 * Single-instance only — Phase 1 runs one API process (cross-process fan-out
 * would swap this Subject's source for Postgres LISTEN/NOTIFY or Redis later).
 */
@Injectable()
export class NotificationBus {
  private readonly stream$ = new Subject<NotificationEvent>();

  publish(evt: NotificationEvent): void {
    this.stream$.next(evt);
  }

  forUser(userId: string): Observable<NotificationEvent> {
    return this.stream$.pipe(filter((e) => e.recipientUserId === userId));
  }
}
