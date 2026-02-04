import React, { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Platforms from './pages/Platforms';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailVerification from './pages/EmailVerification';
import useThemeStore from './store/themeStore';
import useAuthStore from './store/authStore';
import { isProtectedRoute, isPublicRoute } from './middleware/authGuard';
import { toasterConfig } from './config/toaster.config';

const App = () => {
  const [activePage, setActivePage] = useState('dashboard');
  const [showSignUp, setShowSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showEmailVerification, setShowEmailVerification] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [verificationName, setVerificationName] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const theme = useThemeStore((state) => state.theme);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const initializeAuth = useAuthStore((state) => state.initializeAuth);

  // Initialize auth state on app load
  useEffect(() => {
    initializeAuth();
    setIsInitialized(true);
  }, [initializeAuth]);

  // Protect routes - redirect to signin if not authenticated
  useEffect(() => {
    if (!isInitialized) return;

    const token = localStorage.getItem('omnis-reach-token');
    const hasAuth = isAuthenticated && token;

    // If trying to access protected route without auth, redirect to signin
    if (isProtectedRoute(activePage) && !hasAuth) {
      setActivePage('signin');
      setShowSignUp(false);
      setShowForgotPassword(false);
      setShowResetPassword(false);
    }

    // If authenticated and trying to access auth pages, redirect to dashboard
    if (hasAuth && isPublicRoute(activePage)) {
      setActivePage('dashboard');
    }
  }, [activePage, isAuthenticated, isInitialized]);

  useEffect(() => {

    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const renderPage = () => {
    // Don't render protected pages if not authenticated
    const token = localStorage.getItem('omnis-reach-token');
    const hasAuth = isAuthenticated && token;

    if (isProtectedRoute(activePage) && !hasAuth) {
      return null; // Will redirect to signin via useEffect
    }

    switch (activePage) {
      case 'dashboard':
        return <Dashboard setActivePage={setActivePage} />;
      // case 'platforms':
      //   return <Platforms />;
      case 'chat':
        return <Chat />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  // Check authentication status
  const token = localStorage.getItem('omnis-reach-token');
  const hasAuth = isAuthenticated && token;

  // Function to redirect to dashboard
  const redirectToDashboard = () => {
    setActivePage('dashboard');
    setShowSignUp(false);
    setShowForgotPassword(false);
    setShowResetPassword(false);
  };

  // Show auth pages if not authenticated or if explicitly on auth pages
  if (!hasAuth || isPublicRoute(activePage)) {
    if (showEmailVerification) {
      return (
        <>
          <Toaster {...toasterConfig} />
          <EmailVerification
            email={verificationEmail}
            name={verificationName}
            onVerificationSuccess={() => {
              setShowEmailVerification(false);
              setVerificationEmail('');
              setVerificationName('');
              setShowSignUp(false);
              setActivePage('signin');
            }}
            onBack={() => {
              setShowEmailVerification(false);
              setVerificationEmail('');
              setVerificationName('');
              setShowSignUp(true);
            }}
          />
        </>
      );
    }

    if (showResetPassword) {
      return (
        <>
          <Toaster {...toasterConfig} />
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
            onRedirectToDashboard={redirectToDashboard}
          />
        </>
      );
    }

    if (showForgotPassword) {
      return (
        <>
          <Toaster {...toasterConfig} />
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
            onRedirectToDashboard={redirectToDashboard}
          />
        </>
      );
    }

    return (
      <>
        <Toaster {...toasterConfig} />
        {showSignUp ? (
          <SignUp 
            onSignInClick={() => setShowSignUp(false)} 
            onRedirectToDashboard={redirectToDashboard}
            onEmailVerification={(email, name) => {
              setVerificationEmail(email);
              setVerificationName(name);
              setShowSignUp(false);
              setShowEmailVerification(true);
            }}
          />
        ) : (
          <SignIn
            onSignUpClick={() => setShowSignUp(true)}
            onForgotPassword={() => setShowForgotPassword(true)}
            onRedirectToDashboard={redirectToDashboard}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Toaster {...toasterConfig} />
      <div className="flex h-screen w-full bg-base-background overflow-hidden">
        <Sidebar activePage={activePage} setActivePage={setActivePage} />
        <main className={`flex-1 ${activePage === 'chat' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
          {renderPage()}
        </main>
      </div>
    </>
  );
};

export default App;
