import React, { useEffect, useState } from 'react';
import './DatosAutoTurnos.css';

const DatosAutoTurnos = () => {
  const [turnos, setTurnos] = useState([]);
  const [patente, setPatente] = useState('');
  const [turnoSeleccionado, setTurnoSeleccionado] = useState('');

  useEffect(() => {
    fetch('https://parkingapp-back.onrender.com/api/tarifas/')
      .then((response) => response.json())
      .then((data) => {
        const turnosFiltrados = data.filter((turno) => turno.tipo === 'turno');
        setTurnos(turnosFiltrados);
      })
      .catch((error) => console.error('Error al cargar los turnos:', error));
  }, []);

  const handlePatenteChange = (e) => setPatente(e.target.value);
  const handleTurnoChange = (e) => setTurnoSeleccionado(e.target.value);

  const handleSubmit = () => {
    console.log('Registrar turno con patente:', patente, 'y turno:', turnoSeleccionado);
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
            onChange={handlePatenteChange}
            placeholder="Ingrese la patente"
            />
        </div>
        <div>
            <label htmlFor="turno">Seleccionar Turno</label>
            <select
            id="turno"
            value={turnoSeleccionado}
            onChange={handleTurnoChange}
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
        <button onClick={handleSubmit}>Registrar Turno</button>
      </div>
    </div>
  );
};

export default DatosAutoTurnos;
