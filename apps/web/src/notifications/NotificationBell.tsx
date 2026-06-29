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
import { useTheme } from '@mui/material/styles';
import { useNotifications, useMarkRead, useMarkAllRead } from './useNotifications';
import type { NotificationDto } from '@perf-tracker/shared';
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

const RECENT_LIMIT = 10;

export default function NotificationBell() {
  const navigate = useNavigate();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const { data, isLoading } = useNotifications();
  const markRead = useMarkRead();
  const markAllRead = useMarkAllRead();

  const unreadCount = data?.unreadCount ?? 0;
  const recent = (data?.items ?? []).slice(0, RECENT_LIMIT);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) =>
    setAnchorEl(e.currentTarget);
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
            max={99}
            sx={{
              '& .MuiBadge-badge': {
                bgcolor: t.primary,
                color: t.onPrimary,
                fontWeight: 700,
                fontSize: '0.65rem',
                minWidth: 18,
                height: 18,
                padding: '0 4px',
              },
            }}
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
        PaperProps={{
          sx: {
            width: 360,
            maxHeight: 480,
            bgcolor: t.surface,
            border: `1px solid ${t.border}`,
            boxShadow: t.shadowLg,
            borderRadius: 2,
            overflow: 'hidden',
          },
        }}
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
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: t.text }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Box
                sx={{
                  px: 0.75,
                  py: 0.1,
                  borderRadius: '999px',
                  bgcolor: t.primarySoft,
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                <Typography
                  variant="caption"
                  fontWeight={700}
                  sx={{ color: t.primary, fontSize: '0.65rem' }}
                >
                  {unreadCount}
                </Typography>
              </Box>
            )}
          </Box>
          {unreadCount > 0 && (
            <Typography
              variant="caption"
              sx={{
                color: t.primary,
                cursor: 'pointer',
                fontWeight: 600,
                '&:hover': { color: t.primaryHover },
              }}
              onClick={handleMarkAll}
            >
              Mark all read
            </Typography>
          )}
        </Box>
        <Divider sx={{ borderColor: t.border }} />

        {/* Body */}
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {!isLoading && recent.length === 0 && (
          <Box sx={{ px: 2, py: 4, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: t.muted }}>
              Nothing here yet
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: t.faint, display: 'block', mt: 0.5 }}
            >
              Updates on your goals and reviews will appear here
            </Typography>
          </Box>
        )}

        {!isLoading &&
          recent.map((n, idx) => {
            const isUnread = n.status === 'unread';
            return (
              <Box key={n.id}>
                <MenuItem
                  onClick={() => handleItemClick(n)}
                  sx={{
                    alignItems: 'flex-start',
                    gap: 1,
                    py: 1.5,
                    px: 0,
                    whiteSpace: 'normal',
                    backgroundColor: 'transparent',
                    '&:hover': {
                      backgroundColor: isUnread ? t.primarySoft : t.surface2,
                    },
                    borderLeft: '3px solid',
                    borderLeftColor: isUnread ? t.primary : 'transparent',
                    pl: 1.5,
                    pr: 2,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 1,
                        mb: 0.25,
                      }}
                    >
                      <Typography
                        variant="body2"
                        fontWeight={isUnread ? 700 : 400}
                        sx={{
                          color: isUnread ? t.text : t.muted,
                          flex: 1,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {n.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: t.faint,
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                          fontSize: '0.68rem',
                        }}
                      >
                        {relativeTime(n.createdAt)}
                      </Typography>
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        color: t.muted,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {n.body}
                    </Typography>
                  </Box>
                </MenuItem>
                {idx < recent.length - 1 && (
                  <Divider sx={{ borderColor: t.border, mx: 0 }} />
                )}
              </Box>
            );
          })}

        {/* Footer */}
        <Divider sx={{ borderColor: t.border }} />
        <Box sx={{ px: 2, py: 1.25, textAlign: 'center' }}>
          <Typography
            variant="caption"
            sx={{
              color: t.primary,
              cursor: 'pointer',
              fontWeight: 600,
              '&:hover': { color: t.primaryHover },
            }}
            onClick={handleSeeAll}
          >
            See all notifications
          </Typography>
        </Box>
      </Menu>
    </>
  );
}
