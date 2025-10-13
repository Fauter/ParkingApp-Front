// src/Operador/CargaMensuales/DatosAutoAbono.jsx
import React, { useState, useEffect, useRef } from "react";
import { FaCamera, FaCheckCircle } from "react-icons/fa";
import ModalMensaje from "../../ModalMensaje/ModalMensaje";
import "./DatosAutoAbono.css";

const BASE_URL = "http://localhost:5000";
const CATALOG_POLL_MS = 180000; // 3 min

// === Helpers de abono (tier según cochera/exclusiva) ===
const getTierName = (cochera, exclusiva) => {
  const c = String(cochera || "").toLowerCase(); // 'fija' | 'móvil' | ''
  if (c === "fija") return exclusiva ? "exclusiva" : "fija";
  return "móvil";
};

const getAbonoTierKeyCandidates = (cochera, exclusiva) => {
  const t = getTierName(cochera, exclusiva); // 'móvil' | 'fija' | 'exclusiva'
  if (t === "móvil") return ["móvil", "movil"]; // compat sin tilde
  return [t];
};

// === Normalización ligera FRONT (el back también normaliza) ===
const normCocheraFront = (raw) => {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "fija") return "Fija";
  if (v === "móvil" || v === "movil") return "Móvil";
  return "";
};
const normExclusivaFront = (exclusiva, cochera) =>
  normCocheraFront(cochera) === "Fija" ? Boolean(exclusiva) : false;

/* ===========================
   Modal simple inline (Confirmación GENERAL)
=========================== */
const InlineConfirmModal = ({ open, titulo, mensaje, onConfirm, onCancel }) => {
  if (!open) return null;
  const lines = String(mensaje || "")
    .split("\n")
    .map((l) => l.trimEnd());

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div
        className="modal-contenedor"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 420, maxWidth: "92%" }}
      >
        <div className="modal-header">
          <h3 style={{ margin: 0 }}>{titulo || "Confirmar"}</h3>
          <button className="modal-cerrar" onClick={onCancel} title="Cerrar">
            ×
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              whiteSpace: "pre-wrap",
            }}
          >
            {lines.map((line, i) => {
              if (!line.trim()) {
                return <div key={`sep-${i}`} style={{ height: 6, opacity: 0.4 }} />;
              }
              return <div key={i} style={{ lineHeight: 1.25 }}>{line}</div>;
            })}
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
            <button className="guardarWebcamBtn" onClick={onCancel}>
              Cancelar
            </button>
            <button className="guardarWebcamBtn" onClick={onConfirm}>
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

