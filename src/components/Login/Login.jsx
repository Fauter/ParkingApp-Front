import "./Login.css"
import { useState } from 'react'
import { useNavigate } from 'react-router-dom';

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
            const response = await fetch('https://parkingapp-back.onrender.com/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                localStorage.setItem('token', data.token);
                const redirectTo = localStorage.getItem('redirectAfterLogin') || '/';
                localStorage.removeItem('redirectAfterLogin');
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
            <div class="containerLogin">
                <div class="login-container">
                    <h1>Iniciar Sesión</h1>
                    <form onSubmit={handleSubmit}>
                        <label class="input-label">
                            <p>Usuario</p>
                            <input
                                type="text"
                                placeholder="Ingresa tu usuario"
                                className="input-field"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)} 
                            />
                        </label>
                        <label class="input-label">
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
                    <p class="forgot-password">¿Olvidaste tu contraseña?</p>
                </div>
            </div>
        </div>
    )
}

export default Login
