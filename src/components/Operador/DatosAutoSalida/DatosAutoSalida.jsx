import React, { useState, useEffect } from 'react';
import "./DatosAutoSalida.css";



function DatosAutoSalida({ vehiculoLocal, limpiarVehiculo  }) {
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [costoTotal, setCostoTotal] = useState(null);

  useEffect(() => {
    console.log("vehiculoLocal:", vehiculoLocal);
  }, [vehiculoLocal]);
  
  return (
    <div className="datosAutoSalida">
        {/* 1) Foto del auto */}
        <div className="fotoAutoSalida">
          <img src="https://images.pexels.com/photos/452099/pexels-photo-452099.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500" alt="" />
        </div>
        <div className="detalleAutoSalida">
          {/* 2) Patente Auto/Camioneta */}
          <div className="patenteYTipo">
            <div className="patente">{vehiculoLocal?.patente.toUpperCase() || "Sin datos"}</div>
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
                {vehiculoLocal?.historialEstadias?.[0]?.salida // Si hay salida, mostrarla
                  ? new Date(vehiculoLocal.historialEstadias[0].salida).toLocaleString()
                  : vehiculoLocal?.historialEstadias?.[0]?.entrada // Si no hay salida, pero hay entrada, mostrar la hora actual
                  ? new Date(new Date(vehiculoLocal.historialEstadias[0].entrada).getTime() + 1000).toLocaleString() // Sumar 1 segundo a la entrada
                  : "Sin Datos"}
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}

export default DatosAutoSalida;