import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createUserSchema,
  updateUserSchema,
  createPairingSchema,
  ROLE_VALUES,
} from '@perf-tracker/shared';
import type {
  AdminUserDto,
  CreateUserInput,
  UpdateUserInput,
  CreatePairingInput,
} from '@perf-tracker/shared';

import Alert from '@mui/material/Alert';
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
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import BarChartIcon from '@mui/icons-material/BarChart';
import EditIcon from '@mui/icons-material/Edit';
import LinkOffIcon from '@mui/icons-material/LinkOff';

import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  usePairings,
  useCreatePairing,
  useClosePairing,
} from '../admin/useAdminUsers';

// ---- Helpers ----------------------------------------------------------------

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An unexpected error occurred.';
}

// ---- New User Dialog --------------------------------------------------------

interface NewUserDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function NewUserDialog({ open, onClose, onSuccess }: NewUserDialogProps) {
  const createUser = useCreateUser();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'user' },
  });

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: CreateUserInput) => {
    setApiError(null);
    try {
      await createUser.mutateAsync(data);
      reset();
      onSuccess(`User ${data.email} created.`);
      onClose();
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const pending = isSubmitting || createUser.isPending;

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>New User</DialogTitle>
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <DialogContent>
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}
          <Box display="flex" flexDirection="column" gap={2.5} pt={0.5}>
            <TextField
              label="Email address"
              type="email"
              autoComplete="off"
              fullWidth
              disabled={pending}
              error={!!errors.email}
              helperText={errors.email?.message}
              {...register('email')}
            />
            <TextField
              label="Display name"
              fullWidth
              disabled={pending}
              error={!!errors.displayName}
              helperText={errors.displayName?.message}
              {...register('displayName')}
            />
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.role} disabled={pending}>
                  <InputLabel id="new-user-role-label">Role</InputLabel>
                  <Select {...field} labelId="new-user-role-label" label="Role">
                    {ROLE_VALUES.map((r) => (
                      <MenuItem key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.role && (
                    <FormHelperText>{errors.role.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
            <TextField
              label="Password"
              type="password"
              autoComplete="new-password"
              fullWidth
              disabled={pending}
              error={!!errors.password}
              helperText={errors.password?.message}
              {...register('password')}
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
              pending ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {pending ? 'Creating…' : 'Create'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ---- Edit User Dialog -------------------------------------------------------

interface EditUserDialogProps {
  user: AdminUserDto | null;
  onClose: () => void;
  onSuccess: (msg: string) => void;
}

function EditUserDialog({ user, onClose, onSuccess }: EditUserDialogProps) {
  const updateUser = useUpdateUser();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    values: user ? { role: user.role, isActive: user.isActive } : {},
  });

  const handleClose = () => {
    reset();
    setApiError(null);
    onClose();
  };

  const onSubmit = async (data: UpdateUserInput) => {
    if (!user) return;
    setApiError(null);
    try {
      await updateUser.mutateAsync({ id: user.id, data });
      onSuccess(`User ${user.email} updated.`);
      onClose();
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const pending = isSubmitting || updateUser.isPending;

  return (
    <Dialog open={!!user} onClose={handleClose} fullWidth maxWidth="xs">
      <DialogTitle>Edit User — {user?.email}</DialogTitle>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          {apiError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {apiError}
            </Alert>
          )}
          <Box display="flex" flexDirection="column" gap={2.5} pt={0.5}>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <FormControl fullWidth error={!!errors.role} disabled={pending}>
                  <InputLabel id="edit-user-role-label">Role</InputLabel>
                  <Select {...field} labelId="edit-user-role-label" label="Role">
                    {ROLE_VALUES.map((r) => (
                      <MenuItem key={r} value={r}>
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.role && (
                    <FormHelperText>{errors.role.message}</FormHelperText>
                  )}
                </FormControl>
              )}
            />
            <Box display="flex" alignItems="center" gap={1}>
              <Typography variant="body2" sx={{ flexGrow: 1 }}>
                Active
              </Typography>
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value ?? true}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={pending}
                  />
                )}
              />
            </Box>
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
              pending ? <CircularProgress size={16} color="inherit" /> : null
            }
          >
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

// ---- New Pairing Form -------------------------------------------------------

interface NewPairingFormProps {
  onSuccess: (msg: string) => void;
}

function NewPairingForm({ onSuccess }: NewPairingFormProps) {
  const { data: users = [] } = useUsers();
  const createPairing = useCreatePairing();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreatePairingInput>({
    resolver: zodResolver(createPairingSchema),
    defaultValues: { mentorId: '', menteeId: '' },
  });

  const onSubmit = async (data: CreatePairingInput) => {
    setApiError(null);
    try {
      await createPairing.mutateAsync(data);
      reset();
      onSuccess('Pairing created.');
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  };

  const pending = isSubmitting || createPairing.isPending;
  const activeUsers = users.filter((u) => u.isActive);

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      display="flex"
      flexDirection="column"
      gap={2}
    >
      {apiError && (
        <Alert severity="error" onClose={() => setApiError(null)}>
          {apiError}
        </Alert>
      )}
      <Box display="flex" gap={2} flexWrap="wrap">
        <Controller
          name="mentorId"
          control={control}
          render={({ field }) => (
            <FormControl
              sx={{ flex: '1 1 200px', minWidth: 180 }}
              error={!!errors.mentorId}
              disabled={pending}
            >
              <InputLabel id="mentor-select-label">Mentor</InputLabel>
              <Select {...field} labelId="mentor-select-label" label="Mentor">
                <MenuItem value="">
                  <em>Select mentor</em>
                </MenuItem>
                {activeUsers.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.displayName} ({u.email})
                  </MenuItem>
                ))}
              </Select>
              {errors.mentorId && (
                <FormHelperText>{errors.mentorId.message}</FormHelperText>
              )}
            </FormControl>
          )}
        />
        <Controller
          name="menteeId"
          control={control}
          render={({ field }) => (
            <FormControl
              sx={{ flex: '1 1 200px', minWidth: 180 }}
              error={!!errors.menteeId}
              disabled={pending}
            >
              <InputLabel id="mentee-select-label">Mentee</InputLabel>
              <Select {...field} labelId="mentee-select-label" label="Mentee">
                <MenuItem value="">
                  <em>Select mentee</em>
                </MenuItem>
                {activeUsers.map((u) => (
                  <MenuItem key={u.id} value={u.id}>
                    {u.displayName} ({u.email})
                  </MenuItem>
                ))}
              </Select>
              {errors.menteeId && (
                <FormHelperText>{errors.menteeId.message}</FormHelperText>
              )}
            </FormControl>
          )}
        />
        <Box display="flex" alignItems="flex-start" pt={0.5}>
          <Button
            type="submit"
            variant="contained"
            disabled={pending}
            startIcon={
              pending ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <AddIcon />
              )
            }
          >
            {pending ? 'Creating…' : 'Create pairing'}
          </Button>
        </Box>
      </Box>
      {errors.root && (
        <Alert severity="error">{errors.root.message}</Alert>
      )}
    </Box>
  );
}

