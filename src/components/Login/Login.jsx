import "./Login.css";
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const TOKEN_KEY = 'token';
const REDIRECT_KEY = 'redirectAfterLogin';
const OPERADOR_KEY = 'operador';

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
        // ✅ guardar token y operador
        localStorage.setItem(TOKEN_KEY, data.token);
        if (data.operador) {
          localStorage.setItem(OPERADOR_KEY, JSON.stringify(data.operador));
        } else if (data.user) {
          // fallback si backend retorna "user"
          const { _id, username, nombre, apellido, role } = data.user;
          localStorage.setItem(OPERADOR_KEY, JSON.stringify({ _id, username, nombre, apellido, role }));
        }

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
