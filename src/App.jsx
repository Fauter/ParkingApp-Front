import './App.css';
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Interfaz from './components/Interfaz/Interfaz';
import Login from './components/Login/Login.jsx';
import CargaMensuales from './components/CargaMensuales/CargaMensuales.jsx';

const TOKEN_KEY = 'token';
const REDIRECT_KEY = 'redirectAfterLogin';
const OPERADOR_KEY = 'operador';

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

/** Si el rol es cargaMensuales, lo lleva a /carga-mensuales */
function RoleGate({ children }) {
  const location = useLocation();
  const op = readOperador();
  if (op?.role === 'cargaMensuales' && location.pathname !== '/carga-mensuales') {
    return <Navigate to="/carga-mensuales" replace />;
  }
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <RedirectIfAuth>
            <Login />
          </RedirectIfAuth>
        }
      />

      {/* Ruta exclusiva para el rol cargaMensuales */}
      <Route
        path="/carga-mensuales"
        element={
          <RequireAuth>
            <CargaMensuales />
          </RequireAuth>
        }
      />

      {/* Todas las demás rutas son privadas */}
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
