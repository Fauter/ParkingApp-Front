import "./Login.css";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TOKEN_KEY = 'token';
const REDIRECT_KEY = 'redirectAfterLogin';
const OPERADOR_KEY = 'operador';

// helper para normalizar el operador (por si viene doblemente serializado)
function normalizeOperador(opCandidate) {
  if (!opCandidate) return null;
  if (typeof opCandidate === 'object') return opCandidate;
  if (typeof opCandidate === 'string') {
    try {
      const p1 = JSON.parse(opCandidate);
      if (p1 && typeof p1 === 'object') return p1;
    } catch {}
  }
  return null;
}

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem(TOKEN_KEY, data.token);

        // normalizamos operador (sea data.operador, data.user o string) y guardamos BIEN
        const rawOp = data.operador ?? data.user ?? null;
        const op = normalizeOperador(rawOp) ?? (typeof rawOp === 'object' ? rawOp : null);
        if (op) {
          localStorage.setItem(OPERADOR_KEY, JSON.stringify(op));
        } else {
          // si vino mal, limpiamos para forzar login
          localStorage.removeItem(OPERADOR_KEY);
        }

        // 👉 Redirección inmediata por rol
        if (op?.role === 'cargaMensuales') {
          localStorage.removeItem(REDIRECT_KEY); // landing fija para este rol
          navigate('/carga-mensuales', { replace: true });
          return;
        }

        // Caso general
        const redirectTo = localStorage.getItem(REDIRECT_KEY) || '/';
        localStorage.removeItem(REDIRECT_KEY);
        navigate(redirectTo, { replace: true });
      } else {
        setError(data.msg || 'Error en el login');
      }
    } catch (err) {
      setError('Hubo un problema con la conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login">
      <div className="containerLogin">
        <div className="login-container">
          <h1>Iniciar Sesión</h1>
          <form onSubmit={handleSubmit}>
            <label className="input-label">
              <p>Usuario</p>
              <input
                type="text"
                placeholder="Ingresa tu usuario"
                className="input-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)} 
              />
            </label>
            <label className="input-label">
              <p>Contraseña</p>
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                className="input-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Cargando..." : "Iniciar Sesión"}
            </button>
          </form>
          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export default Login;
