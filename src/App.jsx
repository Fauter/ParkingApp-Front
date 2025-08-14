import './App.css';
import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Interfaz from './components/Interfaz/Interfaz';
import Login from './components/Login/Login.jsx';

const TOKEN_KEY = 'token';
const REDIRECT_KEY = 'redirectAfterLogin';

/** Protege rutas privadas */
function RequireAuth({ children }) {
  const location = useLocation();
  const token = localStorage.getItem(TOKEN_KEY);

  if (!token) {
    // Guardamos a dónde quería ir el usuario para redirigir después de loguearse
    const next = location.pathname + location.search;
    localStorage.setItem(REDIRECT_KEY, next || '/');
    return <Navigate to="/login" replace />;
  }
  return children;
}

/** Evita que un usuario logueado vea /login */
function RedirectIfAuth({ children }) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    const redirectTo = localStorage.getItem(REDIRECT_KEY) || '/';
    localStorage.removeItem(REDIRECT_KEY);
    return <Navigate to={redirectTo} replace />;
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
      {/* Todas las demás rutas son privadas */}
      <Route
        path="/*"
        element={
          <RequireAuth>
            <Interfaz />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
