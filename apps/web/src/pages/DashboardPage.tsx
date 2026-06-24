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
import { useSession } from '../auth/useSession';
import { useCycles } from '../reviews/useReviews';
import { useFeedbackRequests } from '../feedback/useFeedback';

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
      icon: <AssessmentIcon fontSize="large" color="primary" />,
      count: reviewsToComplete.length,
      loading: myCycles.isLoading,
      to: '/reviews',
      cta: 'Open Reviews',
    },
    {
      title: 'Feedback requested of you',
      description: 'Colleagues who have asked for your feedback and are awaiting a reply.',
      icon: <FeedbackIcon fontSize="large" color="secondary" />,
      count: pendingFeedback.length,
      loading: received.isLoading,
      to: '/feedback',
      cta: 'Open Feedback',
    },
    {
      title: "Mentees' cycles in flight",
      description: 'Review cycles for employees you mentor that are not yet closed.',
      icon: <EventIcon fontSize="large" color="warning" />,
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
      <Box mb={4}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          {greeting},{' '}
          <Box component="span" color="primary.main">
            {user?.displayName ?? '…'}
          </Box>
          !
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here is what is on your plate today.
        </Typography>
      </Box>

      {/* What's due section */}
      <Typography variant="h6" fontWeight={600} mb={2}>
        What's due
      </Typography>

      <Grid container spacing={3}>
        {cards.map((card) => {
          const hasItems = card.count > 0;
          return (
            <Grid item xs={12} sm={6} md={4} key={card.title}>
              <Card
                sx={{
                  height: '100%',
                  transition: 'box-shadow 0.2s',
                  '&:hover': {
                    boxShadow:
                      '0 4px 20px rgba(0,0,0,0.10), 0 1px 6px rgba(0,0,0,0.06)',
                  },
                }}
              >
                <CardActionArea
                  onClick={() => navigate(card.to)}
                  sx={{ height: '100%' }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                      {card.icon}
                      <Typography variant="h6" fontWeight={600}>
                        {card.title}
                      </Typography>
                    </Box>

                    <Box
                      display="flex"
                      alignItems="center"
                      gap={1}
                      mb={2}
                      p={1.5}
                      bgcolor={hasItems ? 'action.selected' : 'action.hover'}
                      borderRadius={2}
                    >
                      {hasItems ? (
                        <Chip
                          label={card.count}
                          size="small"
                          color="primary"
                          sx={{ fontWeight: 700 }}
                        />
                      ) : (
                        <CheckCircleOutlineIcon
                          fontSize="small"
                          sx={{ color: 'text.disabled' }}
                        />
                      )}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        fontStyle={hasItems ? 'normal' : 'italic'}
                      >
                        {card.loading
                          ? 'Loading…'
                          : hasItems
                            ? `${card.count} item${card.count > 1 ? 's' : ''} need${card.count > 1 ? '' : 's'} attention`
                            : 'Nothing due — you are all caught up'}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary">
                      {card.description}
                    </Typography>

                    <Box mt={2}>
                      <Chip label={card.cta} size="small" variant="outlined" />
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
