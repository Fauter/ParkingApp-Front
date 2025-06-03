import React from 'react';
import './Header.css'; 

function Header({ cambiarVista, vistaActiva }) {
  return (
    <header className="topbar">
      <h1>Parking</h1>
      <div className="menu">
        <button
          className={vistaActiva === 'operador' ? 'boton-activo' : ''}
          onClick={() => cambiarVista('operador')}
        >
          Operador
        </button>
        <button
          className={vistaActiva === 'vehiculos' ? 'boton-activo' : ''}
          onClick={() => cambiarVista('vehiculos')}
        >
          Vehículos Dentro
        </button>
        <button
          className={vistaActiva === 'turnos' ? 'boton-activo' : ''}
          onClick={() => cambiarVista('turnos')}
        >
          Turnos
        </button>
        <button
          className={vistaActiva === 'abono' ? 'boton-activo' : ''}
          onClick={() => cambiarVista('abono')}
        >
          Abono
        </button>
        <a href="https://admin.garageia.com/" className="menu-button">Admin</a>
      </div>
    </header>
  );
}

export default Header;
