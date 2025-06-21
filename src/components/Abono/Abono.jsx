import "./Abono.css";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatosAutoEntradaAbono from "./DatosAutoEntradaAbono/DatosAutoEntradaAbono";
import DatosAutoAbono from "./DatosAutoAbono/DatosAutoAbono";

function Abono() {
  const [datosVehiculo, setDatosVehiculo] = useState({
    patente: "",
    tipoVehiculo: "",
  });
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

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

  console.log("👤 User en Abono:", user);

  return (
    <div className="contenidoCentral">
      <div className="izquierdaAbono">
        <DatosAutoEntradaAbono setDatosVehiculo={setDatosVehiculo} user={user} />
      </div>
      <div className="derechaAbono">
        <DatosAutoAbono datosVehiculo={datosVehiculo} user={user} />
      </div>
    </div>
  );
}

export default Abono;
