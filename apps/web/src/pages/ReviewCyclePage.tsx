import { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { acknowledgeSchema, scheduleMeetingSchema } from '@perf-tracker/shared';
import type {
  CycleStatus,
  AcknowledgeInput,
  ScheduleMeetingInput,
} from '@perf-tracker/shared';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Link from '@mui/material/Link';
import Snackbar from '@mui/material/Snackbar';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckIcon from '@mui/icons-material/Check';
import { useTheme } from '@mui/material/styles';

import { useSession } from '../auth/useSession';
import {
  useCycle,
  useTransition,
  useRelease,
  useAcknowledge,
} from '../reviews/useReviews';
import ReviewForm from '../reviews/ReviewForm';
import ComparisonView from '../reviews/ComparisonView';
import { TOKENS } from '../theme';

// ---- Helpers -----------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}

// The curated stepper steps (calibration is optional so we omit it from the visual)
const STEPPER_STEPS: { status: CycleStatus; label: string }[] = [
  { status: 'not_started', label: 'Not started' },
  { status: 'goals_set', label: 'Goals set' },
  { status: 'self_assessment_open', label: 'Self-assessment' },
  { status: 'mentor_assessment_open', label: 'Mentor assessment' },
  { status: 'meeting_scheduled', label: 'Meeting' },
  { status: 'released_to_employee', label: 'Released' },
  { status: 'closed', label: 'Closed' },
];

// Map status → active step index (using the curated list above)
const STATUS_STEP_INDEX: Partial<Record<CycleStatus, number>> = {
  not_started: 0,
  goals_set: 1,
  self_assessment_open: 2,
  self_submitted: 2,
  mentor_assessment_open: 3,
  mentor_submitted: 3,
  calibration: 3,
  meeting_scheduled: 4,
  meeting_held: 4,
  released_to_employee: 5,
  acknowledged: 5,
  closed: 6,
};

function statusLabel(status: CycleStatus): string {
  const labels: Record<CycleStatus, string> = {
    not_started: 'Not started',
    goals_set: 'Goals set',
    self_assessment_open: 'Self-assessment open',
    self_submitted: 'Self submitted',
    mentor_assessment_open: 'Mentor assessment open',
    mentor_submitted: 'Mentor submitted',
    calibration: 'Calibration',
    meeting_scheduled: 'Meeting scheduled',
    meeting_held: 'Meeting held',
    released_to_employee: 'Released to employee',
    acknowledged: 'Acknowledged',
    closed: 'Closed',
  };
  return labels[status] ?? status;
}

// Map a "to" status to a human button label
function transitionButtonLabel(to: CycleStatus): string {
  const labels: Partial<Record<CycleStatus, string>> = {
    goals_set: 'Mark goals set',
    self_assessment_open: 'Open self-assessment',
    meeting_scheduled: 'Schedule meeting',
    meeting_held: 'Mark meeting held',
    calibration: 'Start calibration',
    mentor_assessment_open: 'Open mentor assessment',
    released_to_employee: 'Release to employee',
    acknowledged: 'Acknowledge',
    closed: 'Close cycle',
  };
  return labels[to] ?? statusLabel(to);
}

// ---- Custom Stepper ----------------------------------------------------------

interface CycleStepperProps {
  activeStep: number;
}

function CycleStepper({ activeStep }: CycleStepperProps) {
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        overflowX: 'auto',
        pb: 0.5,
        gap: 0,
      }}
    >
      {STEPPER_STEPS.map((step, index) => {
        const isDone = index < activeStep;
        const isActive = index === activeStep;
        const isUpcoming = index > activeStep;
        const isLast = index === STEPPER_STEPS.length - 1;

        return (
          <Box
            key={step.status}
            sx={{ display: 'flex', alignItems: 'center', flex: isLast ? 'none' : 1, minWidth: 0 }}
          >
            {/* Step node + label */}
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                flex: 'none',
              }}
            >
              {/* Dot */}
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all .2s',
                  ...(isDone && {
                    bgcolor: t.success,
                    color: '#fff',
                    boxShadow: `0 0 0 3px ${t.successSoft}`,
                  }),
                  ...(isActive && {
                    bgcolor: t.primary,
                    color: '#fff',
                    boxShadow: `0 0 0 3px ${t.primarySoft}`,
                    outline: `1.5px solid ${t.primary}`,
                    outlineOffset: 2,
                  }),
                  ...(isUpcoming && {
                    bgcolor: t.surface2,
                    border: `2px solid ${t.border}`,
                    color: t.faint,
                  }),
                }}
              >
                {isDone ? (
                  <CheckIcon sx={{ fontSize: 14 }} />
                ) : (
                  <Box
                    sx={{
                      width: isActive ? 8 : 6,
                      height: isActive ? 8 : 6,
                      borderRadius: '50%',
                      bgcolor: isActive ? '#fff' : t.faint,
                    }}
                  />
                )}
              </Box>

              {/* Label */}
              <Typography
                variant="caption"
                sx={{
                  fontWeight: isActive ? 700 : 400,
                  color: isDone
                    ? t.success
                    : isActive
                    ? t.primary
                    : t.faint,
                  whiteSpace: 'nowrap',
                  letterSpacing: isActive ? '-.01em' : 0,
                  transition: 'color .2s',
                  maxWidth: 80,
                  textAlign: 'center',
                  display: 'block',
                  lineHeight: 1.3,
                }}
              >
                {step.label}
              </Typography>
            </Box>

            {/* Connector line */}
            {!isLast && (
              <Box
                sx={{
                  flex: 1,
                  height: 2,
                  borderRadius: 1,
                  mx: 1,
                  mt: '-18px', /* align with dot center */
                  bgcolor: isDone ? t.success : t.border,
                  transition: 'background-color .3s',
                  minWidth: 12,
                  alignSelf: 'flex-start',
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

// ---- Schedule Meeting Dialog -------------------------------------------------

interface ScheduleMeetingDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: ScheduleMeetingInput) => Promise<void>;
  pending: boolean;
  apiError: string | null;
}

function ScheduleMeetingDialog({
  open,
  onClose,
  onConfirm,
  pending,
  apiError,
}: ScheduleMeetingDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ScheduleMeetingInput>({
    resolver: zodResolver(scheduleMeetingSchema),
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: ScheduleMeetingInput) => {
    await onConfirm(data);
    reset();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Schedule Review Meeting</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}
          <Box display="flex" flexDirection="column" gap={2.5} pt={0.5}>
            <TextField
              label="Start date & time"
              type="datetime-local"
              fullWidth
              disabled={pending}
              error={!!errors.scheduledStart}
              helperText={errors.scheduledStart?.message as string | undefined}
              InputLabelProps={{ shrink: true }}
              {...register('scheduledStart')}
            />
            <TextField
              label="End date & time"
              type="datetime-local"
              fullWidth
              disabled={pending}
              error={!!errors.scheduledEnd}
              helperText={errors.scheduledEnd?.message as string | undefined}
              InputLabelProps={{ shrink: true }}
              {...register('scheduledEnd')}
            />
            <TextField
              label="Teams join URL (optional)"
              fullWidth
              disabled={pending}
              error={!!errors.teamsJoinUrl}
              helperText={errors.teamsJoinUrl?.message}
              {...register('teamsJoinUrl')}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={pending}
            startIcon={
              pending ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {pending ? 'Scheduling…' : 'Schedule'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ---- Acknowledge Dialog ------------------------------------------------------

interface AcknowledgeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (data: AcknowledgeInput) => Promise<void>;
  pending: boolean;
  apiError: string | null;
}

function AcknowledgeDialog({
  open,
  onClose,
  onConfirm,
  pending,
  apiError,
}: AcknowledgeDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AcknowledgeInput>({
    resolver: zodResolver(acknowledgeSchema),
    defaultValues: { comment: '' },
  });

  const handleClose = () => {
    reset();
    onClose();
  };

  const onSubmit = async (data: AcknowledgeInput) => {
    await onConfirm(data);
    reset();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Acknowledge Review</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            By acknowledging, you confirm you have reviewed your performance assessment.
            You may leave an optional comment.
          </Typography>
          <TextField
            label="Comment (optional)"
            fullWidth
            multiline
            minRows={3}
            disabled={pending}
            error={!!errors.comment}
            helperText={errors.comment?.message}
            {...register('comment')}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={pending}
            startIcon={
              pending ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {pending ? 'Acknowledging…' : 'Acknowledge'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ---- Tab panel ---------------------------------------------------------------

interface TabPanelProps {
  value: number;
  index: number;
  children: React.ReactNode;
}

function TabPanel({ value, index, children }: TabPanelProps) {
  return value === index ? <Box pt={3}>{children}</Box> : null;
}

// ---- Main Page ---------------------------------------------------------------

export default function ReviewCyclePage() {
  const { id } = useParams<{ id: string }>();
  const { data: user } = useSession();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  const { data: cycle, isLoading, error } = useCycle(id ?? '');
  const transitionMut = useTransition(id ?? '');
  const releaseMut = useRelease(id ?? '');
  const acknowledgeMut = useAcknowledge(id ?? '');

  const [snackMsg, setSnackMsg] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Dialog state
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [acknowledgeOpen, setAcknowledgeOpen] = useState(false);

  // Tab state
  const [tab, setTab] = useState(0);

  if (!id) return null;

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !cycle) {
    return (
      <Alert severity="error">
        {error ? getErrorMessage(error) : 'Cycle not found.'}
      </Alert>
    );
  }

  const availableTransitions = cycle.availableTransitions ?? [];
  const isMentee = user?.id === cycle.menteeId;
  const isMentor = user?.id === cycle.mentorId;

  const activeStep = STATUS_STEP_INDEX[cycle.status] ?? 0;

  // Determine if the review form should be shown
  const showSelfForm =
    isMentee && cycle.status === 'self_assessment_open';
  const showMentorForm =
    isMentor && cycle.status === 'mentor_assessment_open';
  const showForm = showSelfForm || showMentorForm;
  const formSide: 'self' | 'mentor' = showMentorForm ? 'mentor' : 'self';

  // Show comparison once self is submitted (for mentee) or from mentor_submitted on
  const showComparison =
    cycle.status !== 'not_started' &&
    cycle.status !== 'goals_set' &&
    cycle.status !== 'self_assessment_open';

  // Determine tabs
  const tabs: string[] = ['Overview'];
  if (showForm) tabs.push('Assessment');
  if (showComparison) tabs.push('Comparison');

  // ---- Action handlers ----

  const handleTransition = async (to: CycleStatus) => {
    if (to === 'meeting_scheduled') {
      setScheduleOpen(true);
      return;
    }
    if (to === 'acknowledged') {
      setAcknowledgeOpen(true);
      return;
    }
    if (to === 'released_to_employee') {
      // Use the release endpoint
      setActionError(null);
      try {
        await releaseMut.mutateAsync();
        setSnackMsg('Review released to employee.');
      } catch (err) {
        setActionError(getErrorMessage(err));
      }
      return;
    }
    setActionError(null);
    try {
      await transitionMut.mutateAsync({ to });
      setSnackMsg(`Status updated to: ${statusLabel(to)}`);
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const handleScheduleConfirm = async (meeting: ScheduleMeetingInput) => {
    setActionError(null);
    try {
      await transitionMut.mutateAsync({ to: 'meeting_scheduled', meeting });
      setScheduleOpen(false);
      setSnackMsg('Meeting scheduled.');
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const handleAcknowledgeConfirm = async (data: AcknowledgeInput) => {
    setActionError(null);
    try {
      await acknowledgeMut.mutateAsync(data);
      setAcknowledgeOpen(false);
      setSnackMsg('Review acknowledged.');
    } catch (err) {
      setActionError(getErrorMessage(err));
    }
  };

  const actionPending =
    transitionMut.isPending || releaseMut.isPending || acknowledgeMut.isPending;

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link
          component={RouterLink}
          to="/reviews"
          underline="hover"
          color="inherit"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <ArrowBackIcon fontSize="small" />
          Reviews
        </Link>
        <Typography color="text.primary">{cycle.periodLabel}</Typography>
      </Breadcrumbs>

      {/* Page header */}
      <Box mb={4} display="flex" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            {cycle.periodLabel}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {cycle.menteeName ?? cycle.menteeId} &mdash; mentored by{' '}
            {cycle.mentorName ?? cycle.mentorId}
          </Typography>
        </Box>
        <Chip
          label={statusLabel(cycle.status)}
          color={
            cycle.status === 'closed'
              ? 'success'
              : cycle.status === 'not_started'
              ? 'default'
              : 'primary'
          }
          variant="filled"
          sx={{ mt: 0.5 }}
        />
      </Box>

      {/* Custom Stepper */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ overflowX: 'auto', py: 3 }}>
          <CycleStepper activeStep={activeStep} />
        </CardContent>
      </Card>

      {/* Action error */}
      {actionError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>
          {actionError}
        </Alert>
      )}

      {/* Action buttons from availableTransitions */}
      {availableTransitions.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography
              variant="overline"
              component="div"
              sx={{
                fontSize: '0.68rem',
                letterSpacing: '.1em',
                color: t.muted,
                mb: 1.5,
                display: 'block',
              }}
            >
              Available actions
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={1.5}>
              {availableTransitions.map((to) => (
                <Button
                  key={to}
                  variant="contained"
                  size="small"
                  disabled={actionPending}
                  onClick={() => void handleTransition(to)}
                  startIcon={
                    actionPending ? <CircularProgress size={14} color="inherit" /> : undefined
                  }
                >
                  {transitionButtonLabel(to)}
                </Button>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Meeting info (when scheduled) */}
      {cycle.meeting && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="subtitle2" fontWeight={600} gutterBottom>
              Review meeting
            </Typography>
            <Box display="flex" flexDirection="column" gap={0.5}>
              <Typography variant="body2">
                <strong>Start:</strong>{' '}
                {new Date(cycle.meeting.scheduledStart).toLocaleString()}
              </Typography>
              <Typography variant="body2">
                <strong>End:</strong>{' '}
                {new Date(cycle.meeting.scheduledEnd).toLocaleString()}
              </Typography>
              {cycle.meeting.teamsJoinUrl && (
                <Typography variant="body2">
                  <strong>Teams:</strong>{' '}
                  <Link href={cycle.meeting.teamsJoinUrl} target="_blank" rel="noreferrer">
                    Join meeting
                  </Link>
                </Typography>
              )}
              <Chip
                label={cycle.meeting.status}
                size="small"
                variant="outlined"
                sx={{ mt: 1, width: 'fit-content' }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v: number) => setTab(v)} sx={{ mb: 1 }}>
        {tabs.map((label, i) => (
          <Tab key={label} label={label} value={i} />
        ))}
      </Tabs>

      {/* Overview tab */}
      <TabPanel value={tab} index={0}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Cycle details
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Typography variant="body2">
                <strong>Mentee:</strong> {cycle.menteeName ?? cycle.menteeId}
              </Typography>
              <Typography variant="body2">
                <strong>Mentor:</strong> {cycle.mentorName ?? cycle.mentorId}
              </Typography>
              <Typography variant="body2">
                <strong>Period:</strong> {cycle.periodLabel}
              </Typography>
              <Typography variant="body2">
                <strong>Goals due:</strong>{' '}
                {new Date(cycle.goalsDueDate).toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                <strong>Self-assessment due:</strong>{' '}
                {new Date(cycle.selfDueDate).toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                <strong>Mentor assessment due:</strong>{' '}
                {new Date(cycle.mentorDueDate).toLocaleDateString()}
              </Typography>
              {cycle.openedAt && (
                <Typography variant="body2">
                  <strong>Opened:</strong>{' '}
                  {new Date(cycle.openedAt).toLocaleDateString()}
                </Typography>
              )}
              {cycle.releasedAt && (
                <Typography variant="body2">
                  <strong>Released:</strong>{' '}
                  {new Date(cycle.releasedAt).toLocaleDateString()}
                </Typography>
              )}
              {cycle.acknowledgedAt && (
                <Typography variant="body2">
                  <strong>Acknowledged:</strong>{' '}
                  {new Date(cycle.acknowledgedAt).toLocaleDateString()}
                </Typography>
              )}
              {cycle.acknowledgementComment && (
                <Typography variant="body2">
                  <strong>Acknowledgement comment:</strong>{' '}
                  {cycle.acknowledgementComment}
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>
      </TabPanel>

      {/* Assessment tab */}
      {showForm && (
        <TabPanel value={tab} index={tabs.indexOf('Assessment')}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                {formSide === 'self' ? 'Self-assessment' : 'Mentor assessment'}
              </Typography>
              <ReviewForm
                cycleId={id}
                side={formSide}
                onSuccess={(msg) => setSnackMsg(msg)}
                onError={(msg) => setActionError(msg)}
              />
            </CardContent>
          </Card>
        </TabPanel>
      )}

      {/* Comparison tab */}
      {showComparison && (
        <TabPanel value={tab} index={tabs.indexOf('Comparison')}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                Review comparison
              </Typography>
              <ComparisonView cycleId={id} />
            </CardContent>
          </Card>
        </TabPanel>
      )}

      {/* ---- Dialogs ---- */}
      <ScheduleMeetingDialog
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onConfirm={handleScheduleConfirm}
        pending={transitionMut.isPending}
        apiError={actionError}
      />

      <AcknowledgeDialog
        open={acknowledgeOpen}
        onClose={() => setAcknowledgeOpen(false)}
        onConfirm={handleAcknowledgeConfirm}
        pending={acknowledgeMut.isPending}
        apiError={actionError}
      />

      {/* ---- Snackbar ---- */}
      <Snackbar
        open={!!snackMsg}
        autoHideDuration={4000}
        onClose={() => setSnackMsg(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackMsg(null)}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