function DatosAutoAbono({ datosVehiculo, clienteSeleccionado, user }) {
  const [formData, setFormData] = useState({
    nombreApellido: "",
    dniCuitCuil: "",
    domicilio: "",
    localidad: "",
    telefonoParticular: "",
    telefonoEmergencia: "",
    domicilioTrabajo: "",
    telefonoTrabajo: "",
    email: "",
    patente: datosVehiculo?.patente || "",
    tipoVehiculo: datosVehiculo?.tipoVehiculo || "",
    marca: "",
    modelo: "",
    color: "",
    anio: "",
    companiaSeguro: "",
    metodoPago: "Efectivo",
    factura: "CC",
    fotoSeguro: null,
    fotoDNI: null,
    fotoCedulaVerde: null,
    cochera: "",
    piso: "",
    exclusiva: false
  });

  const [fileUploaded, setFileUploaded] = useState({
    fotoSeguro: false,
    fotoDNI: false,
    fotoCedulaVerde: false,
  });

  const inputRefs = {
    fotoSeguro: useRef(null),
    fotoDNI: useRef(null),
    fotoCedulaVerde: useRef(null),
  };

  const [tiposVehiculo, setTiposVehiculo] = useState([]);

  // 🔹 Traemos AMBOS catálogos
  const [preciosEfectivo, setPreciosEfectivo] = useState({});
  const [preciosOtros, setPreciosOtros] = useState({});

  // Compat (algunos helpers esperan 'precios' a secas)
  const [precios, setPrecios] = useState({});

  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(false);

  // Upgrade flag para la descripción del movimiento (derivado del preview del back)
  const [isUpgrade, setIsUpgrade] = useState(false);

  // Guardamos el último preview del back para usar montos exactos
  const [lastPreview, setLastPreview] = useState(null);

  // Modal informativo simple
  const [modal, setModal] = useState({ titulo: "", mensaje: "" });
  const closeModal = () => setModal({ titulo: "", mensaje: "" });
  const showModal = (titulo, mensaje) => setModal({ titulo, mensaje });

  // Modal “más caro”
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    titulo: "",
    mensaje: "",
    onConfirm: null,
    onCancel: null,
  });

  // Modal confirmación general (abono)
  const [confirmAbono, setConfirmAbono] = useState({
    open: false,
    titulo: "",
    mensaje: "",
    onConfirm: null,
    onCancel: null,
  });

  // ===== Webcam =====
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [modalCamAbierto, setModalCamAbierto] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [capturingField, setCapturingField] = useState(null);
  const videoRef = useRef(null);

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
      } catch (_) {}
      const ls = localStorage.getItem("webcamDeviceId");
      if (ls) setSelectedDeviceId(ls);
    })();
  }, []);

  const humanMediaError = (err) => {
    if (!err) return "Error desconocido de cámara";
    if (err.name === "NotAllowedError" || err.name === "SecurityError")
      return "Permiso denegado. Habilitá el acceso a la cámara para este sitio.";
    if (err.name === "NotFoundError" || err.name === "OverconstrainedError")
      return "No se encontró esa cámara. Actualizá la lista en Config o reconectá.";
    if (err.name === "NotReadableError")
      return "La cámara está en uso por otra app. Cerrala y probá de nuevo.";
    return `Fallo de cámara: ${err.name || ""} ${err.message || ""}`;
  };

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

  const abrirCamParaCampo = async (campo) => {
    setCapturingField(campo);
    setFotoPreview(null);
    setModalCamAbierto(true);
    try {
      const stream = await getStream();
      setVideoStream(stream);
    } catch (err) {
      setVideoStream(null);
      showModal("Error de cámara", humanMediaError(err));
    }
  };

  const tomarFoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setFotoPreview(canvas.toDataURL("image/png"));
  };

  const repetirFoto = async () => {
    setFotoPreview(null);
    if (videoStream) {
      videoStream.getTracks().forEach((t) => t.stop());
      setVideoStream(null);
    }
    try {
      const stream = await getStream();
      setVideoStream(stream);
    } catch (err) {
      setVideoStream(null);
      showModal("Error de cámara", humanMediaError(err));
    }
  };

  const confirmarFoto = async () => {
    if (!capturingField || !fotoPreview) return;
    const res = await fetch(fotoPreview);
    const blob = await res.blob();
    const patente = (formData.patente || "SINPATENTE").replace(/\s+/g, "");
    const ts = Date.now();
    const filename = `${patente}_${capturingField}_${ts}.png`;
    const file = new File([blob], filename, { type: "image/png" });

    setFormData((prev) => ({ ...prev, [capturingField]: file }));
    setFileUploaded((prev) => ({ ...prev, [capturingField]: true }));
    cerrarModalCam();
  };

  const cerrarModalCam = () => {
    setModalCamAbierto(false);
    setCapturingField(null);
    setFotoPreview(null);
    if (videoStream) {
      try {
        videoStream.getTracks().forEach((t) => t.stop());
      } catch {}
      setVideoStream(null);
    }
  };

  useEffect(() => {
    if (videoRef.current && videoStream) videoRef.current.srcObject = videoStream;
  }, [videoStream]);

  useEffect(() => {
    return () => {
      if (videoStream) {
        try {
          videoStream.getTracks().forEach((t) => t.stop());
        } catch {}
      }
    };
  }, [videoStream]);

  const formatARS = (n) => {
    if (typeof n !== "number" || !isFinite(n)) return "—";
    try {
      return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
    } catch {
      return String(n);
    }
  };

  const fetchClientes = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/clientes`, { cache: "no-store" });
    if (res.ok) {
        const data = await res.json();
        setClientes(Array.isArray(data) ? data : []);
      } else {
        showModal("Error", "No se pudo cargar la lista de clientes.");
      }
    } catch (err) {
      console.error("Error al cargar clientes:", err);
      showModal("Error", "Error al cargar lista de clientes.");
    }
  };

  // si cambia la patente/tipoVehiculo que vienen por prop, los actualizo
  useEffect(() => {
    if (datosVehiculo) {
      setFormData((prev) => ({
        ...prev,
        patente: (datosVehiculo.patente || "").toUpperCase().slice(0, 10),
        tipoVehiculo: datosVehiculo.tipoVehiculo || "",
      }));
    }
  }, [datosVehiculo]);

  // si el usuario elige un cliente a la izquierda, prellenamos el form
  useEffect(() => {
    if (!clienteSeleccionado) return;
    setFormData((prev) => ({
      ...prev,
      nombreApellido: clienteSeleccionado?.nombreApellido || prev.nombreApellido,
      dniCuitCuil: clienteSeleccionado?.dniCuitCuil || prev.dniCuitCuil,
      email: clienteSeleccionado?.email || prev.email,
      domicilio: clienteSeleccionado?.domicilio || prev.domicilio,
      localidad: clienteSeleccionado?.localidad || prev.localidad,
      telefonoParticular: clienteSeleccionado?.telefonoParticular || prev.telefonoParticular,
      telefonoEmergencia: clienteSeleccionado?.telefonoEmergencia || prev.telefonoEmergencia,
      domicilioTrabajo: clienteSeleccionado?.domicilioTrabajo || prev.domicilioTrabajo,
      telefonoTrabajo: clienteSeleccionado?.telefonoTrabajo || prev.telefonoTrabajo,
      cochera: normCocheraFront(clienteSeleccionado?.cochera) || prev.cochera,
      exclusiva: normExclusivaFront(clienteSeleccionado?.exclusiva, clienteSeleccionado?.cochera) || false,
      piso: clienteSeleccionado?.piso || prev.piso,
      patente: (clienteSeleccionado?.patente || prev.patente || "").toUpperCase().slice(0, 10),
    }));
  }, [clienteSeleccionado]);

  // ====== Carga de catálogos con ambos precios ======
  useEffect(() => {
    let timer = null;

    const fetchTiposYPrecios = async () => {
      try {
        const tiposRes = await fetch(`${BASE_URL}/api/tipos-vehiculo`, { cache: "no-store" });
        if (!tiposRes.ok) throw new Error("No se pudo cargar tipos de vehículo");
        const tiposData = await tiposRes.json();
        setTiposVehiculo(Array.isArray(tiposData) ? tiposData : []);

        // efectivo
        let cash = {};
        try {
          const r1 = await fetch(`${BASE_URL}/api/precios`, { cache: "no-store" });
          if (!r1.ok) throw new Error("precios efectivo falló");
          cash = await r1.json();
        } catch {
          const r2 = await fetch(`${BASE_URL}/api/precios?metodo=efectivo`, { cache: "no-store" });
          if (!r2.ok) throw new Error("precios efectivo fallback falló");
          cash = await r2.json();
        }
        setPreciosEfectivo(cash);

        // otros
        let other = {};
        try {
          const r3 = await fetch(`${BASE_URL}/api/precios?metodo=otros`, { cache: "no-store" });
          if (r3.ok) other = await r3.json();
        } catch {}
        setPreciosOtros(other);

        setPrecios(cash);
      } catch (err) {
        console.error("Error al cargar datos:", err);
        showModal("Error", "Error al cargar datos de vehículos y precios.");
      }
    };

    fetchTiposYPrecios();
    timer = setInterval(fetchTiposYPrecios, CATALOG_POLL_MS);

    const onVis = () => document.visibilityState === "visible" && fetchTiposYPrecios();
    const onOnline = () => fetchTiposYPrecios();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);

    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  useEffect(() => {
    fetchClientes();
  }, []);

  // ===== Helpers FRONT: abono por método + prorrateo =====

  const getAbonoPrecioByMetodo = (tipoVehiculo, metodoPago, cochera, exclusiva) => {
    const keyVehiculo = String(tipoVehiculo || "").toLowerCase();
    if (!keyVehiculo) return null;
    const mapa = metodoPago === "Efectivo" ? preciosEfectivo : preciosOtros;
    if (!mapa || !mapa[keyVehiculo]) return null;

    const candidates = getAbonoTierKeyCandidates(cochera, exclusiva);
    for (const tier of candidates) {
      const val = mapa[keyVehiculo]?.[tier];
      if (typeof val === "number" && isFinite(val) && val > 0) return val;
    }
    return null;
  };

  const getUltimoDiaMesFront = (hoy = new Date()) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d;
  };

  const prorratearMontoFront = (base, hoy = new Date()) => {
    const ultimo = getUltimoDiaMesFront(hoy);
    const total = ultimo.getDate();
    const dia = hoy.getDate();
    const diasRestantes = dia === 1 ? total : (total - dia + 1);
    const factor = diasRestantes / total;
    const proporcional = Math.round(Math.max(0, Number(base) || 0) * factor);
    return { proporcional, diasRestantes, totalDiasMes: total, factor };
  };

  // === Dentro del mes actual (para abonos del cliente)
  const isDentroMesActual = (iso) => {
    if (!iso) return false;
    const d = new Date(iso);
    if (isNaN(d)) return false;
    const now = new Date();
    const inicio = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const fin = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return d >= inicio && d <= fin;
  };

  // ====== VALIDACIONES ======
  const validarDNI = (dni) => {
    const s = String(dni || "").replace(/\D+/g, "");
    return s.length >= 7 && s.length <= 11;
  };

  // 🔐 ensureCliente por DNI (crea/actualiza si hace falta) → ahora devuelve { id, isNew }
  const ensureCliente = async () => {
    const dni = (formData.dniCuitCuil || "").trim();
    if (!validarDNI(dni)) throw new Error("DNI/CUIT/CUIL inválido");

    const cocheraNorm = normCocheraFront(formData.cochera);
    const exclusivaNorm = normExclusivaFront(formData.exclusiva, cocheraNorm);
    const pisoVal = String(formData.piso || "").trim();

    const encontrado = (clientes || []).find(
      (c) => String(c.dniCuitCuil || "").trim() === dni
    );

    if (encontrado && encontrado._id) {
      try {
        await fetch(`${BASE_URL}/api/clientes/${encontrado._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombreApellido: formData.nombreApellido,
            dniCuitCuil: formData.dniCuitCuil,
            domicilio: formData.domicilio,
            localidad: formData.localidad,
            telefonoParticular: formData.telefonoParticular,
            telefonoEmergencia: formData.telefonoEmergencia,
            domicilioTrabajo: formData.domicilioTrabajo,
            telefonoTrabajo: formData.telefonoTrabajo,
            email: formData.email,
            cochera: cocheraNorm,
            exclusiva: exclusivaNorm,
            piso: pisoVal
          }),
        }).catch(() => {});
      } catch {}
      return { id: encontrado._id, isNew: false };
    }

    // Crear
    const nuevoClienteRes = await fetch(`${BASE_URL}/api/clientes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombreApellido: formData.nombreApellido,
        dniCuitCuil: formData.dniCuitCuil,
        domicilio: formData.domicilio,
        localidad: formData.localidad,
        telefonoParticular: formData.telefonoParticular,
        telefonoEmergencia: formData.telefonoEmergencia,
        domicilioTrabajo: formData.domicilioTrabajo,
        telefonoTrabajo: formData.telefonoTrabajo,
        email: formData.email,
        precioAbono: formData.tipoVehiculo || "",
        cochera: cocheraNorm,
        exclusiva: exclusivaNorm,
        piso: pisoVal
      }),
    });

    if (!nuevoClienteRes.ok) {
      const err = await nuevoClienteRes.json().catch(() => ({}));
      throw new Error(err?.message || "Error al crear cliente");
    }
    const nuevoCliente = await nuevoClienteRes.json();
    if (!nuevoCliente._id) throw new Error("No se pudo crear cliente");
    return { id: nuevoCliente._id, isNew: true };
  };

  // === Nuevo: pedir preview al back para decidir si es "Aumento de precio" o "Alta abono"
  const fetchPreviewAbono = async () => {
    const params = new URLSearchParams();
    const dni = (formData.dniCuitCuil || "").trim();
    if (validarDNI(dni)) params.set("dniCuitCuil", dni);
    if (formData.tipoVehiculo) params.set("tipoVehiculo", formData.tipoVehiculo);
    params.set("metodoPago", formData.metodoPago || "Efectivo");
    params.set("cochera", formData.cochera || "Móvil");
    params.set(
      "exclusiva",
      normCocheraFront(formData.cochera) === "Fija" && formData.exclusiva ? "true" : "false"
    );
    params.set("mesesAbonar", "1");

    const url = `${BASE_URL}/api/abonos/preview?${params.toString()}`;
    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err?.error || "No se pudo obtener el preview de abono");
    }
    const data = await r.json();
    return data; // incluye: baseActual, baseNuevo, diffBase, proporcionalMesActual, diasRestantes, totalDiasMes, ...
  };

  // === Cálculo LOCAL del “más caro” (usado sólo como fallback si falla el preview del back)
  const calcularUpgradeLocal = (clienteExistente) => {
    const metodoNuevo = formData.metodoPago;
    const cocheraNueva = formData.cochera || "Móvil";
    const exclNueva = formData.cochera === "Fija" ? !!formData.exclusiva : false;

    const baseNuevo = getAbonoPrecioByMetodo(
      formData.tipoVehiculo,
      metodoNuevo,
      cocheraNueva,
      exclNueva
    ) || 0;

    let baseActual = 0;

    if (clienteExistente?.abonos?.length) {
      // max del mes actual
      for (const a of clienteExistente.abonos) {
        if (!a?.activo) continue;
        if (!isDentroMesActual(a?.fechaExpiracion)) continue;

        const metodoAbo = a.metodoPago || metodoNuevo;
        const cochAbo = a.cochera || cocheraNueva;
        const exclAbo = (a.cochera === "Fija") ? !!a.exclusiva : false;

        const baseAbo = getAbonoPrecioByMetodo(
          a.tipoVehiculo,
          metodoAbo,
          cochAbo,
          exclAbo
        );
        if (Number.isFinite(baseAbo) && baseAbo > baseActual) baseActual = baseAbo;
      }
    } else if (clienteExistente?.abonado && clienteExistente?.precioAbono) {
      // fallback si no tenemos abonos poblados
      const baseA = getAbonoPrecioByMetodo(
        clienteExistente.precioAbono,
        metodoNuevo,
        cocheraNueva,
        exclNueva
      );
      if (Number.isFinite(baseA)) baseActual = baseA;
    }

    const diffBase = Math.max(0, baseNuevo - baseActual);
    const { proporcional, diasRestantes, totalDiasMes } = prorratearMontoFront(diffBase);
    return { baseActual, baseNuevo, diffBase, montoHoy: proporcional, diasRestantes, totalDiasMes };
  };

  // ====== Flujo de guardado con dos confirmaciones ======
  const finalizarSubmit = async (previewOverride = null, decision = null) => {
    try {
      const patente = (formData.patente || "").toUpperCase();

      // ⚠️ ahora necesito saber si el cliente es nuevo o existente
      const clienteInfo = await ensureCliente(); // { id, isNew }
      const clienteId = clienteInfo.id;
      const clienteEsNuevo = decision?.isNew ?? clienteInfo.isNew;

      // precio base del NUEVO abono (para etiquetas / info)
      const tierName = getTierName(formData.cochera || "Móvil", formData.exclusiva);
      const baseMensual = getAbonoPrecioByMetodo(
        formData.tipoVehiculo,
        formData.metodoPago,
        formData.cochera || "Móvil",
        formData.cochera === "Fija" ? formData.exclusiva : false
      );

      if (!Number.isFinite(baseMensual)) {
        throw new Error(
          `No hay precio cargado para "${(formData.tipoVehiculo || "").toLowerCase()}" en tier "${tierName}" (${formData.metodoPago}).`
        );
      }

      // Decisión final de "upgrade" (aumento) y monto HOY
      const esUpgradeDecision =
        decision?.upgrade ??
        (previewOverride &&
          Number(previewOverride.baseActual) > 0 &&
          Number(previewOverride.diffBase) > 0);

      let proporcionalHoy;
      let diasRestantes;
      let totalDiasMes;

      if (clienteEsNuevo) {
        // cliente NUEVO: cobra prorrateo de la base mensual completa
        const pr = prorratearMontoFront(baseMensual);
        proporcionalHoy = pr.proporcional;
        diasRestantes = pr.diasRestantes;
        totalDiasMes = pr.totalDiasMes;
      } else if (esUpgradeDecision) {
        // EXISTENTE con aumento: cobra la DIFERENCIA prorrateada (usa preview del back si está disponible)
        if (previewOverride && Number.isFinite(previewOverride.proporcionalMesActual)) {
          proporcionalHoy = Number(previewOverride.proporcionalMesActual);
          diasRestantes = Number(previewOverride.diasRestantes);
          totalDiasMes = Number(previewOverride.totalDiasMes);
        } else {
          // fallback defensivo (ya casi no debería ocurrir)
          const pr = prorratearMontoFront(
            Math.max(0, (previewOverride?.baseNuevo || baseMensual) - (previewOverride?.baseActual || 0))
          );
          proporcionalHoy = pr.proporcional;
          diasRestantes = pr.diasRestantes;
          totalDiasMes = pr.totalDiasMes;
        }
      } else {
        // EXISTENTE y SIN aumento: no se cobra nada
        const pr = prorratearMontoFront(0);
        proporcionalHoy = 0;
        diasRestantes = pr.diasRestantes;
        totalDiasMes = pr.totalDiasMes;
      }

      // Para el back (info referencial — no rompe si no la usa)
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, v);
      });
      fd.set("patente", patente);
      fd.set("cliente", clienteId);
      fd.set("operador", user?.nombre || "Sistema");
      fd.set("exclusiva", formData.exclusiva ? "true" : "false");
      fd.set("precio", String(baseMensual)); // precio de catálogo
      fd.set("precioProrrateadoHoy", String(proporcionalHoy));
      fd.set("tierAbono", getTierName(formData.cochera || "Móvil", formData.exclusiva));

      // 1) Registrar Abono SIEMPRE
      const token = localStorage.getItem("token");
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
      const resp = await fetch(`${BASE_URL}/api/abonos/registrar-abono`, {
        method: "POST",
        headers: authHeaders,
        body: fd,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || "Error al registrar abono.");
      }

      const debeCobrar = clienteEsNuevo || esUpgradeDecision;

      // 2) (condicional) Crear Ticket en DB (tipo ABONO) sólo si se cobra algo
      let ticketNumber = null;
      if (debeCobrar && proporcionalHoy > 0) {
        try {
          const payloadTicketAbono = {
            tipo: "abono",
            patente,
            cliente: clienteId,
            operador: user?.username || user?.nombre || "Sistema",
            metodoPago: formData.metodoPago,
            factura: formData.factura,
            tierAbono: getTierName(formData.cochera || "Móvil", formData.exclusiva),
            baseMensual: baseMensual,
            montoProporcional: proporcionalHoy, // si es upgrade: es el diff prorrateado
            tipoVehiculo: formData.tipoVehiculo,
            fecha: new Date().toISOString(),
          };
          const ticketRes = await fetch(`${BASE_URL}/api/tickets`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(payloadTicketAbono),
          });
          const tj = await ticketRes.json().catch(() => null);
          ticketNumber = tj?.ticket ?? tj?.data?.ticket ?? tj?.result?.ticket ?? tj?._id ?? null;
        } catch (e) {
          console.warn("⚠️ No se pudo crear/leer el ticket ABONO en DB:", e);
        }
      }

      // 3) (condicional) Imprimir ticket sólo si se cobra algo
      if (debeCobrar && proporcionalHoy > 0) {
        try {
          await fetch(`${BASE_URL}/api/tickets/imprimir-abono`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({
              proporcional: `${formatARS(proporcionalHoy)}`,
              valorMensual: `${formatARS(baseMensual)}`,
              baseMensual,
              proporcionalRaw: proporcionalHoy,
              nombreApellido: formData.nombreApellido,
              metodoPago: formData.metodoPago,
              tipoVehiculo: formData.tipoVehiculo,
              marca: formData.marca,
              modelo: formData.modelo,
              patente,
              cochera: formData.cochera,
              piso: formData.piso,
              exclusiva: !!formData.exclusiva,
              diasRestantes,
            }),
          }).catch(() => {});
        } catch (e) {
          console.warn("⚠️ Impresión:", e);
        }
      }

      // 4) (condicional) Registrar movimiento
      if (debeCobrar && proporcionalHoy > 0) {
        const descripcion = clienteEsNuevo ? "Alta abono" : "Aumento de Precio";
        try {
          const movBody = {
            patente,
            tipoVehiculo: formData.tipoVehiculo,
            metodoPago: formData.metodoPago,
            factura: formData.factura,
            monto: proporcionalHoy, // si es upgrade: diff prorrateado; si es nuevo: prorrateo base
            descripcion,
            tipoTarifa: "abono",
            cliente: clienteId,
            operador: user || null,
            ...(ticketNumber ? { ticket: ticketNumber } : {}),
          };
          await fetch(`${BASE_URL}/api/movimientos/registrar`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify(movBody),
          }).catch(() => {});
        } catch (e) {
          console.warn("⚠️ movimiento:", e);
        }
      }

      await fetchClientes();
      fetch(`${BASE_URL}/api/sync/run-now`, { method: "POST" }).catch(() => {});

      const msgOk = clienteEsNuevo
        ? `Abono registrado y cobrado para ${patente} (cliente nuevo).`
        : esUpgradeDecision
          ? `Abono agregado y diferencia cobrada para ${patente} (aumento de precio).`
          : `Abono agregado para ${patente} (sin cargos).`;

      showModal("Éxito", msgOk);

      // Reset UI
      setFormData({
        nombreApellido: "",
        dniCuitCuil: "",
        domicilio: "",
        localidad: "",
        telefonoParticular: "",
        telefonoEmergencia: "",
        domicilioTrabajo: "",
        telefonoTrabajo: "",
        email: "",
        patente: datosVehiculo?.patente || "",
        tipoVehiculo: datosVehiculo?.tipoVehiculo || "",
        marca: "",
        modelo: "",
        color: "",
        anio: "",
        companiaSeguro: "",
        metodoPago: "Efectivo",
        factura: "CC",
        fotoSeguro: null,
        fotoDNI: null,
        fotoCedulaVerde: null,
        cochera: "",
        piso: "",
        exclusiva: false,
      });
      setFileUploaded({
        fotoSeguro: false,
        fotoDNI: false,
        fotoCedulaVerde: false,
      });
      setIsUpgrade(false);
      setLastPreview(null);
    } catch (error) {
      console.error(error);
      showModal("Error", error?.message || "Ocurrió un error al guardar el abono.");
    }
  };

  const continuarFlujoDespuesDeConfirmacion = async () => {
    setConfirmAbono((s) => ({ ...s, open: false }));
    setLoading(true);
    try {
      // ¿El DNI corresponde a un cliente existente?
      const dni = (formData.dniCuitCuil || "").trim();
      const clienteExistente = (clientes || []).find(
        (c) => String(c.dniCuitCuil || "").trim() === dni
      );
      const esClienteNuevo = !clienteExistente;

      // 1) Intentamos preview del back (más preciso)
      let preview = null;
      try {
        preview = await fetchPreviewAbono();
      } catch (e) {
        console.warn("⚠️ preview back falló, uso cálculo local si puedo:", e?.message || e);
      }

      // Regla: JAMÁS mostrar modal de aumento si estoy creando cliente nuevo
      const upgradePorBack = !esClienteNuevo &&
        preview &&
        Number(preview.baseActual) > 0 &&
        Number(preview.diffBase) > 0;

      if (upgradePorBack) {
        const vehiculoPretty = (() => {
          const s = String(formData.tipoVehiculo || "").trim();
          return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
        })();

        setConfirmModal({
          open: true,
          titulo: "Vehículo más caro",
          mensaje:
            `Estás pasando a "${vehiculoPretty}".\n\n` +
            `• Base actual: $${formatARS(preview.baseActual)}\n` +
            `• Base nueva: $${formatARS(preview.baseNuevo)}\n` +
            `• Diferencia mensual: $${formatARS(preview.diffBase)}\n` +
            `• A cobrar HOY: $${formatARS(preview.proporcionalMesActual)}\n\n` +
            `¿Deseás continuar?`,
          onConfirm: async () => {
            setConfirmModal((s) => ({ ...s, open: false }));
            setLoading(true);
            await finalizarSubmit(preview, { isNew: esClienteNuevo, upgrade: true });
            setLoading(false);
          },
          onCancel: () => {
            setConfirmModal((s) => ({ ...s, open: false }));
            setIsUpgrade(false);
            setLastPreview(null);
            setLoading(false);
          },
        });
        return;
      }

      // 2) Si el back no pudo o no marcó upgrade, intentamos heurística local (sólo si NO es cliente nuevo)
      if (!esClienteNuevo) {
        const { baseActual, baseNuevo, diffBase, montoHoy, diasRestantes, totalDiasMes } =
          calcularUpgradeLocal(clienteExistente);

        if (baseActual > 0 && diffBase > 0) {
          setIsUpgrade(true);
          const vehiculoPretty = (() => {
            const s = String(formData.tipoVehiculo || "").trim();
            return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
          })();
          const previewLike = {
            baseActual,
            baseNuevo,
            diffBase,
            proporcionalMesActual: montoHoy,
            diasRestantes,
            totalDiasMes
          };

          setConfirmModal({
            open: true,
            titulo: "Vehículo más caro",
            mensaje:
              `Estás pasando a "${vehiculoPretty}".\n\n` +
              `• Base actual: $${formatARS(baseActual)}\n` +
              `• Base nueva: $${formatARS(baseNuevo)}\n` +
              `• Diferencia mensual: $${formatARS(diffBase)}\n` +
              `• A cobrar HOY: $${formatARS(montoHoy)}\n\n` +
              `¿Deseás continuar?`,
            onConfirm: async () => {
              setConfirmModal((s) => ({ ...s, open: false }));
              setLoading(true);
              await finalizarSubmit(previewLike, { isNew: esClienteNuevo, upgrade: true });
              setLoading(false);
            },
            onCancel: () => {
              setConfirmModal((s) => ({ ...s, open: false }));
              setIsUpgrade(false);
              setLastPreview(null);
              setLoading(false);
            },
          });
          return;
        }
      }

      // 3) No es upgrade: alta normal
      setIsUpgrade(false);
      setLastPreview(null);
      await finalizarSubmit(preview || null, { isNew: esClienteNuevo, upgrade: false });
    } catch (error) {
      console.error(error);
      showModal("Error", error?.message || "Ocurrió un error al guardar el abono.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1) Validaciones locales rápidas
    try {
      const patente = (formData.patente || "").trim();
      if (!patente) throw new Error("Debe ingresar la patente.");
      if (!formData.tipoVehiculo) throw new Error("Debe seleccionar el tipo de vehículo.");
      if (!formData.nombreApellido?.trim())
        throw new Error("Debe ingresar el nombre y apellido del cliente.");
      if (!validarDNI(formData.dniCuitCuil))
        throw new Error("DNI/CUIT/CUIL inválido.");
      if (!formData.email?.trim()) throw new Error("Debe ingresar un email.");
      if (!formData.cochera) throw new Error("Debe seleccionar Cochera (Fija o Móvil).");
    } catch (err) {
      return showModal("Error", err.message);
    }

    // 2) Confirmación GENERAL (informativa)
    try {
      const patente = (formData.patente || "").toUpperCase();
      const tipo = formData.tipoVehiculo;
      const metodo = formData.metodoPago;
      const factura = formData.factura;

      const tierName = getTierName(formData.cochera || "Móvil", formData.exclusiva);
      const baseMensual = getAbonoPrecioByMetodo(
        tipo,
        metodo,
        formData.cochera || "Móvil",
        formData.cochera === "Fija" ? formData.exclusiva : false
      );

      if (!Number.isFinite(baseMensual)) {
        return showModal(
          "Error",
          `No hay precio cargado para "${(tipo || "").toLowerCase()}" en tier "${tierName}" (${metodo}). `
        );
      }

      const { proporcional, diasRestantes, totalDiasMes } = prorratearMontoFront(baseMensual);

      const detalleCochera = [
        `Cochera: ${formData.cochera || "-"}`,
        `N° de Cochera: ${formData.piso || "-"}`,
        `Exclusiva: ${formData.exclusiva ? "Sí" : "No"}`,
      ].join("\n");

      const ucfirst = (s) => {
        const str = String(s || "").trim();
        return str ? str.charAt(0).toLocaleUpperCase("es-AR") + str.slice(1) : "";
      };

      const tierPretty = ucfirst(tierName);
      const metodoCatalogo = ucfirst(metodo === "Efectivo" ? "efectivo" : "otros");

      const msg =
        `Vas a hacer un Abono\n` +
        `\n` +
        `Patente: ${patente}\n` +
        `Tipo: ${tipo}\n` +
        `Método de pago: ${metodo}\n` +
        `Factura: ${factura}\n` +
        `\n` +
        `[${tierPretty}] (Precio Completo: ${metodoCatalogo}): $${formatARS(baseMensual)}\n` +
        `A cobrar HOY (${diasRestantes}/${totalDiasMes}): $${formatARS(proporcional)}\n` +
        `\n` +
        `${detalleCochera}`;

      setConfirmAbono({
        open: true,
        titulo: "Confirmar alta de Abono",
        mensaje: msg,
        onConfirm: continuarFlujoDespuesDeConfirmacion,
        onCancel: () => setConfirmAbono((s) => ({ ...s, open: false })),
      });
    } catch (err) {
      return showModal("Error", err?.message || "No se pudo preparar la confirmación.");
    }
  };

  const handleChange = async (e) => {
    const { name, value, files, type, checked } = e.target;

    if (name === "cochera") {
      setFormData((prev) => {
        const next = { ...prev, cochera: value };
        if (normCocheraFront(value) !== "Fija") {
          next.exclusiva = false;
        }
        return next;
      });
      return;
    }
    if (name === "exclusiva" && type === "checkbox") {
      if (normCocheraFront(formData.cochera) === "Fija") {
        setFormData((prev) => ({ ...prev, exclusiva: Boolean(checked) }));
      }
      return;
    }

    if (name === "patente") {
      setFormData((prev) => ({ ...prev, patente: (value || "").toUpperCase().slice(0, 10) }));
      return;
    }
    if (files && files.length > 0) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
      setFileUploaded((prev) => ({ ...prev, [name]: true }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ===== Render helpers =====

  const renderFileInput = (label, name) => (
    <div className="file-input-wrapper">
      <label className="file-visible-label">{label}</label>
      <label
        className="file-label"
        onClick={(e) => {
          e.preventDefault();
          abrirCamParaCampo(name);
        }}
      >
        <div className="icon-wrapper">
          <FaCamera className="icon" />
        </div>
        {fileUploaded[name] ? (
          <div className="file-uploaded">
            <FaCheckCircle size={20} />
          </div>
        ) : (
          <div className="file-text">
            <span>Sacar</span>
            <span>Foto</span>
          </div>
        )}
        <input
          ref={inputRefs[name]}
          type="file"
          name={name}
          accept="image/*"
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );

  return (
    <div className="abono-container">
      <form className="abono-form" onSubmit={handleSubmit} encType="multipart/form-data">
        {/* ===== FILA DE COCHERA / PISO / EXCLUSIVA ===== */}
        <div className="cochera-row">
          <div className="fullwidth">
            <label>Cochera</label>
            <select
              name="cochera"
              value={formData.cochera}
              onChange={handleChange}
              className="select-style-wide"
              required
            >
              <option value="">Seleccione</option>
              <option value="Fija">Cochera Fija</option>
              <option value="Móvil">Cochera Móvil</option>
            </select>
          </div>

          <div className="fullwidth">
            <label>N° de Cochera</label>
            <input
              type="text"
              name="piso"
              value={formData.piso}
              onChange={handleChange}
              className="input-style-wide"
            />
          </div>

          <div className="exclusiva-toggle">
            <input
              type="checkbox"
              id="exclusiva"
              name="exclusiva"
              checked={Boolean(formData.exclusiva)}
              onChange={handleChange}
              disabled={normCocheraFront(formData.cochera) !== "Fija"}
              title={normCocheraFront(formData.cochera) === "Fija" ? "Marcar como exclusiva" : "Disponible sólo para Cochera Fija"}
            />
            <label htmlFor="exclusiva">Exclusiva</label>
          </div>
        </div>

        <div className="grid-3cols">
          <div>
            <label>Nombre y Apellido</label>
            <input
              type="text"
              name="nombreApellido"
              value={formData.nombreApellido}
              onChange={handleChange}
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label>DNI/CUIT/CUIL</label>
            <input
              type="text"
              name="dniCuitCuil"
              value={formData.dniCuitCuil}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Domicilio</label>
            <input
              type="text"
              name="domicilio"
              value={formData.domicilio}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Localidad</label>
            <input
              type="text"
              name="localidad"
              value={formData.localidad}
              onChange={handleChange}
              required
            />
          </div>
          <div>
            <label>Domicilio Trabajo</label>
            <input
              type="text"
              name="domicilioTrabajo"
              value={formData.domicilioTrabajo}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Tel. Particular</label>
            <input
              type="text"
              name="telefonoParticular"
              value={formData.telefonoParticular}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Tel. Emergencia</label>
            <input
              type="text"
              name="telefonoEmergencia"
              value={formData.telefonoEmergencia}
              onChange={handleChange}
            />
          </div>
          <div>
            <label>Tel. Trabajo</label>
            <input
              type="text"
              name="telefonoTrabajo"
              value={formData.telefonoTrabajo}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid-3cols fotos-grid">
          {renderFileInput("Foto Seguro", "fotoSeguro")}
          {renderFileInput("Foto DNI", "fotoDNI")}
          {renderFileInput("Foto Céd. Verde", "fotoCedulaVerde")}
        </div>

        <div className="grid-3cols">
          <div>
            <label>Patente</label>
            <input
              type="text"
              name="patente"
              value={formData.patente}
              onChange={handleChange}
              maxLength={10}
              required
            />
          </div>
          <div>
            <label>Marca</label>
            <input type="text" name="marca" value={formData.marca} onChange={handleChange} />
          </div>
          <div>
            <label>Modelo</label>
            <input type="text" name="modelo" value={formData.modelo} onChange={handleChange} />
          </div>
          <div>
            <label>Color</label>
            <input type="text" name="color" value={formData.color} onChange={handleChange} />
          </div>
          <div>
            <label>Año</label>
            <input type="number" name="anio" value={formData.anio} onChange={handleChange} />
          </div>
          <div>
            <label>Compañía Seguro</label>
            <input
              type="text"
              name="companiaSeguro"
              value={formData.companiaSeguro}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="grid-3cols">
          <div>
            <label>Método de Pago</label>
            <select
              name="metodoPago"
              value={formData.metodoPago}
              onChange={handleChange}
              className="select-style"
              required
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Débito">Débito</option>
              <option value="Crédito">Crédito</option>
              <option value="QR">QR</option>
            </select>
          </div>
          <div>
            <label>Factura</label>
            <select
              name="factura"
              value={formData.factura}
              onChange={handleChange}
              className="select-style"
            >
              <option value="CC">CC</option>
              <option value="A">A</option>
              <option value="Final">Final</option>
            </select>
          </div>

          {/* ====== Select Tipo de Vehículo (ABONO) ====== */}
  <div>
            <label>Tipo de Vehículo</label>
            <select
              name="tipoVehiculo"
              value={formData.tipoVehiculo}
              onChange={handleChange}
              className="select-style"
              required
            >
              <option value="">Seleccione</option>
              {tiposVehiculo
                .filter((tipo) => tipo?.mensual === true)
                .map((tipo) => {
                  const monthly = getAbonoPrecioByMetodo(
                    tipo.nombre,
                    formData.metodoPago,
                    formData.cochera || "Móvil",
                    formData.cochera === "Fija" ? formData.exclusiva : false
                  );
                  const capitalized = tipo.nombre
                    ? tipo.nombre.charAt(0).toUpperCase() + tipo.nombre.slice(1)
                    : "";
                  const tierName = getTierName(formData.cochera || "Móvil", formData.exclusiva);
                  return (
                    <option
                      key={tipo.nombre}
                      value={tipo.nombre}
                      title={`Catálogo (${formData.metodoPago === "Efectivo" ? "efectivo" : "otros"}) • Tier: ${tierName}`}
                    >
                      {capitalized} - ${formatARS(monthly)}
                    </option>
                  );
                })}
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Guardando..." : "Guardar Abono"}
        </button>
      </form>

      {/* Modal informativo */}
      <ModalMensaje titulo={modal.titulo} mensaje={modal.mensaje} onClose={closeModal} />

      {/* Modal confirmación GENERAL */}
      <InlineConfirmModal
        open={confirmAbono.open}
        titulo={confirmAbono.titulo}
        mensaje={confirmAbono.mensaje}
        onConfirm={confirmAbono.onConfirm}
        onCancel={confirmAbono.onCancel}
      />

      {/* Modal confirmación “más caro” */}
      {confirmModal.open && (
        <ModalMensaje
          titulo={confirmModal.titulo}
          mensaje={confirmModal.mensaje}
          onClose={confirmModal.onCancel}
        >
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
            <button className="guardarWebcamBtn" onClick={confirmModal.onCancel}>
              Cancelar
            </button>
            <button className="guardarWebcamBtn" onClick={confirmModal.onConfirm}>
              Aceptar y continuar
            </button>
          </div>
        </ModalMensaje>
      )}

      {/* Modal de Cámara */}
      {modalCamAbierto && (
        <ModalMensaje
          titulo="Webcam"
          mensaje={
            capturingField
              ? `Tomar foto para: ${capturingField.replace("foto", "Foto ")}`
              : "Vista previa de la cámara"
          }
          onClose={cerrarModalCam}
        >
          <div style={{ textAlign: "center" }}>
            {!fotoPreview ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{ width: "320px", height: "240px", borderRadius: "6px", background: "#222" }}
                />
                <button className="guardarWebcamBtn" style={{ marginTop: "1rem" }} onClick={tomarFoto}>
                  Tomar Foto
                </button>
              </>
            ) : (
              <>
                <img src={fotoPreview} alt="Foto tomada" style={{ width: "320px", borderRadius: "6px" }} />
                <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
                  <button className="guardarWebcamBtn" onClick={repetirFoto}>
                    Repetir
                  </button>
                  <button className="guardarWebcamBtn" onClick={confirmarFoto}>
                    Confirmar
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

export default DatosAutoAbono;
