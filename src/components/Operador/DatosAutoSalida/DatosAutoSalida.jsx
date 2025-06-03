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

  useEffect(() => {
    if (!vehiculoLocal) {
      setInputPatente("");
    }
  }, [vehiculoLocal]);

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
          alert("Error al buscar vehículo.");
          return;
        }

        const data = await response.json();

        // Validación: si no tiene estadía en curso (entrada null o inexistente)
        if (!data.estadiaActual || !data.estadiaActual.entrada) {
          alert("El vehículo no tiene estadía en curso.");
          // No actualizar ni cargar nada
          return;
        }

        const tieneEntrada = !!data.estadiaActual.entrada;
        const yaTieneSalida = !!data.estadiaActual.salida;
        const salidaTemporal = new Date().toISOString();

        if (tieneEntrada && !yaTieneSalida) {
          if (data.abonado) {
            // Salida automática abonado
            const resSalida = await fetch(
              `https://api.garageia.com/api/vehiculos/${patenteBuscada}/registrarSalida`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  salida: salidaTemporal,
                  costo: 0,
                  tarifa: null,
                }),
              }
            );

            const dataSalida = await resSalida.json();

            if (!resSalida.ok || dataSalida.error) {
              console.error("❌ Error al registrar salida automática (abonado):", dataSalida?.msg || "Error desconocido");
              alert("Error al registrar salida automática, intente nuevamente.");
              return;
            }

            alert(`✅ Vehículo ${patenteBuscada} (abonado) salió automáticamente.`);
            setInputPatente("");
            return;
          } else if (data.turno) {
            // Salida automática con turno
            const resSalida = await fetch(
              `https://api.garageia.com/api/vehiculos/${patenteBuscada}/registrarSalida`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  salida: salidaTemporal,
                  costo: 0,
                  tarifa: null,
                }),
              }
            );

            if (!resSalida.ok) {
              const dataError = await resSalida.json();
              console.error("❌ Error al registrar salida automática (turno):", dataError?.msg || "Error desconocido");
              alert("Error al registrar salida automática, intente nuevamente.");
              return;
            }

            // Desactivar turno
            const resDesactivarTurno = await fetch(
              `https://api.garageia.com/api/turnos/desactivar-por-patente/${patenteBuscada}`,
              {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
              }
            );

            if (!resDesactivarTurno.ok) {
              const errorTurno = await resDesactivarTurno.json();
              console.error("❌ Error al desactivar turno:", errorTurno?.msg || "Error desconocido");
              alert("Error al desactivar turno, intente nuevamente.");
              return;
            }

            alert(`✅ Vehículo ${patenteBuscada} con turno salió automáticamente y se desactivó el turno.`);
            setInputPatente("");
            return;
          }
        }

        // Flujo normal si no abonado ni turno o ya salida
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
        setInputPatente(patenteBuscada);
      } catch (err) {
        console.error("Error en la operación:", err);
        alert("Error al procesar la salida.");
      }
    }
  };

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

                // Actualizamos el estado para reflejar el costo actualizado
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