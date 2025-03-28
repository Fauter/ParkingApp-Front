import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Tabs.css'; 

function Tabs() {
  const navigate = useNavigate();

  // Función para manejar el cambio de selección
  const handleButtonClick = (route) => {
    navigate(route);
  };

  return (
    <div className="tabs">
      <div className="upper-buttons">
        <button 
          className="tab-button" 
          onClick={() => handleButtonClick('/')}
        >
          Operador
        </button>
        <button 
          className="tab-button" 
          onClick={() => handleButtonClick('/caja')}
        >
          Caja
        </button>
      </div>
      <div className="lower-buttons">
        <button 
          className="tab-button" 
          onClick={() => handleButtonClick('/planilla')}
        >
          Entr/Sal
        </button>
        <button 
          className="tab-button" 
          onClick={() => handleButtonClick('/admin')}
        >
          Admin
        </button>
      </div>
    </div>
  );
}

export default Tabs;