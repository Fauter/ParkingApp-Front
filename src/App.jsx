// App.jsx
import './App.css';
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Interfaz from './components/Interfaz/Interfaz';
import Login from './components/Login/Login.jsx';
import CargaMensuales from './components/CargaMensuales/CargaMensuales.jsx';
import CargaEstadias from './components/CargaMensuales/CargaEstadias.jsx';

const TOKEN_KEY = 'token';
const REDIRECT_KEY = 'redirectAfterLogin';
const OPERADOR_KEY = 'operador';

/* ==================================================
   🔴 HARD RESET SOLO EN ELECTRON (file://)
   - Si la app corre embebida en Electron (origen file:)
   - Matamos cualquier token/operador ANTES de montar React
   - Así SIEMPRE arrancás en /login en el .exe,
     sin tocar el comportamiento de la versión web
   ================================================== */
if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) { console.warn('[auth-reset] fallo limpieza inicial', e); }
}

/* ===== Helpers: operador seguro (double-parse) ===== */
function readOperador() {
  const raw = localStorage.getItem(OPERADOR_KEY);
  if (!raw) return null;
  try {
    const first = JSON.parse(raw);
    if (first && typeof first === 'object') return first;
    if (typeof first === 'string') {
      try {
        const second = JSON.parse(first);
        return second && typeof second === 'object' ? second : null;
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}
function isOperadorValido(op) {
  return !!(op && (op.username || op.nombre));
}

/** Protege rutas privadas y valida operador */
function RequireAuth({ children }) {
  const location = useLocation();
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    const next = location.pathname + location.search;
    localStorage.setItem(REDIRECT_KEY, next || '/');
    return <Navigate to="/login" replace />;
  }

  const op = readOperador();
  if (!isOperadorValido(op)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(OPERADOR_KEY);
    return <Navigate to="/login" replace />;
  }

  return children;
}

/** Evita que un usuario logueado vea /login, solo si su operador es válido */
function RedirectIfAuth({ children }) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return children;

  const op = readOperador();
  if (!isOperadorValido(op)) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(OPERADOR_KEY);
    return children;
  }

  const redirectTo = localStorage.getItem(REDIRECT_KEY) || '/';
  localStorage.removeItem(REDIRECT_KEY);
  return <Navigate to={redirectTo} replace />;
}

/** Si el rol es cargaMensuales, lo lleva a /operador/carga-mensuales */
function RoleGate({ children }) {
  const location = useLocation();
  const op = readOperador();
  if (
    op?.role === 'cargaMensuales' &&
    location.pathname !== '/operador/carga-mensuales' &&
    location.pathname !== '/operador/carga-estadias'
  ) {
    return <Navigate to="/operador/carga-mensuales" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Login (público con redirección si ya está logueado) */}
      <Route
        path="/login"
        element={
          <RedirectIfAuth>
            <Login />
          </RedirectIfAuth>
        }
      />

      {/* ===== Área Operador - coincide con los navigate('/operador/...') que ya tenés ===== */}
      <Route
        path="/operador/carga-mensuales"
        element={
          <RequireAuth>
            <CargaMensuales />
          </RequireAuth>
        }
      />
      <Route
        path="/operador/carga-estadias"
        element={
          <RequireAuth>
            <CargaEstadias />
          </RequireAuth>
        }
      />

      {/* ===== Alias de compatibilidad (no rompe marcadores previos) ===== */}
      <Route
        path="/carga-mensuales"
        element={
          <RequireAuth>
            <CargaMensuales />
          </RequireAuth>
        }
      />
      <Route
        path="/carga-estadias"
        element={
          <RequireAuth>
            <CargaEstadias />
          </RequireAuth>
        }
      />

      {/* Todas las demás rutas son privadas y pasan por RoleGate */}
      <Route
        path="/*"
        element={
          <RequireAuth>
            <RoleGate>
              <Interfaz />
            </RoleGate>
          </RequireAuth>
        }
      />
    </Routes>
  );
}
