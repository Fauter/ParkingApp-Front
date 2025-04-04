import React, { useState, useEffect } from "react";
import "./DatosPago.css";
import { preciosHora } from "../../../utils/precios";

function DatosPago({ vehiculoLocal, limpiarVehiculo  }) {
    const [metodoPago, setMetodoPago] = useState('');
    const [factura, setFactura] = useState('');
    const [promo, setPromo] = useState('none');
    const [tiempoEstadiaHoras, setTiempoEstadiaHoras] = useState(0);
    const [costoTotal, setCostoTotal] = useState(0);

    const registrarMovimiento = () => {
        if (!vehiculoLocal?.patente) {
            console.error("No hay un vehículo seleccionado.");
            return;
        }
        const operador = "Carlos"; 
        const tipoVehiculo = vehiculoLocal.tipoVehiculo || "Desconocido";
        
        const datosMovimiento = {
            patente: vehiculoLocal.patente,
            operador,
            tipoVehiculo,
            metodoPago,
            factura,
            monto: costoTotal,
            descripcion: `Pago por x${tiempoEstadiaHoras}  Hora/s`
        };

        fetch("https://parkingapp-back.onrender.com/api/movimientos/registrar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosMovimiento),
        })
        .then(res => res.json())
        .then(data => {
            if (data.movimiento) {
                console.log("✅ Movimiento registrado en la BD:", data.movimiento);
                alert(`✅ Movimiento registrado para ${vehiculoLocal.patente}`);
                limpiarVehiculo();
            } else {
                console.error("❌ Error al registrar movimiento:", data.msg);
            }
        })
        .catch(err => console.error("❌ Error conectando al backend:", err));
    };
    
    useEffect(() => {
        if (!vehiculoLocal) {
            // Si no hay vehículo seleccionado, resetea los valores
            setMetodoPago('');
            setFactura('');
            setPromo('none');
            setCostoTotal(0);
            setTiempoEstadiaHoras(0);
            return;
        }

        if (vehiculoLocal.historialEstadias?.length > 0) {
            const ultimaEstadia = vehiculoLocal.historialEstadias[0];

            if (ultimaEstadia.entrada) {
                const entrada = new Date(ultimaEstadia.entrada);
                const salida = ultimaEstadia.salida ? new Date(ultimaEstadia.salida) : new Date();
                const horas = Math.ceil((salida - entrada) / (1000 * 60 * 60));
                setTiempoEstadiaHoras(horas);
                if (vehiculoLocal.tipoVehiculo && preciosHora[vehiculoLocal.tipoVehiculo]) {
                    setCostoTotal(horas * preciosHora[vehiculoLocal.tipoVehiculo]);
                }
            }
        }
    }, [vehiculoLocal]); 
    
    const handleSelectMetodoPago = (metodo) => {
      setMetodoPago(metodo);
    };
    const handleSelectFactura = (opcion) => {
      setFactura(opcion);
    };
    const handleSelectPromo = (opcion) => {
        setPromo(opcion);
    };

    const registrarSalida = () => {
        if (!vehiculoLocal?.patente) {
            console.error("No hay un vehículo seleccionado.");
            return;
        }

        fetch(`https://parkingapp-back.onrender.com/api/vehiculos/${vehiculoLocal.patente}/registrarSalida`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                metodoPago, 
                factura 
            }),
        })
        .then(res => res.json())
        .then(data => {
            if (data.vehiculo) {
                console.log("Salida registrada con éxito:", data.vehiculo);
                alert(`Salida registrada para ${vehiculoLocal.patente}`);
                limpiarVehiculo(); // Llamar a la función limpiarVehiculo después de registrar la salida
            } else {
                console.error("Error al registrar salida:", data.msg);
            }
        })
        .catch(err => console.error("Error registrando salida:", err));
    };


    return (
        <div className="datosPago">
            {/* Precio Total */}
            <div className="precioTotal">
                <div className="precioContainer">
                    ${costoTotal.toLocaleString("es-AR")}
                </div>
                {/* Promo */}
                <div className="promo">
                    <select 
                        className="promoSelect"
                        value={promo}
                        onChange={(e) => handleSelectPromo(e.target.value)}
                    >
                        <option value="none">Selecciona una Promo</option>
                        <option value="camara">Cámara</option>
                        <option value="otro">Otro</option>
                    </select>
                    <a href="" className="iconContainer">
                        <img src="https://www.svgrepo.com/show/904/photo-camera.svg" alt="" className="camIcon" />
                    </a>
                </div>
            </div>
            {/* Precio Especificaciones */}
            <div className="precioEspecificaciones">
                {/* Métodos De Pago */}
                <div>
                    <div className="title">Método de Pago</div>
                    <div className="metodoDePago">
                        {["Efectivo", "Débito", "Crédito", "QR"].map((metodo) => (
                            <div
                                key={metodo}
                                className={`metodoOption ${metodoPago === metodo ? 'selected' : ''}`}
                                onClick={() => handleSelectMetodoPago(metodo)}
                            >
                                {metodo}
                            </div>
                        ))}
                    </div>
                </div>
                {/* Factura */}
                <div>
                    <div className="title">Factura</div>
                    <div className="factura">
                        {["No", "A", "Final"].map((opcion) => (
                            <div
                                key={opcion}
                                className={`facturaOption ${factura === opcion ? 'selected' : ''}`}
                                onClick={() => handleSelectFactura(opcion)}
                            >
                                {opcion}
                            </div>
                        ))}
                    </div>
                </div>   
            </div>
            {/* Botón de Salida */}
            <div className="fondoSalida">
                <div className="salida">
                    <button className="salida" onClick={registrarMovimiento}>
                        ⬆ SALIDA
                    </button>
                </div>
            </div>
        </div>
    );
}

export default DatosPago;