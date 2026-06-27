import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css'; // Agar aapki CSS file hai to
import { StockProvider } from "./Components/inventory/StockContext"; // Ensure folder is "Components" with Capital C

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StockProvider>
      <App />
    </StockProvider>
  </React.StrictMode>
);