import "./Operador.css";
import React, { useState } from 'react';
import DatosAutoSalida from './DatosAutoSalida/DatosAutoSalida';
import DatosPago from './DatosPago/DatosPago'
import DatosAutoEntrada from './DatosAutoEntrada/DatosAutoEntrada';

function Operador() {
  return (
    <div className="contenidoCentral">

      <DatosAutoSalida />

      {/* <DatosAutoEntrada /> */}

      <DatosPago />
      
    </div>
  );
}

export default Operador;