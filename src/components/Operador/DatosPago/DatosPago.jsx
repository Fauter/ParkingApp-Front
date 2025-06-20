import React, { useState, useEffect } from "react";
import "./DatosPago.css";

function DatosPago({ vehiculoLocal, limpiarVehiculo, tarifaCalculada, user }) {
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [factura, setFactura] = useState("CC");
  const [promos, setPromos] = useState([]);
  const [promoSeleccionada, setPromoSeleccionada] = useState(null);
  const [tiempoEstadiaHoras, setTiempoEstadiaHoras] = useState(0);
  const [costoTotal, setCostoTotal] = useState(0);
  const [totalConDescuento, setTotalConDescuento] = useState(0);
  const [tarifaAplicada, setTarifaAplicada] = useState(null);
  const [horaSalida, setHoraSalida] = useState(null);

  useEffect(() => {
    fetch("https://api.garageia.com/api/promos")
      .then((res) => res.json())
      .then((data) => setPromos(data))
      .catch((err) => console.error("Error cargando promociones", err));
  }, []);

  useEffect(() => {
    if (promoSeleccionada) {
      const descuento = promoSeleccionada.descuento || 0;
      const nuevoTotal = costoTotal * (1 - descuento / 100);
      setTotalConDescuento(nuevoTotal);
    } else {
      setTotalConDescuento(costoTotal);
    }
  }, [promoSeleccionada, costoTotal]);

  const handleSeleccionPromo = (e) => {
    const idSeleccionado = e.target.value;
    const promo = promos.find((p) => p._id === idSeleccionado);
    setPromoSeleccionada(promo);
  };

  // Actualizamos costoTotal, horaSalida, tarifaAplicada cuando cambia tarifaCalculada
  useEffect(() => {
    if (tarifaCalculada?.costo != null) {
      setCostoTotal(tarifaCalculada.costo);
    }
    if (tarifaCalculada?.salida) {
      setHoraSalida(tarifaCalculada.salida);
    }
    if (tarifaCalculada?.tarifa) {
      setTarifaAplicada(tarifaCalculada.tarifa);
    }
  }, [tarifaCalculada]);

  // Cálculo tiempo estadía real entre entrada y salida
  useEffect(() => {
    if (!vehiculoLocal) return;

    const estadia = vehiculoLocal.estadiaActual;
    if (!estadia || !estadia.entrada) {
      setTiempoEstadiaHoras(0);
      return;
    }

    // Fecha entrada
    const entrada = new Date(estadia.entrada);

    // Fecha salida: preferimos tarifaCalculada.salida, si no la usamos actual
    const salida = horaSalida ? new Date(horaSalida) : new Date();

    // Calcular diferencia en milisegundos
    const diffMs = salida - entrada;
    if (diffMs <= 0) {
      setTiempoEstadiaHoras(0);
      return;
    }

    // Calcular horas, redondeando hacia arriba y mínimo 1
    const horas = Math.max(Math.ceil(diffMs / (1000 * 60 * 60)), 1);
    setTiempoEstadiaHoras(horas);

    // Si hay costo en estadiaActual, actualizar costoTotal para que coincida
    if (estadia.costoTotal != null) {
      setCostoTotal(estadia.costoTotal);
    } else {
      setCostoTotal(0);
    }

    // Tarifa si existe
    if (estadia.tarifa) {
      setTarifaAplicada(estadia.tarifa);
    } else {
      setTarifaAplicada(null);
    }
  }, [vehiculoLocal, horaSalida]);

  useEffect(() => {
    console.log("🚗 vehiculoLocal en DatosPago:", vehiculoLocal);
  }, [vehiculoLocal]);

  const handleSelectMetodoPago = (metodo) => setMetodoPago(metodo);
  const handleSelectFactura = (opcion) => setFactura(opcion);

  const resetCamposPago = () => {
    setMetodoPago("Efectivo");
    setFactura("CC");
    setPromoSeleccionada(null);
    setTiempoEstadiaHoras(0);
    setCostoTotal(0);
    setTarifaAplicada(null);
    setHoraSalida(null);
    setTotalConDescuento(0);
  };

  const registrarMovimiento = () => {
    if (!vehiculoLocal?.patente) return;

    const operador = user?.nombre || "Operador Desconocido";

    console.log("💡 TARIFA APLICADA en registrarMovimiento:", tarifaAplicada);

    // Usamos las horas calculadas arriba
    const horas = tiempoEstadiaHoras || 1;
    const descripcion = `Pago por ${horas} Hora${horas > 1 ? "s" : ""}`;

    fetch(
      `https://api.garageia.com/api/vehiculos/${vehiculoLocal.patente}/registrarSalida`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salida: horaSalida || new Date().toISOString(),
          costo: totalConDescuento,
          tarifa: tarifaAplicada || null,
          tiempoHoras: horas,
        }),
      }
    )
      .then((res) => res.json())
      .then((dataSalida) => {
        if (!dataSalida || dataSalida.error) {
          console.error("❌ Error al registrar salida:", dataSalida?.msg || "Error desconocido");
          alert("Error al registrar salida, intente nuevamente.");
          return;
        }

        console.log("✅ Salida registrada correctamente:", dataSalida);

        const datosMovimiento = {
          patente: vehiculoLocal.patente,
          operador,
          tipoVehiculo: vehiculoLocal.tipoVehiculo || "Desconocido",
          metodoPago,
          descripcion,
          factura,
          monto: totalConDescuento,
          tipoTarifa: "hora",
        };
        console.log("📦 Datos que se mandan al registrar movimiento:", datosMovimiento);
        return fetch("https://api.garageia.com/api/movimientos/registrar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datosMovimiento),
        });
      })
      .then((res) => {
        if (!res) return;
        return res.json();
      })
      .then((dataMovimiento) => {
        if (!dataMovimiento) return;

        if (dataMovimiento.movimiento) {
          alert(`✅ Movimiento registrado para ${vehiculoLocal.patente}`);
          limpiarVehiculo();
          resetCamposPago();
        } else {
          console.error("❌ Error al registrar movimiento:", dataMovimiento.msg);
          alert("Error al registrar movimiento, intente nuevamente.");
        }
      })
      .catch((err) => {
        console.error("❌ Error conectando al backend:", err);
        alert("Error en la conexión, intente nuevamente.");
      });
  };

  return (
    <div className="datosPago">
      <div className="precioTotal">
        <div className="precioContainer">${totalConDescuento.toLocaleString("es-AR")}</div>
        <div className="promo">
          <select
            className="promoSelect"
            value={promoSeleccionada?._id || "none"}
            onChange={handleSeleccionPromo}
          >
            <option value="none">Seleccioná una Promo</option>
            {promos &&
              Array.isArray(promos) &&
              promos.map((promo) => (
                <option key={promo._id} value={promo._id}>
                  {promo.nombre} ({promo.descuento}%)
                </option>
              ))}
          </select>
          <a href="" className="iconContainer">
            <img
              src="https://www.svgrepo.com/show/904/photo-camera.svg"
              alt=""
              className="camIcon"
            />
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
                className={`metodoOption ${metodoPago === metodo ? "selected" : ""}`}
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
            {["CC", "A", "Final"].map((opcion) => (
              <div
                key={opcion}
                className={`facturaOption ${factura === opcion ? "selected" : ""}`}
                onClick={() => handleSelectFactura(opcion)}
              >
                {opcion}
              </div>
            ))}
          </div>
        </div>
      </div>
      <button className="btn-salida" onClick={registrarMovimiento}>
        ⬆ SALIDA
      </button>
    </div>
  );
}

export default DatosPago;
