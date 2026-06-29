import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { DIGEST_FREQUENCY_VALUES } from '@perf-tracker/shared';
import type { DigestFrequency, NotificationDto } from '@perf-tracker/shared';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useNotificationPreferences,
  useUpdatePreferences,
} from '../notifications/useNotifications';
import { TOKENS } from '../theme';

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function NotificationItem({
  notification,
  onMarkRead,
}: {
  notification: NotificationDto;
  onMarkRead: (id: string) => void;
}) {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];
  const isUnread = notification.status === 'unread';

  const handleClick = () => {
    if (isUnread) onMarkRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  return (
    <ListItem
      disablePadding
      sx={{
        backgroundColor: isUnread ? t.primarySoft : 'transparent',
        borderLeft: '3px solid',
        borderLeftColor: isUnread ? t.primary : 'transparent',
        transition: 'background-color .15s ease',
      }}
    >
      <ListItemButton
        onClick={handleClick}
        sx={{
          py: 2,
          px: 2.5,
          '&:hover': {
            backgroundColor: isUnread ? t.primarySoft : t.surface2,
          },
        }}
      >
        <ListItemText
          disableTypography
          primary={
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 2,
                mb: 0.25,
              }}
            >
              <Typography
                variant="body2"
                fontWeight={isUnread ? 700 : 400}
                sx={{ flex: 1, color: isUnread ? t.text : t.muted }}
              >
                {notification.title}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: t.faint, whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {relativeTime(notification.createdAt)}
              </Typography>
            </Box>
          }
          secondary={
            <Typography variant="caption" sx={{ color: t.muted }}>
              {notification.body}
            </Typography>
          }
        />
      </ListItemButton>
    </ListItem>
  );
}

function PreferencesSection() {
  const { data: prefs, isLoading, isError } = useNotificationPreferences();
  const updatePrefs = useUpdatePreferences();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (isError || !prefs) {
    return (
      <Alert severity="error">Failed to load notification preferences.</Alert>
    );
  }

  return (
    <Stack spacing={3}>
      {/* Email toggle row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
          px: 2,
          borderRadius: 2,
          border: `1px solid ${t.border}`,
          bgcolor: t.surface2,
        }}
      >
        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ color: t.text }}>
            Email notifications
          </Typography>
          <Typography variant="caption" sx={{ color: t.muted }}>
            Receive alerts directly in your inbox
          </Typography>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={prefs.emailEnabled}
              onChange={(e) => {
                updatePrefs.mutate({ emailEnabled: e.target.checked });
              }}
              disabled={updatePrefs.isPending}
            />
          }
          label=""
          sx={{ m: 0 }}
        />
      </Box>

      {/* Digest frequency */}
      <Box>
        <Typography
          variant="overline"
          component="div"
          sx={{
            fontSize: '0.68rem',
            letterSpacing: '.1em',
            color: t.muted,
            mb: 1,
          }}
        >
          Digest frequency
        </Typography>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel id="digest-freq-label">How often</InputLabel>
          <Select<DigestFrequency>
            labelId="digest-freq-label"
            label="How often"
            value={prefs.digestFrequency}
            onChange={(e) => {
              updatePrefs.mutate({
                digestFrequency: e.target.value as DigestFrequency,
              });
            }}
            disabled={updatePrefs.isPending}
          >
            {DIGEST_FREQUENCY_VALUES.map((f) => (
              <MenuItem key={f} value={f}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      {updatePrefs.isError && (
        <Alert severity="error">
          Failed to save preferences. Please try again.
        </Alert>
      )}
    </Stack>
  );
}

export default function NotificationsPage() {
  const { data, isLoading, isError } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Stack spacing={4}>
        {/* Header */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Notifications
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Stay on top of reviews, goals, and feedback updates.
            </Typography>
          </Box>
          {unreadCount > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              sx={{ flexShrink: 0 }}
            >
              Mark all read
            </Button>
          )}
        </Box>

        {/* Feed */}
        <Box>
          <Typography
            variant="overline"
            component="div"
            sx={{
              fontSize: '0.68rem',
              letterSpacing: '.1em',
              color: t.muted,
              mb: 1.5,
            }}
          >
            {unreadCount > 0 ? `${unreadCount} unread` : 'Activity'}
          </Typography>

          <Card>
            {isLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {!isLoading && isError && (
              <Box sx={{ p: 3 }}>
                <Alert severity="error">
                  Failed to load notifications. Please refresh.
                </Alert>
              </Box>
            )}

            {!isLoading && !isError && items.length === 0 && (
              <Box sx={{ py: 6, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: t.muted }}>
                  Nothing here yet.
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ color: t.faint, display: 'block', mt: 0.5 }}
                >
                  Notifications appear when there&apos;s activity on your goals
                  and reviews.
                </Typography>
              </Box>
            )}

            {!isLoading && !isError && items.length > 0 && (
              <List disablePadding>
                {items.map((n, idx) => (
                  <Box key={n.id}>
                    <NotificationItem
                      notification={n}
                      onMarkRead={(id) => markRead.mutate(id)}
                    />
                    {idx < items.length - 1 && (
                      <Divider sx={{ borderColor: t.border }} />
                    )}
                  </Box>
                ))}
              </List>
            )}
          </Card>
        </Box>

        {/* Preferences */}
        <Box>
          <Typography
            variant="overline"
            component="div"
            sx={{
              fontSize: '0.68rem',
              letterSpacing: '.1em',
              color: t.muted,
              mb: 1.5,
            }}
          >
            Preferences
          </Typography>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <PreferencesSection />
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Box>
  );
}
