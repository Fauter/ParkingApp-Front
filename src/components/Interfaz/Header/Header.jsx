import React from 'react';
import './Header.css'; 

function Header({ cambiarVista }) {
  return (
    <header className="topbar">
      <h1>Parking</h1>
      <div className="menu">
        <button onClick={() => cambiarVista('operador')}>Operador</button>
        <button onClick={() => cambiarVista('vehiculos')}>Vehículos Dentro</button>
        <button onClick={() => cambiarVista('turnos')}>Turnos</button>
        <button onClick={() => cambiarVista('abono')}>Abono</button>
        <a href="https://admin.garageia.com/" className="menu-button">Admin</a>
      </div>
    </header>
  );
}

export default Header;
