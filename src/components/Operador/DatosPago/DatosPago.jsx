import React, { useState, useEffect } from "react";
import "./DatosPago.css";

function DatosPago({ vehiculoLocal, limpiarVehiculo }) {
    const [metodoPago, setMetodoPago] = useState('');
    const [factura, setFactura] = useState('');
    const [promo, setPromo] = useState('none');
    const [tiempoEstadiaHoras, setTiempoEstadiaHoras] = useState(0);
    const [costoTotal, setCostoTotal] = useState(0);
    const [precios, setPrecios] = useState(null);
    const [tarifaAplicada, setTarifaAplicada] = useState(null);

    useEffect(() => {
        fetch("https://parkingapp-back.onrender.com/api/precios")
            .then(res => res.json())
            .then(data => {
                setPrecios(data);
            })
            .catch(err => console.error("Error obteniendo precios:", err));
    }, []);

    useEffect(() => {
        console.log(vehiculoLocal);
        if (!vehiculoLocal) return;
    
        if (vehiculoLocal.historialEstadias?.length > 0) {
            const ultimaEstadia = vehiculoLocal.historialEstadias[0];
    
            if (ultimaEstadia.entrada) {
                const entrada = new Date(ultimaEstadia.entrada);
                const salida = ultimaEstadia.salida ? new Date(ultimaEstadia.salida) : new Date();
                const horas = Math.ceil((salida - entrada) / (1000 * 60 * 60));
                setTiempoEstadiaHoras(horas);
    
                if (ultimaEstadia.costoTotal != null) {
                    setCostoTotal(ultimaEstadia.costoTotal);
                } else {
                    console.warn("No se encontró costoTotal en la última estadía.");
                }
    
                if (ultimaEstadia.nombreTarifa) {
                    setTarifaAplicada({ 
                        nombre: ultimaEstadia.nombreTarifa,
                        tipo: ultimaEstadia.tipoTarifa || vehiculoLocal.tipoTarifa || "NN"
                    });
                } else if (ultimaEstadia.tarifaAplicada?.nombre) {
                    setTarifaAplicada({ 
                        nombre: ultimaEstadia.tarifaAplicada.nombre,
                        tipo: ultimaEstadia.tarifaAplicada.tipo || vehiculoLocal.tipoTarifa || "NN"
                    });
                } else {
                    console.warn("No se encontró nombreTarifa ni tarifaAplicada.nombre en la última estadía.");
                    setTarifaAplicada({ 
                        nombre: "hora",
                        tipo: vehiculoLocal.tipoTarifa || "NN"
                    });
                }
            }
        }
    }, [vehiculoLocal]);

    const handleSelectMetodoPago = (metodo) => setMetodoPago(metodo);
    const handleSelectFactura = (opcion) => setFactura(opcion);
    const handleSelectPromo = (opcion) => setPromo(opcion);

    const resetCamposPago = () => {
        setMetodoPago('');
        setFactura('');
        setPromo('none');
        setTiempoEstadiaHoras(0);
        setCostoTotal(0);
        setTarifaAplicada(null);
    };

    const registrarMovimiento = () => {
        console.log(vehiculoLocal);
        if (!vehiculoLocal?.patente) return;

        const operador = "Carlos";

        // ✅ Determinar descripción según la tarifa recibida
        let descripcion = '';

        const nombreTarifa = tarifaAplicada?.nombre?.toLowerCase() || "hora";
        const tipoTarifa = tarifaAplicada?.tipo?.toLowerCase() || "NN";

        if (nombreTarifa === "hora") {
            descripcion = `Pago por x${tiempoEstadiaHoras} Hora${tiempoEstadiaHoras > 1 ? 's' : ''}`;
        } else {
            descripcion = `Pago por ${tarifaAplicada?.nombre}`;
        }

        const datosMovimiento = {
            patente: vehiculoLocal.patente,
            operador,
            tipoVehiculo: vehiculoLocal.tipoVehiculo || "Desconocido",
            metodoPago,
            factura,
            monto: costoTotal,
            descripcion,
            tipoTarifa: tarifaAplicada?.tipo || "NN" 
        };

        fetch("https://parkingapp-back.onrender.com/api/movimientos/registrar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(datosMovimiento),
        })
            .then(res => res.json())
            .then(data => {
                if (data.movimiento) {
                    alert(`✅ Movimiento registrado para ${vehiculoLocal.patente}`);
                    limpiarVehiculo();
                    resetCamposPago();
                } else {
                    console.error("❌ Error al registrar movimiento:", data.msg);
                }
            })
            .catch(err => console.error("❌ Error conectando al backend:", err));
    };

    return (
        <div className="datosPago">
            <div className="precioTotal">
                <div className="precioContainer">
                    ${costoTotal.toLocaleString("es-AR")}
                </div>
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
            <div className="precioEspecificaciones">
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
            <button className="btn-salida" onClick={registrarMovimiento}>⬆ SALIDA</button>
        </div>
    );
}

export default DatosPago;
