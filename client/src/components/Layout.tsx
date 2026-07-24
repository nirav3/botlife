import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { authApi } from '@/api/auth';
import type { UnitSystem } from '@/types';
import toast from 'react-hot-toast';

const navItems = [
  { to: '/',            label: 'Dashboard',   icon: '🏠' },
  { to: '/plans',       label: 'Plans',        icon: '📋' },
  { to: '/workouts',    label: 'Workouts',    icon: '🏋️' },
  { to: '/weight',      label: 'Weight',      icon: '⚖️' },
  { to: '/meals',       label: 'Meals',       icon: '🥗' },
  { to: '/progression', label: 'Progression', icon: '📈' },
];

export default function Layout() {
  const { user, logout, setUser } = useAuth();
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
      <div className="px-6 py-5 pt-[calc(1.25rem_+_env(safe-area-inset-top))] border-b border-gray-100 flex items-center justify-between">
        <span className="text-xl font-bold text-brand-600">💪 BotLife</span>
        <button
          onClick={() => setMobileNavOpen(false)}
          className="lg:hidden text-gray-400 hover:text-gray-600 text-xl leading-none"
          aria-label="Close menu"
        >
          ✕
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => setMobileNavOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <span>{icon}</span>
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Unit toggle + user */}
      <div className="px-4 py-4 border-t border-gray-100 space-y-3">
        {/* Unit system pill toggle */}
        <div>
          <p className="text-xs text-gray-400 mb-1.5">Units</p>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            <button
              onClick={() => !isImperial || unitMutation.mutate('METRIC')}
              disabled={unitMutation.isPending}
              className={`flex-1 py-1.5 transition-colors ${
                !isImperial
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              kg
            </button>
            <button
              onClick={() => isImperial || unitMutation.mutate('IMPERIAL')}
              disabled={unitMutation.isPending}
              className={`flex-1 py-1.5 transition-colors ${
                isImperial
                  ? 'bg-brand-600 text-white'
                  : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              lb
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          <button
            onClick={handleLogout}
            className="mt-1 text-xs text-red-500 hover:text-red-700 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Mobile top bar — only below lg, where the sidebar becomes a drawer.
          pt-[env(...)] pads for the notch/status bar instead of a fixed
          height, so the bar grows on devices that need it and stays 56px
          (h-14) everywhere else. */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 bg-white border-b border-gray-200 pt-[env(safe-area-inset-top)]">
        <div className="flex items-center justify-between px-4 h-14">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="text-gray-600 text-xl leading-none"
            aria-label="Open menu"
          >
            ☰
          </button>
          <span className="font-bold text-brand-600">💪 BotLife</span>
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
        className={`w-56 bg-white border-r border-gray-200 flex flex-col fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-out lg:static lg:translate-x-0 lg:z-auto ${
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
