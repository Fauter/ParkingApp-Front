import "./Turnos.css";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatosAutoEntradaAbono from "../Abono/DatosAutoEntradaAbono/DatosAutoEntradaAbono";
import DatosAutoTurnos from "./DatosAutoTurnos/DatosAutoTurnos"

function Turnos() {
  const [datosVehiculo, setDatosVehiculo] = useState({
    patente: "",
    tipoVehiculo: "",
  });
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Traer datos del usuario logueado igual que en Operador.jsx
  useEffect(() => {
    if (user) {
      console.log(user)
    }
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
          console.log("User logueado en Turnos:", data); // <-- Aquí está el console log que pediste
        } else {
          if (response.status === 401) {
            localStorage.removeItem('token');
            setUser(null);
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('Error fetching user en Turnos:', error);
      }
    };

    fetchUser();
  }, [navigate]);

  return (
    <div className="contenidoCentral">
      <div className="izquierdaTurnos">
        <DatosAutoEntradaAbono setDatosVehiculo={setDatosVehiculo} user={user} />
      </div>
      <div className="derechaTurnos">
        <DatosAutoTurnos datosVehiculo={datosVehiculo} user={user} />
      </div>
    </div>
  );
}

export default Turnos;
