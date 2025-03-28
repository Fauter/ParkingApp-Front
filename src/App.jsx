import './App.css';
import React, { useEffect } from 'react'; // Importa React y useEffect
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'; // Importa los elementos de react-router-dom
import Interfaz from './components/Interfaz/Interfaz';
import Login from './components/Login/Login.jsx';


function App() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const token = localStorage.getItem('token'); 
    if (!token) {
      localStorage.setItem('redirectAfterLogin', window.location.pathname);
      navigate('/login'); 
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
