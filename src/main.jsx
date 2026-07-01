import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { StockProvider } from "./Components/inventory/StockContext";
import { AuthProvider } from './Components/AuthContext';
import { AccountsProvider } from './Components/inventory/ACCOUNTS/AccountsContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <StockProvider>
        <AccountsProvider>
          <App />
        </AccountsProvider>
      </StockProvider>
    </AuthProvider>
  </React.StrictMode>
);
