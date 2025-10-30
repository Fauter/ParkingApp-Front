// src/Operador/Operador/DatosPago/DatosPago.jsx
import React, { useState, useEffect, useRef } from "react";
import "./DatosPago.css";
import ModalMensaje from "../../ModalMensaje/ModalMensaje";
import { useTarifasData, calcularAmbosPrecios, armarParametrosTiempo } from "../../../hooks/tarifasService";

const BASE_URL = "http://localhost:5000";
const PROMOS_POLL_MS = 180000; // 3 min

// ===== DEBUG helpers =====
const DBG = true;
const log = (...args) => DBG && console.log("[DatosPago]", ...args);
const group = (title) => DBG && console.group("[DatosPago]", title);
const groupEnd = () => DBG && console.groupEnd();

function DatosPago({
  vehiculoLocal,
  limpiarVehiculo,
  tarifaCalculada,
  user,
  onAbrirBarreraSalida,
}) {
  // ⬇️ ahora SIN default
  const [metodoPago, setMetodoPago] = useState(null); // "Efectivo" | "Transferencia" | "Débito" | "Crédito" | "QR" | null
  const [factura, setFactura] = useState(null);       // "CC" | "A" | "Final" | null

  const [promos, setPromos] = useState([]);
  const [promoSeleccionada, setPromoSeleccionada] = useState(null);
  const [tiempoEstadiaHoras, setTiempoEstadiaHoras] = useState(0);

  const [costoTotal, setCostoTotal] = useState(0);
  const [totalConDescuento, setTotalConDescuento] = useState(0);
  const [tarifaAplicada, setTarifaAplicada] = useState(null);
  const [horaSalida, setHoraSalida] = useState(null);

  // catálogo para fallback
  const { tarifas, preciosEfectivo, preciosOtros, parametros } = useTarifasData();

  // ⬅️ para que el fallback corra una sola vez como “parche”
  const didFallbackCalcRef = useRef(false);

  // ---- DEBUG: montaje/desmontaje
  useEffect(() => {
    group("MOUNT");
    log("montado");
    groupEnd();
    return () => {
      group("UNMOUNT");
      log("desmontado");
      groupEnd();
    };
  }, []);

  // ---- DEBUG: props
  useEffect(() => {
    group("PROP change: tarifaCalculada");
    log("tarifaCalculada recibida:", JSON.stringify(tarifaCalculada));
    groupEnd();

    if (tarifaCalculada?.salida) setHoraSalida(tarifaCalculada.salida);
    if (tarifaCalculada?.tarifa) setTarifaAplicada(tarifaCalculada.tarifa);

    // si llegó algo usable, no correr más el fallback
    if (tarifaCalculada && (
      tarifaCalculada.costo != null ||
      tarifaCalculada.costoEfectivo != null ||
      tarifaCalculada.costoOtros != null
    )) {
      didFallbackCalcRef.current = true;
    }
  }, [tarifaCalculada]);

  useEffect(() => {
    group("PROP change: vehiculoLocal");
    log("vehiculoLocal:", vehiculoLocal);
    log("estadiaActual:", vehiculoLocal?.estadiaActual);
    log("estadiaActual.costoTotal:", vehiculoLocal?.estadiaActual?.costoTotal);
    groupEnd();
  }, [vehiculoLocal]);

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

  // ✅ al cambiar la promo recalculamos el total con descuento
  useEffect(() => {
    group("RECALC por promo/costoTotal");
    log("promoSeleccionada:", promoSeleccionada);
    log("costoTotal base:", costoTotal);
    if (promoSeleccionada) {
      const descuento = promoSeleccionada.descuento || 0;
      const nuevoTotal = (costoTotal || 0) * (1 - descuento / 100);
      log("→ descuento %:", descuento, "→ totalConDescuento:", nuevoTotal);
      setTotalConDescuento(nuevoTotal);
    } else {
      log("→ sin promo, totalConDescuento = costoTotal");
      setTotalConDescuento(costoTotal || 0);
    }
    groupEnd();
  }, [promoSeleccionada, costoTotal]);

  const handleSeleccionPromo = (e) => {
    const idSeleccionado = e.target.value;
    const promo = promos.find((p) => p._id === idSeleccionado);
    log("Seleccion promo:", idSeleccionado, "→", promo);
    setPromoSeleccionada(promo || null);
  };

  // 🔁 Fallback: si NO llega tarifaCalculada usable, calculo yo (SOLO UNA VEZ)
  useEffect(() => {
    const entrada = vehiculoLocal?.estadiaActual?.entrada;
    const salida = vehiculoLocal?.estadiaActual?.salida;
    if (!vehiculoLocal || !entrada || !salida) return;

    const noHayTarifa =
      !tarifaCalculada ||
      (
        tarifaCalculada.costo == null &&
        tarifaCalculada.costoEfectivo == null &&
        tarifaCalculada.costoOtros == null
      );

    if (!noHayTarifa) return;            // ya hay algo
    if (didFallbackCalcRef.current) return; // ya lo hicimos

    (async () => {
      group("FALLBACK CALC en DatosPago (no llegó tarifaCalculada)");
      try {
        const { dias, horasFormateadas } = armarParametrosTiempo(entrada, salida);
        log("params:", { dias, horasFormateadas });

        const { costoEfectivo, costoOtros } = await calcularAmbosPrecios({
          tipoVehiculo: vehiculoLocal.tipoVehiculo,
          inicio: new Date(entrada).toISOString(),
          dias,
          hora: horasFormateadas,
          tarifas,
          preciosEfectivo,
          preciosOtros,
          parametros,
        });

        didFallbackCalcRef.current = true;

        // ⬇️ si no hay método seleccionado, NO fijamos costo todavía
        if (!metodoPago) {
          log("Sin método seleccionado → no seteo costoTotal en fallback (queda 0 hasta elegir)");
        } else {
          const elegido = metodoPago === "Efectivo" ? costoEfectivo : costoOtros;
          log("resultado fallback → elegido:", elegido);
          setCostoTotal(elegido || 0);
        }
      } catch (e) {
        console.error("fallback cálculo DatosPago:", e.message);
      } finally {
        groupEnd();
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiculoLocal, tarifas, preciosEfectivo, preciosOtros, parametros, metodoPago]);

  // Helper: bucket de método
  const metodoEsEfectivo = (m) => m === "Efectivo";
  const metodoEsOtros = (m) => m && m !== "Efectivo";

  // ✅ CORE: Elegir costo según método usando lo que llegó o lo que calculó el fallback
  useEffect(() => {
    group("RECALC por método/tarifa/vehiculo");
    log("metodoPago:", metodoPago);

    let elegido = null;

    if (metodoEsEfectivo(metodoPago)) {
      elegido = tarifaCalculada?.costoEfectivo ?? tarifaCalculada?.costo;
    } else if (metodoEsOtros(metodoPago)) {
      elegido = tarifaCalculada?.costoOtros ?? tarifaCalculada?.costo;
    } else {
      // sin método: si vino un costo genérico lo usamos; si no, 0
      elegido = tarifaCalculada?.costo ?? null;
    }

    const fallback = vehiculoLocal?.estadiaActual?.costoTotal ?? 0;
    const base = (elegido ?? (metodoPago ? fallback : 0) ?? 0);

    log("valor elegido por método:", elegido);
    log("fallback (estadiaActual.costoTotal):", fallback);
    log("→ base que se setea en costoTotal:", base);

    setCostoTotal(base);
    groupEnd();
  }, [metodoPago, tarifaCalculada, vehiculoLocal]);

  // ====== Tiempo de estadía y compat SIN pisar selección ======
  useEffect(() => {
    if (!vehiculoLocal) return;
    group("RECALC tiempo estadía / compat");

    const estadia = vehiculoLocal.estadiaActual;
    if (!estadia || !estadia.entrada) {
      log("→ sin estadia/entrada; horas = 0");
      setTiempoEstadiaHoras(0);
      groupEnd();
      return;
    }

    const entrada = new Date(estadia.entrada);
    const salida = horaSalida ? new Date(horaSalida) : new Date();
    const diffMs = salida - entrada;

    if (diffMs <= 0) {
      log("→ diffMs <= 0; horas = 0");
      setTiempoEstadiaHoras(0);
      groupEnd();
      return;
    }

    const horas = Math.max(Math.ceil(diffMs / (1000 * 60 * 60)), 1);
    setTiempoEstadiaHoras(horas);
    log("entrada:", entrada.toISOString(), "salida:", salida.toISOString(), "horas redondeadas:", horas);

    // ⛔ NO pisar si ya tenemos tarifaCalculada útil
    const hayTarifaUtil = !!tarifaCalculada && (
      tarifaCalculada.costo != null ||
      tarifaCalculada.costoEfectivo != null ||
      tarifaCalculada.costoOtros != null
    );

    if (!hayTarifaUtil && estadia.costoTotal != null && metodoPago) {
      log("Compat: arrastro costoTotal de estadia:", estadia.costoTotal);
      setCostoTotal(estadia.costoTotal);
    }

    setTarifaAplicada(estadia.tarifa || null);
    groupEnd();
  }, [vehiculoLocal, horaSalida, tarifaCalculada, metodoPago]);

  useEffect(() => { log("🚗 vehiculoLocal en DatosPago:", vehiculoLocal); }, [vehiculoLocal]);

  // Reset al limpiar
  useEffect(() => {
    if (!vehiculoLocal) {
      group("RESET por vehiculoLocal=null");
      log("Reseteando campos de pago, webcam y mensajes");
      groupEnd();
      resetCamposPago();
      setPromoFoto(null);
      setCapturaTemporal(null);
      setMensajeModal(null);
      if (modalCamAbierto) cerrarModalCam();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehiculoLocal]);

  const handleSelectMetodoPago = (metodo) => { log("Click método de pago:", metodo); setMetodoPago(metodo); };
  const handleSelectFactura = (opcion)   => { log("Click factura:", opcion); setFactura(opcion); };

  const resetCamposPago = () => {
    log("resetCamposPago()");
    setMetodoPago(null);
    setFactura(null);
    setPromoSeleccionada(null);
    setTiempoEstadiaHoras(0);
    setCostoTotal(0);
    setTarifaAplicada(null);
    setHoraSalida(null);
    setTotalConDescuento(0);
  };

  // ====== Webcam ======
  const [modalCamAbierto, setModalCamAbierto] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [capturaTemporal, setCapturaTemporal] = useState(null);
  const [promoFoto, setPromoFoto] = useState(null);
  const videoRef = React.useRef(null);

  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [mensajeModal, setMensajeModal] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/webcam`);
        if (r.ok) {
          const data = await r.json();
          if (data?.webcam) {
            log("webcam device desde API:", data.webcam);
            setSelectedDeviceId(data.webcam);
            localStorage.setItem("webcamDeviceId", data.webcam);
            return;
          }
        }
      } catch (_) { /* ignore */ }
      const ls = localStorage.getItem("webcamDeviceId");
      if (ls) {
        log("webcam device desde localStorage:", ls);
        setSelectedDeviceId(ls);
      }
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
      try { return await navigator.mediaDevices.getUserMedia(constraints); }
      catch (e) { lastErr = e; }
    }
    throw lastErr || new Error("No se pudo abrir ninguna cámara");
  };

  // ==== NUEVO: helper para imprimir ticket de salida ====
  const imprimirTicketSalida = async (salidaFinalISO) => {
    try {
      const payload = {
        ticketNumero: vehiculoLocal?.estadiaActual?.ticket,
        ingreso: vehiculoLocal?.estadiaActual?.entrada,
        egreso: salidaFinalISO,
        totalConDescuento,  // number
        patente: vehiculoLocal?.patente,
        tipoVehiculo: vehiculoLocal?.tipoVehiculo,
      };

      log("POST /api/tickets/imprimir-salida payload:", payload);

      const r = await fetch(`${BASE_URL}/api/tickets/imprimir-salida`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const txt = await r.text().catch(() => "");
        console.error("❌ Error al imprimir ticket de salida:", txt || r.status);
        return false;
      }
      return true;
    } catch (e) {
      console.error("❌ Excepción al imprimir ticket de salida:", e);
      return false;
    }
  };

  const registrarMovimiento = () => {
    if (!vehiculoLocal?.patente) return;

    // ⛔ Validaciones duras: requiere método y factura
    if (!metodoPago || !factura) {
      setMensajeModal({
        tipo: "error",
        titulo: "Faltan datos",
        mensaje: !metodoPago && !factura
          ? "Seleccioná un método de pago y un tipo de factura."
          : !metodoPago
            ? "Seleccioná un método de pago."
            : "Seleccioná un tipo de factura."
      });
      return;
    }

    const token = localStorage.getItem('token') || '';

    // Tiempos (MISMA salida para todo el flujo)
    const entradaFinalISO = vehiculoLocal?.estadiaActual?.entrada
      ? new Date(vehiculoLocal.estadiaActual.entrada).toISOString()
      : null;

    const salidaFinalISO =
      (horaSalida ? new Date(horaSalida).toISOString()
      : (vehiculoLocal?.estadiaActual?.salida ? new Date(vehiculoLocal.estadiaActual.salida).toISOString()
      : new Date().toISOString()));

    // Texto
    const horas = tiempoEstadiaHoras || 1;
    const descripcion = `Pago por ${horas} Hora${horas > 1 ? "s" : ""}`;

    const fotoMovimiento = vehiculoLocal?.estadiaActual?.fotoUrl || null;

    group("REGISTRAR MOVIMIENTO payload");
    log("metodoPago:", metodoPago, "factura:", factura);
    log("monto final (con promos):", totalConDescuento);
    log("tarifaAplicada:", tarifaAplicada);
    log("tiempoHoras:", horas);
    log("entradaFinalISO:", entradaFinalISO, "salidaFinalISO:", salidaFinalISO);
    groupEnd();

    // 1) Registrar salida en vehiculo con la misma salidaFinalISO
    fetch(`${BASE_URL}/api/vehiculos/${vehiculoLocal.patente}/registrarSalida`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        salida: salidaFinalISO,
        costo: totalConDescuento,
        tarifa: tarifaAplicada || null,
        tiempoHoras: horas,
      }),
    })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.msg || "Error al registrar salida");
        return json;
      })
      .then(() => {
        // ======= AQUÍ VA EL OPERADOR LOGUEADO =======
        const operadorPayload = user ? {
          username: user.username,
          nombre: user.nombre,
          apellido: user.apellido,
          email: user.email,
          _id: user._id || user.id
        } : undefined;

        // 2) POST movimiento con horarios explícitos
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

          // ⏰ NUEVO: enviar horarios explícitos
          entrada: entradaFinalISO || undefined,
          salida:  salidaFinalISO,

          // Extra informativo para tu grid/back
          tiempoHoras: horas,

          // Operador
          ...(operadorPayload ? { operador: operadorPayload } : {}),
          ...(user?.username ? { operadorUsername: user.username } : {}),
          ...(user?._id || user?.id ? { operadorId: (user._id || user.id).toString() } : {}),

          // Promo (si hay)
          ...(promoSeleccionada ? {
            promo: {
              _id: promoSeleccionada._id,
              nombre: promoSeleccionada.nombre,
              descuento: promoSeleccionada.descuento,
              ...(promoFoto ? { fotoUrl: promoFoto } : {})
            }
          } : {})
        };

        log("POST /api/movimientos/registrar", datosMovimiento);

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
        if (!res.ok || !json?.movimiento) throw new Error(json?.msg || "Error al registrar movimiento");
        return json;
      })
      .then(async () => {
        // 3) Imprimir ticket usando la MISMA salida
        await imprimirTicketSalida(salidaFinalISO);

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
    } catch {
      setVideoStream(null);
      setMensajeModal({ tipo: "error", titulo: "Error de cámara", mensaje: "No se pudo acceder a la webcam." });
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
    try {
      if (videoStream) return;
      const stream = await getStream();
      setVideoStream(stream);
    } catch {
      setVideoStream(null);
      setMensajeModal({ tipo: "error", titulo: "Error de cámara", mensaje: "No se pudo acceder a la webcam." });
    }
  };

  const aceptarFotoPromo = () => { if (capturaTemporal) { setPromoFoto(capturaTemporal); cerrarModalCam(); } };

  useEffect(() => { if (videoRef.current && videoStream) videoRef.current.srcObject = videoStream; }, [videoStream]);

  const cerrarModalCam = () => {
    setModalCamAbierto(false);
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
    setCapturaTemporal(null);
  };

  useEffect(() => {
    return () => { if (videoStream) videoStream.getTracks().forEach((t) => t.stop()); };
  }, [videoStream]);

  return (
    <div className="datosPago">
      <div className="precioTotal">
        <div className="precioContainer">
          ${totalConDescuento.toLocaleString("es-AR")}
        </div>
        <div className="promo">
          <select className="promoSelect" value={promoSeleccionada?._id || "none"} onChange={handleSeleccionPromo}>
            <option value="none">Seleccioná una Promo</option>
            {promos?.map((promo) => (
              <option key={promo._id} value={promo._id}>{promo.nombre} ({promo.descuento}%)</option>
            ))}
          </select>

          <button
            type="button"
            className={`iconContainer ${promoFoto ? "withPhoto" : ""}`}
            onClick={abrirModalCam}
            title={promoFoto ? "Foto de promo cargada" : "Tomar foto para promo"}
          >
            {!promoFoto ? (
              <img src="https://www.svgrepo.com/show/904/photo-camera.svg" alt="" className="camIcon" />
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

      <button className="btn-salida" onClick={registrarMovimiento}>⬆ SALIDA</button>

      {mensajeModal && (
        <ModalMensaje
          tipo={mensajeModal.tipo}
          titulo={mensajeModal.titulo}
          mensaje={mensajeModal.mensaje}
          onClose={() => setMensajeModal(null)}
        />
      )}

      {modalCamAbierto && (
        <ModalMensaje titulo="Webcam" mensaje="Foto para Promo" onClose={cerrarModalCam}>
          <div style={{ textAlign: "center" }}>
            {!capturaTemporal ? (
              <>
                <video ref={videoRef} autoPlay style={{ width: "320px", height: "240px", borderRadius: "6px", background: "#222" }} />
                <button className="guardarWebcamBtn" style={{ marginTop: "1rem" }} onClick={tomarFoto}>Tomar Foto</button>
              </>
            ) : (
              <>
                <img src={capturaTemporal} alt="Foto tomada" style={{ width: "320px", borderRadius: "6px" }} />
                <div style={{ marginTop: "1rem", display: "flex", gap: "10px", justifyContent: "center" }}>
                  <button className="guardarWebcamBtn" onClick={reintentarFoto}>Reintentar</button>
                  <button className="guardarWebcamBtn aceptarBtn" onClick={aceptarFotoPromo}>Aceptar</button>
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
