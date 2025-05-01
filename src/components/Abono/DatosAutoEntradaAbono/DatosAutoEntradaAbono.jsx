import React, { useState, useEffect } from 'react';
import "./DatosAutoEntradaAbono.css";

function DatosAutoEntradaAbono({ setDatosVehiculo }) {
  const [patente, setPatente] = useState('');
  const [tipoVehiculo, setTipoVehiculo] = useState('');
  const [precios, setPrecios] = useState({});
  const [tiposVehiculoDisponibles, setTiposVehiculoDisponibles] = useState([]);

  useEffect(() => {
    const fetchPrecios = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/precios");
        const data = await response.json();
        setPrecios(data);
      } catch (error) {
        console.error("Error al obtener los precios:", error);
        alert("No se pudieron cargar los precios.");
      }
    };

    const fetchTiposVehiculo = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/tipos-vehiculo");
        const data = await response.json();
        setTiposVehiculoDisponibles(data);
      } catch (error) {
        console.error("Error al obtener los tipos de vehículo:", error);
        alert("No se pudieron cargar los tipos de vehículo.");
      }
    };

    fetchPrecios();
    fetchTiposVehiculo();
  }, []);

  const normalizar = (texto) => texto.toLowerCase();

  const handleEntrada = async () => {
    if (!patente || !tipoVehiculo) {
      alert("Debe ingresar una patente y seleccionar un tipo de vehículo.");
      return;
    }

    const tipoNormalizado = normalizar(tipoVehiculo);

    if (!precios[tipoNormalizado]) {
      alert("No se encontraron precios para el tipo de vehículo seleccionado.");
      return;
    }

    try {
      let existeVehiculo = false;

      const checkResponse = await fetch(`http://localhost:5000/api/vehiculos/${patente}`);
      if (checkResponse.ok) {
        existeVehiculo = true;
      }

      if (!existeVehiculo) {
        const vehiculoResponse = await fetch("http://localhost:5000/api/vehiculos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patente, tipoVehiculo, abonado: false }),
        });

        const vehiculoData = await vehiculoResponse.json();
        if (!vehiculoResponse.ok) {
          throw new Error(vehiculoData.msg || "Error al registrar vehículo");
        }

        alert("Vehículo creado y entrada registrada.");
      } else {
        const entradaResponse = await fetch(
          `http://localhost:5000/api/vehiculos/${patente}/registrarEntrada`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operador: "Carlos",
              metodoPago: "Efectivo",
              monto: precios[tipoNormalizado].hora,
            }),
          }
        );

        const entradaData = await entradaResponse.json();
        if (!entradaResponse.ok) {
          throw new Error(entradaData.msg || "Error al registrar entrada");
        }

        alert("Entrada registrada correctamente.");
      }

      // ⬇️ Mandar datos al padre después de registrar entrada
      setDatosVehiculo({ patente, tipoVehiculo });

      // Limpiar campos
      setPatente("");
      setTipoVehiculo("");
    } catch (error) {
      console.error("Error:", error.message);
      alert(error.message);
    }
  };

  return (
    <div className="datosAutoEntrada">
      <div className="fotoAutoEntrada">
        <img
          src="https://images.pexels.com/photos/452099/pexels-photo-452099.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500"
          alt="Auto"
        />
      </div>

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
          {tiposVehiculoDisponibles.map((tipo) => (
            <option key={tipo} value={tipo}>
              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
            </option>
          ))}
        </select>

        <button className="btn-entrada" onClick={handleEntrada}>
          Registrar Entrada
        </button>
      </div>
    </div>
  );
}

export default DatosAutoEntradaAbono;
