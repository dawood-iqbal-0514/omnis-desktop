import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Platforms from './pages/Platforms';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import useThemeStore from './store/themeStore';
import useAuthStore from './store/authStore';

const App = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [showSignUp, setShowSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const theme = useThemeStore((state) => state.theme);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {

    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard setActivePage={setActivePage} />;
      case 'platforms':
        return <Platforms />;
      case 'chat':
        return <Chat />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (!isAuthenticated) {
    if (showResetPassword) {
      return (
        <ResetPassword
          email={resetEmail}
          onBack={(email) => {
            if (email) {
              setResetEmail(email);
              setShowResetPassword(false);
              setShowForgotPassword(true);
            } else {
              setShowResetPassword(false);
              setShowForgotPassword(false);
            }
          }}
          onResetSuccess={() => {
            setShowResetPassword(false);
            setShowForgotPassword(false);
            setResetEmail('');

          }}
        />
      );
    }

    if (showForgotPassword) {
      return (
        <ForgotPassword
          onBack={() => {
            setShowForgotPassword(false);
            setResetEmail('');
          }}
          onOTPSent={(email) => {
            setResetEmail(email);
            setShowForgotPassword(false);
            setShowResetPassword(true);
          }}
        />
      );
    }

    return showSignUp ? (
      <SignUp onSignInClick={() => setShowSignUp(false)} />
    ) : (
      <SignIn
        onSignUpClick={() => setShowSignUp(true)}
        onForgotPassword={() => setShowForgotPassword(true)}
      />
    );
  }

  return (
    <div className="flex h-screen w-full bg-base-background overflow-hidden">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <main className={`flex-1 ${activePage === 'chat' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
        {renderPage()}
      </main>
    </div>
  );
};

export default App;
