import React, { useState } from 'react';
import './Operador.css';

function Operador() {
  const [metodoPago, setMetodoPago] = useState('');
  const [factura, setFactura] = useState('');

  const handleSelectMetodoPago = (metodo) => {
    setMetodoPago(metodo);
  };
  const handleSelectFactura = (opcion) => {
    setFactura(opcion);
  };

  return (
    <div className="contenidoCentral">


      {/*DATOS DE AUTO*/}

      <div className="datosAuto">
        {/* 1) Patente */}
        <div className="patente">
          AB1232CD
        </div>
        {/* 2) Auto/Camioneta */}
        <div className="tipoVehiculo">
          Auto
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
        {/* 4) Foto del auto */}
        <div className="fotoAuto">
          <img src="https://images.pexels.com/photos/452099/pexels-photo-452099.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=500" alt="" />
        </div>
      </div>


      {/* DATOS DE PAGO */}

      <div className="datosPago">
        {/* Precio Total */}
        <div className="precioTotal">
          <div className="precioContainer">
            $6.000,00
          </div>
        </div>
        {/* Precio Especificaciones */}
        <div className="precioEspecificaciones">
          {/* Métodos De Pago */}
          <div className="title">Método de Pago</div>
          <div className="metodoDePago">
            <div
              className={`metodoOption ${metodoPago === 'Efectivo' ? 'selected' : ''}`}
              onClick={() => handleSelectMetodoPago('Efectivo')}
            >
              Efectivo
            </div>
            <div
              className={`metodoOption ${metodoPago === 'Débito' ? 'selected' : ''}`}
              onClick={() => handleSelectMetodoPago('Débito')}
            >
              Débito
            </div>
            <div
              className={`metodoOption ${metodoPago === 'Crédito' ? 'selected' : ''}`}
              onClick={() => handleSelectMetodoPago('Crédito')}
            >
              Crédito
            </div>
            <div
              className={`metodoOption ${metodoPago === 'QR' ? 'selected' : ''}`}
              onClick={() => handleSelectMetodoPago('QR')}
            >
              QR
            </div>
          </div>
          {/* Factura */}
          <div className="title">Factura</div>
          <div className="factura">
            <div
              className={`facturaOption ${factura === 'No' ? 'selected' : ''}`}
              onClick={() => handleSelectFactura('No')}
            >
              No
            </div>
            <div
              className={`facturaOption ${factura === 'A' ? 'selected' : ''}`}
              onClick={() => handleSelectFactura('A')}
            >
              A
            </div>
            <div
              className={`facturaOption ${factura === 'Final' ? 'selected' : ''}`}
              onClick={() => handleSelectFactura('Final')}
            >
              Final
            </div>
          </div>
          {/* Promo */}
          <div className="title">Promo</div>
          <div className="promo">
            <select className="promoSelect">
              <option value="none">Selecciona una Promo</option>
              <option value="camara">Cámara</option>
              <option value="otro">Otro</option>
            </select>
            <a href="" className="iconContainer">
              <img src="https://www.svgrepo.com/show/904/photo-camera.svg" alt="" className="camIcon" />
            </a>
          </div>
        </div>
        {/* Botón de Salida */}
        <div className="fondoSalida">
          <div className="salida">
            <a href="#" class="salida">
              ⬆ SALIDA
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Operador;