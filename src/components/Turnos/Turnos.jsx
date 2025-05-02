import "./Turnos.css";
import React, { useState } from 'react';
import DatosAutoEntradaAbono from "../Abono/DatosAutoEntradaAbono/DatosAutoEntradaAbono";
import DatosAutoTurnos from "./DatosAutoTurnos/DatosAutoTurnos"

function Turnos() {
  const [datosVehiculo, setDatosVehiculo] = useState({
    patente: "",
    tipoVehiculo: "",
  });

  return (
    <div className="contenidoCentral">
      <div className="izquierdaTurnos">
        <DatosAutoEntradaAbono setDatosVehiculo={setDatosVehiculo} />
      </div>
      <div className="derechaTurnos">
        <DatosAutoTurnos datosVehiculo={datosVehiculo} />
      </div>
    </div>
  );
}

export default Turnos;
