import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Home, ClipboardList, Dumbbell, Scale, Salad, TrendingUp, Sun, Moon, X, Menu } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { authApi } from '@/api/auth';
import type { UnitSystem } from '@/types';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/',            label: 'Dashboard',   icon: Home },
  { to: '/plans',       label: 'Plans',        icon: ClipboardList },
  { to: '/workouts',    label: 'Workouts',    icon: Dumbbell },
  { to: '/weight',      label: 'Weight',      icon: Scale },
  { to: '/meals',       label: 'Meals',       icon: Salad },
  { to: '/progression', label: 'Progression', icon: TrendingUp },
];

export default function Layout() {
  const { user, logout, setUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const unitMutation = useMutation({
    mutationFn: (unitSystem: UnitSystem) => authApi.updateMe({ unitSystem }),
    onSuccess: (updatedUser) => {
      setUser(updatedUser);
      // Invalidate all queries so displayed values refresh
      qc.invalidateQueries();
      toast.success(`Switched to ${updatedUser.unitSystem === 'IMPERIAL' ? 'Imperial (lb)' : 'Metric (kg)'}`);
    },
    onError: () => toast.error('Failed to save unit preference'),
  });

  const handleLogout = () => { logout(); navigate('/login'); };

  const isImperial = user?.unitSystem === 'IMPERIAL';

  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const sidebarInner = (
    <>
      {/* Brand — extra top padding clears the notch/status bar on mobile,
          since this drawer is a fixed panel starting at the very top of
          the screen when open; no-op on lg+ (env resolves to 0 there too). */}
      <div className="px-6 py-5 pt-[calc(1.25rem_+_env(safe-area-inset-top))] border-b border-line flex items-center justify-between">
        <span className="text-xl font-extrabold text-ink flex items-center gap-2">
          <Logo className="w-6 h-6" /> BodLife
        </span>
        <button
          onClick={() => setMobileNavOpen(false)}
          className="lg:hidden text-muted hover:text-ink"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-surface-2 text-accent-violet'
                  : 'text-muted hover:bg-surface-2 hover:text-ink'
              }`
            }
          >
            <Icon className="w-[18px] h-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Theme + unit toggle + user */}
      <div className="px-4 py-4 border-t border-line space-y-3">
        {/* Light/dark pill toggle */}
        <div>
          <p className="text-xs text-muted mb-1.5">Theme</p>
          <div className="flex rounded-lg border border-line overflow-hidden text-xs font-medium">
            <button
              onClick={() => theme === 'light' || toggleTheme()}
              className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 transition-colors ${
                theme === 'light' ? 'bg-btn-primary text-btn-primary-text' : 'text-muted hover:bg-surface-2'
              }`}
            >
              <Sun className="w-3.5 h-3.5" /> Light
            </button>
            <button
              onClick={() => theme === 'dark' || toggleTheme()}
              className={`flex-1 py-1.5 flex items-center justify-center gap-1.5 transition-colors ${
                theme === 'dark' ? 'bg-btn-primary text-btn-primary-text' : 'text-muted hover:bg-surface-2'
              }`}
            >
              <Moon className="w-3.5 h-3.5" /> Dark
            </button>
          </div>
        </div>

        {/* Unit system pill toggle */}
        <div>
          <p className="text-xs text-muted mb-1.5">Units</p>
          <div className="flex rounded-lg border border-line overflow-hidden text-xs font-medium">
            <button
              onClick={() => !isImperial || unitMutation.mutate('METRIC')}
              disabled={unitMutation.isPending}
              className={`flex-1 py-1.5 transition-colors ${
                !isImperial
                  ? 'bg-btn-primary text-btn-primary-text'
                  : 'text-muted hover:bg-surface-2'
              }`}
            >
              kg
            </button>
            <button
              onClick={() => isImperial || unitMutation.mutate('IMPERIAL')}
              disabled={unitMutation.isPending}
              className={`flex-1 py-1.5 transition-colors ${
                isImperial
                  ? 'bg-btn-primary text-btn-primary-text'
                  : 'text-muted hover:bg-surface-2'
              }`}
            >
              lb
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted truncate">{user?.email}</p>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => navigate('/onboarding')}
              className="text-xs text-accent-violet hover:underline transition-opacity"
            >
              Edit profile
            </button>
            <button
              onClick={handleLogout}
              className="text-xs text-danger hover:opacity-80 transition-opacity"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-canvas">
      {/* Mobile top bar — only below lg, where the sidebar becomes a drawer.
          pt-[env(...)] pads for the notch/status bar instead of a fixed
          height, so the bar grows on devices that need it and stays 56px
          (h-14) everywhere else. */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-surface border-b border-line pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="text-ink"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-extrabold text-ink flex items-center gap-1.5">
            <Logo className="w-5 h-5" /> BodLife
          </span>
          <span className="w-5" aria-hidden="true" />
        </div>
      </div>

      {/* Backdrop, closes the drawer on tap-outside */}
      {mobileNavOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — static column on lg+, slide-in drawer below it */}
      <aside
        className={`w-56 bg-surface border-r border-line flex flex-col fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:z-auto ${
          mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarInner}
      </aside>

      {/* Main content — top offset matches the mobile bar's actual height
          (56px + safe-area-inset-top), falls back to 0 padding on lg+ where
          there's no fixed bar. Bottom padding clears the home-indicator area
          on devices that have one. */}
      <main className="flex-1 overflow-auto pt-[calc(3.5rem_+_env(safe-area-inset-top))] lg:pt-0 pb-[env(safe-area-inset-bottom)]">
        <Outlet />
      </main>
    </div>
  );
}
