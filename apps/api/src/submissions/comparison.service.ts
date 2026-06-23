import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PolicyService } from '../policy/policy.service';
import { SubmissionService } from './submission.service';
import { statusAtOrAfter, METRIC_KEY_VALUES } from '@perf-tracker/shared';
import type {
  SessionUser,
  ComparisonDto,
  ReviewSubmissionDto,
  MetricGapDto,
  MetricKey,
} from '@perf-tracker/shared';

type Row = any;

@Injectable()
export class ComparisonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly policy: PolicyService,
    private readonly submissions: SubmissionService,
  ) {}

  /**
   * Side-by-side comparison. The ONLY endpoint that can return both sides.
   * - Refuses entirely until BOTH submissions are submitted (invariant #2).
   * - For the employee, withholds the mentor side until release (invariant #3).
   */
  async getComparison(actor: SessionUser, cycleId: string): Promise<ComparisonDto> {
    const cycle = await this.loadCycleWithSubmissions(cycleId);
    this.policy.assertCanViewCycle(actor, cycle);

    const self = cycle.submissions.find((s: Row) => s.authorSide === 'self');
    const mentor = cycle.submissions.find((s: Row) => s.authorSide === 'mentor');
    const bothSubmitted =
      self?.status === 'submitted' && mentor?.status === 'submitted';

    if (!bothSubmitted) {
      throw new ForbiddenException('Comparison is locked until both sides submit');
    }

    const selfDto = self ? await this.submissions.getSubmissionDto(self.id) : null;
    const kind = this.policy.resolveCycleActorKind(actor, cycle);
    const released = statusAtOrAfter(cycle.status, 'released_to_employee');

    // Employee pre-release: own side only, mentor withheld.
    if (kind === 'mentee' && !released) {
      return {
        cycleId,
        bothSubmitted: true,
        releaseGated: true,
        self: selfDto,
        mentor: null,
        gaps: [],
      };
    }

    const mentorDto = mentor
      ? await this.submissions.getSubmissionDto(mentor.id)
      : null;
    return {
      cycleId,
      bothSubmitted: true,
      releaseGated: false,
      self: selfDto,
      mentor: mentorDto,
      gaps: this.buildGaps(selfDto, mentorDto),
    };
  }

  /** The released review bundle — only at/after release, for mentee/mentor/admin. */
  async getReleasedReview(actor: SessionUser, cycleId: string): Promise<ComparisonDto> {
    const cycle = await this.loadCycleWithSubmissions(cycleId);
    if (!this.policy.canViewReleasedReview(actor, cycle)) {
      throw new ForbiddenException('This review has not been released to you');
    }
    const self = cycle.submissions.find((s: Row) => s.authorSide === 'self');
    const mentor = cycle.submissions.find((s: Row) => s.authorSide === 'mentor');
    const selfDto = self ? await this.submissions.getSubmissionDto(self.id) : null;
    const mentorDto = mentor ? await this.submissions.getSubmissionDto(mentor.id) : null;
    return {
      cycleId,
      bothSubmitted: true,
      releaseGated: false,
      self: selfDto,
      mentor: mentorDto,
      gaps: this.buildGaps(selfDto, mentorDto),
    };
  }

  private async loadCycleWithSubmissions(cycleId: string): Promise<Row> {
    const cycle = await this.prisma.reviewCycle.findUnique({
      where: { id: cycleId },
      include: { submissions: { select: { id: true, authorSide: true, status: true } } },
    });
    if (!cycle) throw new NotFoundException(`Cycle not found: ${cycleId}`);
    return cycle;
  }

  private buildGaps(
    self: ReviewSubmissionDto | null,
    mentor: ReviewSubmissionDto | null,
  ): MetricGapDto[] {
    return METRIC_KEY_VALUES.map((key) => {
      const s = self?.ratings.find((r) => r.metricKey === key);
      const m = mentor?.ratings.find((r) => r.metricKey === key);
      const selfScore = s?.score ?? null;
      const mentorScore = m?.score ?? null;
      return {
        metricKey: key as MetricKey,
        metricLabel: s?.metricLabel ?? m?.metricLabel ?? key,
        selfScore,
        mentorScore,
        delta:
          selfScore !== null && mentorScore !== null
            ? mentorScore - selfScore
            : null,
      };
    });
  }
}
