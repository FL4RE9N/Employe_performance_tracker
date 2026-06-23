import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CycleService } from '../cycles/cycle.service';
import { PolicyService } from '../policy/policy.service';
import type {
  SessionUser,
  AuthorSide,
  SaveDraftInput,
  SubmitReviewInput,
  ReviewSubmissionDto,
  CycleDto,
} from '@perf-tracker/shared';

type Row = any;

@Injectable()
export class SubmissionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cycles: CycleService,
    private readonly policy: PolicyService,
  ) {}

  // --- Draft autosave (blocked once locked) ----------------------------------

  async saveDraft(
    actor: SessionUser,
    cycleId: string,
    side: AuthorSide,
    input: SaveDraftInput,
  ): Promise<ReviewSubmissionDto> {
    const { submission } = await this.loadOwnedSubmission(actor, cycleId, side);
    this.assertEditable(submission);

    if (input.answers) {
      for (const a of input.answers) {
        await this.prisma.questionAnswer.upsert({
          where: {
            submissionId_questionKey: {
              submissionId: submission.id,
              questionKey: a.questionKey as Row,
            },
          },
          create: {
            submissionId: submission.id,
            questionKey: a.questionKey as Row,
            answerText: a.answerText,
          },
          update: { answerText: a.answerText },
        });
      }
    }

    if (input.ratings) {
      const metricMap = await this.metricKeyToId();
      const scaleVersion = await this.activeScaleVersion();
      for (const r of input.ratings) {
        const metricId = metricMap.get(r.metricKey);
        if (!metricId) throw new BadRequestException(`Unknown metric: ${r.metricKey}`);
        await this.prisma.metricRating.upsert({
          where: {
            submissionId_metricId: { submissionId: submission.id, metricId },
          },
          create: {
            submissionId: submission.id,
            metricId,
            score: r.score,
            comment: r.comment,
            scaleVersion,
          },
          update: { score: r.score, comment: r.comment, scaleVersion },
        });
      }
    }

    return this.getSubmissionDto(submission.id);
  }

  // --- Submit (persist complete content, then lock + advance the cycle) ------

  async submit(
    actor: SessionUser,
    cycleId: string,
    side: AuthorSide,
    input: SubmitReviewInput,
  ): Promise<{ cycle: CycleDto; submission: ReviewSubmissionDto }> {
    const { submission } = await this.loadOwnedSubmission(actor, cycleId, side);
    this.assertEditable(submission);

    // Persist the full, validated set as the draft content...
    await this.saveDraft(actor, cycleId, side, {
      answers: input.answers,
      ratings: input.ratings,
    });

    // ...then advance through the state machine, which locks this submission.
    const cycle = await this.cycles.transition(
      cycleId,
      side === 'self' ? 'self_submitted' : 'mentor_submitted',
      actor,
    );

    return { cycle, submission: await this.getSubmissionDto(submission.id) };
  }

  // --- Read one side (visibility-gated) --------------------------------------

  async getSubmission(
    actor: SessionUser,
    cycleId: string,
    side: AuthorSide,
  ): Promise<ReviewSubmissionDto> {
    const cycle = await this.prisma.reviewCycle.findUnique({
      where: { id: cycleId },
      include: { submissions: { select: { authorSide: true, status: true } } },
    });
    if (!cycle) throw new NotFoundException(`Cycle not found: ${cycleId}`);

    const bothSubmitted = this.bothSubmitted(cycle.submissions);
    if (!this.policy.canViewSubmission(actor, cycle, side, { bothSubmitted })) {
      throw new ForbiddenException('Not allowed to view this submission');
    }

    const submission = await this.prisma.reviewSubmission.findUnique({
      where: { cycleId_authorSide: { cycleId, authorSide: side } },
    });
    if (!submission) throw new NotFoundException(`No ${side} submission`);
    return this.getSubmissionDto(submission.id);
  }

  // --- Internals -------------------------------------------------------------

  private bothSubmitted(
    submissions: Array<{ authorSide: string; status: string }>,
  ): boolean {
    const self = submissions.find((s) => s.authorSide === 'self');
    const mentor = submissions.find((s) => s.authorSide === 'mentor');
    return self?.status === 'submitted' && mentor?.status === 'submitted';
  }

  private assertEditable(submission: Row): void {
    if (submission.status === 'submitted' || submission.lockedAt) {
      throw new ConflictException('Submission is locked and immutable');
    }
  }

  /** Load the submission for `side`, ensuring `actor` is its rightful author. */
  private async loadOwnedSubmission(
    actor: SessionUser,
    cycleId: string,
    side: AuthorSide,
  ): Promise<{ cycle: Row; submission: Row }> {
    const cycle = await this.prisma.reviewCycle.findUnique({
      where: { id: cycleId },
    });
    if (!cycle) throw new NotFoundException(`Cycle not found: ${cycleId}`);

    const rightfulAuthorId = side === 'self' ? cycle.menteeId : cycle.mentorId;
    if (actor.id !== rightfulAuthorId) {
      throw new ForbiddenException(
        `Only the ${side === 'self' ? 'mentee' : 'mentor'} may edit the ${side} submission`,
      );
    }

    const submission = await this.prisma.reviewSubmission.findUnique({
      where: { cycleId_authorSide: { cycleId, authorSide: side } },
    });
    if (!submission) {
      throw new ConflictException(
        'Submissions are not open yet for this cycle',
      );
    }
    return { cycle, submission };
  }

  private async metricKeyToId(): Promise<Map<string, string>> {
    const metrics = await this.prisma.metricDefinition.findMany({
      select: { id: true, key: true },
    });
    return new Map(metrics.map((m: Row) => [m.key, m.id]));
  }

  private async activeScaleVersion(): Promise<string> {
    const scale = await this.prisma.ratingScale.findFirst({
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return scale?.version ?? 'v1';
  }

  async getSubmissionDto(submissionId: string): Promise<ReviewSubmissionDto> {
    const s = await this.prisma.reviewSubmission.findUnique({
      where: { id: submissionId },
      include: {
        answers: true,
        ratings: { include: { metric: { select: { key: true, label: true } } } },
      },
    });
    if (!s) throw new NotFoundException('Submission not found');
    return {
      id: s.id,
      cycleId: s.cycleId,
      authorSide: s.authorSide,
      status: s.status,
      submittedAt: s.submittedAt ? new Date(s.submittedAt).toISOString() : null,
      lockedAt: s.lockedAt ? new Date(s.lockedAt).toISOString() : null,
      answers: s.answers.map((a: Row) => ({
        questionKey: a.questionKey,
        answerText: a.answerText,
      })),
      ratings: s.ratings.map((r: Row) => ({
        metricKey: r.metric.key,
        metricLabel: r.metric.label,
        score: r.score,
        comment: r.comment ?? null,
        scaleVersion: r.scaleVersion,
      })),
    };
  }
}
