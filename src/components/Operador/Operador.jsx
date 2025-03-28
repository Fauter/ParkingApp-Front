import "./Operador.css";
import React, { useState } from 'react';
import DatosAutoSalida from './DatosAutoSalida/DatosAutoSalida';
import DatosPago from './DatosPago/DatosPago'
import DatosAutoEntrada from './DatosAutoEntrada/DatosAutoEntrada';

function Operador({ mostrarEntrada }) {
  return (
    <div className="contenidoCentral">

      {mostrarEntrada ? (
        <DatosAutoEntrada />
      ) : (
        <DatosAutoSalida />
      )}

      <DatosPago mostrarEntrada={mostrarEntrada} />
      
    </div>
  );
}

export default Operador;