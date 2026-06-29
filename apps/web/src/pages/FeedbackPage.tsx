import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createFeedbackRequestSchema,
  submitFeedbackSchema,
} from '@perf-tracker/shared';
import type {
  CreateFeedbackRequestInput,
  FeedbackBox,
  FeedbackRequestDto,
  SubmitFeedbackInput,
} from '@perf-tracker/shared';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
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
import FormControlLabel from '@mui/material/FormControlLabel';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useTheme } from '@mui/material/styles';

import {
  useFeedbackRequests,
  useCreateFeedbackRequest,
  useRespond,
  useDecline,
} from '../feedback/useFeedback';
import { useDirectory } from '../admin/useAdminUsers';
import { TOKENS } from '../theme';

// ---- Helpers ----------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}

function formatDate(isoDate: string | null): string {
  if (!isoDate) return '—';
  return new Date(isoDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function statusLabel(status: FeedbackRequestDto['status']): string {
  switch (status) {
    case 'pending':
      return 'Awaiting response';
    case 'completed':
      return 'Completed';
    case 'declined':
      return 'Declined';
    default:
      return status;
  }
}

// ---- Request Feedback Dialog ------------------------------------------------

interface RequestFeedbackDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function RequestFeedbackDialog({
  open,
  onClose,
  onSuccess,
}: RequestFeedbackDialogProps) {
  const { data: directory = [] } = useDirectory();
  const createRequest = useCreateFeedbackRequest();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateFeedbackRequestInput>({
    resolver: zodResolver(createFeedbackRequestSchema),
    defaultValues: {
      targetUserId: '',
      prompt: '',
      anonymity: false,
    },
  });

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: CreateFeedbackRequestInput) => {
    setApiError(null);
    try {
      await createRequest.mutateAsync(data);
      reset();
      onSuccess('Feedback request sent.');
      onClose();
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const pending = isSubmitting || createRequest.isPending;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Request feedback</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ pt: 1 }}>
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}
          <Box display="flex" flexDirection="column" gap={2.5} pt={0.5}>
            <Controller
              name="targetUserId"
              control={control}
              render={({ field }) => {
                const selected =
                  directory.find((u) => u.id === field.value) ?? null;
                return (
                  <Autocomplete
                    options={directory}
                    getOptionLabel={(opt) => opt.displayName}
                    value={selected}
                    onChange={(_, option) => {
                      field.onChange(option?.id ?? '');
                    }}
                    disabled={pending}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Who to ask"
                        error={!!errors.targetUserId}
                        helperText={errors.targetUserId?.message}
                      />
                    )}
                  />
                );
              }}
            />
            <TextField
              label="Prompt (optional)"
              multiline
              minRows={3}
              fullWidth
              disabled={pending}
              error={!!errors.prompt}
              helperText={
                errors.prompt?.message ??
                'What specific aspect do you want feedback on?'
              }
              {...register('prompt')}
            />
            <TextField
              label="Due date (optional)"
              type="date"
              fullWidth
              disabled={pending}
              error={!!errors.dueDate}
              helperText={errors.dueDate?.message}
              InputLabelProps={{ shrink: true }}
              {...register('dueDate')}
            />
            <Controller
              name="anonymity"
              control={control}
              render={({ field }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={field.value ?? false}
                      onChange={(e) => field.onChange(e.target.checked)}
                      disabled={pending}
                    />
                  }
                  label="Receive anonymously — respondent's name will not be shown to you"
                />
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
              pending ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            {pending ? 'Sending…' : 'Send request'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ---- Respond Dialog ---------------------------------------------------------

interface RespondDialogProps {
  request: FeedbackRequestDto | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function RespondDialog({ request, onClose, onSuccess }: RespondDialogProps) {
  const respond = useRespond();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SubmitFeedbackInput>({
    resolver: zodResolver(submitFeedbackSchema),
    defaultValues: { body: '' },
  });

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: SubmitFeedbackInput) => {
    if (!request) return;
    setApiError(null);
    try {
      await respond.mutateAsync({ id: request.id, data });
      reset();
      onSuccess('Feedback submitted.');
      onClose();
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const pending = isSubmitting || respond.isPending;

  return (
    <Dialog open={!!request} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Respond to feedback request</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent sx={{ pt: 1 }}>
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}
          {request?.prompt && (
            <Box
              sx={{
                p: 2,
                mb: 2.5,
                bgcolor: t.surface2,
                borderRadius: 2,
                borderLeft: `3px solid ${t.border2}`,
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: t.muted, fontWeight: 600, display: 'block', mb: 0.5 }}
              >
                Prompt from {request.requesterName}
              </Typography>
              <Typography variant="body2" sx={{ color: t.text }}>
                {request.prompt}
              </Typography>
            </Box>
          )}
          <Box display="flex" flexDirection="column" gap={2} pt={0.5}>
            <TextField
              label="Your feedback"
              multiline
              minRows={5}
              fullWidth
              disabled={pending}
              error={!!errors.body}
              helperText={errors.body?.message}
              {...register('body')}
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
              ) : null
            }
          >
            {pending ? 'Submitting…' : 'Submit feedback'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ---- Feedback Request Card --------------------------------------------------

interface FeedbackCardProps {
  item: FeedbackRequestDto;
  box: FeedbackBox;
  onRespond: (item: FeedbackRequestDto) => void;
  onSuccess: (msg: string) => void;
}

function FeedbackCard({ item, box, onRespond, onSuccess }: FeedbackCardProps) {
  const decline = useDecline();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  const handleDecline = async () => {
    try {
      await decline.mutateAsync(item.id);
      onSuccess('Request declined.');
    } catch (err) {
      onSuccess(getErrorMessage(err));
    }
  };

  // Token-based soft chip colors per spec
  const statusChipSx = (() => {
    switch (item.status) {
      case 'pending':
        return { bgcolor: t.amberSoft, color: t.amber, fontWeight: 600 };
      case 'completed':
        return { bgcolor: t.successSoft, color: t.success, fontWeight: 600 };
      case 'declined':
        return { bgcolor: t.surface2, color: t.muted, fontWeight: 600 };
      default:
        return { bgcolor: t.surface2, color: t.faint, fontWeight: 600 };
    }
  })();

  const isPending = item.status === 'pending';

  return (
    <Card
      sx={{
        mb: 2,
        borderLeft: isPending && box === 'received'
          ? `3px solid ${t.amber}`
          : undefined,
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box
          display="flex"
          alignItems="flex-start"
          justifyContent="space-between"
          mb={1.5}
          gap={1}
        >
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ color: t.text }}>
              {box === 'received'
                ? `From ${item.requesterName}`
                : `To ${item.targetName}`}
            </Typography>
            <Typography variant="caption" sx={{ color: t.muted }}>
              Requested {formatDate(item.createdAt)}
              {item.dueDate ? ` · Due ${formatDate(item.dueDate)}` : ''}
            </Typography>
          </Box>
          <Box display="flex" alignItems="center" gap={0.75} flexShrink={0}>
            {item.anonymity && (
              <Chip
                icon={<VisibilityOffIcon sx={{ fontSize: '0.85rem !important' }} />}
                label="Anonymous"
                size="small"
                sx={{
                  bgcolor: t.violetSoft,
                  color: t.violet,
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              />
            )}
            <Chip
              label={statusLabel(item.status)}
              size="small"
              sx={statusChipSx}
            />
          </Box>
        </Box>

        {/* Prompt */}
        {item.prompt && (
          <Box
            sx={{
              p: 1.5,
              mb: 1.5,
              bgcolor: t.surface2,
              borderRadius: 2,
              borderLeft: `3px solid ${t.border2}`,
            }}
          >
            <Typography variant="body2" sx={{ color: t.muted }}>
              {item.prompt}
            </Typography>
          </Box>
        )}

        {/* Received: pending actions */}
        {box === 'received' && item.status === 'pending' && (
          <Stack direction="row" spacing={1} mt={1.5}>
            <Button
              size="small"
              variant="contained"
              onClick={() => onRespond(item)}
            >
              Respond
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              onClick={() => void handleDecline()}
              disabled={decline.isPending}
              sx={{ color: t.muted, borderColor: t.border2 }}
            >
              Decline
            </Button>
          </Stack>
        )}

        {/* Sent: show responses */}
        {box === 'sent' && item.responses && item.responses.length > 0 && (
          <>
            <Divider sx={{ my: 2, borderColor: t.border }} />
            <Typography
              variant="overline"
              component="div"
              sx={{
                fontSize: '0.68rem',
                letterSpacing: '.08em',
                color: t.muted,
                mb: 1.5,
              }}
            >
              Responses
            </Typography>
            {item.responses.map((r) => (
              <Box key={r.id} sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" gap={0.75} mb={0.5}>
                  {r.authorName ? (
                    <Typography variant="caption" sx={{ color: t.muted, fontWeight: 600 }}>
                      {r.authorName}
                    </Typography>
                  ) : (
                    <Chip
                      icon={<VisibilityOffIcon sx={{ fontSize: '0.8rem !important' }} />}
                      label="Anonymous"
                      size="small"
                      sx={{
                        bgcolor: t.violetSoft,
                        color: t.violet,
                        fontWeight: 600,
                        fontSize: '0.68rem',
                        height: 20,
                      }}
                    />
                  )}
                  <Typography variant="caption" sx={{ color: t.faint }}>
                    · {formatDate(r.createdAt)}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', color: t.text }}>
                  {r.body}
                </Typography>
              </Box>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ---- Tab panel helper -------------------------------------------------------

interface TabPanelProps {
  children: React.ReactNode;
  value: FeedbackBox;
  current: FeedbackBox;
}

function TabPanel({ children, value, current }: TabPanelProps) {
  return (
    <Box role="tabpanel" hidden={value !== current}>
      {value === current && children}
    </Box>
  );
}

// ---- Main Page --------------------------------------------------------------

export default function FeedbackPage() {
  const [tab, setTab] = useState<FeedbackBox>('received');
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [respondTarget, setRespondTarget] = useState<FeedbackRequestDto | null>(
    null,
  );
  const [snackMsg, setSnackMsg] = useState<string | null>(null);

  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  const {
    data: received = [],
    isLoading: loadingReceived,
    error: errorReceived,
  } = useFeedbackRequests('received');
  const {
    data: sent = [],
    isLoading: loadingSent,
    error: errorSent,
  } = useFeedbackRequests('sent');

  const error = tab === 'received' ? errorReceived : errorSent;

  return (
    <Box>
      {/* Page header */}
      <Box
        mb={4}
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: t.text }}>
            Feedback
          </Typography>
          <Typography variant="body1" sx={{ color: t.muted }}>
            Request and give structured feedback with teammates.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setRequestDialogOpen(true)}
        >
          Request feedback
        </Button>
      </Box>

      {/* Tabs */}
      <Box
        sx={{
          borderBottom: `1px solid ${t.border}`,
          mb: 3,
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v: FeedbackBox) => setTab(v)}
          aria-label="Feedback inbox tabs"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 600,
              fontSize: '0.84rem',
              textTransform: 'none',
              color: t.muted,
              minHeight: 44,
              '&.Mui-selected': { color: t.primary },
            },
            '& .MuiTabs-indicator': {
              backgroundColor: t.primary,
              height: 2,
              borderRadius: '2px 2px 0 0',
            },
          }}
        >
          <Tab
            label={`Received${received.length > 0 ? ` (${received.length})` : ''}`}
            value="received"
          />
          <Tab
            label={`Sent${sent.length > 0 ? ` (${sent.length})` : ''}`}
            value="sent"
          />
        </Tabs>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {getErrorMessage(error)}
        </Alert>
      )}

      <TabPanel value="received" current={tab}>
        {loadingReceived ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : received.length === 0 ? (
          <Card>
            <CardContent sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: t.muted }}>
                No feedback requests received yet.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          received.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              box="received"
              onRespond={setRespondTarget}
              onSuccess={(msg) => setSnackMsg(msg)}
            />
          ))
        )}
      </TabPanel>

      <TabPanel value="sent" current={tab}>
        {loadingSent ? (
          <Box display="flex" justifyContent="center" py={6}>
            <CircularProgress />
          </Box>
        ) : sent.length === 0 ? (
          <Card>
            <CardContent sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" sx={{ color: t.muted }}>
                No requests sent yet. Use the button above to ask a colleague.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          sent.map((item) => (
            <FeedbackCard
              key={item.id}
              item={item}
              box="sent"
              onRespond={setRespondTarget}
              onSuccess={(msg) => setSnackMsg(msg)}
            />
          ))
        )}
      </TabPanel>

      {/* ---- Dialogs ---- */}
      <RequestFeedbackDialog
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        onSuccess={(msg) => setSnackMsg(msg)}
      />
      <RespondDialog
        request={respondTarget}
        onClose={() => setRespondTarget(null)}
        onSuccess={(msg) => setSnackMsg(msg)}
      />

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
