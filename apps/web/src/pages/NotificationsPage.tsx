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
import { DIGEST_FREQUENCY_VALUES } from '@perf-tracker/shared';
import type { DigestFrequency, NotificationDto } from '@perf-tracker/shared';
import {
  useNotifications,
  useMarkRead,
  useMarkAllRead,
  useNotificationPreferences,
  useUpdatePreferences,
} from '../notifications/useNotifications';

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
  const isUnread = notification.status === 'unread';

  const handleClick = () => {
    if (isUnread) onMarkRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  return (
    <ListItem
      disablePadding
      sx={{
        backgroundColor: isUnread ? 'action.hover' : 'transparent',
        borderLeft: isUnread ? '3px solid' : '3px solid transparent',
        borderLeftColor: isUnread ? 'primary.main' : 'transparent',
      }}
    >
      <ListItemButton onClick={handleClick} sx={{ py: 1.5 }}>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <Typography
                variant="body2"
                fontWeight={isUnread ? 700 : 400}
                sx={{ flex: 1, mr: 2 }}
              >
                {notification.title}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                {relativeTime(notification.createdAt)}
              </Typography>
            </Box>
          }
          secondary={
            <Typography variant="caption" color="text.secondary">
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
    <Stack spacing={2}>
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
        label="Email notifications"
      />

      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="digest-freq-label">Digest frequency</InputLabel>
        <Select<DigestFrequency>
          labelId="digest-freq-label"
          label="Digest frequency"
          value={prefs.digestFrequency}
          onChange={(e) => {
            updatePrefs.mutate({ digestFrequency: e.target.value as DigestFrequency });
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

      {updatePrefs.isError && (
        <Alert severity="error">Failed to save preferences. Please try again.</Alert>
      )}
    </Stack>
  );
}

export default function NotificationsPage() {
  const { data, isLoading, isError } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      <Stack spacing={3}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h5" fontWeight={700}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Button
              variant="outlined"
              size="small"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              Mark all as read
            </Button>
          )}
        </Box>

        {/* Notification List */}
        <Card variant="outlined">
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {!isLoading && isError && (
            <Box sx={{ p: 3 }}>
              <Alert severity="error">Failed to load notifications. Please refresh.</Alert>
            </Box>
          )}

          {!isLoading && !isError && items.length === 0 && (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" color="text.secondary">
                You have no notifications yet.
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
                  {idx < items.length - 1 && <Divider />}
                </Box>
              ))}
            </List>
          )}
        </Card>

        {/* Preferences */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" fontWeight={600} gutterBottom>
              Notification Preferences
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <PreferencesSection />
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
