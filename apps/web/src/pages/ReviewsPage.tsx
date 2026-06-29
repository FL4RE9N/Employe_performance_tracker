import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createCycleSchema,
  launchOrgWideSchema,
} from '@perf-tracker/shared';
import type {
  CreateCycleInput,
  LaunchOrgWideInput,
  CycleDto,
  CycleStatus,
} from '@perf-tracker/shared';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useTheme } from '@mui/material/styles';

import { useSession } from '../auth/useSession';
import {
  useCycles,
  useCreateCycle,
  useLaunchOrgWide,
  useDirectory,
} from '../reviews/useReviews';
import { TOKENS } from '../theme';

// ---- Helpers -----------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}

function cycleStatusLabel(status: CycleStatus): string {
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
    released_to_employee: 'Released',
    acknowledged: 'Acknowledged',
    closed: 'Closed',
  };
  return labels[status] ?? status;
}

function cycleStatusColor(
  status: CycleStatus,
): 'default' | 'info' | 'warning' | 'success' | 'error' | 'primary' | 'secondary' {
  switch (status) {
    case 'not_started':
      return 'default';
    case 'goals_set':
      return 'info';
    case 'self_assessment_open':
    case 'mentor_assessment_open':
      return 'warning';
    case 'self_submitted':
    case 'mentor_submitted':
      return 'primary';
    case 'calibration':
    case 'meeting_scheduled':
      return 'secondary';
    case 'meeting_held':
    case 'released_to_employee':
    case 'acknowledged':
      return 'info';
    case 'closed':
      return 'success';
    default:
      return 'default';
  }
}

// ---- New Cycle Dialog --------------------------------------------------------

