import React, { useState, useEffect } from "react";
import "./DatosAutoEntradaAbono.css";

function DatosAutoEntradaAbono({ user }) {
  const [patente, setPatente] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState("");
  const [precios, setPrecios] = useState({});
  const [tiposVehiculoDisponibles, setTiposVehiculoDisponibles] = useState([]);

  // Al montar el componente, traemos precios, tipos y perfil usuario
  useEffect(() => {
    const fetchPrecios = async () => {
      try {
        const response = await fetch("https://api.garageia.com/api/precios");
        const data = await response.json();
        setPrecios(data);
      } catch (error) {
        console.error("Error al obtener los precios:", error);
        alert("No se pudieron cargar los precios.");
      }
    };

    const fetchTiposVehiculo = async () => {
      try {
        const response = await fetch("https://api.garageia.com/api/tipos-vehiculo");
        const data = await response.json();
        setTiposVehiculoDisponibles(data);
      } catch (error) {
        console.error("Error al obtener los tipos de vehículo:", error);
        alert("No se pudieron cargar los tipos de vehículo.");
      }
    };

    const fetchUserProfile = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("No estás logueado");
        return;
      }
      try {
        const response = await fetch("https://api.garageia.com/api/auth/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok) {
          setUser(data);
        } else {
          if (response.status === 401) {
            localStorage.removeItem("token");
            setUser(null);
            alert("Sesión expirada, por favor logueate de nuevo.");
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchPrecios();
    fetchTiposVehiculo();
    fetchUserProfile();
  }, []);

  const normalizar = (texto) => texto.toLowerCase();

  const handleEntrada = async () => {
    if (!user) {
      alert("No estás logueado");
      return;
    }
    console.log("Nombre del operador para enviar:", user.nombre);

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
      const checkResponse = await fetch(`https://api.garageia.com/api/vehiculos/${patente}`);
      if (checkResponse.ok) {
        existeVehiculo = true;
      }

      // monto que vamos a usar
      const monto = precios[tipoNormalizado].hora;

      if (!existeVehiculo) {
        // POST crea vehículo y entrada
        const vehiculoResponse = await fetch("https://api.garageia.com/api/vehiculos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patente,
            tipoVehiculo,
            abonado: false,
            operador: user.nombre,         // <— aquí mando el operador
            metodoPago: "Efectivo",         // <— y el método de pago
            monto                            // <— y el monto
          }),
        });
        const vehiculoData = await vehiculoResponse.json();
        if (!vehiculoResponse.ok) {
          throw new Error(vehiculoData.msg || "Error al registrar vehículo");
        }
        alert("Vehículo creado y entrada registrada.");
      } else {
        // PUT registra solo la entrada
        const entradaResponse = await fetch(
          `https://api.garageia.com/api/vehiculos/${patente}/registrarEntrada`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operador: user.nombre,   // <— y acá también mando el operador
              metodoPago: "Efectivo",
              monto
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
    // Regex para validar la patente *parcialmente* mientras se escribe:
    const regexParcial = /^[A-Z]{0,3}[0-9]{0,3}[A-Z]{0,2}$/;
    if (valor === "" || regexParcial.test(valor)) {
      setPatente(valor);
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
