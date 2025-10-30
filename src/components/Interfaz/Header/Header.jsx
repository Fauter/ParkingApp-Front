import React, { useState, useEffect, useRef } from 'react';
import './Header.css';
import ModalHeader from './ModalHeader/ModalHeader';
import DatosAutoEntrada from '../../Operador/DatosAutoEntrada/DatosAutoEntrada';
import { useNavigate } from 'react-router-dom';

const TOKEN_KEY = 'token';
const OPERADOR_KEY = 'operador';

function Header({
  cambiarVista,
  vistaActiva,
  abrirModal,
  setMostrarOverlay,
  modalActivo,
  onEjecutarBot,
  user,
  ticketPendiente,
  setTicketPendiente,
  // estado levantado
  mostrarModalEntrada,
  setMostrarModalEntrada
}) {
  const [mostrarSubmenu, setMostrarSubmenu] = useState(false);
  const [timestamp, setTimestamp] = useState(Date.now());
  const menuRef = useRef();
  const navigate = useNavigate();

  // ⏱️ (REMOVIDO: lógica de auto-impresión a los 20s)
  const autoPrintTimerRef = useRef(null);

  // 👉 Cierra sesión (logout)
  const handleLogout = async () => {
    try {
      // eliminamos token local
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(OPERADOR_KEY);

      // opcionalmente podrías avisar al backend, pero no es necesario.
      // await fetch('http://localhost:5000/api/auth/logout', { method: 'POST' }).catch(() => {});

      navigate('/login', { replace: true });
    } catch (err) {
      console.error('Error al desloguearse:', err);
    }
  };

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

  const getButtonClass = (boton) => {
    if (modalActivo !== null) {
      switch (modalActivo) {
        case 'cierredecaja': return boton === 'cierredecaja' ? 'boton-activo' : '';
        case 'cierreparcial': return boton === 'cierreparcial' ? 'boton-activo' : '';
        case 'incidente': return boton === 'incidente' ? 'boton-activo' : '';
        case 'config': return !mostrarSubmenu && vistaActiva === 'config' ? 'boton-activo' : '';
        default: return '';
      }
    }
    switch (boton) {
      case 'operador':
      case 'vehiculos':
      case 'turnos':
        return !mostrarSubmenu && vistaActiva === boton ? 'boton-activo' : '';
      case 'abono':
        return (mostrarSubmenu || vistaActiva === 'abono' || vistaActiva === 'clientes' || vistaActiva === 'detalleCliente') ? 'boton-activo' : '';
      default:
        return '';
    }
  };

  // 🔸 Abrimos el modal INMEDIATO y disparamos BOT sin esperar
  const handleEjecutarBot = () => {
    setMostrarModalEntrada(true);  // Mostrar modal YA
    setTimestamp(Date.now());      // Forzar recarga (foto)
    Promise.resolve(onEjecutarBot()).catch(() => {}); // Fire & forget
  };

  // 🚫 REMOVIDO: efecto que auto-imprimía a los 20s si no confirmaban.
  // (Se mantiene la API de funciones para no romper props/calls)

  const cancelarAutoImpresion = () => {
    // ya no hay temporizador que cancelar; se deja no-op por compatibilidad
    if (autoPrintTimerRef.current) {
      clearTimeout(autoPrintTimerRef.current);
      autoPrintTimerRef.current = null;
    }
  };

  const handleEntradaConfirmada = () => {
    // no-op (compatibilidad). Antes cancelaba el timer.
    cancelarAutoImpresion();
  };

  return (
    <header className="topbar">
      <h1>Parking</h1>
      <div className="menu" ref={menuRef}>
        {/* 🔘 Botón cuadrado para Logout (sin texto) */}
        {/* <button
          className="boton-logout"
          title="Cerrar sesión"
          onClick={handleLogout}
        ></button> */}

        <button className={getButtonClass('operador')} onClick={() => manejarCambioVista('operador')} disabled={modalActivo !== null}>Operador</button>
        <button className={getButtonClass('vehiculos')} onClick={() => manejarCambioVista('vehiculos')} disabled={modalActivo !== null}>Auditoría</button>
        <button className={getButtonClass('turnos')} onClick={() => manejarCambioVista('turnos')} disabled={modalActivo !== null}>Anticipados</button>
        <button className={getButtonClass('abono')} onClick={handleAbonoClick} disabled={modalActivo !== null && !mostrarSubmenu}>Abono</button>

        {mostrarSubmenu && (
          <div className="submenu">
            <button onClick={() => manejarCambioVista('abono')}>Nuevo</button>
            <button onClick={() => manejarCambioVista('clientes')}>Renovar/Editar</button>
          </div>
        )}

        <button className={getButtonClass('cierredecaja')} onClick={() => handleAbrirModal('cierredecaja')}>Cierre de Caja</button>
        <button className={getButtonClass('cierreparcial')} onClick={() => handleAbrirModal('cierreparcial')}>Cierre Parcial</button>
        <button className={getButtonClass('incidente')} onClick={() => handleAbrirModal('incidente')}>Incidente</button>
        <button className={getButtonClass('config')} onClick={() => manejarCambioVista('config')} disabled={modalActivo !== null}>Config</button>
        <button className="boton-bot" onClick={handleEjecutarBot} disabled={modalActivo !== null}>BOT</button>
      </div>

      {mostrarModalEntrada && (
        <ModalHeader titulo="Registrar Entrada" onClose={() => {
          cancelarAutoImpresion();
          setMostrarModalEntrada(false);
        }}>
          <DatosAutoEntrada
            user={user}
            ticketPendiente={ticketPendiente}
            onClose={() => {
              cancelarAutoImpresion();
              setMostrarModalEntrada(false);
              setTicketPendiente(null);
            }}
            timestamp={timestamp}
            setTicketPendiente={setTicketPendiente}
            autoFocusOnMount
            onEntradaConfirmada={handleEntradaConfirmada}
          />
        </ModalHeader>
      )}
    </header>
  );
}

export default Header;
