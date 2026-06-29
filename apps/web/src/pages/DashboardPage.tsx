import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FeedbackIcon from '@mui/icons-material/Feedback';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@mui/material/styles';
import { useSession } from '../auth/useSession';
import { useCycles } from '../reviews/useReviews';
import { useFeedbackRequests } from '../feedback/useFeedback';
import { TOKENS } from '../theme';

interface DueCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  loading: boolean;
  to: string;
  cta: string;
}

export default function DashboardPage() {
  const { data: user } = useSession();
  const navigate = useNavigate();
  const theme = useTheme();
  const t = TOKENS[theme.palette.mode];

  // Cycles I'm part of (as mentee or mentor) + cycles I mentor.
  const myCycles = useCycles();
  const menteeCycles = useCycles('mentee');
  const received = useFeedbackRequests('received');

  const uid = user?.id;

  // Reviews needing MY assessment right now.
  const reviewsToComplete = (myCycles.data ?? []).filter(
    (c) =>
      (c.menteeId === uid && c.status === 'self_assessment_open') ||
      (c.mentorId === uid && c.status === 'mentor_assessment_open'),
  );

  // Feedback others asked of me, still pending.
  const pendingFeedback = (received.data ?? []).filter((r) => r.status === 'pending');

  // My mentees' cycles that are still in flight (need attention before close).
  const TERMINAL = ['closed', 'acknowledged'];
  const menteesEnding = (menteeCycles.data ?? []).filter(
    (c) => !TERMINAL.includes(c.status),
  );

  const cards: DueCard[] = [
    {
      title: 'Reviews to complete',
      description:
        'Self-assessments and mentor reviews that need your attention right now.',
      icon: <AssessmentIcon sx={{ fontSize: 22, color: t.primary }} />,
      count: reviewsToComplete.length,
      loading: myCycles.isLoading,
      to: '/reviews',
      cta: 'Open Reviews',
    },
    {
      title: 'Feedback requested of you',
      description: 'Colleagues who have asked for your feedback and are awaiting a reply.',
      icon: <FeedbackIcon sx={{ fontSize: 22, color: t.violet }} />,
      count: pendingFeedback.length,
      loading: received.isLoading,
      to: '/feedback',
      cta: 'Open Feedback',
    },
    {
      title: "Mentees' cycles in flight",
      description: 'Review cycles for employees you mentor that are not yet closed.',
      icon: <EventIcon sx={{ fontSize: 22, color: t.amber }} />,
      count: menteesEnding.length,
      loading: menteeCycles.isLoading,
      to: '/reviews',
      cta: 'Open Reviews',
    },
  ];

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <Box>
      {/* Greeting */}
      <Box mb={5}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ color: t.text }}>
          {greeting},{' '}
          <Box component="span" sx={{ color: t.primary }}>
            {user?.displayName ?? '…'}
          </Box>
          .
        </Typography>
        <Typography variant="body1" sx={{ color: t.muted }}>
          Here is what needs your attention today.
        </Typography>
      </Box>

      {/* What's due section */}
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
        What&apos;s due
      </Typography>

      <Grid container spacing={2.5}>
        {cards.map((card) => {
          const hasItems = card.count > 0;
          return (
            <Grid item xs={12} sm={6} md={4} key={card.title}>
              <Card
                sx={{
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'box-shadow 0.18s ease, transform 0.18s ease',
                  '&:hover': {
                    boxShadow: t.shadowMd,
                    transform: 'translateY(-1px)',
                  },
                  // Left accent bar — present only when items are due
                  '&::before': hasItems
                    ? {
                        content: '""',
                        position: 'absolute',
                        inset: '0 auto 0 0',
                        width: 3,
                        borderRadius: '16px 0 0 16px',
                        bgcolor: t.primary,
                      }
                    : {},
                }}
              >
                <CardActionArea
                  onClick={() => navigate(card.to)}
                  sx={{ height: '100%', alignItems: 'flex-start' }}
                >
                  <CardContent sx={{ p: 3, height: '100%', boxSizing: 'border-box' }}>
                    {/* Card header: icon + title */}
                    <Box display="flex" alignItems="center" gap={1.25} mb={2.5}>
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          borderRadius: '10px',
                          bgcolor: t.surface2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {card.icon}
                      </Box>
                      <Typography
                        variant="subtitle2"
                        fontWeight={600}
                        sx={{ color: t.text, lineHeight: 1.3 }}
                      >
                        {card.title}
                      </Typography>
                    </Box>

                    {/* Count row */}
                    <Box display="flex" alignItems="center" gap={1.25} mb={2}>
                      {hasItems ? (
                        <Chip
                          label={card.count}
                          size="small"
                          sx={{
                            bgcolor: t.primarySoft,
                            color: t.primary,
                            fontWeight: 700,
                            fontSize: '0.78rem',
                            height: 22,
                            minWidth: 28,
                          }}
                        />
                      ) : (
                        <CheckCircleOutlineIcon
                          sx={{ fontSize: 18, color: t.faint, flexShrink: 0 }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        sx={{
                          color: hasItems ? t.text : t.muted,
                          fontStyle: hasItems ? 'normal' : 'italic',
                          fontSize: '0.82rem',
                        }}
                      >
                        {card.loading
                          ? 'Loading…'
                          : hasItems
                            ? `${card.count} item${card.count > 1 ? 's' : ''} need${card.count > 1 ? '' : 's'} attention`
                            : 'Nothing due — all caught up'}
                      </Typography>
                    </Box>

                    {/* Description */}
                    <Typography
                      variant="body2"
                      sx={{ color: t.muted, fontSize: '0.82rem', lineHeight: 1.55 }}
                    >
                      {card.description}
                    </Typography>

                    {/* CTA chip */}
                    <Box mt={2.5}>
                      <Chip
                        label={card.cta}
                        size="small"
                        sx={{
                          bgcolor: hasItems ? t.primarySoft : t.surface2,
                          color: hasItems ? t.primary : t.muted,
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          height: 24,
                          cursor: 'pointer',
                        }}
                      />
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
