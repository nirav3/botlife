import { useState, useEffect, FormEvent } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { authApi } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import axios from 'axios';

type LinkState = 'checking' | 'valid' | 'invalid' | 'google';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [linkState, setLinkState] = useState<LinkState>('checking');
  const [securityQuestion, setSecurityQuestion] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  // The token is only ever valid because it came from the emailed link, so
  // it's safe to reveal the security question (if any) at this point.
  useEffect(() => {
    if (!token) { setLinkState('invalid'); return; }
    authApi
      .getResetQuestion(token)
      .then((res) => {
        if (res.data.requiresGoogleSignIn) { setLinkState('google'); return; }
        setSecurityQuestion(res.data.securityQuestion);
        setLinkState('valid');
      })
      .catch(() => setLinkState('invalid'));
  }, [token]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (securityQuestion && !answer.trim()) { toast.error('Please answer your security question'); return; }

    setLoading(true);
    try {
      await authApi.resetPassword(token, newPassword, securityQuestion ? answer : undefined);
      setDone(true);
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
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <Logo className="w-10 h-10 mx-auto text-ink" />
          <h1 className="text-2xl font-extrabold text-ink mt-2">Reset password</h1>
        </div>

        {linkState === 'checking' && (
          <p className="text-center text-sm text-muted">Checking your link…</p>
        )}

        {linkState === 'invalid' && (
          <div className="text-center py-2 space-y-4">
            <XCircle className="w-12 h-12 mx-auto text-danger" />
            <p className="font-semibold text-ink">This link is invalid or has expired</p>
            <p className="text-sm text-muted">Reset links are only good for 15 minutes. Request a new one from the login page.</p>
            <Link to="/login">
              <Button className="w-full">Back to login</Button>
            </Link>
          </div>
        )}

        {linkState === 'google' && (
          <div className="text-center py-2 space-y-4">
            <Info className="w-12 h-12 mx-auto text-accent-violet" />
            <p className="font-semibold text-ink">This account uses Google sign-in</p>
            <p className="text-sm text-muted">There's no password to reset — sign in with the "Sign in with Google" button on the login page instead.</p>
            <Link to="/login">
              <Button className="w-full">Back to login</Button>
            </Link>
          </div>
        )}

        {linkState === 'valid' && !done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {securityQuestion && (
              <>
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
              </>
            )}
            <Input
              label="New password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min 8 characters"
              required
              autoFocus={!securityQuestion}
            />
            <Input
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat new password"
              required
            />
            <Button type="submit" loading={loading} className="w-full" size="lg">
              Reset password
            </Button>
          </form>
        )}

        {done && (
          <div className="text-center py-2 space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-accent-lime" />
            <p className="font-semibold text-ink">Password reset!</p>
            <p className="text-sm text-muted">You can now sign in with your new password.</p>
            <Link to="/login">
              <Button className="w-full">Back to login</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