// ---- Main Page --------------------------------------------------------------

export default function AdminUsersPage() {
  const { data: users = [], isLoading: usersLoading, error: usersError } = useUsers();
  const { data: pairings = [], isLoading: pairingsLoading, error: pairingsError } = usePairings();
  const closePairing = useClosePairing();

  const [newUserOpen, setNewUserOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserDto | null>(null);
  const [snackMsg, setSnackMsg] = useState<string | null>(null);
  const [closeError, setCloseError] = useState<string | null>(null);

  const handleClosePairing = async (id: string) => {
    setCloseError(null);
    try {
      await closePairing.mutateAsync(id);
      setSnackMsg('Pairing closed.');
    } catch (err) {
      setCloseError(getErrorMessage(err));
    }
  };

  return (
    <Box>
      {/* Page header */}
      <Box mb={4} display="flex" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box flex={1}>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Admin — Users &amp; Pairings
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage user accounts, roles, and mentor-mentee pairings.
          </Typography>
        </Box>
        <Button
          component={RouterLink}
          to="/admin/dashboard"
          startIcon={<BarChartIcon />}
          variant="outlined"
          size="small"
          sx={{ mt: 0.5, flexShrink: 0 }}
        >
          View dashboard
        </Button>
      </Box>

      {/* ---- Users section ---- */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
            mb={2}
          >
            <Typography variant="h6" fontWeight={600}>
              Users
            </Typography>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={() => setNewUserOpen(true)}
            >
              New user
            </Button>
          </Box>

          {usersError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getErrorMessage(usersError)}
            </Alert>
          )}

          {usersLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Active</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No users found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    users.map((user) => (
                      <TableRow key={user.id} hover>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.displayName}</TableCell>
                        <TableCell>
                          <Chip
                            label={user.role}
                            size="small"
                            color={user.role === 'admin' ? 'primary' : 'default'}
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={user.isActive ? 'Active' : 'Inactive'}
                            size="small"
                            color={user.isActive ? 'success' : 'default'}
                            variant={user.isActive ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit role / active">
                            <IconButton
                              size="small"
                              onClick={() => setEditUser(user)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ---- Pairings section ---- */}
      <Card>
        <CardContent sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight={600} mb={2}>
            Mentor-Mentee Pairings
          </Typography>

          <NewPairingForm onSuccess={(msg) => setSnackMsg(msg)} />

          <Divider sx={{ my: 3 }} />

          {pairingsError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {getErrorMessage(pairingsError)}
            </Alert>
          )}

          {closeError && (
            <Alert
              severity="error"
              sx={{ mb: 2 }}
              onClose={() => setCloseError(null)}
            >
              {closeError}
            </Alert>
          )}

          {pairingsLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Mentor</TableCell>
                    <TableCell>Mentee</TableCell>
                    <TableCell>Effective From</TableCell>
                    <TableCell>Effective To</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pairings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No pairings found.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pairings.map((pairing) => (
                      <TableRow key={pairing.id} hover>
                        <TableCell>{pairing.mentorName}</TableCell>
                        <TableCell>{pairing.menteeName}</TableCell>
                        <TableCell>{pairing.effectiveFrom}</TableCell>
                        <TableCell>
                          {pairing.effectiveTo ?? (
                            <Chip
                              label="Open"
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                          )}
                        </TableCell>
                        <TableCell align="right">
                          {pairing.effectiveTo === null && (
                            <Tooltip title="Close pairing">
                              <IconButton
                                size="small"
                                color="warning"
                                onClick={() => handleClosePairing(pairing.id)}
                                disabled={closePairing.isPending}
                              >
                                <LinkOffIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* ---- Dialogs ---- */}
      <NewUserDialog
        open={newUserOpen}
        onClose={() => setNewUserOpen(false)}
        onSuccess={(msg) => setSnackMsg(msg)}
      />
      <EditUserDialog
        user={editUser}
        onClose={() => setEditUser(null)}
        onSuccess={(msg) => setSnackMsg(msg)}
      />

      {/* ---- Success snackbar ---- */}
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
