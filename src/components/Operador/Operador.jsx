import "./Operador.css";
import React, { useState } from 'react';
import DatosAutoSalida from './DatosAutoSalida/DatosAutoSalida';
import DatosPago from './DatosPago/DatosPago';
import DatosAutoEntrada from './DatosAutoEntrada/DatosAutoEntrada';

function Operador() {
  const [vehiculoLocal, setVehiculoLocal] = useState(null);
  const [resetInput, setResetInput] = useState(false);
  const [error, setError] = useState(null);
  const [tarifaCalculada, setTarifaCalculada] = useState(null);

  const limpiarVehiculo = () => {
    setVehiculoLocal(null);
    setError(null);
    setResetInput(prev => !prev);
    setTarifaCalculada(null);
  };

  const buscarVehiculo = async (patente) => {
    try {
      const patenteMayuscula = patente.toUpperCase();

      const response = await fetch(`https://api.garageia.com/api/vehiculos/${patenteMayuscula}`);
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
        <DatosAutoEntrada />
      </div>
      <div className="derecha">
        <DatosAutoSalida
          buscarVehiculo={buscarVehiculo}
          error={error}
          vehiculoLocal={vehiculoLocal}
          limpiarInputTrigger={resetInput}
          onActualizarVehiculoLocal={setVehiculoLocal}
          onTarifaCalculada={setTarifaCalculada}
        />
        <DatosPago
          vehiculoLocal={vehiculoLocal}
          tarifaCalculada={tarifaCalculada}
          limpiarVehiculo={limpiarVehiculo}
        />
      </div>
    </div>
  );
}

export default Operador;
