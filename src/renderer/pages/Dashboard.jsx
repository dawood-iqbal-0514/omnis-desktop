import React from 'react';
import { ButtonPlain } from '../components/Button';

const Dashboard = ({ setActivePage }) => {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Dashboard</h1>
        <p className="text-text-secondary">Welcome to Omnis Reach - Your automation hub</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[var(--color-base-background-light)] rounded-lg p-6 border border-border-muted">
          <h3 className="text-text-secondary text-sm mb-2">Active Automations</h3>
          <p className="text-3xl font-bold text-primary-accent">0</p>
        </div>
        <div className="bg-[var(--color-base-background-light)] rounded-lg p-6 border border-border-muted">
          <h3 className="text-text-secondary text-sm mb-2">Connected Platforms</h3>
          <p className="text-3xl font-bold text-primary-accent">0</p>
        </div>
        <div className="bg-[var(--color-base-background-light)] rounded-lg p-6 border border-border-muted">
          <h3 className="text-text-secondary text-sm mb-2">Tasks Completed</h3>
          <p className="text-3xl font-bold text-primary-accent">0</p>
        </div>
      </div>

      <div className="bg-[var(--color-base-background-light)] rounded-lg p-6 border border-border-muted">
        <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <ButtonPlain variant="primary" onClick={() => setActivePage('platforms')}>
            Connect Platform
          </ButtonPlain>
          <ButtonPlain variant="outline" onClick={() => setActivePage('chat')}>
            Create Automation
          </ButtonPlain>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

