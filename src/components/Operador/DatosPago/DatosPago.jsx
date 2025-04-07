import React, { useState, useEffect } from "react";
import "./DatosPago.css";

function DatosPago({ vehiculoLocal, limpiarVehiculo  }) {
    const [metodoPago, setMetodoPago] = useState('');
    const [factura, setFactura] = useState('');
    const [promo, setPromo] = useState('none');
    const [tiempoEstadiaHoras, setTiempoEstadiaHoras] = useState(0);
    const [costoTotal, setCostoTotal] = useState(0);
    const [precios, setPrecios] = useState(null); // ⬅️ Aca guardamos los precios del backend

    // ⬇️ Fetch para traer los precios al cargar el componente
    useEffect(() => {
        fetch("http://localhost:5000/api/precios")
            .then(res => res.json())
            .then(data => {
                setPrecios(data);
            })
            .catch(err => console.error("Error obteniendo precios:", err));
    }, []);

    // ⬇️ Cuando cambia el vehículo, calculamos la estadía y el costo
    useEffect(() => {
        if (!vehiculoLocal || !precios) return;

        if (vehiculoLocal.historialEstadias?.length > 0) {
            const ultimaEstadia = vehiculoLocal.historialEstadias[0];

            if (ultimaEstadia.entrada) {
                const entrada = new Date(ultimaEstadia.entrada);
                const salida = ultimaEstadia.salida ? new Date(ultimaEstadia.salida) : new Date();
                const horas = Math.ceil((salida - entrada) / (1000 * 60 * 60));
                setTiempoEstadiaHoras(horas);

                const tipo = vehiculoLocal.tipoVehiculo?.toLowerCase();
                const precioPorHora = precios[tipo]?.hora;

                if (precioPorHora) {
                    setCostoTotal(horas * precioPorHora);
                } else {
                    console.warn("No se encontró precio para tipo:", tipo);
                }
            }
        }
    }, [vehiculoLocal, precios]);

    const handleSelectMetodoPago = (metodo) => {
        setMetodoPago(metodo);
    };
    const handleSelectFactura = (opcion) => {
        setFactura(opcion);
    };
    const handleSelectPromo = (opcion) => {
        setPromo(opcion);
    };

    const resetCamposPago = () => {
        setMetodoPago('');
        setFactura('');
        setPromo('none');
        setTiempoEstadiaHoras(0);
        setCostoTotal(0);
    };

    const registrarMovimiento = () => {
        if (!vehiculoLocal?.patente) return;
    
        const operador = "Carlos"; 
    
        const datosMovimiento = {
            patente: vehiculoLocal.patente,
            operador,
            tipoVehiculo: vehiculoLocal.tipoVehiculo || "Desconocido",
            metodoPago,
            factura,
            monto: costoTotal,
            descripcion: `Pago por x${tiempoEstadiaHoras} Hora/s`
        };
    
        fetch("http://localhost:5000/api/movimientos/registrar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosMovimiento),
        })
        .then(res => res.json())
        .then(data => {
            if (data.movimiento) {
                alert(`✅ Movimiento registrado para ${vehiculoLocal.patente}`);
                limpiarVehiculo();       // Limpia los datos del vehículo
                resetCamposPago();       // Resetea los selects y el precio
            } else {
                console.error("❌ Error al registrar movimiento:", data.msg);
            }
        })
        .catch(err => console.error("❌ Error conectando al backend:", err));
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