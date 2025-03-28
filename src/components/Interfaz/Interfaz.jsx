import './Interfaz.css'; 
import React from 'react';
import Header from './Header/Header'; 
import Tabs from './Tabs/Tabs'; 
import PanelDerecho from './PanelDerecho/PanelDerecho'; 
import Operador from '../Operador/Operador';
import Background from '../Background/Background'; 

function Interfaz() {
    return (
      <div className="interfaz">
          <Background />
          <Header />
          <div className="content">
            <Tabs />
            <Operador />
            <PanelDerecho />
          </div>
      </div>
    );
  }
  
  export default Interfaz;