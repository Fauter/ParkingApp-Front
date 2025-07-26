import React, { useState, useEffect, useRef } from "react";
import "./DatosAutoSalida.css";
import { useTarifasData, calcularTarifaAPI } from "../../../hooks/tarifasService";
import ModalMensaje from "../../ModalMensaje/ModalMensaje";

import AutoPlaceHolder from "../../../../public/images/placeholder.png";
import AutoPlaceHolderNoimage from "../../../../public/images/placeholderNoimage.png";

function DatosAutoSalida({
  buscarVehiculo,
  vehiculoLocal,
  error,
  limpiarInputTrigger,
  onActualizarVehiculoLocal,
  onTarifaCalculada,
  onSalidaCalculada,
}) {
  const [inputPatente, setInputPatente] = useState("");
  const [tarifaCalculada, setTarifaCalculada] = useState(null);
  const { tarifas, precios, tiposVehiculo, parametros } = useTarifasData();
  const yaActualizado = useRef(false);
  const inputRef = useRef(null);
  const lastInputTime = useRef(0);
  const inputTimer = useRef(null);
  const isScanning = useRef(false);

  // Estado para modal de mensajes
  const [modalMensaje, setModalMensaje] = useState("");
  const [modalTitulo, setModalTitulo] = useState("Atención");

  // *** NUEVO estado para controlar la imagen mostrada ***
  const [imgSrc, setImgSrc] = useState(AutoPlaceHolder);

  // Limpiar input cuando se recibe el trigger
  useEffect(() => {
    if (limpiarInputTrigger) {
      setInputPatente("");
    }
  }, [limpiarInputTrigger]);

  // Limpiar input cuando no hay vehículo
  useEffect(() => {
    if (!vehiculoLocal) {
      setInputPatente("");
    }
  }, [vehiculoLocal]);

  // *** NUEVO efecto para actualizar imgSrc cuando cambia vehiculoLocal ***
  useEffect(() => {
    if (!vehiculoLocal) {
      // Sin vehículo: imagen por defecto
      setImgSrc(AutoPlaceHolder);
      return;
    }

    const fotoUrl = vehiculoLocal.estadiaActual?.fotoUrl;

    if (fotoUrl) {
      // Intentamos mostrar la foto real
      setImgSrc(`http://localhost:5000${fotoUrl}`);
    } else {
      // Si no hay foto, mostramos imagen "noimage"
      setImgSrc(AutoPlaceHolderNoimage);
    }
  }, [vehiculoLocal]);

  // Efecto para detectar lectura rápida (lector de tickets)
  useEffect(() => {
    const handleInput = (e) => {
      const currentTime = Date.now();
      const value = e.target.value;

      if (currentTime - lastInputTime.current < 100 && value.length === 10 && /^\d+$/.test(value)) {
        clearTimeout(inputTimer.current);
        isScanning.current = true;
        handleTicketScan(value);
      }

      lastInputTime.current = currentTime;

      if (value.length === 10 && /^\d+$/.test(value)) {
        clearTimeout(inputTimer.current);
        isScanning.current = true;
        inputTimer.current = setTimeout(() => {
          handleTicketScan(value);
        }, 200);
      }
    };

    const inputElement = inputRef.current;
    inputElement.addEventListener("input", handleInput);

    return () => {
      inputElement.removeEventListener("input", handleInput);
      clearTimeout(inputTimer.current);
    };
  }, []);

  // Función para procesar ticket escaneado
  const handleTicketScan = async (ticketNumber) => {
    try {
      const ticketNum = parseInt(ticketNumber, 10);

      if (isNaN(ticketNum)) {
        setModalTitulo("Error");
        setModalMensaje("Ticket inválido");
        isScanning.current = false;
        return;
      }

      const response = await fetch(`http://localhost:5000/api/vehiculos/ticket/${ticketNum}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Error:", errorData.msg);
        setModalTitulo("Error");
        setModalMensaje(`No se encontró vehículo con ticket ${ticketNum}`);
        isScanning.current = false;
        return;
      }

      const data = await response.json();
      await procesarVehiculoEncontrado(data);

      if (data.patente) {
        setInputPatente(data.patente);

        setTimeout(() => {
          const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            which: 13,
            bubbles: true,
          });
          inputRef.current.dispatchEvent(enterEvent);
          isScanning.current = false;
        }, 100);
      }
    } catch (err) {
      console.error("Error al buscar por ticket:", err);
      setModalTitulo("Error");
      setModalMensaje("Error al procesar el ticket escaneado");
      isScanning.current = false;
    }
  };

  // Función común para procesar vehículos encontrados (por patente o ticket)
  const procesarVehiculoEncontrado = async (data) => {
    if (!data.estadiaActual || !data.estadiaActual.entrada) {
      setModalTitulo("Error");
      setModalMensaje("El vehículo no tiene estadía en curso.");
      return;
    }

    const tieneEntrada = !!data.estadiaActual.entrada;
    const yaTieneSalida = !!data.estadiaActual.salida;
    const salidaTemporal = new Date().toISOString();

    if (tieneEntrada && !yaTieneSalida) {
      if (data.abonado) {
        await procesarSalidaAbonado(data, salidaTemporal);
        return;
      } else if (data.turno) {
        await procesarSalidaTurno(data, salidaTemporal);
        return;
      }
    }

    const actualizado = {
      ...data,
      estadiaActual: {
        ...data.estadiaActual,
        salida: salidaTemporal,
      },
    };

    if (onSalidaCalculada && !yaTieneSalida) {
      onSalidaCalculada(salidaTemporal);
    }

    onActualizarVehiculoLocal(actualizado);
  };

  // Función para procesar salida de vehículo abonado
  const procesarSalidaAbonado = async (vehiculo, salida) => {
    const resSalida = await fetch(
      `http://localhost:5000/api/vehiculos/${vehiculo.patente}/registrarSalida`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salida,
          costo: 0,
          tarifa: null,
        }),
      }
    );

    if (!resSalida.ok) {
      const errorData = await resSalida.json();
      setModalTitulo("Error");
      setModalMensaje(errorData.msg || "Error al registrar salida automática");
      return;
    }

    setModalTitulo("Éxito");
    setModalMensaje(`✅ Vehículo ${vehiculo.patente} (abonado) salió automáticamente.`);
    setInputPatente("");
  };

  // Función para procesar salida de vehículo con turno
  const procesarSalidaTurno = async (vehiculo, salida) => {
    const resSalida = await fetch(
      `http://localhost:5000/api/vehiculos/${vehiculo.patente}/registrarSalida`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salida,
          costo: 0,
          tarifa: null,
        }),
      }
    );

    if (!resSalida.ok) {
      setModalTitulo("Error");
      setModalMensaje("Error al registrar salida automática");
      return;
    }

    const resDesactivarTurno = await fetch(
      `http://localhost:5000/api/turnos/desactivar-por-patente/${vehiculo.patente}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!resDesactivarTurno.ok) {
      setModalTitulo("Error");
      setModalMensaje("Error al desactivar turno");
      return;
    }

    setModalTitulo("Éxito");
    setModalMensaje(`✅ Vehículo ${vehiculo.patente} con turno salió automáticamente.`);
    setInputPatente("");
  };

  // Manejar entrada manual de patente
  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && !isScanning.current) {
      const patenteBuscada = inputPatente.trim().toUpperCase();
      if (!patenteBuscada) return;

      try {
        const response = await fetch(`http://localhost:5000/api/vehiculos/${patenteBuscada}`);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.msg || "Vehículo no encontrado");
        }

        const data = await response.json();
        await procesarVehiculoEncontrado(data);
      } catch (err) {
        console.error("Error en la operación:", err);
        setModalTitulo("Error");
        setModalMensaje(err.message || "Error al procesar la salida.");
      }
    }
  };

  // Cálculo de tarifa cuando hay salida
  useEffect(() => {
    const entrada = vehiculoLocal?.estadiaActual?.entrada;
    const salida = vehiculoLocal?.estadiaActual?.salida;
    const costoTotal = vehiculoLocal?.estadiaActual?.costoTotal;

    if (!salida) {
      return;
    }

    const calcularTarifa = async () => {
      if (
        entrada &&
        salida &&
        (costoTotal === 0 || costoTotal === undefined || !yaActualizado.current)
      ) {
        const fechaEntrada = new Date(entrada);
        const fechaSalida = new Date(salida);
        const diferenciaMs = fechaSalida - fechaEntrada;
        const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
        const horas = Math.ceil(
          (diferenciaMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const horasFormateadas = `${String(horas).padStart(2, "0")}:00`;

        try {
          const result = await calcularTarifaAPI({
            tipoVehiculo: vehiculoLocal.tipoVehiculo,
            inicio: fechaEntrada.toISOString(),
            dias,
            hora: horasFormateadas,
            tarifaAbono: null,
            tipoTarifa: "estadia",
            tarifas,
            precios,
            parametros,
          });

          const match = result?.detalle?.match(/Total:\s*\$?([0-9,.]+)/i);
          const costo = match ? parseFloat(match[1].replace(",", "")) : null;

          if (costo !== null) {
            setTarifaCalculada(costo);

            if (
              vehiculoLocal?.patente &&
              vehiculoLocal?.estadiaActual?.costoTotal !== costo
            ) {
              const bodyData = { costoTotal: costo };

              const resActualizar = await fetch(
                `http://localhost:5000/api/vehiculos/${vehiculoLocal.patente}/costoTotal`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(bodyData),
                }
              );

              if (resActualizar.ok) {
                const actualizado = await resActualizar.json();
                yaActualizado.current = true;

                onActualizarVehiculoLocal({
                  ...actualizado.vehiculo,
                  costoTotal: costo,
                  estadiaActual: {
                    ...actualizado.vehiculo.estadiaActual,
                    costoTotal: costo,
                  },
                });
              } else {
                const errorJson = await resActualizar.json();
                console.error("Error al actualizar costoTotal:", errorJson.msg);
              }
            }
          }
        } catch (error) {
          console.error("Error al calcular tarifa:", error.message);
        }
      } else {
        console.log("❌ No se cumplen condiciones para calcular tarifa");
      }
    };

    calcularTarifa();
  }, [vehiculoLocal, tarifas, precios, parametros, onActualizarVehiculoLocal]);

  // Cálculo de tarifa temporal (previsualización)
  useEffect(() => {
    const calcularTarifaTemporal = async () => {
      if (vehiculoLocal?.estadiaActual?.entrada && !vehiculoLocal?.estadiaActual?.salida) {
        const entrada = new Date(vehiculoLocal.estadiaActual.entrada);
        const salida = new Date();
        const diferenciaMs = salida - entrada;
        const dias = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
        const horas = Math.ceil((diferenciaMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const horasFormateadas = `${String(horas).padStart(2, '0')}:00`;

        try {
          const result = await calcularTarifaAPI({
            tipoVehiculo: vehiculoLocal.tipoVehiculo,
            inicio: entrada.toISOString(),
            dias,
            hora: horasFormateadas,
            tarifaAbono: null,
            tipoTarifa: "estadia",
            tarifas,
            precios,
            parametros,
          });

          const match = result?.detalle?.match(/Total:\s*\$?([0-9,.]+)/i);
          const costo = match ? parseFloat(match[1].replace(",", "")) : null;

          if (costo !== null) {
            onTarifaCalculada({
              costo,
              salida: salida.toISOString(),
            });

            onActualizarVehiculoLocal({
              ...vehiculoLocal,
              estadiaActual: {
                ...vehiculoLocal.estadiaActual,
                salida: salida.toISOString(),
                costoTotal: costo,
              },
            });
          }
        } catch (error) {
          console.error("Error al calcular tarifa:", error.message);
        }
      }
    };

    calcularTarifaTemporal();
  }, [vehiculoLocal, tarifas, precios, parametros, onActualizarVehiculoLocal, onTarifaCalculada]);

  const entradaDate = vehiculoLocal?.estadiaActual?.entrada
    ? new Date(vehiculoLocal.estadiaActual.entrada)
    : null;

  const salidaDate = vehiculoLocal?.estadiaActual?.salida
    ? new Date(vehiculoLocal.estadiaActual.salida)
    : null;

  return (
    <>
      <div className="datosAutoSalida">
        <div className="fotoAutoSalida">
          <img
            src={imgSrc}
            alt="Auto"
            className="foto-vehiculo"
            onError={(e) => {
              e.target.onerror = null; // evita loop infinito
              setImgSrc(AutoPlaceHolderNoimage);
            }}
          />
        </div>

        <div className="detalleAutoSalida">
          <div className="patenteYTipo">
            <div className="patente">
              <input
                ref={inputRef}
                type="text"
                className="input-patente"
                placeholder="Ingresá la patente o escaneá el ticket"
                value={inputPatente}
                onChange={(e) => setInputPatente(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
            <div className="tipoVehiculo">
              {vehiculoLocal?.tipoVehiculo
                ? vehiculoLocal.tipoVehiculo.charAt(0).toUpperCase() +
                  vehiculoLocal.tipoVehiculo.slice(1)
                : "Sin datos"}
            </div>
          </div>

          <div className="horarios">
            <div className="container">
              <div>⬆</div>
              <div>{entradaDate ? entradaDate.toLocaleString() : "Sin Datos"}</div>
            </div>
            <div className="container">
              <div>⬇</div>
              <div>{salidaDate ? salidaDate.toLocaleString() : "Sin Datos"}</div>
            </div>
          </div>

          {error && <div className="error">{error}</div>}
        </div>
      </div>

      <ModalMensaje
        titulo={modalTitulo}
        mensaje={modalMensaje}
        onClose={() => setModalMensaje("")}
      />
    </>
  );
}

export default DatosAutoSalida;
