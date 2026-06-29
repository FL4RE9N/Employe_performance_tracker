import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createAppreciationSchema,
  METRICS,
} from '@perf-tracker/shared';
import type {
  CreateAppreciationInput,
  AppreciationDto,
} from '@perf-tracker/shared';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import CelebrationIcon from '@mui/icons-material/Celebration';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useTheme } from '@mui/material/styles';

import {
  useFeed,
  useCreateAppreciation,
  useReact,
  useUnreact,
  useRemoveAppreciation,
} from '../appreciation/useAppreciation';
import { useDirectory } from '../admin/useAdminUsers';
import { TOKENS, BRAND_GRADIENT } from '../theme';

// ---- Helpers ----------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString();
}

// ---- Reaction config --------------------------------------------------------

const REACTION_TYPES = [
  { type: 'thumbs_up', label: 'Thumbs up', icon: <ThumbUpIcon fontSize="inherit" /> },
  { type: 'heart', label: 'Heart', icon: <FavoriteIcon fontSize="inherit" /> },
  { type: 'celebrate', label: 'Celebrate', icon: <CelebrationIcon fontSize="inherit" /> },
  { type: 'trophy', label: 'Trophy', icon: <EmojiEventsIcon fontSize="inherit" /> },
] as const;

// ---- Metric label helper ----------------------------------------------------

function metricLabel(key: string): string {
  return METRICS.find((m) => m.key === key)?.label ?? key;
}

// ---- Composer ---------------------------------------------------------------

interface ComposerProps {
  onSuccess: (msg: string) => void;
}

