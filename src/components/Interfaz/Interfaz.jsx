import './Interfaz.css'; 
import React, { useState } from 'react'; 
import Header from './Header/Header'; 
import Tabs from './Tabs/Tabs'; 
import PanelDerecho from './PanelDerecho/PanelDerecho'; 
import Operador from '../Operador/Operador'; 
import Background from '../Background/Background'; 

function Interfaz() {
    const [mostrarEntrada, setMostrarEntrada] = useState(true);
    const toggleEntradaSalida = () => {
      setMostrarEntrada(prevState => !prevState);
    };

    return (
      <div className="interfaz">
          <Background />
          <Header />
          <div className="content">
            <Operador mostrarEntrada={mostrarEntrada} /> 
            <PanelDerecho />
          </div>
      </div>
    );
  }
  
  export default Interfaz;