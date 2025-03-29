import React, { useState } from 'react';
import "./DatosAutoEntrada.css"

function DatosAutoEntrada() {
  const [patente, setPatente] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState('');

  return (
    <div className="datosAutoEntrada">
      {/* Foto del Auto */}
      <div className="fotoAutoEntrada">
        <img
          src="https://images.pexels.com/photos/452099/pexels-photo-452099.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500"
          alt="Auto"
        />
      </div>

      {/* Formulario de Patente y Tipo de Vehículo */}
      <div className="formularioAuto">
        <label htmlFor="patente">Patente</label>
        <input
          id="patente"
          type="text"
          placeholder="Ingrese la patente"
          value={patente}
          onChange={(e) => setPatente(e.target.value)}
          className="inputPatente"
        />

        <label htmlFor="tipoVehiculo">Tipo de Vehículo</label>
        <select
          id="tipoVehiculo"
          value={tipoVehiculo}
          onChange={(e) => setTipoVehiculo(e.target.value)}
          className="selectVehiculo"
        >
          <option value="">Seleccione un tipo</option>
          <option value="auto">Auto</option>
          <option value="camioneta">Camioneta</option>
          <option value="moto">Moto</option>
        </select>
      </div>
    </div>
  );
}

export default DatosAutoEntrada;