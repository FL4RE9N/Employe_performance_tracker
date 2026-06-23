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

import {
  useFeedbackRequests,
  useCreateFeedbackRequest,
  useRespond,
  useDecline,
} from '../feedback/useFeedback';
import { useDirectory } from '../admin/useAdminUsers';

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

function statusColor(
  status: FeedbackRequestDto['status'],
): 'default' | 'warning' | 'success' | 'error' {
  switch (status) {
    case 'pending':
      return 'warning';
    case 'completed':
      return 'success';
    case 'declined':
      return 'error';
    default:
      return 'default';
  }
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
      <DialogTitle>Request feedback</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
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
      <DialogTitle>Respond to feedback request</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}
          {request?.prompt && (
            <Box
              sx={{
                p: 2,
                mb: 2,
                bgcolor: 'action.hover',
                borderRadius: 1,
                borderLeft: '3px solid',
                borderLeftColor: 'primary.main',
              }}
            >
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Prompt from {request.requesterName}
              </Typography>
              <Typography variant="body2">{request.prompt}</Typography>
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
        <DialogActions sx={{ px: 3, pb: 2 }}>
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

  const handleDecline = async () => {
    try {
      await decline.mutateAsync(item.id);
      onSuccess('Request declined.');
    } catch (err) {
      onSuccess(getErrorMessage(err));
    }
  };

  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent sx={{ p: 2.5 }}>
        {/* Header */}
        <Box
          display="flex"
          alignItems="flex-start"
          justifyContent="space-between"
          mb={1.5}
        >
          <Box>
            <Typography variant="body2" fontWeight={600}>
              {box === 'received'
                ? `From: ${item.requesterName}`
                : `To: ${item.targetName}`}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Requested {formatDate(item.createdAt)}
              {item.dueDate ? ` · Due ${formatDate(item.dueDate)}` : ''}
              {item.anonymity ? ' · Anonymous' : ''}
            </Typography>
          </Box>
          <Chip
            label={statusLabel(item.status)}
            size="small"
            color={statusColor(item.status)}
            variant="outlined"
          />
        </Box>

        {/* Prompt */}
        {item.prompt && (
          <Box
            sx={{
              p: 1.5,
              mb: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
              borderLeft: '3px solid',
              borderLeftColor: 'divider',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              {item.prompt}
            </Typography>
          </Box>
        )}

        {/* Received: pending actions */}
        {box === 'received' && item.status === 'pending' && (
          <Stack direction="row" spacing={1} mt={1}>
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
            >
              Decline
            </Button>
          </Stack>
        )}

        {/* Sent: show responses */}
        {box === 'sent' && item.responses && item.responses.length > 0 && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              display="block"
              mb={1}
            >
              Responses
            </Typography>
            {item.responses.map((r) => (
              <Box key={r.id} sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  {r.authorName ?? 'Anonymous'} · {formatDate(r.createdAt)}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
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
        mb={3}
        display="flex"
        alignItems="flex-start"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Feedback
          </Typography>
          <Typography variant="body1" color="text.secondary">
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
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v: FeedbackBox) => setTab(v)}
          aria-label="Feedback inbox tabs"
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
          <Card variant="outlined">
            <CardContent sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
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
          <Card variant="outlined">
            <CardContent sx={{ py: 6, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No feedback requests sent yet. Use the button above to ask a
                colleague.
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
