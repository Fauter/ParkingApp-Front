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
          <div className="button">Abono</div>
          <a href="https://admin.ofiflex.com.ar" className="button">Admin</a>
      </div>
    </div>
  );
}

export default Header;
