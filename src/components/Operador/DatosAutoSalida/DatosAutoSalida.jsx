import React, { useState, useEffect, useRef } from "react";
import "./DatosAutoSalida.css";
import {
  useTarifasData,
  calcularAmbosPrecios,
  armarParametrosTiempo,
} from "../../../hooks/tarifasService";
import ModalMensaje from "../../ModalMensaje/ModalMensaje";
import AutoPlaceHolder from "../../../../public/images/placeholder.png";
import AutoPlaceHolderNoimage from "../../../../public/images/placeholderNoimage.png";
import { HiArrowRight, HiX } from "react-icons/hi";

// ===== DEBUG helpers =====
const DBG = true;
const log = (...a) => DBG && console.log("[Salida]", ...a);
const group = (t) => DBG && console.group("[Salida]", t);
const groupEnd = () => DBG && console.groupEnd();

function DatosAutoSalida({
  buscarVehiculo,
  vehiculoLocal,
  error,
  limpiarInputTrigger,
  onActualizarVehiculoLocal,
  onTarifaCalculada,
  onSalidaCalculada,
  autoFocusActivo = true,
}) {
  const [inputPatente, setInputPatente] = useState("");

  // Catálogo completo (efectivo + otros)
  const { tarifas, preciosEfectivo, preciosOtros, parametros } = useTarifasData();

  const yaActualizado = useRef(false);
  const inputRef = useRef(null);
  const lastInputTime = useRef(0);
  const inputTimer = useRef(null);
  const isScanning = useRef(false);

  const [modalMensaje, setModalMensaje] = useState("");
  const [modalTitulo, setModalTitulo] = useState("Atención");
  const [imgSrc, setImgSrc] = useState(AutoPlaceHolder);

  useEffect(() => {
    if (autoFocusActivo) {
      const t = setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
      return () => clearTimeout(t);
    }
  }, [autoFocusActivo]);

  useEffect(() => {
    if (limpiarInputTrigger) setInputPatente("");
  }, [limpiarInputTrigger]);

  useEffect(() => {
    if (!vehiculoLocal) setInputPatente("");
  }, [vehiculoLocal]);

  useEffect(() => {
    if (!vehiculoLocal) {
      setImgSrc(AutoPlaceHolder);
      return;
    }
    const fotoUrl = vehiculoLocal.estadiaActual?.fotoUrl;
    if (fotoUrl) setImgSrc(/^https?:\/\//i.test(fotoUrl) ? fotoUrl : `http://localhost:5000${fotoUrl}`);
    else setImgSrc(AutoPlaceHolderNoimage);
  }, [vehiculoLocal]);

  // ---- lector rápido de tickets (igual que antes) ----
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
        inputTimer.current = setTimeout(() => handleTicketScan(value), 200);
      }
    };

    const inputElement = inputRef.current;
    inputElement?.addEventListener("input", handleInput);
    return () => {
      inputElement?.removeEventListener("input", handleInput);
      clearTimeout(inputTimer.current);
    };
  }, []);

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
          const enterEvent = new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true });
          inputRef.current?.dispatchEvent(enterEvent);
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
      if (data.abonado) return await procesarSalidaAbonado(data, salidaTemporal);
      if (data.turno)   return await procesarSalidaTurno(data, salidaTemporal);
    }

    const actualizado = {
      ...data,
      estadiaActual: { ...data.estadiaActual, salida: salidaTemporal },
    };

    if (onSalidaCalculada && !yaTieneSalida) onSalidaCalculada(salidaTemporal);
    onActualizarVehiculoLocal(actualizado);
  };

  const procesarSalidaAbonado = async (vehiculo, salida) => {
    const resSalida = await fetch(
      `http://localhost:5000/api/vehiculos/${vehiculo.patente}/registrarSalida`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salida, costo: 0, tarifa: null }) }
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

  const procesarSalidaTurno = async (vehiculo, salida) => {
    const resSalida = await fetch(
      `http://localhost:5000/api/vehiculos/${vehiculo.patente}/registrarSalida`,
      { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ salida, costo: 0, tarifa: null }) }
    );
    if (!resSalida.ok) {
      setModalTitulo("Error");
      setModalMensaje("Error al registrar salida automática");
      return;
    }

    const resDesactivarTurno = await fetch(
      `http://localhost:5000/api/turnos/desactivar-por-patente/${vehiculo.patente}`,
      { method: "PATCH", headers: { "Content-Type": "application/json" } }
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

  const submitPatente = async () => {
    if (isScanning.current) return;
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
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter" && !isScanning.current) submitPatente();
  };

  /** ========= CÁLCULO CENTRAL ========= */
  useEffect(() => {
    const entrada = vehiculoLocal?.estadiaActual?.entrada;
    const salida = vehiculoLocal?.estadiaActual?.salida;
    const costoTotal = vehiculoLocal?.estadiaActual?.costoTotal;

    if (!entrada || !salida) return;

    const calc = async () => {
      group("CALC con salida seteada");
      log("entrada:", entrada, "salida:", salida, "costoTotal actual:", costoTotal);

      try {
        const { dias, horasFormateadas } = armarParametrosTiempo(entrada, salida);
        log("→ params:", { dias, horasFormateadas });

        const { costoEfectivo, costoOtros } = await calcularAmbosPrecios({
          tipoVehiculo: vehiculoLocal.tipoVehiculo,
          inicio: new Date(entrada).toISOString(),
          dias,
          hora: horasFormateadas,
          tarifas,
          preciosEfectivo,
          preciosOtros,
          parametros,
        });

        log("totales calculados → efectivo:", costoEfectivo, "otros:", costoOtros);

        // ⬅️ COMPAT: mando también `costo` = costoEfectivo
        onTarifaCalculada?.({ salida, costo: costoEfectivo, costoEfectivo, costoOtros, tarifa: null });

        // persistimos al back SOLO si costoTotal no existe/0
        const necesitaPersistir = (costoTotal === 0 || costoTotal === undefined) && typeof costoEfectivo === "number";
        log("necesitaPersistir:", necesitaPersistir);

        if (necesitaPersistir && vehiculoLocal?.patente) {
          const resActualizar = await fetch(
            `http://localhost:5000/api/vehiculos/${vehiculoLocal.patente}/costoTotal`,
            { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ costoTotal: costoEfectivo }) }
          );

          if (resActualizar.ok) {
            const actualizado = await resActualizar.json();
            yaActualizado.current = true;
            onActualizarVehiculoLocal({
              ...actualizado.vehiculo,
              costoTotal: costoEfectivo,
              estadiaActual: { ...actualizado.vehiculo.estadiaActual, costoTotal: costoEfectivo },
            });
            log("persistido costoTotal en back:", costoEfectivo);
          } else {
            const errorJson = await resActualizar.json();
            console.error("Error al actualizar costoTotal:", errorJson.msg);
          }
        }
      } catch (error) {
        console.error("Error al calcular tarifa:", error.message);
      } finally {
        groupEnd();
      }
    };

    calc();
  }, [vehiculoLocal, tarifas, preciosEfectivo, preciosOtros, parametros, onActualizarVehiculoLocal, onTarifaCalculada]);

  /** Cálculo temporal si NO hay salida aún (preview) */
  useEffect(() => {
    const entrada = vehiculoLocal?.estadiaActual?.entrada;
    if (!entrada || vehiculoLocal?.estadiaActual?.salida) return;

    const calcTemp = async () => {
      group("CALC temporal (sin salida)");
      try {
        const salida = new Date();
        const { dias, horasFormateadas } = armarParametrosTiempo(entrada, salida.toISOString());
        log("→ params:", { dias, horasFormateadas });

        const { costoEfectivo, costoOtros } = await calcularAmbosPrecios({
          tipoVehiculo: vehiculoLocal.tipoVehiculo,
          inicio: new Date(entrada).toISOString(),
          dias,
          hora: horasFormateadas,
          tarifas,
          preciosEfectivo,
          preciosOtros,
          parametros,
        });

        log("PREVIEW → efectivo:", costoEfectivo, "otros:", costoOtros);

        // ⬅️ COMPAT: mando `costo` = costoEfectivo
        onTarifaCalculada?.({
          costo: costoEfectivo,
          salida: salida.toISOString(),
          tarifa: null,
          costoEfectivo,
          costoOtros,
        });

        onActualizarVehiculoLocal({
          ...vehiculoLocal,
          estadiaActual: {
            ...vehiculoLocal.estadiaActual,
            salida: salida.toISOString(),
            costoTotal: costoEfectivo, // preview con efectivo
          },
        });
      } catch (e) {
        console.error("Error preview cálculo:", e.message);
      } finally {
        groupEnd();
      }
    };

    calcTemp();
  }, [vehiculoLocal, tarifas, preciosEfectivo, preciosOtros, parametros, onActualizarVehiculoLocal, onTarifaCalculada]);

  const entradaDate = vehiculoLocal?.estadiaActual?.entrada ? new Date(vehiculoLocal.estadiaActual.entrada) : null;
  const salidaDate  = vehiculoLocal?.estadiaActual?.salida  ? new Date(vehiculoLocal.estadiaActual.salida)  : null;

  const handleBorrar = () => {
    setInputPatente("");
    yaActualizado.current = false;
    setImgSrc(AutoPlaceHolder);
    onActualizarVehiculoLocal?.(null);
    onTarifaCalculada?.(null);
    onSalidaCalculada?.(null);
    inputRef.current?.focus();
  };

  const handleAceptar = () => submitPatente();

  return (
    <>
      <div className="datosAutoSalida">
        <div className="fotoAutoSalida">
          <img
            src={imgSrc}
            alt="Auto"
            className="foto-vehiculo"
            onError={() => setImgSrc(AutoPlaceHolderNoimage)}
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
              />
            </div>

            <div className="tipoYAcciones">
              <div className="tipoVehiculo">
                {vehiculoLocal?.tipoVehiculo
                  ? vehiculoLocal.tipoVehiculo.charAt(0).toUpperCase() + vehiculoLocal.tipoVehiculo.slice(1)
                  : "Sin datos"}
              </div>

              <div className="accionesInput">
                <button type="button" className="btnCuadrado btnBorrar" title="Borrar" aria-label="Borrar" onClick={handleBorrar}>
                  <HiX size={22} />
                </button>
                <button type="button" className="btnCuadrado btnAceptar" title="Aceptar" aria-label="Aceptar" onClick={handleAceptar}>
                  <HiArrowRight size={22} />
                </button>
              </div>
            </div>
          </div>

          <div className="horarios">
            <div className="container"><div>⬆</div><div>{entradaDate ? entradaDate.toLocaleString() : "Sin Datos"}</div></div>
            <div className="container"><div>⬇</div><div>{salidaDate  ? salidaDate.toLocaleString()  : "Sin Datos"}</div></div>
          </div>

          {error && <div className="error">{error}</div>}
        </div>
      </div>

      <ModalMensaje titulo={modalTitulo} mensaje={modalMensaje} onClose={() => setModalMensaje("")} />
    </>
  );
}

export default DatosAutoSalida;
