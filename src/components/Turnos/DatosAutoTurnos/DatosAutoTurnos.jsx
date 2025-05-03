import React, { useEffect, useState } from 'react';
import './DatosAutoTurnos.css';

const DatosAutoTurnos = () => {
  const [turnos, setTurnos] = useState([]);
  const [patente, setPatente] = useState('');
  const [turnoSeleccionado, setTurnoSeleccionado] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [factura, setFactura] = useState('no');
  const [precio, setPrecio] = useState(0); // Estado para precio
  const [nombreTarifa, setNombreTarifa] = useState(''); // Estado para nombre de tarifa

  useEffect(() => {
    fetch('http://localhost:5000/api/tarifas/')
      .then((res) => res.json())
      .then((data) => {
        const turnosFiltrados = data.filter((t) => t.tipo === 'turno');
        setTurnos(turnosFiltrados);
      })
      .catch((err) => console.error('Error al cargar los turnos:', err));
  }, []);

  const handleSubmit = async () => {
    if (!patente || !turnoSeleccionado) {
      alert('Completá la patente y seleccioná un turno.');
      return;
    }

    const turnoData = turnos.find(t => t._id === turnoSeleccionado);
    if (!turnoData) {
      alert('Error interno: turno no encontrado.');
      return;
    }

    const duracionHoras = (turnoData.dias || 0) * 24 + (turnoData.horas || 0) + (turnoData.minutos || 0) / 60;
    const ahora = new Date();
    const fechaFin = new Date(ahora);
    fechaFin.setMinutes(fechaFin.getMinutes() + ((turnoData.dias || 0) * 1440) + ((turnoData.horas || 0) * 60) + (turnoData.minutos || 0));

    try {
      const resPrecio = await fetch('http://localhost:5000/api/precios/');
      const precios = await resPrecio.json();
      console.log('Precios cargados:', precios);

      const precioAuto = precios.auto || {};
      const nombreTarifa = turnoData.nombre.toLowerCase().trim(); // e.g. "4 horas"
      const precio = precioAuto[nombreTarifa];

      if (!precio) {
        alert(`No se encontró un precio para el turno "${turnoData.nombre}"`);
        return;
      }

      // Guardamos el precio y nombre de tarifa en los estados
      setPrecio(precio);
      setNombreTarifa(turnoData.nombre);

      const payload = {
        patente,
        turnoId: turnoSeleccionado,
        metodoPago: metodoPago.charAt(0).toUpperCase() + metodoPago.slice(1), 
        factura: factura === 'a' ? 'A' : factura === 'final' ? 'Final' : 'No', 
        precio,
        duracionHoras,
        fechaFin
      };

      console.log('Enviando payload:', payload);

      const res = await fetch('http://localhost:5000/api/turnos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.ok) {
        alert('Turno registrado correctamente');
        console.log('Respuesta del servidor:', data);
        setPatente('');
        setTurnoSeleccionado('');
      } else {
        alert('Error del servidor: ' + (data.error || JSON.stringify(data)));
      }
    } catch (err) {
      console.error('Error al obtener el precio:', err);
      alert('No se pudo obtener el precio.');
      return;
    }
  };

  return (
    <div className="turnos-container">
      <div className="turno-form">
        <div>
          <label htmlFor="patente">Patente</label>
          <input
            type="text"
            id="patente"
            value={patente}
            onChange={(e) => setPatente(e.target.value)}
            placeholder="Ingrese la patente"
          />
        </div>

        <div>
          <label htmlFor="turno">Seleccionar Turno</label>
          <select
            id="turno"
            value={turnoSeleccionado}
            onChange={(e) => setTurnoSeleccionado(e.target.value)}
            className="select-style"
          >
            <option value="">Seleccione un turno</option>
            {turnos.map((turno) => (
              <option key={turno._id} value={turno._id}>
                {turno.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="metodoPago">Método de Pago</label>
          <select
            id="metodoPago"
            value={metodoPago}
            onChange={(e) => setMetodoPago(e.target.value)}
            className="select-style"
          >
            <option value="efectivo">Efectivo</option>
            <option value="debito">Débito</option>
            <option value="credito">Crédito</option>
            <option value="qr">QR</option>
          </select>
        </div>

        <div>
          <label htmlFor="factura">Factura</label>
          <select
            id="factura"
            value={factura}
            onChange={(e) => setFactura(e.target.value)}
            className="select-style"
          >
            <option value="no">No</option>
            <option value="a">A</option>
            <option value="final">Consumidor Final</option>
          </select>
        </div>

        <button onClick={handleSubmit}>Registrar Turno</button>
      </div>
    </div>
  );
};

export default DatosAutoTurnos;