function AppreciationComposer({ onSuccess }: ComposerProps) {
  const { data: directory = [] } = useDirectory();
  const createAppreciation = useCreateAppreciation();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateAppreciationInput>({
    resolver: zodResolver(createAppreciationSchema),
    defaultValues: {
      message: '',
      recipientUserIds: [],
      metricTag: undefined,
    },
  });

  const onSubmit = async (data: CreateAppreciationInput) => {
    setApiError(null);
    try {
      await createAppreciation.mutateAsync(data);
      reset();
      onSuccess('Appreciation sent!');
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const pending = isSubmitting || createAppreciation.isPending;

  return (
    <Card
      sx={{
        mb: 4,
        bgcolor: t.surface2,
        border: `1px solid ${t.border}`,
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Typography
          variant="overline"
          component="div"
          sx={{
            fontSize: '0.68rem',
            letterSpacing: '.1em',
            color: t.muted,
            mb: 2,
          }}
        >
          Recognise a teammate
        </Typography>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
        >
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}
          <Box display="flex" flexDirection="column" gap={2}>
            <Controller
              name="recipientUserIds"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  options={directory}
                  getOptionLabel={(opt) => opt.displayName}
                  value={directory.filter((u) =>
                    (field.value as string[]).includes(u.id),
                  )}
                  onChange={(_, selected) => {
                    field.onChange(selected.map((u) => u.id));
                  }}
                  disabled={pending}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Recipients"
                      error={!!errors.recipientUserIds}
                      helperText={
                        errors.recipientUserIds
                          ? String(errors.recipientUserIds.message ?? '')
                          : undefined
                      }
                    />
                  )}
                />
              )}
            />
            <TextField
              label="Message"
              multiline
              minRows={3}
              fullWidth
              disabled={pending}
              error={!!errors.message}
              helperText={errors.message?.message}
              {...register('message')}
            />
            <Controller
              name="metricTag"
              control={control}
              render={({ field }) => (
                <FormControl
                  fullWidth
                  error={!!errors.metricTag}
                  disabled={pending}
                >
                  <InputLabel id="appreciation-metric-label">
                    Metric (optional)
                  </InputLabel>
                  <Select
                    {...field}
                    labelId="appreciation-metric-label"
                    label="Metric (optional)"
                    value={field.value ?? ''}
                    onChange={(e) => {
                      field.onChange(e.target.value === '' ? undefined : e.target.value);
                    }}
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {METRICS.map((m) => (
                      <MenuItem key={m.key} value={m.key}>
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.metricTag && (
                    <FormHelperText>{errors.metricTag.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
            <Box display="flex" justifyContent="flex-end">
              <Button
                type="submit"
                variant="contained"
                disabled={pending}
                startIcon={
                  pending ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : null
                }
              >
                {pending ? 'Sending…' : 'Send appreciation'}
              </Button>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ---- Appreciation Card -------------------------------------------------------

interface AppreciationCardProps {
  item: AppreciationDto;
  onSuccess: (msg: string) => void;
}

function AppreciationCard({ item, onSuccess }: AppreciationCardProps) {
  const react = useReact();
  const unreact = useUnreact();
  const remove = useRemoveAppreciation();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  const handleReaction = async (type: string) => {
    const existing = item.reactions.find((r) => r.type === type);
    try {
      if (existing?.mine) {
        await unreact.mutateAsync({ id: item.id, type });
      } else {
        await react.mutateAsync({ id: item.id, type });
      }
    } catch {
      // Silently fail reaction updates
    }
  };

  const handleRemove = async () => {
    try {
      await remove.mutateAsync(item.id);
      onSuccess('Appreciation removed.');
    } catch (err) {
      onSuccess(getErrorMessage(err));
    }
  };

  const reactionMap = new Map(item.reactions.map((r) => [r.type, r]));

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header: author + timestamp + delete */}
        <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            {/* Aesthetic risk: brand gradient avatar instead of flat fill */}
            <Avatar
              sx={{
                width: 40,
                height: 40,
                fontSize: '0.875rem',
                fontWeight: 700,
                background: BRAND_GRADIENT(t),
                color: '#ffffff',
                flexShrink: 0,
              }}
            >
              {getInitials(item.authorName)}
            </Avatar>
            <Box>
              <Typography variant="body2" fontWeight={600} sx={{ color: t.text }}>
                {item.authorName}
              </Typography>
              <Typography variant="caption" sx={{ color: t.faint }}>
                {formatRelativeTime(item.createdAt)}
              </Typography>
            </Box>
          </Box>
          {item.canRemove && (
            <Tooltip title="Remove">
              <IconButton
                size="small"
                color="error"
                onClick={handleRemove}
                disabled={remove.isPending}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Recipients + metric tag */}
        <Box mb={2} display="flex" alignItems="center" flexWrap="wrap" gap={0.75}>
          <Typography
            variant="caption"
            sx={{ color: t.muted, fontWeight: 600, mr: 0.25 }}
          >
            To
          </Typography>
          {item.recipients.map((r) => (
            <Chip
              key={r.id}
              label={r.displayName}
              size="small"
              sx={{
                bgcolor: t.primarySoft,
                color: t.primary,
                fontWeight: 600,
                fontSize: '0.72rem',
              }}
            />
          ))}
          {item.metricTag && (
            <Chip
              label={metricLabel(item.metricTag)}
              size="small"
              sx={{
                bgcolor: t.violetSoft,
                color: t.violet,
                fontWeight: 600,
                fontSize: '0.72rem',
              }}
            />
          )}
        </Box>

        {/* Message */}
        <Typography
          variant="body2"
          sx={{
            mb: 2.5,
            whiteSpace: 'pre-wrap',
            color: t.text,
            lineHeight: 1.65,
          }}
        >
          {item.message}
        </Typography>

        {/* Reactions */}
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          {REACTION_TYPES.map(({ type, label, icon }) => {
            const r = reactionMap.get(type);
            const count = r?.count ?? 0;
            const mine = r?.mine ?? false;
            return (
              <Button
                key={type}
                size="small"
                onClick={() => void handleReaction(type)}
                startIcon={icon}
                aria-label={`${label}${count > 0 ? ` (${count})` : ''}`}
                sx={{
                  minWidth: 0,
                  px: 1.25,
                  py: 0.5,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  borderRadius: '999px',
                  bgcolor: mine ? t.primarySoft : t.surface2,
                  color: mine ? t.primary : t.muted,
                  border: `1px solid ${mine ? t.primary : t.border}`,
                  '&:hover': {
                    bgcolor: t.primarySoft,
                    color: t.primary,
                    borderColor: t.primary,
                  },
                }}
              >
                {count > 0 ? count : label}
              </Button>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

// ---- Main Page --------------------------------------------------------------

export default function AppreciationPage() {
  const { data: feed = [], isLoading, error } = useFeed();
  const [snackMsg, setSnackMsg] = useState<string | null>(null);
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  // Sort reverse-chronological
  const sorted = [...feed].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  return (
    <Box>
      {/* Page header */}
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: t.text }}>
          Appreciation
        </Typography>
        <Typography variant="body1" sx={{ color: t.muted }}>
          Celebrate the work and values teammates bring every day.
        </Typography>
      </Box>

      {/* Composer */}
      <AppreciationComposer onSuccess={(msg) => setSnackMsg(msg)} />

      {/* Feed */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getErrorMessage(error)}
        </Alert>
      )}

      {sorted.length > 0 && (
        <Typography
          variant="overline"
          component="div"
          sx={{
            fontSize: '0.68rem',
            letterSpacing: '.1em',
            color: t.muted,
            mb: 2,
          }}
        >
          Recent recognitions
        </Typography>
      )}

      {isLoading ? (
        <Box display="flex" justifyContent="center" py={6}>
          <CircularProgress />
        </Box>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: t.muted }}>
              No appreciations yet. Be the first to recognise a teammate.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        sorted.map((item) => (
          <AppreciationCard
            key={item.id}
            item={item}
            onSuccess={(msg) => setSnackMsg(msg)}
          />
        ))
      )}

      {/* Success snackbar */}
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
