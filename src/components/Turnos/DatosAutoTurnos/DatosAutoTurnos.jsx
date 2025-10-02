// src/components/Turnos/DatosAutoTurnos/DatosAutoTurnos.jsx
import React, { useEffect, useState } from 'react';
import './DatosAutoTurnos.css';
import ModalMensaje from '../../ModalMensaje/ModalMensaje';

// 🔹 URL base configurable
const baseUrl = 'http://localhost:5000';

// Normalizador consistente (minúsculas + trim)
const normalizar = (str) => (str ?? '').toString().toLowerCase().trim();

/**
 * Construye:
 * - idx[tipoN][tarifaN] = { precio, tarifaOriginal }
 * - canonTipo[tipoN] = "auto" | "moto" | ...
 */
function indexarPrecios(preciosRaw) {
  const idx = {};
  const canonTipo = {};
  Object.entries(preciosRaw || {}).forEach(([tipo, tabla]) => {
    const tipoN = normalizar(tipo);
    canonTipo[tipoN] = tipo; // como viene del back
    idx[tipoN] = {};
    Object.entries(tabla || {}).forEach(([tarifa, valor]) => {
      const tarifaN = normalizar(tarifa);
      idx[tipoN][tarifaN] = { precio: valor, tarifaOriginal: tarifa };
    });
  });
  return { idx, canonTipo };
}

const DatosAutoTurnos = ({ user }) => {
  const [turnos, setTurnos] = useState([]);
  const [preciosIdx, setPreciosIdx] = useState(null); // { idx, canonTipo }

  const [patente, setPatente] = useState('');
  const [turnoSeleccionado, setTurnoSeleccionado] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [factura, setFactura] = useState('CC');
  const [precio, setPrecio] = useState(0);
  const [mensajeModal, setMensajeModal] = useState('');

  // Carga inicial
  useEffect(() => {
    (async () => {
      try {
        const [resTarifas, resPrecios] = await Promise.all([
          fetch(`${baseUrl}/api/tarifas/`),
          fetch(`${baseUrl}/api/precios/`)
        ]);

        if (!resTarifas.ok) throw new Error('No se pudo cargar tarifas');
        if (!resPrecios.ok) throw new Error('No se pudo cargar precios');

        const dataTarifas = await resTarifas.json();
        const dataPrecios = await resPrecios.json();

        const turnosFiltrados = (dataTarifas || []).filter(t => t.tipo === 'turno');
        setTurnos(turnosFiltrados);

        setPreciosIdx(indexarPrecios(dataPrecios));
      } catch (err) {
        console.error('Error al cargar datos iniciales:', err);
        setMensajeModal('Error al cargar turnos o precios.');
      }
    })();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!patente || !turnoSeleccionado) {
      setMensajeModal('Completá la patente y seleccioná un turno.');
      return;
    }

    const turnoData = turnos.find(t => t._id === turnoSeleccionado);
    if (!turnoData) {
      setMensajeModal('Error interno: turno no encontrado.');
      return;
    }

    // 1) Traer vehículo para conocer el tipo
    let tipoVehiculoRaw;
    try {
      const resVehiculo = await fetch(`${baseUrl}/api/vehiculos/${encodeURIComponent(patente.trim())}`);
      if (!resVehiculo.ok) {
        setMensajeModal('Vehículo no encontrado');
        return;
      }
      const dataVehiculo = await resVehiculo.json();
      tipoVehiculoRaw = dataVehiculo?.tipoVehiculo;
      if (!tipoVehiculoRaw) {
        setMensajeModal('Tipo de vehículo no definido');
        return;
      }
    } catch (err) {
      console.error(err);
      setMensajeModal('Error al obtener datos del vehículo.');
      return;
    }

    // 2) Calcular duración y fin
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

    // 3) Buscar precio con índice normalizado y armar claves
    try {
      if (!preciosIdx) {
        setMensajeModal('Tabla de precios no disponible.');
        return;
      }

      const tvKey = normalizar(tipoVehiculoRaw);         // fuerza minúsculas
      const tarifaKey = normalizar(turnoData.nombre);    // ej "4 horas"

      const entry = preciosIdx.idx?.[tvKey]?.[tarifaKey];
      if (!entry) {
        const disponiblesTipo = Object.keys(preciosIdx.idx?.[tvKey] || {}).join(', ');
        setMensajeModal(
          `No se encontró precio para tipo="${tipoVehiculoRaw}" y tarifa="${turnoData.nombre}". ` +
          (disponiblesTipo ? `Tarifas disponibles para ${preciosIdx.canonTipo[tvKey] || tvKey}: ${disponiblesTipo}` : 'No hay tarifas para ese tipo.')
        );
        return;
      }

      const precioVehiculo = entry.precio;
      const nombreTarifaCanonica = entry.tarifaOriginal; // p. ej. "4 horas"
      const tipoVehiculoLower = tvKey;                   // 🔻 garantizo minúsculas

      setPrecio(precioVehiculo);

      // 4) Registrar Turno — mandamos tipoVehiculo en minúscula
      const payload = {
        patente: patente.trim().toUpperCase(),
        metodoPago,
        factura,
        duracionHoras,
        fin,
        nombreTarifa: nombreTarifaCanonica,
        tipoVehiculo: tipoVehiculoLower, // 🔻 clave
      };

      const res = await fetch(`${baseUrl}/api/turnos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMensajeModal('Error del servidor al crear turno: ' + (data?.error || JSON.stringify(data)));
        return;
      }

      // 5) Registrar Movimiento (si lo querés desde UI)
      const datosMovimiento = {
        patente: patente.trim().toUpperCase(),
        descripcion: `Pago por Turno (${nombreTarifaCanonica})`,
        operador: user?.nombre || 'Desconocido',
        tipoVehiculo: tipoVehiculoLower, // mantengo minúscula
        metodoPago,
        factura,
        monto: precioVehiculo,
        tipoTarifa: 'turno'
      };

      const resMovimiento = await fetch(`${baseUrl}/api/movimientos/registrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datosMovimiento),
      });

      if (!resMovimiento.ok) {
        const errorMov = await resMovimiento.json().catch(() => ({}));
        setMensajeModal('Turno registrado, pero error al crear movimiento: ' + (errorMov.error || JSON.stringify(errorMov)));
        return;
      }

      setMensajeModal('Turno y movimiento registrados correctamente');
      setPatente('');
      setTurnoSeleccionado('');
      setPrecio(0);
    } catch (err) {
      console.error(err);
      setMensajeModal('Error al registrar el turno o el movimiento.');
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
          <label htmlFor="turno">Seleccionar Turno</label>
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
            {["Efectivo", "Transferencia", "Débito", "Crédito", "QR"].map((metodo) => (
              <button
                key={metodo}
                type="button"
                className={metodoPago === metodo ? "boton-turno-seleccionado" : "boton-turno"}
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
            {["CC", "A", "Final"].map((tipo) => (
              <button
                key={tipo}
                type="button"
                className={factura === tipo ? "boton-turno-seleccionado" : "boton-turno"}
                onClick={() => setFactura(tipo)}
              >
                {tipo}
              </button>
            ))}
          </div>
        </div>

        <button className="registrarTurno" type="submit">Registrar Anticipado</button>
      </form>

      <ModalMensaje
        titulo="Aviso"
        mensaje={mensajeModal}
        onClose={() => setMensajeModal("")}
      />
    </div>
  );
};

export default DatosAutoTurnos;
