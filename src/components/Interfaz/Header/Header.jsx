import React, { useState, useEffect, useRef } from 'react';
import './Header.css';

function Header({ cambiarVista, vistaActiva, abrirModal, setMostrarOverlay, modalActivo }) {
  const [mostrarSubmenu, setMostrarSubmenu] = useState(false);
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

  // Evita abrir submenu Abono si hay modal activo
  const handleAbonoClick = () => {
    if (modalActivo !== null) return; // bloquea abrir submenu si hay modal abierto
    const nuevoEstado = !mostrarSubmenu;
    setMostrarSubmenu(nuevoEstado);
    setMostrarOverlay(nuevoEstado);
  };

  // Al abrir modal, cierra submenu y overlay si estaban abiertos y abre modal
  const handleAbrirModal = (modal) => {
    if (mostrarSubmenu) {
      setMostrarSubmenu(false);
      setMostrarOverlay(false);
    }
    abrirModal(modal);
  };

  // Cierra submenu y overlay para clicks que no cambian vista ni abren modal
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
        {/* Agrego onClick para cerrar submenu y overlay si estaban abiertos */}
        <a
          href="https://admin.garageia.com/"
          className="menu-button"
          onClick={cerrarSubmenuYOverlay}
        >
          Admin
        </a>
      </div>
    </header>
  );
}

export default Header;
