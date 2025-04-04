import "./Operador.css";
import React, { useState } from 'react';
import DatosAutoSalida from './DatosAutoSalida/DatosAutoSalida';
import DatosPago from './DatosPago/DatosPago'
import DatosAutoEntrada from './DatosAutoEntrada/DatosAutoEntrada';

function Operador() {
  const [vehiculoLocal, setVehiculoLocal] = useState(null);
  const [resetInput, setResetInput] = useState(false);
  const [error, setError] = useState(null);
  
  const limpiarVehiculo = () => {
    setVehiculoLocal(null);
    setError(null);
    setResetInput(prev => !prev);
  };
  const buscarVehiculo = async (patente) => {
    try {
      const patenteMayuscula = patente.toUpperCase();
      const putResponse = await fetch(`https://parkingapp-back.onrender.com/api/vehiculos/${patenteMayuscula}/registrarSalida`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          metodoPago: "Efectivo",
          factura: "No"
        })
      });

      if (!putResponse.ok) {
        const err = await putResponse.json();
        throw new Error(err.msg || "Error al registrar salida");
      }

      const response = await fetch(`https://parkingapp-back.onrender.com/api/vehiculos/${patenteMayuscula}`);
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
        <DatosAutoEntrada/>
      </div>
      <div className="derecha">
        <DatosAutoSalida
          buscarVehiculo={buscarVehiculo}
          error={error}
          vehiculoLocal={vehiculoLocal}
          limpiarInputTrigger={resetInput}
        />
        <DatosPago
          vehiculoLocal={vehiculoLocal}
          limpiarVehiculo={limpiarVehiculo}
        />
      </div>
    </div>
  );
}

export default Operador;