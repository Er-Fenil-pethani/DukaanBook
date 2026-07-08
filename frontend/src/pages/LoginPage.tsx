import { useState } from 'react';
import {
  useNavigate,
  Navigate,
  Link,
} from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Store, LogIn } from 'lucide-react';
import { api, extractApiError } from '@/lib/api';
import { useAuth } from '@/stores/authStore';
import type { AuthUser } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email('Invalid email address'),

  password: z
    .string()
    .min(1, 'Password is required'),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();

  const {
    token,
    user,
    setAuth,
  } = useAuth();

  const [submitting, setSubmitting] =
    useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: '',
      password: '',
    },
  });

  if (token && user) {
    return (
      <Navigate
        to={
          user.role === 'OWNER'
            ? '/dashboard'
            : '/pos'
        }
        replace
      />
    );
  }

  const onSubmit = async (
    values: LoginValues
  ) => {
    setSubmitting(true);

    try {
      const { data } = await api.post<{
        token: string;
        user: AuthUser;
      }>('/auth/login', {
        email: values.email
          .trim()
          .toLowerCase(),

        password: values.password,
      });

      setAuth(data.token, data.user);

      toast.success(
        `Welcome back, ${data.user.name}`
      );

      navigate(
        data.user.role === 'OWNER'
          ? '/dashboard'
          : '/pos',
        {
          replace: true,
        }
      );
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
            'radial-gradient(circle at 30% 20%, hsl(160 84% 39% / 0.10) 0%, transparent 45%), radial-gradient(circle at 70% 80%, hsl(160 84% 39% / 0.06) 0%, transparent 50%)',
        }}
      />

      <div className="relative w-full max-w-md rounded-xl border border-border bg-card/80 backdrop-blur-sm shadow-2xl animate-slide-up">
        <div className="px-8 pt-8 pb-2 text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-xl overflow-hidden flex items-center justify-center">
            <img
              src="/dukaanbook-logo.png"
              alt="DukaanBook"
              className="h-12 w-12 rounded-xl object-cover"
            />
          </div>

          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              DukaanBook
            </h1>

            <p className="text-sm text-muted-foreground mt-1">
              Sign in to manage your store
            </p>
          </div>
        </div>

        <div className="px-8 pt-6 pb-8">
          <form
            className="space-y-4"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="space-y-1.5">
              <Label htmlFor="login-email">
                Email
              </Label>

              <Input
                id="login-email"
                type="email"
                autoComplete="username"
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
              <Label htmlFor="login-password">
                Password
              </Label>

              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                {...register('password')}
              />

              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
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
                  Signing in…
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign in
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            New to DukaanBook?{' '}
            <Link
              to="/register"
              className="text-primary font-medium hover:underline underline-offset-4"
            >
              Create your store
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}