import React, { useState, useEffect, useRef } from 'react';
import './Header.css';
import ModalHeader from './ModalHeader/ModalHeader';
import DatosAutoEntrada from '../../Operador/DatosAutoEntrada/DatosAutoEntrada';

function Header({ 
  cambiarVista, 
  vistaActiva, 
  abrirModal, 
  setMostrarOverlay, 
  modalActivo, 
  onEjecutarBot,
  user,
  ticketPendiente
}) {
  const [mostrarSubmenu, setMostrarSubmenu] = useState(false);
  const [mostrarModalEntrada, setMostrarModalEntrada] = useState(false);
  const [timestamp, setTimestamp] = useState(Date.now()); // 👈 NUEVO
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMostrarSubmenu(false);
        setMostrarOverlay(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setMostrarOverlay]);

  const manejarCambioVista = (vista) => {
    cambiarVista(vista);
    setMostrarSubmenu(false);
    setMostrarOverlay(false);
  };

  const handleAbonoClick = () => {
    if (modalActivo !== null) return;
    const nuevoEstado = !mostrarSubmenu;
    setMostrarSubmenu(nuevoEstado);
    setMostrarOverlay(nuevoEstado);
  };

  const handleAbrirModal = (modal) => {
    if (mostrarSubmenu) {
      setMostrarSubmenu(false);
      setMostrarOverlay(false);
    }
    abrirModal(modal);
  };

  const cerrarSubmenuYOverlay = () => {
    if (mostrarSubmenu) {
      setMostrarSubmenu(false);
      setMostrarOverlay(false);
    }
  };

  const getButtonClass = (boton) => {
    if (modalActivo !== null) {
      switch (modalActivo) {
        case 'cierredecaja':
          return boton === 'cierredecaja' ? 'boton-activo' : '';
        case 'cierreparcial':
          return boton === 'cierreparcial' ? 'boton-activo' : '';
        case 'incidente':
          return boton === 'incidente' ? 'boton-activo' : '';
        default:
          return '';
      }
    }

    switch (boton) {
      case 'operador':
      case 'vehiculos':
      case 'turnos':
        return !mostrarSubmenu && vistaActiva === boton ? 'boton-activo' : '';
      case 'abono':
        return (mostrarSubmenu || vistaActiva === 'abono' || vistaActiva === 'clientes' || vistaActiva === 'detalleCliente') ? 'boton-activo' : '';
      case 'cierredecaja':
      case 'cierreparcial':
      case 'incidente':
        return '';
      default:
        return '';
    }
  };

  const handleEjecutarBot = async () => {
    await onEjecutarBot(); // Ejecutar lógica del bot
    setMostrarModalEntrada(true); // Mostrar modal
    setTimestamp(Date.now()); // 👈 Forzar recarga del componente hijo
  };

  return (
    <header className="topbar">
      <h1>Parking</h1>
      <div className="menu" ref={menuRef}>
        <button
          className={getButtonClass('operador')}
          onClick={() => manejarCambioVista('operador')}
          disabled={modalActivo !== null}
        >
          Operador
        </button>
        <button
          className={getButtonClass('vehiculos')}
          onClick={() => manejarCambioVista('vehiculos')}
          disabled={modalActivo !== null}
        >
          Auditoría
        </button>
        <button
          className={getButtonClass('turnos')}
          onClick={() => manejarCambioVista('turnos')}
          disabled={modalActivo !== null}
        >
          Turnos
        </button>
        <button
          className={getButtonClass('abono')}
          onClick={handleAbonoClick}
          disabled={modalActivo !== null && !mostrarSubmenu}
        >
          Abono
        </button>

        {mostrarSubmenu && (
          <div className="submenu">
            <button onClick={() => manejarCambioVista('abono')}>Nuevo</button>
            <button onClick={() => manejarCambioVista('clientes')}>Renovar</button>
          </div>
        )}

        <button
          className={getButtonClass('cierredecaja')}
          onClick={() => handleAbrirModal('cierredecaja')}
        >
          Cierre de Caja
        </button>
        <button
          className={getButtonClass('cierreparcial')}
          onClick={() => handleAbrirModal('cierreparcial')}
        >
          Cierre Parcial
        </button>
        <button
          className={getButtonClass('incidente')}
          onClick={() => handleAbrirModal('incidente')}
        >
          Incidente
        </button>
        {/* <a
          href="https://admin.garageia.com/"
          className="menu-button"
          onClick={cerrarSubmenuYOverlay}
        >
          Admin
        </a> */}
        <button
          className="boton-bot"
          onClick={handleEjecutarBot}
          disabled={modalActivo !== null}
        >
          BOT
        </button>
      </div>

      {mostrarModalEntrada && (
        <ModalHeader titulo="Registrar Entrada" onClose={() => setMostrarModalEntrada(false)}>
          <DatosAutoEntrada 
            user={user} 
            ticketPendiente={ticketPendiente} 
            onClose={() => setMostrarModalEntrada(false)}
            timestamp={timestamp} // 👈 PASÁS EL TIMESTAMP AL COMPONENTE
          />
        </ModalHeader>
      )}
    </header>
  );
}

export default Header;
