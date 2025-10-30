import './Interfaz.css';
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header/Header';
import PanelDerecho from './PanelDerecho/PanelDerecho';
import Operador from '../Operador/Operador';
import VehiculosDentro from '../VehiculosDentro/VehiculosDentro';
import Clientes from '../Clientes/Clientes';
import DetalleClienteCajero from '../Clientes/DetalleClienteCajero';
import Background from '../Background/Background';
import Abono from '../Abono/Abono';
import Turnos from '../Turnos/Turnos';
import ModalHeader from './Header/ModalHeader/ModalHeader';
import ModalMensaje from '../ModalMensaje/ModalMensaje';
import Config from '../Config/Config';

const TOKEN_KEY = 'token';
const OPERADOR_KEY = 'operador';

// ===== Helpers operador (double-parse & validación) =====
const readOperador = () => {
  const raw = localStorage.getItem(OPERADOR_KEY);
  if (!raw) return null;
  try {
    const first = JSON.parse(raw);
    if (first && typeof first === 'object') return first;
    if (typeof first === 'string') {
      try { const second = JSON.parse(first); return second && typeof second === 'object' ? second : null; }
      catch { return null; }
    }
    return null;
  } catch { return null; }
};
const isOperadorValido = (op) => !!(op && (op.username || op.nombre));

// Formatea con separadores de miles (.)
const formatearVisualmente = (valor) => {
  if (!valor && valor !== 0) return '';
  const s = valor.toString();
  if (!s) return '';
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};
// Deja solo dígitos (elimina todo lo que no sea 0-9)
const limpiarNumero = (valor) => (valor || '').replace(/[^\d]/g, '');
// Bloquea teclas no numéricas (permite navegación/edición)
const handleNumericKeyDown = (e) => {
  const permitidas = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'];
  if (e.ctrlKey || e.metaKey) return;
  if (permitidas.includes(e.key)) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
};

