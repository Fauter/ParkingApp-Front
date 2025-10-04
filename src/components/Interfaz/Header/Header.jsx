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
  ticketPendiente,
  setTicketPendiente,
  // estado levantado
  mostrarModalEntrada,
  setMostrarModalEntrada
}) {
  const [mostrarSubmenu, setMostrarSubmenu] = useState(false);
  const [timestamp, setTimestamp] = useState(Date.now());
  const menuRef = useRef();

  // ⏱️ Timer de auto-impresión si no confirman en 20s
  const autoPrintTimerRef = useRef(null);

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

  // 🚨 Auto-impresión si no confirman en 20s
  useEffect(() => {
    if (autoPrintTimerRef.current) {
      clearTimeout(autoPrintTimerRef.current);
      autoPrintTimerRef.current = null;
    }

    if (mostrarModalEntrada && ticketPendiente?.ticket) {
      autoPrintTimerRef.current = setTimeout(async () => {
        try {
          if (mostrarModalEntrada) {
            const ticketNumFormateado = String(ticketPendiente.ticket).padStart(6, '0');
            await fetch('http://localhost:5000/api/ticket/imprimir', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                texto: ticketNumFormateado,
                ticketNumero: ticketNumFormateado
              }),
            });
          }
        } catch (e) {
          console.error('Auto-impresión fallida:', e);
        } finally {
          autoPrintTimerRef.current = null;
        }
      }, 20000); // 20s
    }

    return () => {
      if (autoPrintTimerRef.current) {
        clearTimeout(autoPrintTimerRef.current);
        autoPrintTimerRef.current = null;
      }
    };
  }, [mostrarModalEntrada, ticketPendiente]);

  const cancelarAutoImpresion = () => {
    if (autoPrintTimerRef.current) {
      clearTimeout(autoPrintTimerRef.current);
      autoPrintTimerRef.current = null;
    }
  };

  const handleEntradaConfirmada = () => {
    cancelarAutoImpresion();
  };

  return (
    <header className="topbar">
      <h1>Parking</h1>
      <div className="menu" ref={menuRef}>
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
