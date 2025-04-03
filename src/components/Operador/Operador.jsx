import "./Operador.css";
import React, { useState } from 'react';
import DatosAutoSalida from './DatosAutoSalida/DatosAutoSalida';
import DatosPago from './DatosPago/DatosPago'
import DatosAutoEntrada from './DatosAutoEntrada/DatosAutoEntrada';

function Operador() {
  const [vehiculoLocal, setVehiculoLocal] = useState(null);

  const limpiarVehiculo = () => {
    setVehiculoLocal(null);
  };

  return (
    <div className="contenidoCentral">
      <div className="izquierda">
        <DatosAutoEntrada setVehiculoLocal={setVehiculoLocal} />
      </div>
      <div className="derecha">
        <DatosAutoSalida vehiculoLocal={vehiculoLocal} limpiarVehiculo={limpiarVehiculo} />
        <DatosPago vehiculoLocal={vehiculoLocal} limpiarVehiculo={limpiarVehiculo} />
      </div>
    </div>
  );
}

export default Operador;