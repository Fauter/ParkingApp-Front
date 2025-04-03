import React, { useState } from 'react';
import "./DatosAutoEntrada.css"

function DatosAutoEntrada({ setVehiculoLocal }) {
  const [patente, setPatente] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState('');

  const handleEntrada = async () => {
    if (!patente || !tipoVehiculo) {
      alert("Debe ingresar una patente y seleccionar un tipo de vehículo.");
      return;
    }

    try {
      // 1. Crear el vehículo si no existe
      const vehiculoResponse = await fetch("http://localhost:5000/api/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patente, tipoVehiculo, abonado: false }),
      });

      const vehiculoData = await vehiculoResponse.json();
      if (!vehiculoResponse.ok) {
        throw new Error(vehiculoData.msg || "Error al registrar vehículo");
      }

      // 2. Registrar la entrada automáticamente
      const entradaResponse = await fetch(
        `http://localhost:5000/api/vehiculos/${patente}/registrarEntrada`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operador: "Carlos",
            metodoPago: "Efectivo",
            monto: 2400, // Monto por hora
          }),
        }
      );

      const entradaData = await entradaResponse.json();
      if (!entradaResponse.ok) {
        throw new Error(entradaData.msg || "Error al registrar entrada");
      }

      alert("Vehículo registrado y entrada confirmada.");
      setPatente("");
      setTipoVehiculo("");

      setVehiculoLocal({
        patente,
        tipoVehiculo,
        abonado: false,
        abonoExpira: null,
        cashback: 0,
        historialEstadias: [
          {
            entrada: new Date().toISOString(), // Hora actual de entrada
            salida: null, // Se llenará cuando salga
            costoTotal: 0, // Se calculará cuando salga
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    } catch (error) {
      console.error("Error:", error.message);
      alert(error.message);
    }
  };

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
        </select>

        <button onClick={handleEntrada}>Registrar Entrada</button>
      </div>
    </div>
  );
}

export default DatosAutoEntrada;