import React, { useEffect, useState } from 'react';
import './DatosAutoTurnos.css';
import ModalMensaje from '../../ModalMensaje/ModalMensaje'; // ✅ Importar modal

const DatosAutoTurnos = ({ user }) => {
  const [turnos, setTurnos] = useState([]);
  const [patente, setPatente] = useState('');
  const [turnoSeleccionado, setTurnoSeleccionado] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [factura, setFactura] = useState('CC');
  const [precio, setPrecio] = useState(0);
  const [mensajeModal, setMensajeModal] = useState(""); // ✅ Estado para mensaje

  useEffect(() => {
    fetch('http://localhost:5000/api/tarifas/')
      .then(res => res.json())
      .then(data => {
        const turnosFiltrados = data.filter(t => t.tipo === 'turno');
        setTurnos(turnosFiltrados);
      })
      .catch(err => {
        console.error('Error al cargar los turnos:', err);
        setMensajeModal('Error al cargar los turnos.');
      });
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

    let tipoVehiculo;
    try {
      const resVehiculo = await fetch(`http://localhost:5000/api/vehiculos/${patente}`);
      if (!resVehiculo.ok) {
        setMensajeModal('Vehículo no encontrado');
        return;
      }
      const dataVehiculo = await resVehiculo.json();
      tipoVehiculo = dataVehiculo.tipoVehiculo;
      if (!tipoVehiculo) {
        setMensajeModal('Tipo de vehículo no definido');
        return;
      }
    } catch (err) {
      setMensajeModal('Error al obtener datos del vehículo.');
      return;
    }

    const duracionHoras = (turnoData.dias || 0) * 24 + (turnoData.horas || 0) + ((turnoData.minutos || 0) / 60);
    const ahora = new Date();
    const fin = new Date(ahora);
    fin.setMinutes(fin.getMinutes() + ((turnoData.dias || 0) * 1440) + ((turnoData.horas || 0) * 60) + (turnoData.minutos || 0));

    try {
      const resPrecio = await fetch('http://localhost:5000/api/precios/');
      const precios = await resPrecio.json();

      const nombreTarifa = turnoData.nombre.toLowerCase().trim();
      const precioVehiculo = precios[tipoVehiculo]?.[nombreTarifa];
      if (precioVehiculo === undefined) {
        setMensajeModal(`No se encontró un precio para "${turnoData.nombre}" y vehículo tipo "${tipoVehiculo}"`);
        return;
      }
      setPrecio(precioVehiculo);

      const payload = {
        patente,
        metodoPago,
        factura,
        duracionHoras,
        fin,
        nombreTarifa
      };

      const res = await fetch('http://localhost:5000/api/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        const datosMovimiento = {
          patente,
          descripcion: `Pago por Turno (${turnoData.nombre})`,
          operador: user?.nombre || 'Desconocido',
          tipoVehiculo,
          metodoPago,
          factura,
          monto: precioVehiculo,
          tipoTarifa: 'turno'
        };

        const resMovimiento = await fetch("http://localhost:5000/api/movimientos/registrar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datosMovimiento),
        });

        if (!resMovimiento.ok) {
          const errorMov = await resMovimiento.json();
          setMensajeModal('Turno registrado, pero error al crear movimiento: ' + (errorMov.error || JSON.stringify(errorMov)));
          return;
        }

        setMensajeModal('Turno y movimiento registrados correctamente');
        setPatente('');
        setTurnoSeleccionado('');
      } else {
        setMensajeModal('Error del servidor: ' + (data.error || JSON.stringify(data)));
      }

    } catch (err) {
      setMensajeModal('Error al consultar precios o registrar turno.');
      console.error(err);
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
            <option value="">Seleccione un turno</option>
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
            {["Efectivo", "Débito", "Crédito", "QR"].map((metodo) => (
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

        <button className="registrarTurno" type="submit">Registrar Turno</button>
      </form>

      {/* ✅ Modal de mensaje */}
      <ModalMensaje 
        titulo="Aviso"
        mensaje={mensajeModal}
        onClose={() => setMensajeModal("")}
      />
    </div>
  );
};

export default DatosAutoTurnos;
