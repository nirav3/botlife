import { useState, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import axios from 'axios';

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your primary school?",
  "What was the make of your first car?",
  "What is your oldest sibling's middle name?",
];

export default function RegisterPage() {
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credential?: string) => {
    if (!credential) { toast.error('Google sign-in failed'); return; }
    try {
      await loginWithGoogle(credential);
      navigate('/');
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? 'Google sign-in failed'
        : 'Google sign-in failed';
      toast.error(msg);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (!securityAnswer.trim()) { toast.error('Please provide a security answer'); return; }
    setLoading(true);
    try {
      await register(name, email, password, securityQuestion, securityAnswer);
      navigate('/onboarding'); // brand-new account — always ask once
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? (err.response?.data as { error?: string })?.error ?? 'Registration failed'
        : 'Registration failed';
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
          <h1 className="text-2xl font-extrabold text-ink mt-2">Create account</h1>
          <p className="text-muted text-sm mt-1">Start tracking your lifestyle</p>
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
            label="Name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 characters"
            required
          />

          {/* Security question section */}
          <div className="pt-2 border-t border-line">
            <p className="text-xs text-muted mb-3">
              Set a security question to recover your account if you forget your password.
            </p>
            <div className="flex flex-col gap-1 mb-3">
              <label className="text-sm font-medium text-ink">Security question</label>
              <select
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                className="border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/30 bg-surface text-ink"
              >
                {SECURITY_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
            <Input
              label="Your answer"
              type="text"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              placeholder="Answer is case-insensitive"
              required
            />
          </div>

          <Button type="submit" loading={loading} className="w-full" size="lg">
            Create account
          </Button>
        </form>

        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent-violet hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
