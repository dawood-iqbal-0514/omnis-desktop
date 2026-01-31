import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

const initializeTheme = () => {
  const savedTheme = localStorage.getItem('omnis-reach-theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
};

initializeTheme();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

