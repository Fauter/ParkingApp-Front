import React, { useState, useEffect, useRef } from 'react';
import './Header.css';

function Header({ cambiarVista, vistaActiva, abrirModal }) {
  const [mostrarSubmenu, setMostrarSubmenu] = useState(false);
  const menuRef = useRef();

  // Cierra el submenú si hacés clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMostrarSubmenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const manejarCambioVista = (vista) => {
    cambiarVista(vista);
    setMostrarSubmenu(false);
  };

  return (
    <header className="topbar">
      <h1>Parking</h1>
      <div className="menu" ref={menuRef}>
        <button className={vistaActiva === 'operador' ? 'boton-activo' : ''} onClick={() => cambiarVista('operador')}>Operador</button>
        <button className={vistaActiva === 'vehiculos' ? 'boton-activo' : ''} onClick={() => cambiarVista('vehiculos')}>Auditoría</button>
        <button className={vistaActiva === 'turnos' ? 'boton-activo' : ''} onClick={() => cambiarVista('turnos')}>Turnos</button>

        {/* Botón Abono igual que los demás */}
        <button
          className={((vistaActiva === 'abono' || vistaActiva === 'clientes') || mostrarSubmenu) ? 'boton-activo' : ''}
          onClick={() => setMostrarSubmenu(!mostrarSubmenu)}
        >
          Abono
        </button>

        {/* Submenú flotante */}
        {mostrarSubmenu && (
          <div className="submenu">
            <button onClick={() => manejarCambioVista('abono')}>Nuevo</button>
            <button onClick={() => manejarCambioVista('clientes')}>Renovar</button>
          </div>
        )}

        <button onClick={() => abrirModal('cierredecaja')}>Cierre de Caja</button>
        <button onClick={() => abrirModal('cierreparcial')}>Cierre Parcial</button>
        <button onClick={() => abrirModal('incidente')}>Incidente</button>
        <a href="https://admin.garageia.com/" className="menu-button">Admin</a>
      </div>
    </header>
  );
}

export default Header;
