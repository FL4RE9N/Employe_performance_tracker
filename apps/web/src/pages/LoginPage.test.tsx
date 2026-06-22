import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@mui/material/styles';
import LoginPage from './LoginPage';
import theme from '../theme';

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

function renderLoginPage() {
  const queryClient = createTestQueryClient();
  return render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <LoginPage />
        </ThemeProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  it('renders the email field', () => {
    renderLoginPage();
    expect(
      screen.getByRole('textbox', { name: /email address/i }),
    ).toBeInTheDocument();
  });

  it('renders the password field', () => {
    renderLoginPage();
    // password inputs don't get role=textbox; query by label text
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('renders the submit button', () => {
    renderLoginPage();
    expect(
      screen.getByRole('button', { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it('renders the page heading', () => {
    renderLoginPage();
    expect(screen.getByText('Performance Tracker')).toBeInTheDocument();
  });
});
