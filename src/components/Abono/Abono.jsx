import "./Abono.css";
import React, { useState } from 'react';
import DatosAutoEntradaAbono from "./DatosAutoEntradaAbono/DatosAutoEntradaAbono";
import DatosAutoAbono from "./DatosAutoAbono/DatosAutoAbono";

function Abono() {
  const [datosVehiculo, setDatosVehiculo] = useState({
    patente: "",
    tipoVehiculo: "",
  });

  return (
    <div className="contenidoCentral">
      <div className="izquierdaAbono">
        <DatosAutoEntradaAbono setDatosVehiculo={setDatosVehiculo} />
      </div>
      <div className="derechaAbono">
        {/* Aquí pasas datosVehiculo como prop */}
        <DatosAutoAbono datosVehiculo={datosVehiculo} />
      </div>
    </div>
  );
}

export default Abono;
