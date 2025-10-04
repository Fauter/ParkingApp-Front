// src/components/Turnos/DatosAutoTurnos/DatosAutoTurnos.jsx
import React, { useEffect, useState, useMemo } from 'react';
import './DatosAutoTurnos.css';
import ModalMensaje from '../../ModalMensaje/ModalMensaje';

const baseUrl = 'http://localhost:5000';

// Normalizador consistente (minúsculas + trim)
const normalizar = (str) => (str ?? '').toString().toLowerCase().trim();

// Capitaliza solo la primera letra (resto minúsculas)
const capitalizarPrimera = (str = '') => {
  const s = String(str).trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

// Indexa: idx[tipoN][tarifaN] = { precio, tarifaOriginal }
function indexarPrecios(preciosRaw) {
  const idx = {};
  const canonTipo = {};
  Object.entries(preciosRaw || {}).forEach(([tipo, tabla]) => {
    const tipoN = normalizar(tipo);
    canonTipo[tipoN] = tipo; // como viene del back
    idx[tipoN] = {};
    Object.entries(tabla || {}).forEach(([tarifa, valor]) => {
      const tarifaN = normalizar(tarifa);
      idx[tipoN][tarifaN] = { precio: Number(valor), tarifaOriginal: tarifa };
    });
  });
  return { idx, canonTipo };
}

const formatARS = (n) => {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  try {
    return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(n);
  } catch {
    return String(n);
  }
};

/* =======================
 * Modal de Confirmación
 * ======================= */
function ConfirmModal({ open, titulo, patente, nombreTurno, tipoVehiculo, precio, onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="cfm-backdrop" onClick={onCancel}>
      <div className="cfm-card" onClick={(e) => e.stopPropagation()}>
        <div className="cfm-header">
          <div className="cfm-icon">✓</div>
          <h2 className="cfm-title">{titulo || 'Confirmar'}</h2>
          <button className="cfm-close" onClick={onCancel} aria-label="Cerrar">×</button>
        </div>

        <div className="cfm-body">
          <div className="cfm-line">
            Vas a registrar un anticipado <span className="cfm-highlight">({nombreTurno})</span> para
            <span className="cfm-badge">{patente}</span>
          </div>
          <div className="cfm-line">
            Tipo de Vehículo: <span className="cfm-strong">{capitalizarPrimera(tipoVehiculo)}</span>
          </div>
          <div className="cfm-line">
            Precio: <span className="cfm-strong">$ {formatARS(precio)}</span>
          </div>
        </div>

        <div className="cfm-actions">
          <button className="cfm-btn cfm-btn-cancel" onClick={onCancel}>Cancelar</button>
          <button className="cfm-btn cfm-btn-confirm" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

const DatosAutoTurnos = ({ user }) => {
  const [turnos, setTurnos] = useState([]);

  // Dos catálogos
  const [preciosCashIdx, setPreciosCashIdx] = useState(null);  // { idx, canonTipo }
  const [preciosOtrosIdx, setPreciosOtrosIdx] = useState(null);

  // UI state
  const [patente, setPatente] = useState('');
  const [turnoSeleccionado, setTurnoSeleccionado] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [factura, setFactura] = useState('CC');

  // Para mensajes
  const [mensajeModal, setMensajeModal] = useState('');

  // Confirmación previa (usa ConfirmModal propio)
  const [confirm, setConfirm] = useState({
    open: false,
    titulo: '',
    patente: '',
    nombreTurno: '',
    tipoVehiculo: '',
    precio: 0,
    onConfirm: null,
    onCancel: null,
  });

  // Cache de vehículo consultado
  const [vehiculoCache, setVehiculoCache] = useState({ patente: '', tipoVehiculo: '' });

  // Carga inicial de tarifas (turnos) + ambos catálogos de precios
  useEffect(() => {
    (async () => {
      try {
        // Tarifas (filtramos por tipo 'turno')
        const resTarifas = await fetch(`${baseUrl}/api/tarifas/`, { cache: 'no-store' });
        if (!resTarifas.ok) throw new Error('No se pudo cargar tarifas');
        const dataTarifas = await resTarifas.json();
        const turnosFiltrados = (dataTarifas || []).filter(t => t.tipo === 'turno');
        setTurnos(turnosFiltrados);

        // Precios efectivo (con fallback a /api/precios?metodo=efectivo)
        let cash = {};
        try {
          const r1 = await fetch(`${baseUrl}/api/precios`, { cache: 'no-store' });
          if (!r1.ok) throw new Error('precios efectivo falló');
          cash = await r1.json();
        } catch {
          const r2 = await fetch(`${baseUrl}/api/precios?metodo=efectivo`, { cache: 'no-store' });
          if (!r2.ok) throw new Error('precios efectivo fallback falló');
          cash = await r2.json();
        }
        setPreciosCashIdx(indexarPrecios(cash));

        // Precios otros
        let other = {};
        try {
          const r3 = await fetch(`${baseUrl}/api/precios?metodo=otros`, { cache: 'no-store' });
          if (r3.ok) other = await r3.json();
        } catch {}
        setPreciosOtrosIdx(indexarPrecios(other));
      } catch (err) {
        console.error('Error al cargar datos iniciales:', err);
        setMensajeModal('Error al cargar turnos o precios.');
      }
    })();
  }, []);

  // Helper para conocer el índice de precios correspondiente al método
  const preciosActivo = useMemo(() => {
    return metodoPago === 'Efectivo' ? preciosCashIdx : preciosOtrosIdx;
  }, [metodoPago, preciosCashIdx, preciosOtrosIdx]);

  // Calcula el precio del turno según tipoVehiculo + nombre de turno + método
  const getPrecioTurno = (tipoVehiculoRaw, nombreTurno) => {
    if (!preciosActivo) return null;
    const tvKey = normalizar(tipoVehiculoRaw);
    const tarifaKey = normalizar(nombreTurno);
    const entry = preciosActivo.idx?.[tvKey]?.[tarifaKey];
    if (!entry || typeof entry.precio !== 'number' || !isFinite(entry.precio)) return null;
    return {
      precio: entry.precio,
      tarifaOriginal: entry.tarifaOriginal,
      tipoCanon: preciosActivo.canonTipo?.[tvKey] || tvKey
    };
  };

  // Obtiene datos del vehículo (y cachea por patente)
  const fetchVehiculoTipo = async (pat) => {
    const p = (pat || '').trim().toUpperCase();
    if (!p) throw new Error('Patente vacía');
    if (vehiculoCache.patente === p && vehiculoCache.tipoVehiculo) {
      return vehiculoCache.tipoVehiculo;
    }
    const resVehiculo = await fetch(`${baseUrl}/api/vehiculos/${encodeURIComponent(p)}`);
    if (!resVehiculo.ok) throw new Error('Vehículo no encontrado');
    const dataVehiculo = await resVehiculo.json();
    const tipoVehiculoRaw = dataVehiculo?.tipoVehiculo;
    if (!tipoVehiculoRaw) throw new Error('Tipo de vehículo no definido');
    setVehiculoCache({ patente: p, tipoVehiculo: tipoVehiculoRaw });
    return tipoVehiculoRaw;
  };

  // Acciones de registro (turno + movimiento) — devuelve info del turno creado para imprimir
  const registrarTurnoYMovimiento = async ({ patenteU, turnoData, tipoVehiculoRaw, precioTurno }) => {
    // Duración (horas/min/días)
    const minutosExtra =
      ((turnoData.dias || 0) * 1440) +
      ((turnoData.horas || 0) * 60) +
      (turnoData.minutos || 0);

    const duracionHoras =
      (turnoData.dias || 0) * 24 +
      (turnoData.horas || 0) +
      ((turnoData.minutos || 0) / 60);

    const ahora = new Date();
    const fin = new Date(ahora.getTime() + minutosExtra * 60 * 1000);

    // Registrar Turno
    const payloadTurno = {
      patente: patenteU,
      metodoPago,
      factura,
      duracionHoras,
      fin,
      nombreTarifa: precioTurno.tarifaOriginal,
      tipoVehiculo: normalizar(tipoVehiculoRaw),
    };

    const res = await fetch(`${baseUrl}/api/turnos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadTurno),
    });

    const dataTurno = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error('Error del servidor al crear turno: ' + (dataTurno?.error || JSON.stringify(dataTurno)));
    }

    // Registrar Movimiento
    const datosMovimiento = {
      patente: patenteU,
      descripcion: `Pago por Turno (${precioTurno.tarifaOriginal})`,
      operador: user?.nombre || 'Desconocido',
      tipoVehiculo: normalizar(tipoVehiculoRaw),
      metodoPago,
      factura,
      monto: precioTurno.precio,
      tipoTarifa: 'turno',
    };

    const resMovimiento = await fetch(`${baseUrl}/api/movimientos/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosMovimiento),
    });

    if (!resMovimiento.ok) {
      const errorMov = await resMovimiento.json().catch(() => ({}));
      throw new Error('Turno registrado, pero error al crear movimiento: ' + (errorMov.error || JSON.stringify(errorMov)));
    }

    // ➕ Devuelvo datos necesarios para imprimir
    return {
      dataTurno,
      precioTurno,
      tipoVehiculoRaw,
      fin,
      duracionHoras,
    };
  };

  // Submit con confirmación previa (usa ConfirmModal propio)
  const handleSubmit = async (event) => {
    event.preventDefault();

    const pat = (patente || '').trim().toUpperCase();
    if (!pat || !turnoSeleccionado) {
      setMensajeModal('Completá la patente y seleccioná un turno.');
      return;
    }

    const turnoData = turnos.find(t => t._id === turnoSeleccionado);
    if (!turnoData) {
      setMensajeModal('Error interno: turno no encontrado.');
      return;
    }

    try {
      // 1) Buscar tipo de vehículo
      const tipoVehiculoRaw = await fetchVehiculoTipo(pat);

      // 2) Calcular precio según método
      const precioTurno = getPrecioTurno(tipoVehiculoRaw, turnoData.nombre);
      if (!precioTurno) {
        const avisoMetodo = metodoPago === 'Efectivo'
          ? 'catálogo de efectivo (/api/precios)'
          : 'catálogo de otros (/api/precios?metodo=otros)';
        setMensajeModal(
          `No hay precio para tipo="${tipoVehiculoRaw}" y tarifa="${turnoData.nombre}" en ${avisoMetodo}.`
        );
        return;
      }

      // 3) Abrir confirmación con el modal nuevo
      setConfirm({
        open: true,
        titulo: 'Confirmar registro de Anticipado',
        patente: pat,
        nombreTurno: turnoData.nombre,
        tipoVehiculo: tipoVehiculoRaw,
        precio: precioTurno.precio,
        onConfirm: async () => {
          setConfirm(s => ({ ...s, open: false }));
          try {
            // Registrar en backend
            const { dataTurno, fin, duracionHoras } = await registrarTurnoYMovimiento({
              patenteU: pat,
              turnoData,
              tipoVehiculoRaw,
              precioTurno
            });

            // ===============================
            // 🖨️ Imprimir ANTICIPADO (nuevo)
            // ===============================
            try {
              // ticketNumero: preferimos 10 dígitos (controller igual paddea)
              const bruto = (dataTurno?.ticket ?? dataTurno?.numero ?? dataTurno?._id ?? Date.now()).toString();
              const ticketNumero10 = bruto.replace(/\D/g, '').padStart(10, '0').slice(-10);

              await fetch(`${baseUrl}/api/tickets/imprimir-anticipado`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  ticketNumero: ticketNumero10,
                  // el script acepta alias: valorAnticipado | precio | valorHora
                  valorAnticipado: `$${Number(precioTurno.precio).toLocaleString('es-AR')}`,
                  nombreTurno: turnoData.nombre,
                  patente: pat,
                  tipoVehiculo: tipoVehiculoRaw,

                  // (opcional, por si querés loguear más adelante)
                  metodoPago,
                  factura,
                  operador: user?.nombre || 'Desconocido',
                  fin: new Date(fin).toISOString(),
                  duracionHoras
                }),
              });
            } catch (e) {
              console.warn('Impresión de anticipado falló, se ignora:', e);
            }

            setMensajeModal('Turno y movimiento registrados correctamente');
            setPatente('');
            setTurnoSeleccionado('');
          } catch (e) {
            setMensajeModal(e.message || 'Error al registrar el turno o el movimiento.');
          }
        },
        onCancel: () => setConfirm(s => ({ ...s, open: false })),
      });
    } catch (err) {
      console.error(err);
      setMensajeModal(err?.message || 'Error al obtener datos del vehículo o calcular el precio.');
    }
  };

  return (
    <div className="turnos-container">
      <form className="turno-form" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="patente">Patente</label>
          <input
            type="text"
            id="patente"
            value={patente}
            onChange={e => setPatente(e.target.value.toUpperCase())}
            placeholder="Ingrese la patente"
          />
        </div>

        <div>
          <label htmlFor="turno">Seleccionar Anticipado</label>
          <select
            id="turno"
            value={turnoSeleccionado}
            onChange={e => setTurnoSeleccionado(e.target.value)}
            className="select-style"
          >
            <option value="">Seleccione un anticipado</option>
            {turnos.map(turno => (
              <option key={turno._id} value={turno._id}>
                {turno.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Método de Pago</label>
          <div className="paymentButtons">
            {['Efectivo', 'Transferencia', 'Débito', 'Crédito', 'QR'].map((metodo) => (
              <button
                key={metodo}
                type="button"
                className={metodoPago === metodo ? 'boton-turno-seleccionado' : 'boton-turno'}
                onClick={() => setMetodoPago(metodo)}
              >
                {metodo}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label>Factura</label>
          <div className="paymentButtons">
            {['CC', 'A', 'Final'].map((tipo) => (
              <button
                key={tipo}
                type="button"
                className={factura === tipo ? 'boton-turno-seleccionado' : 'boton-turno'}
                onClick={() => setFactura(tipo)}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        <button className="registrarTurno" type="submit">Registrar Anticipado</button>
      </form>

      {/* Modal informativo (aviso) */}
      <ModalMensaje
        titulo="Aviso"
        mensaje={mensajeModal}
        onClose={() => setMensajeModal('')}
      />

      {/* Modal de confirmación propio */}
      <ConfirmModal
        open={confirm.open}
        titulo={confirm.titulo}
        patente={confirm.patente}
        nombreTurno={confirm.nombreTurno}
        tipoVehiculo={confirm.tipoVehiculo}
        precio={confirm.precio}
        onConfirm={confirm.onConfirm}
        onCancel={confirm.onCancel}
      />
    </div>
  );
};

export default DatosAutoTurnos;
