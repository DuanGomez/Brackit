import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Primero los estilos globales: las hojas de cada componente deben poder sobrescribirlos
import './styles/global.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
