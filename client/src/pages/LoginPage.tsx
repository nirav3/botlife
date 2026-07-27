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

type ResetStep = 'email' | 'answer' | 'newPassword' | 'done';

function ForgotPasswordModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<ResetStep>('email');
  const [email, setEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 1 — look up security question by email
  const handleEmailSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(email);
      if (!res.data.securityQuestion) {
        toast.error('No security question set for this account. Use the CLI script to reset.');
        return;
      }
      setSecurityQuestion(res.data.securityQuestion);
      setStep('answer');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 — verify security answer → receive reset token
  const handleAnswerSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await authApi.verifySecurityAnswer(email, answer);
      setResetToken(res.data.resetToken);
      setStep('newPassword');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? 'Incorrect answer'
        : 'Incorrect answer';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  // Step 3 — set new password using the token
  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await authApi.resetPassword(resetToken, newPassword);
      setStep('done');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? 'Reset failed'
        : 'Reset failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Reset password">
      {/* Step indicator */}
      {step !== 'done' && (
        <div className="flex items-center gap-2 mb-6">
          {(['email', 'answer', 'newPassword'] as ResetStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step === s
                    ? 'bg-btn-primary text-btn-primary-text'
                    : ['answer', 'newPassword'].indexOf(step) > ['answer', 'newPassword'].indexOf(s)
                    ? 'bg-surface-2 text-accent-violet'
                    : 'bg-surface-2 text-muted'
                }`}
              >
                {i + 1}
              </div>
              {i < 2 && <div className="flex-1 h-px bg-line w-8" />}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Email */}
      {step === 'email' && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <p className="text-sm text-muted">Enter your email and we'll retrieve your security question.</p>
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
            <Button type="submit" loading={loading}>Continue</Button>
          </div>
        </form>
      )}

      {/* Step 2: Security answer */}
      {step === 'answer' && (
        <form onSubmit={handleAnswerSubmit} className="space-y-4">
          <div className="bg-surface-2 rounded-lg px-4 py-3">
            <p className="text-xs text-muted uppercase tracking-wide font-medium mb-1">Security question</p>
            <p className="text-sm font-medium text-ink">{securityQuestion}</p>
          </div>
          <Input
            label="Your answer"
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Answer is case-insensitive"
            required
            autoFocus
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setStep('email')}>Back</Button>
            <Button type="submit" loading={loading}>Verify</Button>
          </div>
        </form>
      )}

      {/* Step 3: New password */}
      {step === 'newPassword' && (
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <p className="text-sm text-muted">Almost there — set your new password. This link expires in 15 minutes.</p>
          <Input
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Min 8 characters"
            required
            autoFocus
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            required
          />
          <div className="flex gap-3 justify-end">
            <Button variant="secondary" type="button" onClick={() => setStep('answer')}>Back</Button>
            <Button type="submit" loading={loading}>Reset password</Button>
          </div>
        </form>
      )}

      {/* Done */}
      {step === 'done' && (
        <div className="text-center py-4 space-y-4">
          <CheckCircle2 className="w-12 h-12 mx-auto text-accent-lime" />
          <p className="font-semibold text-ink">Password reset!</p>
          <p className="text-sm text-muted">You can now sign in with your new password.</p>
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
