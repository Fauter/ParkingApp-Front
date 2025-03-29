import React from 'react';
import './Header.css'; 

function Header() {
  return (
    <div className="header">
      <div className="logo">
        <h1>Parking</h1>
      </div>
      <div className="buttons">
          <div className="button">Operador</div>
          <div className="button">Caja</div>
          <div className="button">Entr/Sal</div>
          <div className="button">Admin</div>
      </div>
    </div>
  );
}

export default Header;
