import React, { useState, useEffect } from "react";
import "./DatosAutoEntradaAbono.css";

function DatosAutoEntradaAbono({ user, timestamp }) {
  const [patente, setPatente] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState("");
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
    if (!user) {
      alert("No estás logueado");
      return;
    }

    const regexCompleto = /^([A-Z]{3}[0-9]{3}|[A-Z]{2}[0-9]{3}[A-Z]{2})$/;
    if (!regexCompleto.test(patente)) {
      alert("La patente ingresada no es válida.");
      return;
    }
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

      const monto = precios[tipoNormalizado].hora;
      const fotoUrl = getFotoUrl(); // usamos la función para agregar la URL con timestamp

      if (!existeVehiculo) {
        const vehiculoResponse = await fetch("http://localhost:5000/api/vehiculos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patente,
            tipoVehiculo,
            abonado: false,
            operador: user.nombre,
            metodoPago: "Efectivo",
            monto,
            fotoUrl
          }),
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
              operador: user.nombre,
              metodoPago: "Efectivo",
              monto,
              fotoUrl
            }),
          }
        );
        const entradaData = await entradaResponse.json();
        if (!entradaResponse.ok) {
          throw new Error(entradaData.msg || "Error al registrar entrada");
        }
        alert("Entrada registrada correctamente.");
      }

      setPatente("");
      setTipoVehiculo("");
    } catch (error) {
      console.error("Error:", error.message);
      alert(error.message);
    }
  };

  const handlePatenteChange = (e) => {
    const valor = e.target.value.toUpperCase();
    const regexParcial = /^[A-Z]{0,3}[0-9]{0,3}[A-Z]{0,2}$/;
    if (valor === "" || regexParcial.test(valor)) {
      setPatente(valor);
    }
  };

  const getFotoUrl = () => {
    const baseUrl = "http://localhost:5000/camara/sacarfoto/captura.jpg";
    return `${baseUrl}?t=${timestamp}`;
  };

  return (
    <div className="datosAutoEntrada">
      <div className="fotoAutoEntrada">
        <img
          src={getFotoUrl()}
          alt="Foto auto"
          className="foto-vehiculo"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/img/default.jpg";
          }}
        />
      </div>
      <div className="formularioAuto">
        <label htmlFor="patente">Patente</label>
        <input
          id="patente"
          type="text"
          placeholder="Ingrese la patente"
          value={patente}
          onChange={handlePatenteChange}
          className="inputPatente"
          maxLength={8}
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
