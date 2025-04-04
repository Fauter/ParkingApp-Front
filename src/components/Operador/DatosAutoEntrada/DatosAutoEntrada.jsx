import React, { useState } from 'react';
import "./DatosAutoEntrada.css"
import { preciosHora } from "../../../utils/precios";


function DatosAutoEntrada() {
  const [patente, setPatente] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState('');
  const [abonado, setAbonado] = useState(false);

  const handleEntrada = async () => {
    if (!patente || !tipoVehiculo) {
      alert("Debe ingresar una patente y seleccionar un tipo de vehículo.");
      return;
    }

    try {
      // 1. Crear el vehículo si no existe
      const vehiculoResponse = await fetch("https://parkingapp-back.onrender.com/api/vehiculos", {
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
        `https://parkingapp-back.onrender.com/api/vehiculos/${patente}/registrarEntrada`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            operador: "Carlos",
            metodoPago: "Efectivo",
            monto: preciosHora[tipoVehiculo], 
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
    } catch (error) {
      console.error("Error:", error.message);
      alert(error.message);
    }
  };

  const handleAbonar = async () => {
    if (!patente || !tipoVehiculo) {
      alert("Debe ingresar una patente y seleccionar un tipo de vehículo.");
      return;
    }
  
    try {
      const response = await fetch("https://parkingapp-back.onrender.com/api/vehiculos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patente, tipoVehiculo, abonado: true }), // Directamente se envía como abonado
      });
  
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || "Error al registrar el vehículo como abonado");
      }
  
      alert("Vehículo abonado registrado correctamente.");
      setPatente("");
      setTipoVehiculo("");
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
          onChange={(e) => setPatente(e.target.value.toUpperCase())}
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