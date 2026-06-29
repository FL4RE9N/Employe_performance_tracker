import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createGoalSchema,
  updateGoalSchema,
  METRICS,
  GOAL_STATUS_VALUES,
  VISIBILITY_VALUES,
} from '@perf-tracker/shared';
import type {
  CreateGoalInput,
  UpdateGoalInput,
  GoalDto,
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
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { useTheme } from '@mui/material/styles';

import {
  useGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
} from '../goals/useGoals';
import { TOKENS } from '../theme';
import type { Tokens } from '../theme';

// ---- Helpers ----------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}

function statusLabel(status: GoalDto['status']): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'active':
      return 'Active';
    case 'at_risk':
      return 'At risk';
    case 'done':
      return 'Done';
    case 'dropped':
      return 'Dropped';
    default:
      return status;
  }
}

/**
 * Returns sx-compatible bgcolor + color for goal status chips.
 * Follows the V1.3 spec: soft bg + strong text, fontWeight 600.
 */
function statusChipSx(status: GoalDto['status'], t: Tokens) {
  switch (status) {
    case 'active':
      return { bgcolor: t.primarySoft, color: t.primary };
    case 'at_risk':
      return { bgcolor: t.amberSoft, color: t.amber };
    case 'done':
      return { bgcolor: t.successSoft, color: t.success };
    case 'dropped':
      return { bgcolor: t.surface2, color: t.faint };
    case 'draft':
    default:
      return { bgcolor: t.surface2, color: t.muted };
  }
}

// ---- New Goal Dialog --------------------------------------------------------

