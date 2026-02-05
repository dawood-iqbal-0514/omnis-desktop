import React from 'react';
import useAuthStore from '../../store/authStore';
import logo from '@assets/logos/logo.png';

const Sidebar = ({ activePage, setActivePage }) => {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    // { id: 'platforms', label: 'Platforms', icon: '🔌' },
    { id: 'chat', label: 'Omnis Assistant', icon: '💬' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleLogout = () => {
    logout();
    setActivePage('signin');
  };

  return (
    <div className="w-64 bg-[var(--color-base-background-light)] border-r border-border-muted h-full flex flex-col">
      <div className="px-6 py-3 border-b border-border-muted flex items-center justify-center">
        <img src={logo} alt="Omnis Reach" className="h-16 w-auto" />
      </div>
      <nav className="p-4 flex-1">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => setActivePage(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activePage === item.id
                    ? 'bg-primary-accent text-white'
                    : 'text-text-secondary hover:bg-[var(--color-base-background)] hover:text-text-primary'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* User info and logout button at bottom */}
      <div className="p-4 border-t border-border-muted">
        {user && (
          <div className="mb-3 px-4 py-2">
            <p className="text-text-secondary text-xs mb-1">Signed in as</p>
            <p className="text-text-primary font-medium text-sm truncate">{user.name || user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-text-secondary hover:bg-[var(--color-base-background)] hover:text-error"
        >
          <span className="text-xl">🚪</span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
