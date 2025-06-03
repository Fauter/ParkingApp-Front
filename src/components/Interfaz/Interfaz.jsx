import './Interfaz.css';
import React, { useState } from 'react';
import Header from './Header/Header';
import PanelDerecho from './PanelDerecho/PanelDerecho';
import Operador from '../Operador/Operador';
import VehiculosDentro from '../VehiculosDentro/VehiculosDentro';
import Background from '../Background/Background';
import Abono from '../Abono/Abono'
import Turnos from '../Turnos/Turnos';

function Interfaz() {
  const [vistaActual, setVistaActual] = useState('operador');

  return (
    <div className="interfaz">
      <Background />
      {/* Acá le pasamos la prop vistaActiva */}
      <Header cambiarVista={setVistaActual} vistaActiva={vistaActual} />
      <div className="content">
        {vistaActual === 'operador' && <Operador />}
        {vistaActual === 'vehiculos' && <VehiculosDentro />}
        {vistaActual === 'turnos' && <Turnos />}
        {vistaActual === 'abono' && <Abono />}
        <PanelDerecho />
      </div>
    </div>
  );
}

export default Interfaz;