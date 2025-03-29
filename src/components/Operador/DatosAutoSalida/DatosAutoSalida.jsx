// DatosAuto.js
import React from 'react';
import "./DatosAutoSalida.css"


function DatosAutoSalida({ patente, tipoVehiculo, horarioEntrada, horarioSalida, foto }) {
  return (
    <div className="datosAutoSalida">
      
        {/* 1) Foto del auto */}
        <div className="fotoAutoSalida">
          <img src="https://images.pexels.com/photos/452099/pexels-photo-452099.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500" alt="" />
        </div>
        <div className="detalleAutoSalida">
          {/* 2) Patente Auto/Camioneta */}
          <div className="patenteYTipo">
            <div className="patente"> AB1232CD </div>
            <div className="tipoVehiculo"> Auto </div>
          </div>
          {/* 3) Horario de Salida y de Entrada */}
          <div className="horarios">
            <div className="container">
              <div>⬆</div>
              <div>11:35 - 22/03/2025</div>
            </div>
            <div className="container">
              <div>⬇</div>
              <div>13:30 - 24/03/2025</div>
            </div>
          </div>
        </div>
    </div>
  );
}

export default DatosAutoSalida;