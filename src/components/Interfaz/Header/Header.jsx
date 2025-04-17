import React from 'react';
import './Header.css'; 

function Header({ cambiarVista }) {
  return (
    <header className="topbar">
      <h1>Parking</h1>
      <div className="menu">
        <button onClick={() => cambiarVista('operador')}>Operador</button>
        <button onClick={() => cambiarVista('vehiculos')}>Vehículos Dentro</button>
        <button>Caja</button>
        <button>Abono</button>
        <a href="https://admin.ofiflex.com.ar" className="menu-button">Admin</a>
      </div>
    </header>
  );
}

export default Header;
