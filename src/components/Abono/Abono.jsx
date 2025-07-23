import "./Abono.css";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatosAutoEntrada from "../Operador/DatosAutoEntrada/DatosAutoEntrada";
import DatosAutoAbono from "./DatosAutoAbono/DatosAutoAbono";

function Abono() {
  const [datosVehiculo, setDatosVehiculo] = useState({
    patente: "",
    tipoVehiculo: "",
  });
  const [ticketPendiente, setTicketPendiente] = useState(null);
  const [timestamp, setTimestamp] = useState(Date.now());
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Intervalo para actualizar timestamp cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      setTimestamp(Date.now());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Traer datos del usuario logueado
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/api/auth/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok) {
          setUser(data);
        } else {
          if (response.status === 401) {
            localStorage.removeItem('token');
            setUser(null);
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    fetchUser();
  }, [navigate]);

  // Manejar cuando se registra una entrada exitosa
  const handleEntradaExitosa = (patente, tipoVehiculo) => {
    setDatosVehiculo({
      patente,
      tipoVehiculo
    });
    setTicketPendiente(null);
  };

  return (
    <div className="contenidoCentral">
      <div className="izquierdaAbono">
        <DatosAutoEntrada
          user={user} 
          ticketPendiente={ticketPendiente} 
          onClose={handleEntradaExitosa}
          setTicketPendiente={setTicketPendiente}
          timestamp={timestamp}
        />
      </div>
      <div className="derechaAbono">
        <DatosAutoAbono datosVehiculo={datosVehiculo} user={user} />
      </div>
    </div>
  );
}

export default Abono;