import './Interfaz.css';
import React, { useState, useEffect } from 'react';
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
  const permitidas = [
    'Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End'
  ];
  // Permitir combos Ctrl/Cmd (copiar, pegar, etc.)
  if (e.ctrlKey || e.metaKey) return;
  if (permitidas.includes(e.key)) return;
  // Permitir solo dígitos
  if (!/^\d$/.test(e.key)) e.preventDefault();
};

function Interfaz() {
  const [vistaActual, setVistaActual] = useState('operador');
  const [modalActivo, setModalActivo] = useState(null);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [ticketPendiente, setTicketPendiente] = useState(null);

  // Cierre de Caja
  const [recaudado, setRecaudado] = useState('');  // solo dígitos
  const [enCaja, setEnCaja] = useState('');        // solo dígitos
  const [confirmandoCaja, setConfirmandoCaja] = useState(false);

  // Cierre Parcial
  const [montoParcial, setMontoParcial] = useState(''); // solo dígitos
  const [nombreParcial, setNombreParcial] = useState(''); // texto
  const [textoParcial, setTextoParcial] = useState('');   // texto

  // Incidente
  const [incidente, setIncidente] = useState('');

  const [mostrarOverlay, setMostrarOverlay] = useState(false);
  const [barreraIzqAbierta, setBarreraIzqAbierta] = useState(false);
  const [barreraDerAbierta, setBarreraDerAbierta] = useState(false);
  const [user, setUser] = useState(null);
  const [mensajeModal, setMensajeModal] = useState(null);
  const [timestamp, setTimestamp] = useState(Date.now());

  const navigate = useNavigate();

  // ✅ Cargar operador local inmediatamente
  useEffect(() => {
    const operadorStr = localStorage.getItem(OPERADOR_KEY);
    if (operadorStr) {
      try {
        const op = JSON.parse(operadorStr);
        if (op && op.username) setUser(op);
      } catch {}
    }
  }, []);

  // ✅ Refrescar con /profile (JWT) — requiere middleware en back
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
        if (data && data.username) {
          setUser(data);
          // mantener en localStorage sincronizado
          localStorage.setItem(OPERADOR_KEY, JSON.stringify(data));
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

  // 🔴 Helper: arma objeto operador estable para payloads
  const operadorPayload = () => {
    if (!user) return null;
    const { _id, username, nombre, apellido, role } = user;
    return { _id, username, nombre, apellido, role };
  };

  const enviarCierreDeCaja = async () => {
    const op = operadorPayload();
    if (!op) return;

    const { fecha, hora } = getFechaHora();
    const totalRecaudado = parseFloat(limpiarNumero(recaudado));
    const dejoEnCaja = parseFloat(limpiarNumero(enCaja));
    const totalRendido = totalRecaudado + dejoEnCaja;

    const data = {
      fecha,
      hora,
      totalRecaudado,
      dejoEnCaja,
      totalRendido,
      operador: op, // ✅ objeto, no string
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
          mensaje: 'Error al rendir caja: ' + (content.message || JSON.stringify(content)),
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
      operador: op, // ✅ objeto
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

      const dataAlerta = {
        fecha,
        hora,
        tipoDeAlerta: `Cierre Parcial ($${monto.toLocaleString('es-AR')})`,
        operador: op, // ✅ objeto
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
      operador: op, // ✅ objeto
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
    let fotoUrlTemporal = null;

    // 1) Disparar captura y esperar a que esté realmente disponible
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // ⬆️ 8s como en Config.jsx

      const resFoto = await fetch('http://localhost:5000/api/camara/sacarfoto', {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const json = await resFoto.json();
      if (json.exito) {
        // misma carpeta que Config, servida estática desde server.js ahora
        const bust = Date.now();
        const staticUrl = `http://localhost:5000/camara/sacarfoto/captura.jpg?t=${bust}`;

        // pequeño delay + HEAD para asegurar que el FS terminó de escribir
        await new Promise(r => setTimeout(r, 1200));
        const head = await fetch(staticUrl, { method: 'HEAD' });
        if (!head.ok) throw new Error('La imagen no está disponible (HEAD != 200)');

        fotoUrlTemporal = 'http://localhost:5000/camara/sacarfoto/captura.jpg';
      } else {
        console.warn("⚠️ No se pudo capturar foto:", json.mensaje);
      }
    } catch (err) {
      if (err.name === 'AbortError') console.warn("⏰ Timeout al intentar sacar la foto");
      else console.error("❌ Error al sacar foto:", err);
    }

    // 2) Crear ticket
    let ticketCreado = null;
    try {
      const resTicket = await fetch('http://localhost:5000/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      ticketCreado = await resTicket.json();

      // 3) Si hay foto temporal disponible, persistirla y asociarla al ticket
      if (fotoUrlTemporal && ticketCreado?.ticket?._id) {
        try {
          const putRes = await fetch(`http://localhost:5000/api/tickets/${ticketCreado.ticket._id}/foto`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fotoUrl: '/camara/sacarfoto/captura.jpg' }) // sin querystring
          });
          const updated = await putRes.json();
          if (putRes.ok && updated?.ticket) {
            ticketCreado.ticket = updated.ticket; // incluye ticket.fotoUrl permanente
          } else {
            console.warn('⚠️ No se pudo persistir la foto del ticket:', updated);
          }
        } catch (e) {
          console.warn('⚠️ Error persistiendo foto del ticket:', e);
        }
      }

      setTicketPendiente(ticketCreado.ticket);
    } catch (err) {
      console.error("❌ Error al crear ticket:", err);
      return;
    }

    // 4) Imprimir ticket
    try {
      const ticketNumFormateado = String(ticketCreado.ticket.ticket).padStart(6, '0');
      const textoTicket = `${ticketNumFormateado}`; // minimal
      await fetch('http://localhost:5000/api/ticket/imprimir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: textoTicket, ticketNumero: ticketNumFormateado }),
      });
    } catch (err) {
      console.error("❌ Error al imprimir ticket:", err);
    }

    // 5) Abrir barrera (como estaba)
    setTimeout(() => {
      setBarreraIzqAbierta(true);
      setTimeout(() => setBarreraIzqAbierta(false), 10000);
    }, 1500);
  };

  const totalRendidoPreview = () => {
    const rec = parseFloat(limpiarNumero(recaudado));
    const caja = parseFloat(limpiarNumero(enCaja));
    const suma = (!isNaN(rec) ? rec : 0) + (!isNaN(caja) ? caja : 0);
    return formatearVisualmente(String(suma));
  };

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
      />
      <div className="content">
        {vistaActual === 'operador' && (
          <Operador 
            ticketPendiente={ticketPendiente} 
            onAbrirBarreraSalida={abrirBarreraSalida}
            setTicketPendiente={forzarLimpiarTicket}
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

      {/* Modal: Cierre de Caja */}
      {modalActivo === 'cierredecaja' && (
        <ModalHeader titulo="Cierre de Caja" onClose={cerrarModal}>
          {!confirmandoCaja ? (
            <>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                onKeyDown={handleNumericKeyDown}
                className="modal-input"
                placeholder="Total Recaudado"
                value={formatearVisualmente(recaudado)}
                onChange={(e) => setRecaudado(limpiarNumero(e.target.value))}
              />
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                onKeyDown={handleNumericKeyDown}
                className="modal-input"
                placeholder="Dejo en Caja"
                value={formatearVisualmente(enCaja)}
                onChange={(e) => setEnCaja(limpiarNumero(e.target.value))}
              />
              <button className="modal-btn" disabled={!isCajaValida()} onClick={() => setConfirmandoCaja(true)}>
                Confirmar
              </button>
            </>
          ) : (
            <>
              <p>Total Recaudado: ${formatearVisualmente(recaudado)}</p>
              <p>Dejo en Caja: ${formatearVisualmente(enCaja)}</p>
              <p>Total Rendido: ${formatearVisualmente(String(parseFloat(limpiarNumero(recaudado)) + parseFloat(limpiarNumero(enCaja))))}</p>
              <button className="modal-btn" onClick={() => setConfirmandoCaja(false)}>Modificar</button>
              <button className="modal-btn" onClick={enviarCierreDeCaja}>Confirmar</button>
            </>
          )}
        </ModalHeader>
      )}

      {/* Modal: Cierre Parcial */}
      {modalActivo === 'cierreparcial' && (
        <ModalHeader titulo="Cierre Parcial" onClose={cerrarModal}>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            onKeyDown={handleNumericKeyDown}
            className="modal-input"
            placeholder="Monto"
            value={formatearVisualmente(montoParcial)}
            onChange={(e) => setMontoParcial(limpiarNumero(e.target.value))}
          />

          {/* 🆕 Nombre (opcional) */}
          <input
            type="text"
            className="modal-input"
            placeholder="Nombre (opcional)"
            value={nombreParcial}
            onChange={(e) => setNombreParcial(e.target.value)}
            maxLength={60}
          />

          {/* 🆕 Texto (opcional) */}
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

      {/* Modal: Incidente */}
      {modalActivo === 'incidente' && (
        <ModalHeader titulo="Incidente" onClose={cerrarModal}>
          <textarea
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

      {/* Modal de Mensajes */}
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