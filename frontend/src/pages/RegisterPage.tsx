import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Store, UserPlus } from 'lucide-react';
import { api, extractApiError } from '@/lib/api';
import { useAuth } from '@/stores/authStore';
import type { AuthUser } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters'),
    businessName: z
      .string()
      .trim()
      .min(2, 'Business name must be at least 2 characters'),
    email: z.string().trim().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterValues = z.infer<typeof registerSchema>;

interface RegisterResponse {
  token: string;
  user: AuthUser;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { token, user, setAuth } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      businessName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  if (token && user) {
    return (
      <Navigate
        to={user.role === 'OWNER' ? '/dashboard' : '/pos'}
        replace
      />
    );
  }

  const onSubmit = async (values: RegisterValues) => {
    setSubmitting(true);

    try {
      const { data } = await api.post<RegisterResponse>('/auth/register', {
        name: values.name.trim(),
        businessName: values.businessName.trim(),
        email: values.email.trim().toLowerCase(),
        password: values.password,
      });

      setAuth(data.token, data.user);

      toast.success('Your store is ready');

      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(extractApiError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            'radial-gradient(circle at 30% 20%, hsl(217 91% 60% / 0.10) 0%, transparent 45%), radial-gradient(circle at 70% 80%, hsl(217 91% 60% / 0.06) 0%, transparent 50%)',
        }}
      />

      <div className="relative w-full max-w-md rounded-xl border border-border bg-card/80 backdrop-blur-sm shadow-2xl animate-slide-up">
        <div className="px-8 pt-8 pb-2 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center ring-1 ring-primary/30">
            <Store className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Create your DukaanBook
            </h1>

            <p className="text-sm text-muted-foreground mt-1">
              Set up your store and owner account
            </p>
          </div>
        </div>

        <div className="px-8 pt-6 pb-8">
          <form
            className="space-y-4"
            onSubmit={handleSubmit(onSubmit)}
            autoComplete="off"
          >
            <div className="space-y-1.5">
              <Label htmlFor="register-full-name">Your name</Label>

              <Input
                id="register-full-name"
                type="text"
                autoComplete="off"
                autoCapitalize="words"
                spellCheck={false}
                placeholder="Your full name"
                {...register('name')}
              />

              {errors.name && (
                <p className="text-xs text-destructive">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-business-name">
                Business name
              </Label>

              <Input
                id="register-business-name"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="Your store name"
                {...register('businessName')}
              />

              {errors.businessName && (
                <p className="text-xs text-destructive">
                  {errors.businessName.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-email">Email</Label>

              <Input
                id="register-email"
                type="email"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="you@example.com"
                {...register('email')}
              />

              {errors.email && (
                <p className="text-xs text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-password">Password</Label>

              <Input
                id="register-password"
                type="password"
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
                {...register('password')}
              />

              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="register-confirm-password">
                Confirm password
              </Label>

              <Input
                id="register-confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="Repeat your password"
                {...register('confirmPassword')}
              />

              {errors.confirmPassword && (
                <p className="text-xs text-destructive">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-10"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Spinner className="mr-2" />
                  Creating store…
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Create store
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary font-medium hover:underline underline-offset-4"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}