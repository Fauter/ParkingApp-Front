import React from 'react';
import './Header.css'; 

function Header({ cambiarVista, vistaActiva, abrirModal }) {
  return (
    <header className="topbar">
      <h1>Parking</h1>
      <div className="menu">
        <button className={vistaActiva === 'operador' ? 'boton-activo' : ''} onClick={() => cambiarVista('operador')}>Operador</button>
        <button className={vistaActiva === 'vehiculos' ? 'boton-activo' : ''} onClick={() => cambiarVista('vehiculos')}>Auditoría</button>
        <button className={vistaActiva === 'clientes' ? 'boton-activo' : ''} onClick={() => cambiarVista('clientes')}>Clientes</button>
        <button className={vistaActiva === 'turnos' ? 'boton-activo' : ''} onClick={() => cambiarVista('turnos')}>Turnos</button>
        <button className={vistaActiva === 'abono' ? 'boton-activo' : ''} onClick={() => cambiarVista('abono')}>Abono</button>

        {/* Estos abren modales */}
        <button onClick={() => abrirModal('cierredecaja')}>Cierre de Caja</button>
        <button onClick={() => abrirModal('cierreparcial')}>Cierre Parcial</button>
        <button onClick={() => abrirModal('incidente')}>Incidente</button>

        <a href="https://admin.garageia.com/" className="menu-button">Admin</a>
      </div>
    </header>
  );
}

export default Header;
