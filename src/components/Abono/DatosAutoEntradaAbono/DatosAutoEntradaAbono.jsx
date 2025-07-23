import React, { useState, useEffect } from "react";
import "./DatosAutoEntradaAbono.css";
import ModalMensaje from "../../ModalMensaje/ModalMensaje";
import AutoPlaceHolder from "../../../../public/images/placeholder.png";

function DatosAutoEntradaAbono({ 
  user, 
  ticketPendiente, 
  onClose, 
  timestamp, 
  setTicketPendiente = () => {} 
}) {
  // Estados principales
  const [patente, setPatente] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState("");
  const [precios, setPrecios] = useState({});
  const [tiposVehiculoDisponibles, setTiposVehiculoDisponibles] = useState([]);

  // Estados para el modal
  const [modalMensaje, setModalMensaje] = useState("");
  const [modalTitulo, setModalTitulo] = useState("Atención");
  const [mostrarModal, setMostrarModal] = useState(false);

  // Foto para mostrar (preview)
  const [fotoUrl, setFotoUrl] = useState(AutoPlaceHolder);

  // Carga de precios y tipos al montar componente
  useEffect(() => {
    const fetchPrecios = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/precios");
        const data = await response.json();
        setPrecios(data);
      } catch (error) {
        mostrarMensaje("Error", "No se pudieron cargar los precios.");
        console.error("Error al obtener los precios:", error);
      }
    };

    const fetchTiposVehiculo = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/tipos-vehiculo");
        const data = await response.json();
        setTiposVehiculoDisponibles(data);
      } catch (error) {
        mostrarMensaje("Error", "No se pudieron cargar los tipos de vehículo.");
        console.error("Error al obtener los tipos de vehículo:", error);
      }
    };

    fetchPrecios();
    fetchTiposVehiculo();
  }, []);

  // Actualiza la foto cuando cambia ticketPendiente o timestamp
  useEffect(() => {
    if (ticketPendiente) {
      const url = ticketPendiente.fotoUrl
        ? `${ticketPendiente.fotoUrl}?t=${timestamp}`
        : `http://localhost:5000/camara/sacarfoto/captura.jpg?t=${timestamp}`;
      setFotoUrl(url);
    } else {
      setFotoUrl(AutoPlaceHolder);
    }
  }, [ticketPendiente, timestamp]);

  // Normalizar texto a minuscula para precios
  const normalizar = (texto) => texto.toLowerCase();

  // Eliminar foto temporal en backend
  const eliminarFotoTemporal = async () => {
    try {
      await fetch("http://localhost:5000/api/vehiculos/eliminar-foto-temporal", {
        method: "DELETE",
      });
    } catch (error) {
      console.error("Error al eliminar foto temporal:", error);
    }
  };

  // Mostrar modal con título y mensaje
  const mostrarMensaje = (titulo, mensaje) => {
    setModalTitulo(titulo);
    setModalMensaje(mensaje);
    setMostrarModal(true);
  };

  // Función para resetear todo el estado local y también el ticket pendiente vía prop
  const resetearEstadoCompleto = () => {
    setPatente("");
    setTipoVehiculo("");
    setFotoUrl(AutoPlaceHolder);
    setTicketPendiente(null);
  };

  // Función que maneja el cierre del modal y resetea estados si fue éxito
  const handleCerrarModal = () => {
    setMostrarModal(false);
    setModalMensaje("");

    if (modalTitulo === "Éxito") {
      resetearEstadoCompleto();
      
      if (typeof onClose === "function") {
        onClose();
      }
      if (typeof setTicketPendiente === "function") {
        setTicketPendiente(null);
      }
    }
  };

  // Validación y proceso de registrar entrada
  const handleEntrada = async () => {
    if (!user) {
      mostrarMensaje("Atención", "No estás logueado.");
      return;
    }

    if (!ticketPendiente) {
      mostrarMensaje("Atención", "Primero debes generar un ticket presionando el botón BOT.");
      return;
    }

    const regexCompleto = /^([A-Z]{3}[0-9]{3}|[A-Z]{2}[0-9]{3}[A-Z]{2})$/;
    if (!regexCompleto.test(patente)) {
      mostrarMensaje("Patente inválida", "La patente ingresada no es válida.");
      return;
    }

    if (!patente || !tipoVehiculo) {
      mostrarMensaje("Faltan datos", "Debe ingresar una patente y seleccionar un tipo de vehículo.");
      return;
    }

    const tipoNormalizado = normalizar(tipoVehiculo);
    if (!precios[tipoNormalizado]) {
      mostrarMensaje("Sin precios", "No se encontraron precios para el tipo de vehículo seleccionado.");
      return;
    }

    try {
      const fotoUrlActual = ticketPendiente.fotoUrl
        ? ticketPendiente.fotoUrl
        : "http://localhost:5000/camara/sacarfoto/captura.jpg";

      // Asociar ticket con vehículo
      const resAsociar = await fetch(
        `http://localhost:5000/api/tickets/${ticketPendiente._id}/asociar`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patente,
            tipoVehiculo,
            operadorNombre: user.nombre,
            fotoUrl: fotoUrlActual,
            esAbono: true
          }),
        }
      );

      const dataAsociar = await resAsociar.json();
      if (!resAsociar.ok) throw new Error(dataAsociar.msg || "Error al asociar ticket");

      // Verificar si el vehículo ya existe
      const checkResponse = await fetch(`http://localhost:5000/api/vehiculos/${patente}`);

      if (checkResponse.ok) {
        // Vehículo existe, registrar entrada de abono
        const entradaResponse = await fetch(
          `http://localhost:5000/api/vehiculos/${patente}/registrarEntrada`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operador: user.nombre,
              metodoPago: "Abono",
              monto: 0,
              ticket: ticketPendiente.ticket,
              entrada: ticketPendiente.creadoEn,
              fotoUrl: fotoUrlActual,
              esAbono: true
            }),
          }
        );
        if (!entradaResponse.ok) throw new Error("Error al registrar entrada de abono");
      } else {
        // Vehículo no existe, crear nuevo con abono
        const vehiculoResponse = await fetch("http://localhost:5000/api/vehiculos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patente,
            tipoVehiculo,
            abonado: true,
            operador: user.nombre,
            ticket: ticketPendiente.ticket,
            entrada: ticketPendiente.creadoEn,
            fotoUrl: fotoUrlActual,
            esAbono: true
          }),
        });
        if (!vehiculoResponse.ok) throw new Error("Error al registrar vehículo con abono");
      }

      // Eliminar foto temporal
      await eliminarFotoTemporal();

      // Reseteo local básico
      setPatente("");
      setTipoVehiculo("");
      setFotoUrl(AutoPlaceHolder);

      // Mostrar éxito
      mostrarMensaje("Éxito", `Entrada con abono registrada para ${patente}.`);
    } catch (error) {
      console.error("Error:", error.message);
      mostrarMensaje("Error", error.message || "Ocurrió un error al registrar el abono");
    }
  };

  // Control para que la patente sea mayúscula y válido parcialmente
  const handlePatenteChange = (e) => {
    const valor = e.target.value.toUpperCase();
    const regexParcial = /^[A-Z]{0,3}[0-9]{0,3}[A-Z]{0,2}$/;
    if (valor === "" || regexParcial.test(valor)) {
      setPatente(valor);
    }
  };

  return (
    <div className="datosAutoEntrada">
      <div className="fotoAutoEntrada">
        <img
          src={fotoUrl}
          alt="Foto auto"
          className="foto-vehiculo"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = AutoPlaceHolder;
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
          Registrar Entrada con Abono
        </button>
      </div>

      <ModalMensaje
        titulo={modalTitulo}
        mensaje={modalMensaje}
        onClose={handleCerrarModal}
        mostrar={mostrarModal}
      />
    </div>
  );
}

export default DatosAutoEntradaAbono;