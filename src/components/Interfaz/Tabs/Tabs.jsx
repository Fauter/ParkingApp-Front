import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Tabs.css'; 

function Tabs({ toggleEntradaSalida }) {
  const navigate = useNavigate();

  const handleButtonClick = (route) => {
    navigate(route);
  };

  const handleAdminRedirect = () => {
    window.location.href = 'https://admin.ofiflex.com.ar';
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
          onClick={toggleEntradaSalida}
        >
          Entr/Sal
        </button>
        <button 
          className="tab-button" 
          onClick={handleAdminRedirect}
        >
          Admin
        </button>
      </div>
    </div>
  );
}

export default Tabs;