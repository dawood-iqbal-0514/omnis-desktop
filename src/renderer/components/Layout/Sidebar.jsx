import React from 'react';
import logo from '@assets/logos/logo.png';

const Sidebar = ({ activePage, setActivePage }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'platforms', label: 'Platforms', icon: '🔌' },
    { id: 'chat', label: 'Omnis Assistant', icon: '💬' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="w-64 bg-[var(--color-base-background-light)] border-r border-border-muted h-full">
      <div className="px-6 py-3 border-b border-border-muted flex items-center justify-center">
        <img src={logo} alt="Omnis Reach" className="h-16 w-auto" />
      </div>
      <nav className="p-4">
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
    </div>
  );
};

export default Sidebar;
