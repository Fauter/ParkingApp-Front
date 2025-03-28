import "./Login.css"
import { useState } from 'react'
import { useNavigate } from 'react-router-dom';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState(''); // Nuevo estado para los mensajes de éxito o error
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('http://localhost:5000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage('Login exitoso');
                localStorage.setItem('token', data.token);
                const redirectTo = localStorage.getItem('redirectAfterLogin') || '/';
                localStorage.removeItem('redirectAfterLogin');
                navigate(redirectTo);
            } else {
                setError(data.msg || 'Error en el login');
            }
        } catch (err) {
            setError('Hubo un problema con la conexión');
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
                                onChange={(e) => setUsername(e.target.value)} // Maneja el cambio de usuario
                            />
                        </label>
                        <label class="input-label">
                            <p>Contraseña</p>
                            <input
                                type="password"
                                placeholder="Ingresa tu contraseña"
                                className="input-field"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)} // Maneja el cambio de contraseña
                            />
                        </label>
                        <button type="submit" className="login-button">Iniciar Sesión</button>
                    </form>
                    {error && <p className="error-message">{error}</p>}
                    <p class="forgot-password">¿Olvidaste tu contraseña?</p>
                </div>
            </div>
        </div>
    )
}

export default Login
