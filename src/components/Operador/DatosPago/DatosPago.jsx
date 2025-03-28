import React, { useState } from 'react';
import "./DatosPago.css"

function DatosPago({ mostrarEntrada }) {
    const [metodoPago, setMetodoPago] = useState('');
    const [factura, setFactura] = useState('');

    const handleSelectMetodoPago = (metodo) => {
      setMetodoPago(metodo);
    };
    const handleSelectFactura = (opcion) => {
      setFactura(opcion);
    };

    const datosPagoStyles = mostrarEntrada ? {
        opacity: 0.2,
        pointerEvents: 'none',
        cursor: 'not-allowed',
      } : {};

    return (
            <div className="datosPago" style={datosPagoStyles}>
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
    );
}

export default DatosPago;