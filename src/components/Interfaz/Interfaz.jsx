import './Interfaz.css';
import React, { useState } from 'react';
import Header from './Header/Header';
import Tabs from './Tabs/Tabs';
import PanelDerecho from './PanelDerecho/PanelDerecho';
import Operador from '../Operador/Operador';
import VehiculosDentro from '../VehiculosDentro/VehiculosDentro';
import Background from '../Background/Background';
import Abono from '../Abono/Abono'

function Interfaz() {
  const [vistaActual, setVistaActual] = useState('operador');

  return (
    <div className="interfaz">
      <Background />
      <Header cambiarVista={setVistaActual} />
      <div className="content">
        {vistaActual === 'operador' && <Operador />}
        {vistaActual === 'vehiculos' && <VehiculosDentro />}
        {vistaActual === 'abono' && <Abono />}
        <PanelDerecho />
      </div>
    </div>
  );
}

export default Interfaz;