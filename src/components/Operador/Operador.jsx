import "./Operador.css";
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DatosAutoSalida from './DatosAutoSalida/DatosAutoSalida';
import DatosPago from './DatosPago/DatosPago';
import DatosAutoEntrada from './DatosAutoEntrada/DatosAutoEntrada';

function Operador() {
  const [vehiculoLocal, setVehiculoLocal] = useState(null);
  const [resetInput, setResetInput] = useState(false);
  const [error, setError] = useState(null);
  const [tarifaCalculada, setTarifaCalculada] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // ✅ Traer datos del usuario logueado
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

  const limpiarVehiculo = () => {
    setVehiculoLocal(null);
    setError(null);
    setResetInput(prev => !prev);
    setTarifaCalculada(null);
  };

  const buscarVehiculo = async (patente) => {
    try {
      const patenteMayuscula = patente.toUpperCase();

      const response = await fetch(`http://localhost:5000/api/vehiculos/${patenteMayuscula}`);
      if (!response.ok) {
        throw new Error("Vehículo no encontrado");
      }

      const data = await response.json();
      setVehiculoLocal(data);
      setError(null);
    } catch (err) {
      setVehiculoLocal(null);
      setError(err.message);
    }
  };

  return (
    <div className="contenidoCentral">
      <div className="izquierda">
        <DatosAutoEntrada user={user} />
      </div>
      <div className="derecha">
        <DatosAutoSalida
          buscarVehiculo={buscarVehiculo}
          error={error}
          vehiculoLocal={vehiculoLocal}
          limpiarInputTrigger={resetInput}
          onActualizarVehiculoLocal={setVehiculoLocal}
          onTarifaCalculada={setTarifaCalculada}
          user={user}
        />
        <DatosPago
          vehiculoLocal={vehiculoLocal}
          tarifaCalculada={tarifaCalculada}
          limpiarVehiculo={limpiarVehiculo}
          user={user}
        />
      </div>
    </div>
  );
}

export default Operador;
