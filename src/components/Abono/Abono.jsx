import "./Abono.css";
import React, { useState } from 'react';
import DatosAutoEntradaAbono from "./DatosAutoEntradaAbono/DatosAutoEntradaAbono";
import DatosAutoAbono from "./DatosAutoAbono/DatosAutoAbono";

function Abono() {

  return (
    <div className="contenidoCentral">
      <div className="izquierda">
        <DatosAutoEntradaAbono />
      </div>
      <div className="derecha">
        <DatosAutoAbono />
      </div>
    </div>
  );
}

export default Abono;