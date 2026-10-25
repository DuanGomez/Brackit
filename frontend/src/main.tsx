import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Primero los estilos base: las hojas de cada pantalla deben poder sobrescribirlos
import './styles/base.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
