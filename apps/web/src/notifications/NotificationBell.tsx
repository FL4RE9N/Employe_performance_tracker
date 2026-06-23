import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useNotifications, useMarkRead, useMarkAllRead } from './useNotifications';
import type { NotificationDto } from '@perf-tracker/shared';

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const RECENT_LIMIT = 10;

export default function NotificationBell() {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = data?.unreadCount ?? 0;
  const recent = (data?.items ?? []).slice(0, RECENT_LIMIT);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleItemClick = (notification: NotificationDto) => {
    if (notification.status === 'unread') {
      markRead.mutate(notification.id);
    }
    handleClose();
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAll = () => {
    markAllRead.mutate();
  };

  const handleSeeAll = () => {
    handleClose();
    navigate('/notifications');
  };

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton
          color="inherit"
          aria-label="notifications"
          onClick={handleOpen}
          size="small"
          sx={{ mr: 0.5 }}
        >
          <Badge
            badgeContent={unreadCount > 0 ? unreadCount : undefined}
            color="error"
            max={99}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        PaperProps={{ sx: { width: 360, maxHeight: 480 } }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Typography variant="subtitle1" fontWeight={700}>
            Notifications
          </Typography>
          {unreadCount > 0 && (
            <Typography
              variant="caption"
              color="primary"
              sx={{ cursor: 'pointer', fontWeight: 600 }}
              onClick={handleMarkAll}
            >
              Mark all read
            </Typography>
          )}
        </Box>
        <Divider />

        {/* Body */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!isLoading && recent.length === 0 && (
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        )}

        {!isLoading &&
          recent.map((n) => (
            <MenuItem
              key={n.id}
              onClick={() => handleItemClick(n)}
              sx={{
                alignItems: 'flex-start',
                gap: 1,
                py: 1.5,
                px: 2,
                backgroundColor:
                  n.status === 'unread' ? 'action.hover' : 'transparent',
                whiteSpace: 'normal',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  fontWeight={n.status === 'unread' ? 700 : 400}
                  noWrap
                >
                  {n.title}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {n.body}
                </Typography>
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {relativeTime(n.createdAt)}
              </Typography>
            </MenuItem>
          ))}

        {/* Footer */}
        <Divider />
        <Box sx={{ px: 2, py: 1, textAlign: 'center' }}>
          <Typography
            variant="caption"
            color="primary"
            sx={{ cursor: 'pointer', fontWeight: 600 }}
            onClick={handleSeeAll}
          >
            See all notifications
          </Typography>
        </Box>
      </Menu>
    </>
  );
}
