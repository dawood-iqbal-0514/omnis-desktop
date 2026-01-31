import React from 'react';
import { ButtonPlain } from '../components/Button';
import { Dropdown } from '../components/Dropdown';
import useThemeStore from '../store/themeStore';
import useAuthStore from '../store/authStore';

const Settings = () => {
  const theme = useThemeStore((state) => state.theme);
  const setTheme = useThemeStore((state) => state.setTheme);
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const themeOptions = [
    { value: 'dark', label: 'Dark' },
    { value: 'light', label: 'Light' },
  ];

  const currentTheme = themeOptions.find((opt) => opt.value === theme);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Settings</h1>
        <p className="text-text-secondary">Manage your application settings and preferences</p>
      </div>

      <div className="space-y-6">
        <div className="bg-[var(--color-base-background-light)] rounded-lg p-6 border border-border-muted">
          <h2 className="text-xl font-semibold text-text-primary mb-4">General</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-text-secondary text-sm mb-2">Application Theme</label>
              <Dropdown
                options={themeOptions}
                value={currentTheme}
                onChange={(selected) => setTheme(selected.value)}
                placeholder="Select theme..."
                isSearchable={false}
              />
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-base-background-light)] rounded-lg p-6 border border-border-muted">
          <h2 className="text-xl font-semibold text-text-primary mb-4">Account</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-text-secondary text-sm mb-2">Email</label>
              <p className="text-text-primary">{user?.email || 'Not set'}</p>
            </div>
            <div>
              <label className="block text-text-secondary text-sm mb-2">Subscription Status</label>
              <p className="text-text-primary">Free Plan</p>
            </div>
            <div className="flex gap-3">
              <ButtonPlain variant="outline">Upgrade Plan</ButtonPlain>
              <ButtonPlain variant="outline" onClick={logout}>
                Sign Out
              </ButtonPlain>
            </div>
          </div>
        </div>

        <div className="bg-[var(--color-base-background-light)] rounded-lg p-6 border border-border-muted">
          <h2 className="text-xl font-semibold text-text-primary mb-4">About</h2>
          <p className="text-text-secondary text-sm">Omnis Reach v1.0.0</p>
          <p className="text-text-secondary text-sm">Multi-Platform Automation Desktop App</p>
        </div>
      </div>
    </div>
  );
};

export default Settings;

