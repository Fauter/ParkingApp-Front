import './App.css';
import React, { useEffect } from 'react'; 
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'; 
import Interfaz from './components/Interfaz/Interfaz';
import Login from './components/Login/Login.jsx';

function App() {
  const navigate = useNavigate();
  const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');
  
  useEffect(() => {
    const token = localStorage.getItem('token');
    const redirectAfterLogin = localStorage.getItem('redirectAfterLogin');

    if (!token) {
      if (window.location.pathname !== '/login') {
        localStorage.setItem('redirectAfterLogin', window.location.pathname);
        navigate('/login');
      }
    } else if (window.location.pathname === '/login') {
      navigate(redirectAfterLogin || '/', { replace: true });
    }
  }, [navigate]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="*" element={<Interfaz />} />
    </Routes>
  );
}

export default App;
