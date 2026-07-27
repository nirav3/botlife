import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { CheckCircle2 } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import axios from 'axios';

// ─── Reset password modal ─────────────────────────────────────────────────────
// Single step: hand over an email, get a generic acknowledgement back. The
// actual reset happens on the /reset-password page linked from the email —
// this modal never learns whether the account exists.

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSent(true);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Reset password">
      {!sent ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-muted">
            Enter your email and, if you have an account, we'll send a link to reset your password.
          </p>
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={loading}>Send reset link</Button>
          </div>
        </form>
      ) : (
        <div className="text-center py-4 space-y-4">
          <CheckCircle2 className="w-12 h-12 mx-auto text-accent-lime" />
          <p className="font-semibold text-ink">Check your email</p>
          <p className="text-sm text-muted">
            If an account exists for {email}, a reset link is on its way. It expires in 15 minutes.
          </p>
          <Button onClick={onClose} className="w-full">Back to login</Button>
        </div>
      )}
    </Modal>
  );
}

// ─── Login page ───────────────────────────────────────────────────────────────

// A returning user who already filled this in (or explicitly skipped it)
// goes straight to the dashboard; anyone else gets one more chance to see it.
function postLoginPath(user: { dateOfBirth?: string | null; sex?: string | null; onboardingSkipped?: boolean }): string {
  return !user.dateOfBirth && !user.sex && !user.onboardingSkipped ? '/onboarding' : '/';
}

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(postLoginPath(user));
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? 'Login failed'
        : 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential?: string) => {
    if (!credential) { toast.error('Google sign-in failed'); return; }
    try {
      const user = await loginWithGoogle(credential);
      navigate(postLoginPath(user));
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? 'Google sign-in failed'
        : 'Google sign-in failed';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <Logo className="w-10 h-10 mx-auto text-ink" />
          <h1 className="text-2xl font-extrabold text-ink mt-2">BodLife</h1>
          <p className="text-muted text-sm mt-1">Sign in to your account</p>
        </div>

        <div className="flex justify-center mb-6">
          <GoogleLogin
            onSuccess={(res) => handleGoogleSuccess(res.credential)}
            onError={() => toast.error('Google sign-in failed')}
          />
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-line" />
          <span className="text-xs text-muted uppercase tracking-wide">or</span>
          <div className="flex-1 h-px bg-line" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoFocus
          />
          <div className="space-y-1">
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="text-xs text-accent-violet hover:underline"
              >
                Forgot password?
              </button>
            </div>
          </div>
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent-violet hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>

      {showReset && <ForgotPasswordModal onClose={() => setShowReset(false)} />}
    </div>
  );
}
