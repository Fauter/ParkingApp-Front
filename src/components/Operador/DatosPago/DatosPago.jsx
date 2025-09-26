import React, { useState, useEffect } from "react";
import "./DatosPago.css";
import ModalMensaje from "../../ModalMensaje/ModalMensaje";

const BASE_URL = "http://localhost:5000";
const PROMOS_POLL_MS = 180000; // 3 min

function DatosPago({
  vehiculoLocal,
  limpiarVehiculo,          // (lo seguís usando tras registrar movimiento)
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

  // ====== Webcam (para FOTO DE PROMO) ======
  const [modalCamAbierto, setModalCamAbierto] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [capturaTemporal, setCapturaTemporal] = useState(null); // preview
  const [promoFoto, setPromoFoto] = useState(null); // ✅ dataURL final aceptada para la PROMO
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
        if (promoSeleccionada && !data.find(p => p._id === promoSeleccionada._id)) {
          setPromoSeleccionada(null);
        }
      } catch (err) {
        console.error("Error cargando promociones", err);
      }
    };

    loadPromos();
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
    // Si cambio de promo, mantengo la foto previa (si ya fue tomada) — si querés limpiarla al cambiar promo, descomentá:
    // setPromoFoto(null);
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

  // ✅ Resetear todo cuando desde DatosAutoSalida limpian el vehiculo (vehiculoLocal → null)
  useEffect(() => {
    if (!vehiculoLocal) {
      resetCamposPago();
      setPromoFoto(null);
      setCapturaTemporal(null);
      setMensajeModal(null);
      if (modalCamAbierto) cerrarModalCam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const token = localStorage.getItem('token') || '';
    const horas = tiempoEstadiaHoras || 1;
    const descripcion = `Pago por ${horas} Hora${horas > 1 ? "s" : ""}`;

    // ⛔ Foto del movimiento: mantenemos la de ENTRADA (o la que ya tenga el vehículo)
    const fotoMovimiento =
      vehiculoLocal?.estadiaActual?.fotoUrl /* /uploads/... de la entrada */ ||
      null;

    // 1) Registrar salida
    fetch(`${BASE_URL}/api/vehiculos/${vehiculoLocal.patente}/registrarSalida`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        salida: horaSalida || new Date().toISOString(),
        costo: totalConDescuento,
        tarifa: tarifaAplicada || null,
        tiempoHoras: horas,
      }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json?.msg || "Error al registrar salida");
        }
        return json;
      })
      .then(() => {
        // 2) Registrar movimiento
        const datosMovimiento = {
          patente: vehiculoLocal.patente,
          tipoVehiculo: vehiculoLocal.tipoVehiculo || "Desconocido",
          metodoPago,
          factura,
          descripcion,
          monto: totalConDescuento,
          tipoTarifa: "hora",
          ticket: vehiculoLocal.estadiaActual?.ticket || undefined,
          fotoUrl: fotoMovimiento || undefined,
          ...(promoSeleccionada ? {
            promo: {
              _id: promoSeleccionada._id,
              nombre: promoSeleccionada.nombre,
              descuento: promoSeleccionada.descuento,
              // ⬇️ Enviamos la foto de la PROMO como dataURL; el back la persiste en /uploads/fotos/webcamPromos/
              ...(promoFoto ? { fotoUrl: promoFoto } : {})
            }
          } : {})
        };

        return fetch(`${BASE_URL}/api/movimientos/registrar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(datosMovimiento),
        });
      })
      .then(async (res) => {
        if (!res) return null;
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json?.movimiento) {
          throw new Error(json?.msg || "Error al registrar movimiento");
        }
        return json;
      })
      .then(() => {
        setMensajeModal({
          tipo: "exito",
          titulo: "Movimiento registrado",
          mensaje: `✅ Movimiento registrado para ${vehiculoLocal.patente}`,
        });
        limpiarVehiculo?.();
        resetCamposPago();
        setPromoFoto(null);
        setCapturaTemporal(null);
        if (onAbrirBarreraSalida) onAbrirBarreraSalida();
      })
      .catch((err) => {
        console.error("❌ Error en salida/movimiento:", err);
        setMensajeModal({
          tipo: "error",
          titulo: "Error",
          mensaje: err?.message || "No se pudo completar la operación.",
        });
      });
  };

  // ====== Cámara (modal) – SOLO para FOTO DE PROMO ======
  const abrirModalCam = async () => {
    setCapturaTemporal(null);
    try {
      const stream = await getStream();
      setVideoStream(stream);
      setModalCamAbierto(true);
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
    setCapturaTemporal(canvas.toDataURL("image/png"));
  };

  const reintentarFoto = async () => {
    setCapturaTemporal(null);
    // reabrimos stream por si se cortó
    try {
      if (videoStream) {
        // si ya hay stream vivo, solo volvemos a mostrar vista
        return;
      }
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

  const aceptarFotoPromo = () => {
    if (!capturaTemporal) return;
    setPromoFoto(capturaTemporal);
    cerrarModalCam();
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
    setCapturaTemporal(null);
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

          <button
            type="button"
            className={`iconContainer ${promoFoto ? "withPhoto" : ""}`}
            onClick={abrirModalCam}
            title={promoFoto ? "Foto de promo cargada" : "Tomar foto para promo"}
          >
            {!promoFoto ? (
              <img
                src="https://www.svgrepo.com/show/904/photo-camera.svg"
                alt=""
                className="camIcon"
              />
            ) : (
              <span className="promoCheck">✔</span>
            )}
          </button>
        </div>
      </div>

      <div className="precioEspecificaciones">
        <div>
          <div className="title">Método de Pago</div>
          <div className="metodoDePago">
            {["Efectivo", "Transferencia", "Débito", "Crédito", "QR"].map((metodo) => (
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

      {/* Modal de Cámara (FOTO PROMO) */}
      {modalCamAbierto && (
        <ModalMensaje titulo="Webcam" mensaje="Foto para Promo" onClose={cerrarModalCam}>
          <div style={{ textAlign: "center" }}>
            {!capturaTemporal ? (
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
                <img src={capturaTemporal} alt="Foto tomada" style={{ width: "320px", borderRadius: "6px" }} />
                <div style={{ marginTop: "1rem", display: "flex", gap: "10px", justifyContent: "center" }}>
                  <button className="guardarWebcamBtn" onClick={reintentarFoto}>
                    Reintentar
                  </button>
                  <button className="guardarWebcamBtn aceptarBtn" onClick={aceptarFotoPromo}>
                    Aceptar
                  </button>
                </div>
              </>
            )}
          </div>
        </ModalMensaje>
      )}
    </div>
  );
}

export default DatosPago;