interface NewCycleDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function NewCycleDialog({ open, onClose, onSuccess }: NewCycleDialogProps) {
  const createCycle = useCreateCycle();
  const { data: directory = [] } = useDirectory();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateCycleInput>({
    resolver: zodResolver(createCycleSchema),
    defaultValues: {
      menteeId: '',
      mentorId: '',
      periodLabel: '',
      goalsDueDate: undefined,
      selfDueDate: undefined,
      mentorDueDate: undefined,
    },
  });

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: CreateCycleInput) => {
    setApiError(null);
    try {
      await createCycle.mutateAsync(data);
      reset();
      onSuccess('Review cycle created.');
      onClose();
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const pending = isSubmitting || createCycle.isPending;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>New Review Cycle</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}
          <Box display="flex" flexDirection="column" gap={2.5} pt={0.5}>
            <Controller
              name="menteeId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.menteeId} disabled={pending}>
                  <InputLabel id="new-cycle-mentee-label">Mentee</InputLabel>
                  <Select
                    {...field}
                    labelId="new-cycle-mentee-label"
                    label="Mentee"
                    value={field.value ?? ''}
                  >
                    {directory.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.displayName} ({u.email})
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.menteeId && (
                    <FormHelperText>{errors.menteeId.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            <Controller
              name="mentorId"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.mentorId} disabled={pending}>
                  <InputLabel id="new-cycle-mentor-label">Mentor</InputLabel>
                  <Select
                    {...field}
                    labelId="new-cycle-mentor-label"
                    label="Mentor"
                    value={field.value ?? ''}
                  >
                    {directory.map((u) => (
                      <MenuItem key={u.id} value={u.id}>
                        {u.displayName} ({u.email})
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.mentorId && (
                    <FormHelperText>{errors.mentorId.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />

            <TextField
              label="Period label (e.g. 2025-H1)"
              fullWidth
              disabled={pending}
              error={!!errors.periodLabel}
              helperText={errors.periodLabel?.message}
              {...register('periodLabel')}
            />

            <TextField
              label="Goals due date"
              type="date"
              fullWidth
              disabled={pending}
              error={!!errors.goalsDueDate}
              helperText={errors.goalsDueDate?.message as string | undefined}
              InputLabelProps={{ shrink: true }}
              {...register('goalsDueDate')}
            />

            <TextField
              label="Self-assessment due date"
              type="date"
              fullWidth
              disabled={pending}
              error={!!errors.selfDueDate}
              helperText={errors.selfDueDate?.message as string | undefined}
              InputLabelProps={{ shrink: true }}
              {...register('selfDueDate')}
            />

            <TextField
              label="Mentor assessment due date"
              type="date"
              fullWidth
              disabled={pending}
              error={!!errors.mentorDueDate}
              helperText={errors.mentorDueDate?.message as string | undefined}
              InputLabelProps={{ shrink: true }}
              {...register('mentorDueDate')}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
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
            {pending ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ---- Launch Org-Wide Dialog --------------------------------------------------

interface LaunchOrgWideDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function LaunchOrgWideDialog({ open, onClose, onSuccess }: LaunchOrgWideDialogProps) {
  const launchOrgWide = useLaunchOrgWide();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LaunchOrgWideInput>({
    resolver: zodResolver(launchOrgWideSchema),
    defaultValues: {
      periodLabel: '',
      goalsDueDate: undefined,
      selfDueDate: undefined,
      mentorDueDate: undefined,
    },
  });

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: LaunchOrgWideInput) => {
    setApiError(null);
    try {
      const result = await launchOrgWide.mutateAsync(data);
      reset();
      onSuccess(
        `Org-wide cycle launched: ${result.created} created, ${result.skipped} skipped.`,
      );
      onClose();
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const pending = isSubmitting || launchOrgWide.isPending;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>Launch Org-Wide Review Cycle</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}
          <Alert severity="info" sx={{ mb: 2 }}>
            This will create one review cycle for every active mentor/mentee pairing.
          </Alert>
          <Box display="flex" flexDirection="column" gap={2.5} pt={0.5}>
            <TextField
              label="Period label (e.g. 2025-H1)"
              fullWidth
              disabled={pending}
              error={!!errors.periodLabel}
              helperText={errors.periodLabel?.message}
              {...register('periodLabel')}
            />

            <TextField
              label="Goals due date"
              type="date"
              fullWidth
              disabled={pending}
              error={!!errors.goalsDueDate}
              helperText={errors.goalsDueDate?.message as string | undefined}
              InputLabelProps={{ shrink: true }}
              {...register('goalsDueDate')}
            />

            <TextField
              label="Self-assessment due date"
              type="date"
              fullWidth
              disabled={pending}
              error={!!errors.selfDueDate}
              helperText={errors.selfDueDate?.message as string | undefined}
              InputLabelProps={{ shrink: true }}
              {...register('selfDueDate')}
            />

            <TextField
              label="Mentor assessment due date"
              type="date"
              fullWidth
              disabled={pending}
              error={!!errors.mentorDueDate}
              helperText={errors.mentorDueDate?.message as string | undefined}
              InputLabelProps={{ shrink: true }}
              {...register('mentorDueDate')}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={handleClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={pending}
            startIcon={
              pending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <RocketLaunchIcon />
              )
            }
          >
            {pending ? 'Launching…' : 'Launch'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ---- Main Page ---------------------------------------------------------------

type ScopeFilter = 'mine' | 'all';

export default function ReviewsPage() {
  const { data: user } = useSession();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];
  const isAdmin = user?.role === 'admin';

  const [scope, setScope] = useState<ScopeFilter>('mine');
  const { data: cycles = [], isLoading, error } = useCycles(scope);

  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [launchOpen, setLaunchOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState<string | null>(null);

  return (
    <Box>
      {/* Page header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Review Cycles
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage performance review cycles and assessments.
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            gap={2}
            mb={3}
          >
            <Box display="flex" alignItems="center" gap={2}>
              <Typography variant="h6" fontWeight={600}>
                Cycles
              </Typography>
              {isAdmin && (
                <ToggleButtonGroup
                  size="small"
                  value={scope}
                  exclusive
                  onChange={(_, val) => {
                    if (val !== null) setScope(val as ScopeFilter);
                  }}
                  sx={{
                    '& .MuiToggleButton-root': {
                      borderRadius: '8px !important',
                      px: 1.5,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      textTransform: 'none',
                      border: `1px solid ${t.border}`,
                      color: t.muted,
                      '&.Mui-selected': {
                        bgcolor: t.primarySoft,
                        color: t.primary,
                        borderColor: t.primary,
                      },
                    },
                  }}
                >
                  <ToggleButton value="mine">Mine</ToggleButton>
                  <ToggleButton value="all">All</ToggleButton>
                </ToggleButtonGroup>
              )}
            </Box>

            {isAdmin && (
              <Box display="flex" gap={1.5}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<RocketLaunchIcon />}
                  onClick={() => setLaunchOpen(true)}
                >
                  Launch org-wide
                </Button>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setNewCycleOpen(true)}
                >
                  New cycle
                </Button>
              </Box>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getErrorMessage(error)}
            </Alert>
          )}

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow
                    sx={{
                      '& .MuiTableCell-head': {
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        letterSpacing: '.05em',
                        textTransform: 'uppercase',
                        color: t.muted,
                        borderBottom: `1px solid ${t.border}`,
                        py: 1.25,
                      },
                    }}
                  >
                    <TableCell>Period</TableCell>
                    <TableCell>Mentee</TableCell>
                    <TableCell>Mentor</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Self due</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cycles.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" color="text.secondary">
                          No review cycles yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    cycles.map((cycle: CycleDto) => (
                      <TableRow
                        key={cycle.id}
                        hover
                        sx={{
                          '& .MuiTableCell-body': {
                            borderBottom: `1px solid ${t.border}`,
                            py: 1.5,
                          },
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {cycle.periodLabel}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {cycle.menteeName ?? cycle.menteeId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {cycle.mentorName ?? cycle.mentorId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={cycleStatusLabel(cycle.status)}
                            size="small"
                            color={cycleStatusColor(cycle.status)}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" color="text.secondary">
                            {new Date(cycle.selfDueDate).toLocaleDateString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            component={RouterLink}
                            to={`/reviews/${cycle.id}`}
                            size="small"
                            endIcon={<OpenInNewIcon fontSize="small" />}
                          >
                            Open
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ---- Dialogs ---- */}
      {isAdmin && (
        <>
          <NewCycleDialog
            open={newCycleOpen}
            onClose={() => setNewCycleOpen(false)}
            onSuccess={(msg) => setSnackMsg(msg)}
          />
          <LaunchOrgWideDialog
            open={launchOpen}
            onClose={() => setLaunchOpen(false)}
            onSuccess={(msg) => setSnackMsg(msg)}
          />
        </>
      )}

      {/* ---- Success snackbar ---- */}
      <Snackbar
        open={!!snackMsg}
        autoHideDuration={5000}
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
