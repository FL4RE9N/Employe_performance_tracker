import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import AssessmentIcon from '@mui/icons-material/Assessment';
import FeedbackIcon from '@mui/icons-material/Feedback';
import EventIcon from '@mui/icons-material/Event';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useSession } from '../auth/useSession';

interface DueCard {
  title: string;
  description: string;
  icon: React.ReactNode;
  chipLabel: string;
  chipColor: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
}

const DUE_CARDS: DueCard[] = [
  {
    title: 'Reviews to complete',
    description:
      'Self-assessments and mentor reviews that need your attention will appear here.',
    icon: <AssessmentIcon fontSize="large" color="primary" />,
    chipLabel: 'Phase 1',
    chipColor: 'default',
  },
  {
    title: 'Feedback requested of you',
    description:
      'Colleagues who have asked for your feedback will be listed here.',
    icon: <FeedbackIcon fontSize="large" color="secondary" />,
    chipLabel: 'Phase 1',
    chipColor: 'default',
  },
  {
    title: "Mentees' cycles ending",
    description:
      'Upcoming review-cycle deadlines for employees you mentor will surface here.',
    icon: <EventIcon fontSize="large" color="warning" />,
    chipLabel: 'Phase 1',
    chipColor: 'default',
  },
];

export default function DashboardPage() {
  const { data: user } = useSession();

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
        {DUE_CARDS.map((card) => (
          <Grid item xs={12} sm={6} md={4} key={card.title}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'box-shadow 0.2s',
                '&:hover': {
                  boxShadow:
                    '0 4px 20px rgba(0,0,0,0.10), 0 1px 6px rgba(0,0,0,0.06)',
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
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
                  bgcolor="action.hover"
                  borderRadius={2}
                >
                  <CheckCircleOutlineIcon
                    fontSize="small"
                    sx={{ color: 'text.disabled' }}
                  />
                  <Typography variant="body2" color="text.secondary" fontStyle="italic">
                    Nothing due — Phase 1 will populate this
                  </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                  {card.description}
                </Typography>

                <Box mt={2}>
                  <Chip
                    label={card.chipLabel}
                    size="small"
                    color={card.chipColor}
                    variant="outlined"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
