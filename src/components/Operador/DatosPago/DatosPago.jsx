import React, { useState, useEffect } from "react";
import "./DatosPago.css";
import ModalMensaje from "../../ModalMensaje/ModalMensaje";

const BASE_URL = "http://localhost:5000";
const PROMOS_POLL_MS = 180000; // 3 min

function DatosPago({
  vehiculoLocal,
  limpiarVehiculo,
  tarifaCalculada,
  user,
  onAbrirBarreraSalida,
}) {
  const [metodoPago, setMetodoPago] = useState("Efectivo");
  const [factura, setFactura] = useState("CC");
  const [promos, setPromos] = useState([]);
  const [promoSeleccionada, setPromoSeleccionada] = useState(null);
  const [tiempoEstadiaHoras, setTiempoEstadiaHoras] = useState(0);
  const [costoTotal, setCostoTotal] = useState(0);
  const [totalConDescuento, setTotalConDescuento] = useState(0);
  const [tarifaAplicada, setTarifaAplicada] = useState(null);
  const [horaSalida, setHoraSalida] = useState(null);

  const [modalCamAbierto, setModalCamAbierto] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [fotoUrl, setFotoUrl] = useState(null);
  const videoRef = React.useRef(null);

  // 🎯 Cámara elegida en Config.jsx
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  // 🔔 Modal de mensaje
  const [mensajeModal, setMensajeModal] = useState(null);

  // ====== Carga y auto-refresh de promos ======
  useEffect(() => {
    let timer = null;

    const loadPromos = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/promos`, { cache: "no-store" });
        if (!res.ok) throw new Error("Promos fetch failed");
        const data = await res.json();
        setPromos(Array.isArray(data) ? data : []);
        // Si la promo seleccionada ya no existe, la limpiamos
        if (promoSeleccionada && !data.find(p => p._id === promoSeleccionada._id)) {
          setPromoSeleccionada(null);
        }
      } catch (err) {
        console.error("Error cargando promociones", err);
      }
    };

    loadPromos(); // primera

    timer = setInterval(loadPromos, PROMOS_POLL_MS);

    const onVis = () => document.visibilityState === "visible" && loadPromos();
    const onOnline = () => loadPromos();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, [promoSeleccionada]);

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
    setPromoSeleccionada(promo || null);
  };

  // ====== Actualiza totales por tarifa ======
  useEffect(() => {
    if (tarifaCalculada?.costo != null) setCostoTotal(tarifaCalculada.costo);
    if (tarifaCalculada?.salida) setHoraSalida(tarifaCalculada.salida);
    if (tarifaCalculada?.tarifa) setTarifaAplicada(tarifaCalculada.tarifa);
  }, [tarifaCalculada]);

  // ====== Tiempo de estadía y totales ======
  useEffect(() => {
    if (!vehiculoLocal) return;

    const estadia = vehiculoLocal.estadiaActual;
    if (!estadia || !estadia.entrada) {
      setTiempoEstadiaHoras(0);
      return;
    }

    const entrada = new Date(estadia.entrada);
    const salida = horaSalida ? new Date(horaSalida) : new Date();
    const diffMs = salida - entrada;

    if (diffMs <= 0) {
      setTiempoEstadiaHoras(0);
      return;
    }

    const horas = Math.max(Math.ceil(diffMs / (1000 * 60 * 60)), 1);
    setTiempoEstadiaHoras(horas);

    if (estadia.costoTotal != null) setCostoTotal(estadia.costoTotal);
    else setCostoTotal(0);

    setTarifaAplicada(estadia.tarifa || null);
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

  // ====== RESPECTA cámara de Config.jsx con fallback ======
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/webcam`);
        if (r.ok) {
          const data = await r.json();
          if (data?.webcam) {
            setSelectedDeviceId(data.webcam);
            localStorage.setItem("webcamDeviceId", data.webcam);
            return;
          }
        }
      } catch (_) { /* ignore */ }
      const ls = localStorage.getItem("webcamDeviceId");
      if (ls) setSelectedDeviceId(ls);
    })();
  }, []);

  const getStream = async () => {
    const tryList = [
      selectedDeviceId ? { video: { deviceId: { exact: selectedDeviceId } } } : null,
      { video: { facingMode: { ideal: "environment" } } },
      { video: true },
    ].filter(Boolean);

    let lastErr = null;
    for (const constraints of tryList) {
      try {
        return await navigator.mediaDevices.getUserMedia(constraints);
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr || new Error("No se pudo abrir ninguna cámara");
  };

  // ====== Registrar movimiento ======
  const registrarMovimiento = () => {
    if (!vehiculoLocal?.patente) return;

    const operador = user?.nombre || "Operador Desconocido";
    const horas = tiempoEstadiaHoras || 1;
    const descripcion = `Pago por ${horas} Hora${horas > 1 ? "s" : ""}`;

    fetch(`${BASE_URL}/api/vehiculos/${vehiculoLocal.patente}/registrarSalida`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        salida: horaSalida || new Date().toISOString(),
        costo: totalConDescuento,
        tarifa: tarifaAplicada || null,
        tiempoHoras: horas,
      }),
    })
      .then((res) => res.json())
      .then((dataSalida) => {
        if (!dataSalida || dataSalida.error) {
          console.error("❌ Error al registrar salida:", dataSalida?.msg || "Error desconocido");
          setMensajeModal({
            tipo: "error",
            titulo: "Error al registrar salida",
            mensaje: "Intente nuevamente.",
          });
          return;
        }

        const datosMovimiento = {
          patente: vehiculoLocal.patente,
          operador,
          tipoVehiculo: vehiculoLocal.tipoVehiculo || "Desconocido",
          metodoPago,
          descripcion,
          factura,
          monto: totalConDescuento,
          tipoTarifa: "hora",
          ticket: vehiculoLocal.estadiaActual?.ticket || undefined,
          foto: fotoUrl || null,
        };

        return fetch(`${BASE_URL}/api/movimientos/registrar`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datosMovimiento),
        });
      })
      .then((res) => (res ? res.json() : null))
      .then((dataMovimiento) => {
        if (!dataMovimiento) return;

        if (dataMovimiento.movimiento) {
          setMensajeModal({
            tipo: "exito",
            titulo: "Movimiento registrado",
            mensaje: `✅ Movimiento registrado para ${vehiculoLocal.patente}`,
          });
          limpiarVehiculo();
          resetCamposPago();
          if (onAbrirBarreraSalida) onAbrirBarreraSalida();
        } else {
          console.error("❌ Error al registrar movimiento:", dataMovimiento?.msg);
          setMensajeModal({
            tipo: "error",
            titulo: "Error al registrar movimiento",
            mensaje: "Intente nuevamente.",
          });
        }
      })
      .catch((err) => {
        console.error("❌ Error conectando al backend:", err);
        setMensajeModal({
          tipo: "error",
          titulo: "Error de conexión",
          mensaje: "No se pudo conectar al servidor.",
        });
      });
  };

  // ====== Cámara (modal) ======
  const abrirModalCam = async () => {
    setFotoUrl(null);
    setModalCamAbierto(true);
    try {
      const stream = await getStream();
      setVideoStream(stream);
    } catch (err) {
      setVideoStream(null);
      setMensajeModal({
        tipo: "error",
        titulo: "Error de cámara",
        mensaje: "No se pudo acceder a la webcam.",
      });
    }
  };

  const tomarFoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setFotoUrl(canvas.toDataURL("image/png"));
  };

  const volverACamara = async () => {
    setFotoUrl(null);
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    try {
      const stream = await getStream();
      setVideoStream(stream);
    } catch (err) {
      setVideoStream(null);
      setMensajeModal({
        tipo: "error",
        titulo: "Error de cámara",
        mensaje: "No se pudo acceder a la webcam.",
      });
    }
  };

  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  const cerrarModalCam = () => {
    setModalCamAbierto(false);
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    setFotoUrl(null);
  };

  // Limpia cámara al desmontar
  useEffect(() => {
    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [videoStream]);

  return (
    <div className="datosPago">
      <div className="precioTotal">
        <div className="precioContainer">
          ${totalConDescuento.toLocaleString("es-AR")}
        </div>
        <div className="promo">
          <select
            className="promoSelect"
            value={promoSeleccionada?._id || "none"}
            onChange={handleSeleccionPromo}
          >
            <option value="none">Seleccioná una Promo</option>
            {promos?.map((promo) => (
              <option key={promo._id} value={promo._id}>
                {promo.nombre} ({promo.descuento}%)
              </option>
            ))}
          </select>
          <button type="button" className="iconContainer" onClick={abrirModalCam}>
            <img
              src="https://www.svgrepo.com/show/904/photo-camera.svg"
              alt=""
              className="camIcon"
            />
          </button>
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

      {/* Modal de mensajes genéricos */}
      {mensajeModal && (
        <ModalMensaje
          tipo={mensajeModal.tipo}
          titulo={mensajeModal.titulo}
          mensaje={mensajeModal.mensaje}
          onClose={() => setMensajeModal(null)}
        />
      )}

      {/* Modal de Cámara */}
      {modalCamAbierto && (
        <ModalMensaje titulo="Webcam" mensaje="Vista previa de la cámara" onClose={cerrarModalCam}>
          <div style={{ textAlign: "center" }}>
            {!fotoUrl ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  style={{
                    width: "320px",
                    height: "240px",
                    borderRadius: "6px",
                    background: "#222",
                  }}
                />
                <button className="guardarWebcamBtn" style={{ marginTop: "1rem" }} onClick={tomarFoto}>
                  Tomar Foto
                </button>
              </>
            ) : (
              <>
                <img src={fotoUrl} alt="Foto tomada" style={{ width: "320px", borderRadius: "6px" }} />
                <button className="guardarWebcamBtn" style={{ marginTop: "1rem" }} onClick={volverACamara}>
                  Volver a cámara
                </button>
              </>
            )}
          </div>
        </ModalMensaje>
      )}
    </div>
  );
}

export default DatosPago;
