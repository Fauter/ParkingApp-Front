import React, { useState, useEffect, useRef } from "react";
import "./DatosAutoSalida.css";
import { useTarifasData, calcularTarifaAPI } from "../../../hooks/tarifasService";

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
  const yaActualizado = useRef(false); // flag para evitar bucle

  useEffect(() => {
    if (limpiarInputTrigger) {
      setInputPatente("");
    }
  }, [limpiarInputTrigger]);

  const handleKeyDown = async (e) => {
    if (e.key === "Enter") {
      const patenteBuscada = inputPatente.trim().toUpperCase();

      if (!patenteBuscada) return;

      try {
        const response = await fetch(
          `https://api.garageia.com/api/vehiculos/${patenteBuscada}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Error:", errorData.msg);
          return;
        }

        const data = await response.json();

        // Al presionar Enter, definimos hora de salida como ahora
        const salida = new Date().toISOString();
        const actualizado = {
          ...data,
          estadiaActual: {
            ...data.estadiaActual,
            salida,
          },
        };

        onActualizarVehiculoLocal(actualizado);

        // Notificamos a DatosPago cuál es la salida
        if (onSalidaCalculada) {
          onSalidaCalculada(salida);
        }

        setInputPatente(patenteBuscada);
      } catch (err) {
        console.error("Error en la operación:", err);
      }
    }
  };

  useEffect(() => {
    const calcularTarifa = async () => {
      if (
        vehiculoLocal?.estadiaActual?.entrada &&
        vehiculoLocal?.estadiaActual?.salida &&
        !yaActualizado.current
      ) {
        const entrada = new Date(vehiculoLocal.estadiaActual.entrada);
        const salida = new Date(vehiculoLocal.estadiaActual.salida);
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
            setTarifaCalculada(costo);

            if (
              vehiculoLocal?.patente &&
              vehiculoLocal?.estadiaActual?.costoTotal !== costo
            ) {
              const bodyData = { costoTotal: costo };

              const resActualizar = await fetch(
                `https://api.garageia.com/api/vehiculos/${vehiculoLocal.patente}/costoTotal`,
                {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(bodyData),
                }
              );

              if (resActualizar.ok) {
                const actualizado = await resActualizar.json();
                yaActualizado.current = true;

                // Actualizamos el costo también en vehiculoLocal por si otros componentes lo usan
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
      }
    };

    calcularTarifa();
  }, [vehiculoLocal, tarifas, precios, parametros, onActualizarVehiculoLocal]);
  useEffect(() => {
    const calcularTarifaTemporal = async () => {
      // Solo calcular si hay entrada y NO hay salida
      if (vehiculoLocal?.estadiaActual?.entrada && !vehiculoLocal?.estadiaActual?.salida) {
        const entrada = new Date(vehiculoLocal.estadiaActual.entrada);
        const salida = new Date(); // salida temporal: ahora
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

            // Actualizo vehiculoLocal solo si no tenía salida
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
    <div className="datosAutoSalida">
      <div className="fotoAutoSalida">
        <img
          src="https://images.pexels.com/photos/452099/pexels-photo-452099.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500"
          alt="Auto"
        />
      </div>

      <div className="detalleAutoSalida">
        <div className="patenteYTipo">
          <div className="patente">
            <input
              type="text"
              className="input-patente"
              placeholder="Ingresá la patente"
              value={inputPatente}
              onChange={(e) => setInputPatente(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
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
  );
}

export default DatosAutoSalida;