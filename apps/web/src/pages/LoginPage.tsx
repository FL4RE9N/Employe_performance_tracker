import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@perf-tracker/shared';
import type { LoginInput } from '@perf-tracker/shared';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useLogin } from '../auth/useSession';

// Seeded admin: admin@example.com / changeme123

export default function LoginPage() {
  const login = useLogin();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setAuthError(null);
    try {
      await login.mutateAsync(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred.';
      setAuthError(message);
    }
  };

  const pending = isSubmitting || login.isPending;

  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="center"
      minHeight="100vh"
      bgcolor="background.default"
      px={2}
    >
      <Box width="100%" maxWidth={440}>
        {/* Header */}
        <Box textAlign="center" mb={4}>
          <Typography variant="h4" fontWeight={700} color="primary" gutterBottom>
            Performance Tracker
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Sign in to continue to your workspace
          </Typography>
        </Box>

        <Card elevation={0}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" fontWeight={600} mb={3}>
              Sign in
            </Typography>

            {authError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {authError}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleSubmit(onSubmit)}
              noValidate
              display="flex"
              flexDirection="column"
              gap={2.5}
            >
              <TextField
                label="Email address"
                type="email"
                autoComplete="email"
                autoFocus
                fullWidth
                disabled={pending}
                error={!!errors.email}
                helperText={errors.email?.message}
                {...register('email')}
              />

              <TextField
                label="Password"
                type="password"
                autoComplete="current-password"
                fullWidth
                disabled={pending}
                error={!!errors.password}
                helperText={errors.password?.message}
                {...register('password')}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={pending}
                sx={{ mt: 1 }}
                startIcon={
                  pending ? <CircularProgress size={18} color="inherit" /> : null
                }
              >
                {pending ? 'Signing in…' : 'Sign in'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