interface NewGoalDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function NewGoalDialog({ open, onClose, onSuccess }: NewGoalDialogProps) {
  const createGoal = useCreateGoal();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateGoalInput>({
    resolver: zodResolver(createGoalSchema),
    defaultValues: {
      metricKey: 'deliverables',
      title: '',
      description: '',
      target: '',
      status: 'draft',
      visibility: 'restricted',
    },
  });

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: CreateGoalInput) => {
    setApiError(null);
    try {
      await createGoal.mutateAsync(data);
      reset();
      onSuccess('Goal created.');
      onClose();
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const pending = isSubmitting || createGoal.isPending;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>New goal</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ pt: 1.5 }}>
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}
          <Box display="flex" flexDirection="column" gap={2.5} pt={0.5}>
            <Controller
              name="metricKey"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  error={!!errors.metricKey}
                  disabled={pending}
                >
                  <InputLabel id="new-goal-metric-label">Metric</InputLabel>
                  <Select
                    {...field}
                    labelId="new-goal-metric-label"
                    label="Metric"
                  >
                    {METRICS.map((m) => (
                      <MenuItem key={m.key} value={m.key}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.metricKey && (
                    <FormHelperText>{errors.metricKey.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
            <TextField
              label="Title"
              fullWidth
              disabled={pending}
              error={!!errors.title}
              helperText={errors.title?.message}
              {...register('title')}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              minRows={3}
              disabled={pending}
              error={!!errors.description}
              helperText={errors.description?.message}
              {...register('description')}
            />
            <TextField
              label="Target (optional)"
              fullWidth
              disabled={pending}
              error={!!errors.target}
              helperText={errors.target?.message}
              {...register('target')}
            />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  error={!!errors.status}
                  disabled={pending}
                >
                  <InputLabel id="new-goal-status-label">Status</InputLabel>
                  <Select
                    {...field}
                    labelId="new-goal-status-label"
                    label="Status"
                    value={field.value ?? ''}
                  >
                    {GOAL_STATUS_VALUES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {statusLabel(s)}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.status && (
                    <FormHelperText>{errors.status.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
            <Controller
              name="visibility"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  error={!!errors.visibility}
                  disabled={pending}
                >
                  <InputLabel id="new-goal-visibility-label">
                    Visibility
                  </InputLabel>
                  <Select
                    {...field}
                    labelId="new-goal-visibility-label"
                    label="Visibility"
                    value={field.value ?? ''}
                  >
                    {VISIBILITY_VALUES.map((v) => (
                      <MenuItem key={v} value={v}>
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.visibility && (
                    <FormHelperText>{errors.visibility.message}</FormHelperText>
                  )}
                </FormControl>
              )}
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
            {pending ? 'Creating…' : 'Create goal'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ---- Edit Goal Dialog -------------------------------------------------------

interface EditGoalDialogProps {
  goal: GoalDto | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function EditGoalDialog({ goal, onClose, onSuccess }: EditGoalDialogProps) {
  const updateGoal = useUpdateGoal();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateGoalInput>({
    resolver: zodResolver(updateGoalSchema),
    values: goal
      ? {
          title: goal.title,
          status: goal.status,
          target: goal.target ?? undefined,
          visibility: goal.visibility,
        }
      : {},
  });

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: UpdateGoalInput) => {
    if (!goal) return;
    setApiError(null);
    try {
      await updateGoal.mutateAsync({ id: goal.id, data });
      onSuccess('Goal updated.');
      onClose();
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const pending = isSubmitting || updateGoal.isPending;

  return (
    <Dialog open={!!goal} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>Edit goal</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ pt: 1.5 }}>
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}
          <Box display="flex" flexDirection="column" gap={2.5} pt={0.5}>
            <TextField
              label="Title"
              fullWidth
              disabled={pending}
              error={!!errors.title}
              helperText={errors.title?.message}
              {...register('title')}
            />
            <TextField
              label="Target (optional)"
              fullWidth
              disabled={pending}
              error={!!errors.target}
              helperText={errors.target?.message}
              {...register('target')}
            />
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  error={!!errors.status}
                  disabled={pending}
                >
                  <InputLabel id="edit-goal-status-label">Status</InputLabel>
                  <Select
                    {...field}
                    labelId="edit-goal-status-label"
                    label="Status"
                    value={field.value ?? ''}
                  >
                    {GOAL_STATUS_VALUES.map((s) => (
                      <MenuItem key={s} value={s}>
                        {statusLabel(s)}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.status && (
                    <FormHelperText>{errors.status.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
            <Controller
              name="visibility"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  error={!!errors.visibility}
                  disabled={pending}
                >
                  <InputLabel id="edit-goal-visibility-label">
                    Visibility
                  </InputLabel>
                  <Select
                    {...field}
                    labelId="edit-goal-visibility-label"
                    label="Visibility"
                    value={field.value ?? ''}
                  >
                    {VISIBILITY_VALUES.map((v) => (
                      <MenuItem key={v} value={v}>
                        {v.charAt(0).toUpperCase() + v.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.visibility && (
                    <FormHelperText>{errors.visibility.message}</FormHelperText>
                  )}
                </FormControl>
              )}
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
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ---- Delete Confirm Dialog --------------------------------------------------

interface DeleteConfirmDialogProps {
  goal: GoalDto | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function DeleteConfirmDialog({
  goal,
  onClose,
  onSuccess,
}: DeleteConfirmDialogProps) {
  const deleteGoal = useDeleteGoal();
  const [apiError, setApiError] = useState<string | null>(null);

  const handleClose = () => {
    setApiError(null);
    onClose();
  };

  const handleConfirm = async () => {
    if (!goal) return;
    setApiError(null);
    try {
      await deleteGoal.mutateAsync(goal.id);
      onSuccess('Goal deleted.');
      onClose();
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const pending = deleteGoal.isPending;

  return (
    <Dialog open={!!goal} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>Delete goal?</DialogTitle>
      <DialogContent>
        {apiError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary">
          Are you sure you want to delete{' '}
          <strong>{goal?.title}</strong>? This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={handleClose} disabled={pending}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          disabled={pending}
          onClick={handleConfirm}
          startIcon={
            pending ? <CircularProgress size={16} color="inherit" /> : null
          }
        >
          {pending ? 'Deleting…' : 'Delete'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ---- Goal Row Card ----------------------------------------------------------

interface GoalRowProps {
  goal: GoalDto;
  t: Tokens;
  onEdit: (goal: GoalDto) => void;
  onDelete: (goal: GoalDto) => void;
}

function GoalRow({ goal, t, onEdit, onDelete }: GoalRowProps) {
  const chipSx = statusChipSx(goal.status, t);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2.5,
        py: 2,
        borderRadius: '12px',
        border: `1px solid ${t.border}`,
        bgcolor: t.surface,
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          borderColor: t.border2,
          boxShadow: t.shadowSm,
        },
        flexWrap: 'wrap',
      }}
    >
      {/* Metric tag */}
      <Chip
        label={goal.metricLabel}
        size="small"
        sx={{
          bgcolor: t.primarySoft,
          color: t.primary,
          fontWeight: 600,
          fontSize: '0.72rem',
          height: 22,
          flexShrink: 0,
        }}
      />

      {/* Title — grows to fill remaining space */}
      <Typography
        variant="body2"
        fontWeight={500}
        sx={{
          flex: 1,
          minWidth: 120,
          color: t.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {goal.title}
      </Typography>

      {/* Target */}
      <Typography
        variant="body2"
        sx={{
          color: goal.target ? t.muted : t.faint,
          fontSize: '0.8rem',
          minWidth: 80,
          maxWidth: 180,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {goal.target ?? '—'}
      </Typography>

      {/* Status chip */}
      <Chip
        label={statusLabel(goal.status)}
        size="small"
        sx={{
          ...chipSx,
          fontWeight: 600,
          fontSize: '0.72rem',
          height: 22,
          flexShrink: 0,
        }}
      />

      {/* Visibility */}
      <Chip
        label={goal.visibility.charAt(0).toUpperCase() + goal.visibility.slice(1)}
        size="small"
        sx={{
          bgcolor: t.surface2,
          color: t.muted,
          fontWeight: 500,
          fontSize: '0.72rem',
          height: 22,
          flexShrink: 0,
        }}
      />

      {/* Actions */}
      <Box display="flex" gap={0.5} flexShrink={0}>
        <Tooltip title="Edit">
          <IconButton
            size="small"
            onClick={() => onEdit(goal)}
            sx={{ color: t.muted, '&:hover': { color: t.primary } }}
          >
            <EditIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton
            size="small"
            onClick={() => onDelete(goal)}
            sx={{ color: t.muted, '&:hover': { color: t.red } }}
          >
            <DeleteIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

// ---- Main Page --------------------------------------------------------------

export default function GoalsPage() {
  const { data: goals = [], isLoading, error } = useGoals('mine');
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  const [newGoalOpen, setNewGoalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<GoalDto | null>(null);
  const [deleteGoal, setDeleteGoal] = useState<GoalDto | null>(null);
  const [snackMsg, setSnackMsg] = useState<string | null>(null);

  return (
    <Box>
      {/* Page header */}
      <Box mb={5}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: t.text }}>
          Goals
        </Typography>
        <Typography variant="body1" sx={{ color: t.muted }}>
          Track and manage your performance goals.
        </Typography>
      </Box>

      <Card>
        <CardContent sx={{ p: 3 }}>
          {/* Section toolbar */}
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={0.5}
          >
            <Typography
              variant="overline"
              component="div"
              sx={{
                fontSize: '0.68rem',
                letterSpacing: '.1em',
                color: t.muted,
              }}
            >
              My goals
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setNewGoalOpen(true)}
            >
              New goal
            </Button>
          </Box>

          <Divider sx={{ mb: 2.5, borderColor: t.border }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getErrorMessage(error)}
            </Alert>
          )}

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={5}>
              <CircularProgress />
            </Box>
          ) : goals.length === 0 ? (
            <Box
              display="flex"
              flexDirection="column"
              alignItems="center"
              py={6}
              gap={1.5}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  bgcolor: t.surface2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <FlagOutlinedIcon sx={{ color: t.faint, fontSize: 24 }} />
              </Box>
              <Typography variant="body2" sx={{ color: t.muted }}>
                No goals yet. Set your first goal to get started.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setNewGoalOpen(true)}
              >
                New goal
              </Button>
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={1.5}>
              {goals.map((goal) => (
                <GoalRow
                  key={goal.id}
                  goal={goal}
                  t={t}
                  onEdit={setEditGoal}
                  onDelete={setDeleteGoal}
                />
              ))}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* ---- Dialogs ---- */}
      <NewGoalDialog
        open={newGoalOpen}
        onClose={() => setNewGoalOpen(false)}
        onSuccess={(msg) => setSnackMsg(msg)}
      />
      <EditGoalDialog
        goal={editGoal}
        onClose={() => setEditGoal(null)}
        onSuccess={(msg) => setSnackMsg(msg)}
      />
      <DeleteConfirmDialog
        goal={deleteGoal}
        onClose={() => setDeleteGoal(null)}
        onSuccess={(msg) => setSnackMsg(msg)}
      />

      {/* ---- Success snackbar ---- */}
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