function Interfaz() {
  const [vistaActual, setVistaActual] = useState('operador');
  const [modalActivo, setModalActivo] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [ticketPendiente, setTicketPendiente] = useState(null);

  // Cierre de Caja
  const [recaudado, setRecaudado] = useState('');
  const [enCaja, setEnCaja] = useState('');
  const [confirmandoCaja, setConfirmandoCaja] = useState(false);

  // Cierre Parcial
  const [montoParcial, setMontoParcial] = useState('');
  const [nombreParcial, setNombreParcial] = useState('');
  const [textoParcial, setTextoParcial] = useState('');

  // Incidente
  const [incidente, setIncidente] = useState('');

  const [mostrarOverlay, setMostrarOverlay] = useState(false);
  const [barreraIzqAbierta, setBarreraIzqAbierta] = useState(false);
  const [barreraDerAbierta, setBarreraDerAbierta] = useState(false);
  const [user, setUser] = useState(null);
  const [mensajeModal, setMensajeModal] = useState(null);
  const [timestamp, setTimestamp] = useState(Date.now());

  // ⬇️ Estado levantado desde Header: modal de Registrar Entrada
  const [modalEntradaAbierto, setModalEntradaAbierto] = useState(false);

  const navigate = useNavigate();

  // -------------------- AUTOFOCUS Refs para MODALES --------------------
  const recaudadoRef = useRef(null);
  const enCajaRef = useRef(null);
  const montoParcialRef = useRef(null);
  const incidenteRef = useRef(null);

  useEffect(() => {
    if (modalActivo === 'cierredecaja' && !confirmandoCaja) {
      const t = setTimeout(() => recaudadoRef.current?.focus({ preventScroll: true }), 0);
      return () => clearTimeout(t);
    }
  }, [modalActivo, confirmandoCaja]);

  useEffect(() => {
    if (modalActivo === 'cierreparcial') {
      const t = setTimeout(() => montoParcialRef.current?.focus({ preventScroll: true }), 0);
      return () => clearTimeout(t);
    }
  }, [modalActivo]);

  useEffect(() => {
    if (modalActivo === 'incidente') {
      const t = setTimeout(() => incidenteRef.current?.focus({ preventScroll: true }), 0);
      return () => clearTimeout(t);
    }
  }, [modalActivo]);
  // --------------------------------------------------------------------

  // 🔐 Guard de entrada: si no hay operador válido, desloguea; si es cargaMensuales, redirige.
  useEffect(() => {
    const op = readOperador();
    if (!isOperadorValido(op)) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(OPERADOR_KEY);
      navigate('/login', { replace: true });
      return;
    }
    if (op.role === 'cargaMensuales') {
      navigate('/carga-mensuales', { replace: true });
      return;
    }
    setUser(op);
  }, [navigate]);

  // 🔄 Refresca perfil; si falla o viene inválido, desloguea. Si rol es cargaMensuales, redirige.
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        navigate('/login', { replace: true });
        return;
      }
      try {
        const response = await fetch('http://localhost:5000/api/auth/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to fetch user');
        const data = await response.json();

        if (data && (data.username || data.nombre)) {
          localStorage.setItem(OPERADOR_KEY, JSON.stringify(data));
          if (data.role === 'cargaMensuales') {
            navigate('/carga-mensuales', { replace: true });
            return;
          }
          setUser(data);
        } else {
          throw new Error('Perfil inválido');
        }
      } catch (error) {
        console.error('Error al obtener usuario:', error);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(OPERADOR_KEY);
        navigate('/login', { replace: true });
      }
    };
    fetchUser();
  }, [navigate]);

  const manejarSeleccionCliente = (idCliente) => {
    setClienteSeleccionado(idCliente);
    setVistaActual('detalleCliente');
  };

  const forzarLimpiarTicket = () => {
    setTicketPendiente(null);
    setTimestamp(Date.now());
  };

  const volverAClientes = () => {
    setClienteSeleccionado(null);
    setVistaActual('clientes');
  };

  const cerrarModal = () => {
    setModalActivo(null);
    setRecaudado('');
    setEnCaja('');
    setMontoParcial('');
    setNombreParcial('');
    setTextoParcial('');
    setIncidente('');
    setConfirmandoCaja(false);
  };

  const isCajaValida = () => {
    const rec = parseFloat(limpiarNumero(recaudado));
    const caja = parseFloat(limpiarNumero(enCaja));
    return !isNaN(rec) && !isNaN(caja) && rec >= 0 && caja >= 0;
  };

  const isMontoParcialValido = () => {
    const m = parseFloat(limpiarNumero(montoParcial));
    return !isNaN(m) && m >= 0;
  };

  const getFechaHora = () => {
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().slice(0, 5);
    return { fecha, hora };
  };

  const abrirBarreraSalida = () => {
    setBarreraDerAbierta(true);
    setTimeout(() => setBarreraDerAbierta(false), 10000);
  };

  // 👉 sigue existiendo para parcial/incidente (guardás objeto ahí)
  const operadorPayload = () => {
    if (!user) return null;
    const { _id, username, nombre, apellido, role } = user;
    return { _id, username, nombre, apellido, role };
  };

  // ✅ NUEVO: para CIERRE DE CAJA mandamos SOLO el _id a la API de cierres
  const getOperadorId = () => {
    return user?._id || readOperador()?._id || null;
  };

  // ============ NUEVO: soltar ticket (impresión) como el BOT pero para cierres ============
  const imprimirCierre = async (payload) => {
    try {
      // Solo disparamos, sin bloquear el flujo de la UI (similar al BOT)
      fetch('http://localhost:5000/api/tickets/imprimir-cierredecaja', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ''}`,
        },
        body: JSON.stringify(payload),
      }).catch(() => {});
    } catch (e) {
      // No bloqueamos nada si falla
      console.error('No se pudo disparar impresión de cierre:', e);
    }
  };
  // =========================================================================================

  const enviarCierreDeCaja = async () => {
    const operadorId = getOperadorId();
    if (!operadorId) return;

    const { fecha, hora } = getFechaHora();
    const totalRecaudado = parseFloat(limpiarNumero(recaudado));
    const efectivoEnCaja = parseFloat(limpiarNumero(enCaja));
    const totalRendido = totalRecaudado - efectivoEnCaja;

    const data = {
      fecha,
      hora,
      totalRecaudado,
      dejoEnCaja: efectivoEnCaja,
      totalRendido,
      operador: operadorId, // 👈 SOLO el ObjectId en la colección de cierres
    };

    try {
      const res = await fetch('http://localhost:5000/api/cierresDeCaja', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: JSON.stringify(data),
      });

      const content = await res.json();

      if (res.ok) {
        // 🔔 Disparamos impresión ANTES de limpiar token, usando datos locales + operador legible
        const opHuman = operadorPayload();
        imprimirCierre({
          tipo: 'cierreDeCaja',
          cierre: {
            fecha,
            hora,
            totalRecaudado,
            dejoEnCaja: efectivoEnCaja,
            totalRendido,
          },
          operador: opHuman, // para imprimir nombre/usuario
          _idCierre: content?._id || null
        });

        // Deslogueo
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(OPERADOR_KEY);

        if (localStorage.getItem(TOKEN_KEY)) {
          setMensajeModal({
            titulo: 'Error',
            mensaje: 'No se pudo desloguear, no se realizó el cierre de caja.',
            onClose: () => setMensajeModal(null)
          });
          return;
        }

        setMensajeModal({
          titulo: 'Éxito',
          mensaje: '¡Caja rendida correctamente! Has sido deslogueado.',
          onClose: () => {
            setMensajeModal(null);
            cerrarModal();
            navigate('/login', { replace: true });
          }
        });
      } else {
        console.error('Error al rendir caja:', content);
        setMensajeModal({
          titulo: 'Error',
          mensaje: 'Error al rendir caja: ' + (content?.message || JSON.stringify(content)),
          onClose: () => setMensajeModal(null)
        });
      }
    } catch (err) {
      console.error(err);
      setMensajeModal({
        titulo: 'Error',
        mensaje: 'Error en la conexión.',
        onClose: () => setMensajeModal(null)
      });
    }
  };

  const enviarCierreParcial = async () => {
    const op = operadorPayload();
    if (!op) return;

    const { fecha, hora } = getFechaHora();
    const monto = parseFloat(limpiarNumero(montoParcial));

    const dataCierreParcial = {
      fecha,
      hora,
      monto,
      nombre: nombreParcial || '',
      texto: textoParcial || '',
      operador: op,
    };

    try {
      const resCierreParcial = await fetch('http://localhost:5000/api/cierresDeCaja/parcial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: JSON.stringify(dataCierreParcial),
      });

      if (!resCierreParcial.ok) {
        setMensajeModal({
          titulo: 'Error',
          mensaje: 'Error al registrar cierre parcial.',
          onClose: () => setMensajeModal(null)
        });
        return;
      }

      const { fecha: f2, hora: h2 } = getFechaHora();
      const dataAlerta = {
        fecha: f2,
        hora: h2,
        tipoDeAlerta: `Cierre Parcial ($${monto.toLocaleString('es-AR')})`,
        operador: op,
      };

      const resAlerta = await fetch('http://localhost:5000/api/alertas/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: JSON.stringify(dataAlerta),
      });

      if (!resAlerta.ok) {
        setMensajeModal({
          titulo: 'Error',
          mensaje: 'Error al crear la alerta del cierre parcial.',
          onClose: () => setMensajeModal(null)
        });
        return;
      }

      // 🔔 Disparamos impresión del CIERRE PARCIAL (sin descripción, solo monto y nombre si hay)
      imprimirCierre({
        tipo: 'cierreParcial',
        parcial: {
          fecha,
          hora,
          monto,
          nombre: nombreParcial || ''
        },
        operador: op
      });

      setMensajeModal({
        titulo: 'Éxito',
        mensaje: 'Cierre parcial registrado y alerta creada.',
        onClose: () => {
          setMensajeModal(null);
          cerrarModal();
        }
      });
    } catch (err) {
      console.error(err);
      setMensajeModal({
        titulo: 'Error',
        mensaje: 'Error en la conexión.',
        onClose: () => setMensajeModal(null)
      });
    }
  };

  const enviarIncidente = async () => {
    const op = operadorPayload();
    if (!op) return;

    const { fecha, hora } = getFechaHora();

    const data = {
      fecha,
      hora,
      texto: incidente,
      operador: op,
    };

    try {
      const res = await fetch('http://localhost:5000/api/incidentes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY)}`,
        },
        body: JSON.stringify(data),
      });

      const content = await res.json();
      if (res.ok) {
        setMensajeModal({
          titulo: 'Éxito',
          mensaje: 'Incidente registrado.',
          onClose: () => {
            setMensajeModal(null);
            cerrarModal();
          }
        });
      } else {
        console.error('Error al registrar incidente:', content);
        setMensajeModal({
          titulo: 'Error',
          mensaje: 'Error al registrar incidente: ' + (content.message || JSON.stringify(content)),
          onClose: () => setMensajeModal(null)
        });
      }
    } catch (err) {
      console.error(err);
      setMensajeModal({
        titulo: 'Error',
        mensaje: 'Error en la conexión.',
        onClose: () => setMensajeModal(null)
      });
    }
  };

  const ejecutarBot = async () => {
    let capturaFallida = false;
    let fotoUrlTemporal = null;

    const capturaPromise = (async () => {
      try {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 3500);
        const res = await fetch('http://localhost:5000/api/camara/sacarfoto', { signal: controller.signal });
        clearTimeout(t);
        const json = await res.json().catch(() => ({}));
        if (json?.exito) {
          const bust = Date.now();
          const staticUrl = `http://localhost:5000/camara/sacarfoto/captura.jpg?t=${bust}`;
          await new Promise(r => setTimeout(r, 900));
          const head = await fetch(staticUrl, { method: 'HEAD' });
          if (head.ok) {
            fotoUrlTemporal = '/camara/sacarfoto/captura.jpg';
            return true;
          }
        }
        capturaFallida = true;
        return false;
      } catch (err) {
        capturaFallida = true;
        return false;
      }
    })();

    const ticketPromise = (async () => {
      const res = await fetch('http://localhost:5000/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return res.json();
    })();

    let ticketCreado = null;
    try {
      const [_, ticketJson] = await Promise.allSettled([capturaPromise, ticketPromise]);
      ticketCreado = ticketJson.status === 'fulfilled' ? ticketJson.value : null;
    } catch {}

    if (ticketCreado?.ticket?._id && fotoUrlTemporal) {
      try {
        const putRes = await fetch(`http://localhost:5000/api/tickets/${ticketCreado.ticket._id}/foto`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fotoUrl: fotoUrlTemporal })
        });
        if (putRes.ok) {
          const updated = await putRes.json().catch(() => null);
          if (updated?.ticket) ticketCreado.ticket = updated.ticket;
        }
      } catch {}
    }

    if (ticketCreado?.ticket) {
      setTicketPendiente({
        ...ticketCreado.ticket,
        capturaFallida: Boolean(capturaFallida),
        fotoUrl: fotoUrlTemporal || ticketCreado.ticket.fotoUrl || null,
      });
    }

    setTimeout(() => {
      setBarreraIzqAbierta(true);
      setTimeout(() => setBarreraIzqAbierta(false), 10000);
    }, 1500);
  };

  const totalRendidoPreview = () => {
    const rec = parseFloat(limpiarNumero(recaudado));
    const caja = parseFloat(limpiarNumero(enCaja));
    const resta = (!isNaN(rec) ? rec : 0) - (!isNaN(caja) ? caja : 0);
    return formatearVisualmente(String(resta));
  };

  const hayModalBloqueante =
    Boolean(modalActivo) || Boolean(mensajeModal) || Boolean(modalEntradaAbierto);

  return (
    <div className="interfaz">
      <Background />
      <Header
        cambiarVista={setVistaActual}
        vistaActiva={vistaActual}
        abrirModal={setModalActivo}
        setMostrarOverlay={setMostrarOverlay}
        modalActivo={modalActivo}
        onEjecutarBot={ejecutarBot}
        user={user}
        ticketPendiente={ticketPendiente}
        setTicketPendiente={setTicketPendiente}
        mostrarModalEntrada={modalEntradaAbierto}
        setMostrarModalEntrada={setModalEntradaAbierto}
      />
      <div className="content">
        {vistaActual === 'operador' && (
          <Operador 
            ticketPendiente={ticketPendiente} 
            onAbrirBarreraSalida={abrirBarreraSalida}
            setTicketPendiente={forzarLimpiarTicket}
            autoFocusSalida={!hayModalBloqueante}
          />
        )}
        {vistaActual === 'vehiculos' && <VehiculosDentro />}
        {vistaActual === 'turnos' && <Turnos />}
        {vistaActual === 'abono' && <Abono />}
        {vistaActual === 'clientes' && <Clientes onSeleccionarCliente={manejarSeleccionCliente} />}
        {vistaActual === 'detalleCliente' && clienteSeleccionado && (
          <DetalleClienteCajero 
            clienteId={clienteSeleccionado} 
            volver={volverAClientes} 
          />
        )}
        {vistaActual === 'config' && <Config />}
        <PanelDerecho 
          barreraIzquierdaAbierta={barreraIzqAbierta} 
          barreraDerechaAbierta={barreraDerAbierta} 
        />
      </div>

      {modalActivo === 'cierredecaja' && (
        <ModalHeader titulo="Cierre de Caja" onClose={cerrarModal}>
          {!confirmandoCaja ? (
            <>
              <label>Total en Caja</label>
              <input
                ref={recaudadoRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                onKeyDown={handleNumericKeyDown}
                className="modal-input"
                placeholder="Total en Caja"
                value={formatearVisualmente(recaudado)}
                onChange={(e) => setRecaudado(limpiarNumero(e.target.value))}
              />

              <label>Queda en Caja</label>
              <input
                ref={enCajaRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                onKeyDown={handleNumericKeyDown}
                className="modal-input"
                placeholder="Queda en Caja"
                value={formatearVisualmente(enCaja)}
                onChange={(e) => setEnCaja(limpiarNumero(e.target.value))}
              />

              <button className="modal-btn" disabled={!isCajaValida()} onClick={() => setConfirmandoCaja(true)}>
                Confirmar
              </button>
            </>
          ) : (
            <>
              <p>Total en Caja: ${formatearVisualmente(recaudado)}</p>
              <p>Queda en Caja: ${formatearVisualmente(enCaja)}</p>
              <p>Total Rendido: ${totalRendidoPreview()}</p>
              <button className="modal-btn" onClick={() => setConfirmandoCaja(false)}>Modificar</button>
              <button className="modal-btn" onClick={enviarCierreDeCaja}>Confirmar</button>
            </>
          )}
        </ModalHeader>
      )}

      {modalActivo === 'cierreparcial' && (
        <ModalHeader titulo="Cierre Parcial" onClose={cerrarModal}>
          <label>Monto</label>
          <input
            ref={montoParcialRef}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            onKeyDown={handleNumericKeyDown}
            className="modal-input"
            placeholder="Monto"
            value={formatearVisualmente(montoParcial)}
            onChange={(e) => setMontoParcial(limpiarNumero(e.target.value))}
          />

          <label>Nombre (opcional)</label>
          <input
            type="text"
            className="modal-input"
            placeholder="Nombre (opcional)"
            value={nombreParcial}
            onChange={(e) => setNombreParcial(e.target.value)}
            maxLength={60}
          />

          <label>Texto (opcional)</label>
          <textarea
            rows={3}
            className="modal-input"
            placeholder="Texto (opcional, máx. 300)"
            value={textoParcial}
            onChange={(e) => setTextoParcial(e.target.value)}
            maxLength={300}
          />

          <button className="modal-btn" disabled={!isMontoParcialValido()} onClick={enviarCierreParcial}>
            Confirmar
          </button>
        </ModalHeader>
      )}

      {modalActivo === 'incidente' && (
        <ModalHeader titulo="Incidente" onClose={cerrarModal}>
          <label>Descripción del Incidente</label>
          <textarea
            ref={incidenteRef}
            maxLength={300}
            rows={4}
            className="modal-input"
            placeholder="Describí el incidente (máx. 300 caracteres)"
            value={incidente}
            onChange={(e) => setIncidente(e.target.value)}
          />
          <button className="modal-btn" onClick={enviarIncidente}>Enviar</button>
        </ModalHeader>
      )}

      {mensajeModal && (
        <ModalMensaje
          titulo={mensajeModal.titulo}
          mensaje={mensajeModal.mensaje}
          onClose={mensajeModal.onClose}
        />
      )}
    </div>
  );
}

export default Interfaz;
