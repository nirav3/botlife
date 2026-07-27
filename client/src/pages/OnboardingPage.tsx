import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import { Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Sex } from '@/types';
import toast from 'react-hot-toast';

// Requesting these scopes only works once the People API is enabled for the
// Google Cloud project and the OAuth consent screen has them added — until
// then Google will reject the request and the button below just falls back
// to manual entry (see onError).
const GOOGLE_PROFILE_SCOPES =
  'https://www.googleapis.com/auth/user.birthday.read https://www.googleapis.com/auth/user.gender.read';

export default function OnboardingPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [sex, setSex] = useState<Sex | ''>('');
  const [loading, setLoading] = useState(false);
  const [prefilling, setPrefilling] = useState(false);

  const prefillFromGoogle = useGoogleLogin({
    flow: 'implicit',
    scope: GOOGLE_PROFILE_SCOPES,
    onSuccess: async (tokenResponse) => {
      setPrefilling(true);
      try {
        const res = await fetch(
          'https://people.googleapis.com/v1/people/me?personFields=birthdays,genders',
          { headers: { Authorization: `Bearer ${tokenResponse.access_token}` } }
        );
        if (!res.ok) throw new Error('People API request failed');
        const data = await res.json();

        const birthday = (data.birthdays as { date?: { year?: number; month?: number; day?: number } }[] | undefined)
          ?.find((b) => b.date?.year && b.date?.month && b.date?.day)?.date;
        const genderValue = (data.genders as { value?: string }[] | undefined)?.[0]?.value;

        let found = false;
        if (birthday) {
          const iso = `${birthday.year}-${String(birthday.month).padStart(2, '0')}-${String(birthday.day).padStart(2, '0')}`;
          setDateOfBirth(iso);
          found = true;
        }
        if (genderValue === 'male') { setSex('MALE'); found = true; }
        else if (genderValue === 'female') { setSex('FEMALE'); found = true; }

        toast[found ? 'success' : 'error'](
          found ? 'Prefilled from your Google account — review before saving' : "Google doesn't have this shared — enter it manually"
        );
      } catch {
        toast.error("Couldn't reach Google — please enter it manually");
      } finally {
        setPrefilling(false);
      }
    },
    onError: () => toast.error('Google permission request failed — please enter it manually'),
  });

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updated = await authApi.updateMe({
        ...(dateOfBirth && { dateOfBirth }),
        ...(sex && { sex }),
      });
      setUser(updated);
      toast.success('Thanks — your suggestions will be a bit smarter now');
      navigate('/');
    } catch {
      toast.error('Something went wrong saving that — please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);
    try {
      const updated = await authApi.updateMe({ onboardingSkipped: true });
      setUser(updated);
    } catch {
      // Non-critical — worst case they see this page again next time.
    } finally {
      setLoading(false);
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="bg-surface rounded-2xl shadow-lg w-full max-w-sm p-8">
        <div className="text-center mb-6">
          <Sparkles className="w-8 h-8 mx-auto text-accent-violet" />
          <h1 className="text-xl font-extrabold text-ink mt-2">Quick and optional</h1>
          <p className="text-muted text-sm mt-1">
            Tell us your birthday and sex and we can suggest a smarter starting weight the first time you try a new exercise. Skip anytime — you can fill this in later.
          </p>
        </div>

        {user?.googleId && (
          <Button
            type="button"
            variant="secondary"
            className="w-full mb-4"
            loading={prefilling}
            onClick={() => prefillFromGoogle()}
          >
            Prefill from Google
          </Button>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Date of birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-ink">Sex</label>
            <select
              value={sex}
              onChange={(e) => setSex(e.target.value as Sex | '')}
              className="border border-line rounded-lg px-3 py-2 text-sm outline-none focus:border-accent-violet focus:ring-2 focus:ring-accent-violet/30 bg-surface text-ink"
            >
              <option value="">Prefer not to say</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </select>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={handleSkip} loading={loading}>
              Skip for now
            </Button>
            <Button type="submit" loading={loading}>
              Save
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
