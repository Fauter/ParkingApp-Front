import React, { useState, useEffect } from 'react';
import "./DatosAutoSalida.css";


function DatosAutoSalida({ buscarVehiculo, vehiculoLocal, error, limpiarInputTrigger }) {
  const [inputPatente, setInputPatente] = useState("");

  useEffect(() => {
    if (limpiarInputTrigger) {
      setInputPatente("");
    }
  }, [limpiarInputTrigger]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      buscarVehiculo(inputPatente);
    }
  };

  return (
    <div className="datosAutoSalida">
        {/* 1) Foto del auto */}
        <div className="fotoAutoSalida">
          <img src="https://images.pexels.com/photos/452099/pexels-photo-452099.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500" alt="" />
        </div>
        <div className="detalleAutoSalida">
          {/* 2) Patente Auto/Camioneta */}
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
                ? vehiculoLocal.tipoVehiculo.charAt(0).toUpperCase() + vehiculoLocal.tipoVehiculo.slice(1)
                : "Sin datos"}
            </div>
          </div>
          {/* 3) Horario de Salida y de Entrada */}
          <div className="horarios">
            <div className="container">
              <div>⬆</div>
              <div>
                {vehiculoLocal?.historialEstadias?.[0]?.entrada
                  ? new Date(vehiculoLocal.historialEstadias[0].entrada).toLocaleString()
                  : "Sin Datos"}
              </div>
            </div>
            <div className="container">
              <div>⬇</div>
              <div>
                {vehiculoLocal?.historialEstadias?.[0]?.salida
                  ? new Date(vehiculoLocal.historialEstadias[0].salida).toLocaleString()
                  : vehiculoLocal?.historialEstadias?.[0]?.entrada
                    ? new Date(new Date(vehiculoLocal.historialEstadias[0].entrada).getTime() + 1000).toLocaleString()
                    : "Sin Datos"}
              </div>
            </div>
          </div>
          {error && <div className="error">{error}</div>}
        </div>
    </div>
  );
}

export default DatosAutoSalida;