// src/Operador/CargaMensuales/CargaMensuales.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ModalMensaje from "../ModalMensaje/ModalMensaje";
import { FaCamera, FaCheckCircle, FaArrowRight, FaSyncAlt, FaEye } from "react-icons/fa";
import "./CargaMensuales.css";
import CargaMensualesDetalle from "./CargaMensualesDetalle";

const TOKEN_KEY = "token";
const OPERADOR_KEY = "operador";
const BASE_URL = "http://localhost:5000";
const CATALOG_POLL_MS = 180000;

/* ========= Utils ========= */
function readOperador() {
  const raw = localStorage.getItem(OPERADOR_KEY);
  if (!raw) return null;
  try {
    const first = JSON.parse(raw);
    if (first && typeof first === "object") return first;
    if (typeof first === "string") {
      try {
        const second = JSON.parse(first);
        return second && typeof second === "object" ? second : null;
      } catch {
        return null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

const getTierName = (cochera, exclusiva) => {
  const c = String(cochera || "").toLowerCase();
  if (c === "fija") return exclusiva ? "exclusiva" : "fija";
  return "móvil";
};

const getAbonoTierKeyCandidates = (cochera, exclusiva) => {
  const t = getTierName(cochera, exclusiva);
  if (t === "móvil") return ["móvil", "movil"];
  return [t];
};

const normCocheraFront = (raw) => {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "fija") return "Fija";
  if (v === "móvil" || v === "movil") return "Móvil";
  return "";
};

const normExclusivaFront = (exclusiva, cochera) =>
  normCocheraFront(cochera) === "Fija" ? Boolean(exclusiva) : false;

const formatARS = (n) =>
  typeof n === "number" && isFinite(n)
    ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n)
    : "—";

const getUltimoDiaMesFront = (hoy = new Date()) => {
  const d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

// NUEVO: con offset de meses (0 = mes actual, 1 = mes siguiente, etc.)
const getUltimoDiaMesOffsetFront = (base = new Date(), offset = 0) => {
  const d = new Date(base.getFullYear(), base.getMonth() + 1 + offset, 0);
  d.setHours(23, 59, 59, 999);
  return d;
};

const prorratearMontoFront = (base, hoy = new Date()) => {
  const ultimo = getUltimoDiaMesFront(hoy);
  const total = ultimo.getDate();
  const dia = hoy.getDate();
  const diasRestantes = dia === 1 ? total : total - dia + 1;
  const factor = diasRestantes / total;
  return {
    proporcional: Math.round((Number(base) || 0) * factor),
    diasRestantes,
    totalDiasMes: total,
    factor,
  };
};

// NUEVO: formatear DNI/CUIT/CUIL con puntos (simple "thousands")
const formatDNI = (v) => {
  const digits = String(v || "").replace(/\D+/g, "");
  if (!digits) return "—";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

/* ======= Modal de Confirmación (custom) ======= */
function ConfirmDialog({ open, titulo, mensaje, onConfirm, onCancel }) {
  if (!open) return null;

  // Parseo dirigido por etiquetas para ordenar las secciones como pediste
  const lines = String(mensaje || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  let totalLine = null;
  const top = [];       // Patente / Tipo / Meses a abonar
  const cochera = [];   // Cochera / N° de Cochera / Exclusiva
  const precios = [];   // [tier] Precio mensual / Proporcional / Meses completos / Vence el

  const isTop = (l) =>
    /^Patente:/i.test(l) ||
    /^Tipo:/i.test(l) ||
    /^Meses a abonar:/i.test(l);

  const isCochera = (l) =>
    /^Cochera:/i.test(l) ||
    /^N° de Cochera:/i.test(l) ||
    /^Nº de Cochera:/i.test(l) ||
    /^No de Cochera:/i.test(l) ||
    /^Nro de Cochera:/i.test(l) ||
    /^Exclusiva:/i.test(l);

  const isPrecio = (l) =>
    /^\[.*\]\s*Precio mensual:/i.test(l) ||
    /^Mes actual \(proporcional/i.test(l) ||
    /^Meses completos siguientes/i.test(l) ||
    /^Vence el:/i.test(l);

  lines.forEach((l) => {
    if (/^TOTAL a cobrar:/i.test(l)) {
      totalLine = l;
      return;
    }
    if (isTop(l)) { top.push(l); return; }
    if (isCochera(l)) { cochera.push(l); return; }
    if (isPrecio(l)) { precios.push(l); return; }
  });

  const totalValue =
    totalLine && totalLine.includes(":")
      ? totalLine.split(":").slice(1).join(":").trim()
      : null;

  return (
    <div className="cm-confirm-overlay-cargamensuales" role="dialog" aria-modal="true">
      <div className="cm-confirm-card-cargamensuales">
        <div className="cm-confirm-header-cargamensuales">
          <h3>{titulo || "Confirmar"}</h3>
        </div>

        <div className="cm-confirm-body-cargamensuales">
          {/* Bloque superior: datos clave */}
          {top.length > 0 && (
            <div className="cm-confirm-block-cargamensuales cm-confirm-block--top-cargamensuales">
              {top.map((l, i) => (
                <div className="cm-line-cargamensuales" key={`top-${i}`}>{l}</div>
              ))}
            </div>
          )}

          {/* Bloque intermedio: cochera */}
          {cochera.length > 0 && (
            <div className="cm-confirm-block-cargamensuales cm-confirm-block--cochera-cargamensuales">
              {cochera.map((l, i) => (
                <div className="cm-line-cargamensuales" key={`coch-${i}`}>{l}</div>
              ))}
            </div>
          )}

          {/* Bloque inferior: precios + vence (si existieran) */}
          {precios.length > 0 && (
            <div className="cm-confirm-block-cargamensuales cm-confirm-block--precios-cargamensuales">
              {precios.map((l, i) => (
                <div className="cm-line-cargamensuales" key={`pre-${i}`}>{l}</div>
              ))}
            </div>
          )}

          {/* TOTAL al fondo, “pegadito” al bloque de precios */}
          {totalValue && (
            <div className="cm-confirm-total-cargamensuales" aria-live="polite">
              <span className="cm-total-label-cargamensuales">TOTAL a cobrar</span>
              <span className="cm-total-value-cargamensuales">{totalValue}</span>
            </div>
          )}
        </div>

        <div className="cm-confirm-actions-cargamensuales">
          <button type="button" className="cm-btn-cargamensuales cm-btn--ghost-cargamensuales" onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className="cm-btn-cargamensuales cm-btn--primary-cargamensuales" onClick={onConfirm}>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ======== Componente ======== */
export default function CargaMensuales() {
  const navigate = useNavigate();
  const operador = useMemo(() => readOperador(), []);
  const token = useMemo(() => localStorage.getItem(TOKEN_KEY) || "", []);
  const authHeaders = useMemo(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token]
  );

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(OPERADOR_KEY);
    navigate("/login", { replace: true });
  };

  /* —— Clientes (left) —— */
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState("");
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [selectedCliente, setSelectedCliente] = useState(null);

  // NUEVO: id del cliente para ver detalle en la misma vista
  const [detalleClienteId, setDetalleClienteId] = useState(null);

  // 🔄 Refrescar (soft + cooldown)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
  const COOLDOWN_SECONDS = 5;
  const cooldownTimerRef = useRef(null);

  const startCooldown = useCallback(() => {
    if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    setCooldownLeft(COOLDOWN_SECONDS);
    cooldownTimerRef.current = setInterval(() => {
      setCooldownLeft((s) => {
        if (s <= 1) {
          clearInterval(cooldownTimerRef.current);
          cooldownTimerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const fetchClientes = useCallback(async () => {
    setLoadingClientes(true);
    try {
      const res = await fetch(`${BASE_URL}/api/clientes`, {
        cache: "no-store",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("No se pudo cargar la lista de clientes");
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingClientes(false);
    }
  }, [authHeaders]);

  const softRefreshClientes = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await fetchClientes();
    } finally {
      setIsRefreshing(false);
      startCooldown();
    }
  }, [fetchClientes, isRefreshing, startCooldown]);

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const filteredClientes = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter((c) => {
      const nombre = String(c?.nombreApellido || "").toLowerCase();
      const dni = String(c?.dniCuitCuil || "").toLowerCase();
      const patente = String(c?.patente || "").toLowerCase();
      return (
        nombre.includes(term) ||
        dni.includes(term) ||
        patente.includes(term)
      );
    });
  }, [clientes, q]);

  /* —— Catálogos —— */
  const [tiposVehiculo, setTiposVehiculo] = useState([]);
  const [preciosEfectivo, setPreciosEfectivo] = useState({});
  const [preciosOtros, setPreciosOtros] = useState({});

  useEffect(() => {
    let timer = null;
    const fetchTiposYPrecios = async () => {
      try {
        const tiposRes = await fetch(`${BASE_URL}/api/tipos-vehiculo`, {
          cache: "no-store",
          headers: authHeaders,
        });
        if (!tiposRes.ok) throw new Error();
        setTiposVehiculo(await tiposRes.json());

        let cash = {};
        try {
          const r1 = await fetch(`${BASE_URL}/api/precios`, {
            cache: "no-store",
            headers: authHeaders,
          });
          if (!r1.ok) throw new Error();
          cash = await r1.json();
        } catch {
          const r2 = await fetch(`${BASE_URL}/api/precios?metodo=efectivo`, {
            cache: "no-store",
            headers: authHeaders,
          });
          cash = r2.ok ? await r2.json() : {};
        }
        setPreciosEfectivo(cash);

        let other = {};
        try {
          const r3 = await fetch(`${BASE_URL}/api/precios?metodo=otros`, {
            cache: "no-store",
            headers: authHeaders,
          });
          other = r3.ok ? await r3.json() : {};
        } catch {}
        setPreciosOtros(other);
      } catch (err) {
        console.error("Catálogos:", err);
      }
    };
    fetchTiposYPrecios();
    timer = setInterval(fetchTiposYPrecios, CATALOG_POLL_MS);
    const onVis = () =>
      document.visibilityState === "visible" && fetchTiposYPrecios();
    const onOnline = () => fetchTiposYPrecios();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, [authHeaders]);

  const getAbonoPrecioByMetodo = useCallback(
    (tipoVehiculo, metodoPago, cochera, exclusiva) => {
      const keyVehiculo = String(tipoVehiculo || "").toLowerCase();
      if (!keyVehiculo) return null;
      const mapa = metodoPago === "Efectivo" ? preciosEfectivo : preciosOtros;
      if (!mapa || !mapa[keyVehiculo]) return null;
      for (const tier of getAbonoTierKeyCandidates(cochera, exclusiva)) {
        const val = mapa[keyVehiculo]?.[tier];
        if (typeof val === "number" && isFinite(val) && val > 0) return val;
      }
      return null;
    },
    [preciosEfectivo, preciosOtros]
  );

  /* —— Form (right) —— */
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
    patente: "",
    tipoVehiculo: "",
    marca: "",
    modelo: "",
    color: "",
    anio: "",
    companiaSeguro: "",
    // (Eliminado) metodoPago
    // (Eliminado) factura
    fotoSeguro: null,
    fotoDNI: null,
    fotoCedulaVerde: null,
    cochera: "",
    piso: "",
    exclusiva: false,
    mesesAbonar: 1, // controlado 1..12
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

  const patchFormFromCliente = useCallback((cli) => {
    if (!cli) return;
    setSelectedCliente(cli);
    setFormData((prev) => ({
      ...prev,
      nombreApellido: cli?.nombreApellido || prev.nombreApellido,
      dniCuitCuil: cli?.dniCuitCuil || prev.dniCuitCuil,
      email: cli?.email || prev.email,
      domicilio: cli?.domicilio || prev.domicilio,
      localidad: cli?.localidad || prev.localidad,
      telefonoParticular: cli?.telefonoParticular || prev.telefonoParticular,
      telefonoEmergencia: cli?.telefonoEmergencia || prev.telefonoEmergencia,
      domicilioTrabajo: cli?.domicilioTrabajo || prev.domicilioTrabajo,
      telefonoTrabajo: cli?.telefonoTrabajo || prev.telefonoTrabajo,
      cochera: normCocheraFront(cli?.cochera) || prev.cochera,
      exclusiva: normExclusivaFront(cli?.exclusiva, cli?.cochera) || false,
      piso: cli?.piso || prev.piso,
    }));
  }, []);

  /* —— Modales & cam —— */
  const [modal, setModal] = useState({ titulo: "", mensaje: "" });
  const closeModal = () => setModal({ titulo: "", mensaje: "" });
  const showModal = (titulo, mensaje) => setModal({ titulo, mensaje });

  const [confirmAbono, setConfirmAbono] = useState({
    open: false,
    titulo: "",
    mensaje: "",
    onConfirm: null,
    onCancel: null,
  });

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
      } catch {}
      const ls = localStorage.getItem("webcamDeviceId");
      if (ls) setSelectedDeviceId(ls);
    })();
  }, []);

  const humanMediaError = (err) => {
    if (!err) return "Error desconocido de cámara";
    if (err.name === "NotAllowedError" || err.name === "SecurityError")
      return "Permiso denegado. Habilitá la cámara.";
    if (err.name === "NotFoundError" || err.name === "OverconstrainedError")
      return "No se encontró esa cámara.";
    if (err.name === "NotReadableError")
      return "La cámara está en uso por otra app.";
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
      try { return await navigator.mediaDevices.getUserMedia(constraints); }
      catch (e) { lastErr = e; }
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
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
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
    const file = new File([blob], `${patente}_${capturingField}_${Date.now()}.png`, {
      type: "image/png",
    });
    setFormData((p) => ({ ...p, [capturingField]: file }));
    setFileUploaded((p) => ({ ...p, [capturingField]: true }));
    cerrarModalCam();
  };

  const cerrarModalCam = () => {
    setModalCamAbierto(false);
    setCapturingField(null);
    setFotoPreview(null);
    if (videoStream) {
      try { videoStream.getTracks().forEach((t) => t.stop()); } catch {}
      setVideoStream(null);
    }
  };

  useEffect(() => {
    if (videoRef.current && videoStream) videoRef.current.srcObject = videoStream;
  }, [videoStream]);

  useEffect(() => () => {
    if (videoStream) {
      try { videoStream.getTracks().forEach((t) => t.stop()); } catch {}
    }
  }, [videoStream]);

  /* —— Validaciones & guardar —— */
  const validarDNI = (dni) => {
    const s = String(dni || "").replace(/\D+/g, "");
    return s.length >= 7 && s.length <= 11;
  };

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
          headers: { "Content-Type": "application/json", ...authHeaders },
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
            piso: pisoVal,
          }),
        }).catch(() => {});
      } catch {}
      return encontrado._id;
    }

    const nuevoClienteRes = await fetch(`${BASE_URL}/api/clientes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
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
        piso: pisoVal,
      }),
    });
    if (!nuevoClienteRes.ok) {
      const err = await nuevoClienteRes.json().catch(() => ({}));
      throw new Error(err?.message || "Error al crear cliente");
    }
    const nuevoCliente = await nuevoClienteRes.json();
    if (!nuevoCliente._id) throw new Error("No se pudo crear cliente");
    return nuevoCliente._id;
  };

  const [loadingSave, setLoadingSave] = useState(false);

  const handleChange = (e) => {
    const { name, value, files, type, checked } = e.target;
    if (name === "cochera") {
      setFormData((prev) => {
        const next = { ...prev, cochera: value };
        if (normCocheraFront(value) !== "Fija") next.exclusiva = false;
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
      setFormData((prev) => ({
        ...prev,
        patente: (value || "").toUpperCase().slice(0, 10),
      }));
      return;
    }
    if (name === "mesesAbonar") {
      setFormData((prev) => ({ ...prev, mesesAbonar: Math.max(1, Math.min(12, Number(value) || 1)) }));
      return;
    }
    if (files && files.length > 0) {
      setFormData((prev) => ({ ...prev, [name]: files[0] }));
      setFileUploaded((prev) => ({ ...prev, [name]: true }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const confirmarYGuardar = async () => {
    setConfirmAbono((s) => ({ ...s, open: false }));
    setLoadingSave(true);
    try {
      const patente = (formData.patente || "").toUpperCase();
      const clienteId = await ensureCliente();

      const tierName = getTierName(formData.cochera || "Móvil", formData.exclusiva);

      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, v);
      });
      fd.set("mesesAbonar", String(formData.mesesAbonar || 1));
      fd.set("patente", patente);
      fd.set("cliente", clienteId);
      fd.set("operador", operador?.username || operador?.nombre || "Sistema");
      fd.set("exclusiva", formData.exclusiva ? "true" : "false");
      fd.set("tierAbono", tierName);

      const resp = await fetch(`${BASE_URL}/api/abonos/registrar-abono`, {
        method: "POST",
        headers: authHeaders,
        body: fd,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || "Error al registrar abono.");
      }

      await softRefreshClientes();
      showModal("Éxito", `Abono registrado correctamente para ${patente}.`);

      // 🔧 Resetear formularios y limpiar selección de la fila
      setFormData((prev) => ({
        ...prev,
        nombreApellido: "",
        dniCuitCuil: "",
        domicilio: "",
        localidad: "",
        telefonoParticular: "",
        telefonoEmergencia: "",
        domicilioTrabajo: "",
        telefonoTrabajo: "",
        email: "",
        patente: "",
        tipoVehiculo: "",
        marca: "",
        modelo: "",
        color: "",
        anio: "",
        companiaSeguro: "",
        fotoSeguro: null,
        fotoDNI: null,
        fotoCedulaVerde: null,
        cochera: "",
        piso: "",
        exclusiva: false,
        mesesAbonar: 1,
      }));
      setFileUploaded({ fotoSeguro:false, fotoDNI:false, fotoCedulaVerde:false });

      // 👇 ESTE ES EL FIX: quitar el highlight de la lista
      setSelectedCliente(null);
    } catch (err) {
      console.error(err);
      showModal("Error", err?.message || "Ocurrió un error al guardar el abono.");
    } finally {
      setLoadingSave(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    try {
      const patente = (formData.patente || "").trim();
      if (!patente) throw new Error("Debe ingresar la patente.");
      if (!formData.tipoVehiculo) throw new Error("Debe seleccionar el tipo de vehículo.");
      if (!formData.nombreApellido?.trim()) throw new Error("Debe ingresar el nombre y apellido.");
      if (!validarDNI(formData.dniCuitCuil)) throw new Error("DNI/CUIT/CUIL inválido.");
      if (!formData.email?.trim()) throw new Error("Debe ingresar un email.");
      if (!formData.cochera) throw new Error("Debe seleccionar Cochera (Fija o Móvil).");
    } catch (err) { return showModal("Error", err.message); }

    const hoy = new Date();
    const meses = Math.max(1, Math.min(12, Number(formData.mesesAbonar) || 1));
    const venceEl = getUltimoDiaMesOffsetFront(hoy, meses - 1);

    const dd = String(venceEl.getDate()).padStart(2, "0");
    const mm = String(venceEl.getMonth() + 1).padStart(2, "0");
    const yyyy = venceEl.getFullYear();

    const msg =
      `Patente: ${formData.patente.toUpperCase()}\n` +
      `Tipo: ${formData.tipoVehiculo}\n` +
      `Meses a abonar: ${meses}\n\n` +
      `Cochera: ${formData.cochera || "-"}\n` +
      `N° de Cochera: ${formData.piso || "-"}\n` +
      `Exclusiva: ${formData.exclusiva ? "Sí" : "No"}\n\n` +
      `Vence el: ${dd}/${mm}/${yyyy}`;

    setConfirmAbono({
      open: true,
      titulo: "Confirmar alta de Abono",
      mensaje: msg,
      onConfirm: confirmarYGuardar,
      onCancel: () => setConfirmAbono((s) => ({ ...s, open: false })),
    });
  };

  const renderFileInput = (label, name) => (
    <div className="cm-file-input-wrapper-cargamensuales">
      <label className="cm-file-visible-label-cargamensuales">{label}</label>
      <label
        className="cm-file-label-cargamensuales"
        onClick={(e) => { e.preventDefault(); abrirCamParaCampo(name); }}
      >
        <div className="cm-icon-wrapper-cargamensuales"><FaCamera className="cm-icon-cargamensuales" /></div>
        {fileUploaded[name]
          ? <div className="cm-file-uploaded-cargamensuales"><FaCheckCircle size={16} /></div>
          : <div className="cm-file-text-cargamensuales"><span>Sacar</span><span>Foto</span></div>}
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

  /* ================== UI ================== */
  const showSkeleton = loadingClientes || isRefreshing;

  // NUEVO: cuando hay un cliente elegido para ver detalle, muestro el detalle full-page dentro del scope
  if (detalleClienteId) {
    return (
      <div className="cm-scope-cargamensuales">
        <div className="cm-topbar-cargamensuales">
          <div className="cm-top-left-cargamensuales">
            <h1 className="cm-title-cargamensuales">Carga de Mensuales</h1>
            <span className="cm-role-cargamensuales">{operador?.role || "rol"}</span>
          </div>
          <div className="cm-top-right-cargamensuales">
            {/* NAV: Tabs */}
            <nav className="cm-navtabs-cargamensuales" aria-label="Secciones">
              <button
                type="button"
                className="cm-tab-cargamensuales is-active"
                onClick={() => navigate("/operador/carga-mensuales")}
                aria-current="page"
              >
                Mensuales
              </button>
              <button
                type="button"
                className="cm-tab-cargamensuales"
                onClick={() => navigate("/operador/carga-estadias")}
              >
                Estadías
              </button>
            </nav>
            <button
              className="cm-btn-cargamensuales cm-btn--danger-cargamensuales"
              type="button"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>

        <CargaMensualesDetalle
          clienteId={detalleClienteId}
          volver={() => setDetalleClienteId(null)}
        />
      </div>
    );
  }

  return (
    <div className="cm-scope-cargamensuales">
      <div className="cm-page-cargamensuales">
        {/* Topbar */}
        <div className="cm-topbar-cargamensuales">
          <div className="cm-top-left-cargamensuales">
            <h1 className="cm-title-cargamensuales">Carga de Mensuales</h1>
            <span className="cm-role-cargamensuales">{operador?.role || "rol"}</span>
          </div>
          <div className="cm-top-right-cargamensuales">
            {/* NAV: Tabs */}
            <nav className="cm-navtabs-cargamensuales" aria-label="Secciones">
              <button
                type="button"
                className="cm-tab-cargamensuales is-active"
                onClick={() => navigate("/operador/carga-mensuales")}
                aria-current="page"
              >
                Mensuales
              </button>
              <button
                type="button"
                className="cm-tab-cargamensuales"
                onClick={() => navigate("/operador/carga-estadias")}
              >
                Estadías
              </button>
            </nav>

            {/* Botón Logout */}
            <button
              className="cm-btn-cargamensuales cm-btn--danger-cargamensuales"
              type="button"
              onClick={logout}
            >
              Logout
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="cm-container-cargamensuales">
          <div className="cm-grid-cargamensuales">
            {/* Left */}
            <section className="cm-left-cargamensuales">
              <div className="cm-search-cargamensuales">
                <input
                  className="input-wide-cargamensuales"
                  placeholder="Buscar por nombre, DNI o patente…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button
                  className={`cm-btn-cargamensuales cm-btn--ghost-cargamensuales cm-btn--refresh-cargamensuales ${isRefreshing ? "is-busy" : ""}`}
                  onClick={() => {
                    if (!isRefreshing && cooldownLeft === 0) {
                      softRefreshClientes();
                    }
                  }}
                  type="button"
                  disabled={isRefreshing || cooldownLeft > 0}
                  aria-busy={isRefreshing ? "true" : "false"}
                  title="Refrescar"
                >
                  <FaSyncAlt className={isRefreshing ? "cm-spin-cargamensuales" : ""} size={12} />
                  <span style={{ marginLeft: 6 }}>Refrescar</span>
                </button>
              </div>

              <div className="cm-left-static-cargamensuales">
                <div className="cm-left-scrollbox-cargamensuales">
                  <table className="cm-table-cargamensuales">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>DNI/CUIT</th>
                        <th>Cochera</th>
                        <th style={{ width: 56 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {showSkeleton ? (
                        Array.from({ length: 8 }).map((_, i) => (
                          <tr key={`sk-${i}`} className="cm-skel-row-cargamensuales">
                            <td><div className="cm-skel cm-skel--w60" /></td>
                            <td><div className="cm-skel cm-skel--w40" /></td>
                            <td><div className="cm-skel cm-skel--w50" /></td>
                            <td style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                              <div className="cm-skel cm-skel--circle" />
                              <div className="cm-skel cm-skel--circle" />
                            </td>
                          </tr>
                        ))
                      ) : filteredClientes.length === 0 ? (
                        <tr>
                          <td colSpan={4}>
                            <div className="cm-empty-cargamensuales">No hay clientes que coincidan.</div>
                          </td>
                        </tr>
                      ) : (
                        filteredClientes.map((c) => (
                          <tr
                            key={c._id || `${c.dniCuitCuil}-${c.nombreApellido}`}
                            className={selectedCliente?._id === c._id ? "is-selected" : undefined}
                          >
                            <td>{c?.nombreApellido || "—"}</td>
                            <td>{formatDNI(c?.dniCuitCuil)}</td>
                            <td>
                              {normCocheraFront(c?.cochera) || "—"}
                              {c?.piso ? ` • N° ${c.piso}` : ""}
                              {c?.exclusiva ? " • Exclusiva" : ""}
                            </td>
                            <td style={{ display:"flex", gap:6, justifyContent:"flex-end" }}>
                              {/* NUEVO: ver detalle en la misma vista */}
                              <button
                                className="cm-btn-cargamensuales cm-btn--icon-cargamensuales"
                                type="button"
                                title="Ver detalle del cliente"
                                onClick={() => setDetalleClienteId(c._id)}
                              >
                                <FaEye size={12} />
                              </button>
                              {/* EXISTENTE: cargar datos al form */}
                              <button
                                className="cm-btn-cargamensuales cm-btn--icon-cargamensuales"
                                type="button"
                                title="Cargar datos en el formulario"
                                onClick={() => patchFormFromCliente(c)}
                              >
                                <FaArrowRight size={12} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="cm-meta-cargamensuales">
                  Total: {clientes.length} · Filtrados: {filteredClientes.length}
                </div>
              </div>
            </section>

            {/* Right */}
            <section className="cm-right-cargamensuales">
              <div className="cm-right-static-cargamensuales">
                <form onSubmit={handleSubmit} encType="multipart/form-data" className="cm-page-cargamensuales">
                  {/* Cochera / Piso / Exclusiva */}
                  <div className="cm-row-3-cargamensuales">
                    <div className="cm-field-cargamensuales">
                      <label>Cochera</label>
                      <select
                        name="cochera"
                        value={formData.cochera}
                        onChange={handleChange}
                        className="select-wide-cargamensuales"
                        required
                      >
                        <option value="">Seleccione</option>
                        <option value="Fija">Cochera Fija</option>
                        <option value="Móvil">Cochera Móvil</option>
                      </select>
                    </div>
                    <div className="cm-field-cargamensuales">
                      <label>N° de Cochera</label>
                      <input
                        type="text"
                        name="piso"
                        value={formData.piso}
                        onChange={handleChange}
                        className="input-wide-cargamensuales"
                      />
                    </div>
                    <div className="cm-field-cargamensuales cm-field--toggle-cargamensuales">
                      <label className="lbl">Exclusiva</label>
                      <input
                        type="checkbox"
                        id="exclusiva"
                        name="exclusiva"
                        checked={Boolean(formData.exclusiva)}
                        onChange={handleChange}
                        disabled={normCocheraFront(formData.cochera) !== "Fija"}
                      />
                    </div>
                  </div>

                  {/* Datos cliente */}
                  <div className="cm-grid-3-cargamensuales">
                    <div className="cm-field-cargamensuales"><label>Nombre y Apellido</label><input type="text" name="nombreApellido" value={formData.nombreApellido} onChange={handleChange} autoComplete="off" required /></div>
                    <div className="cm-field-cargamensuales"><label>DNI/CUIT/CUIL</label><input type="text" name="dniCuitCuil" value={formData.dniCuitCuil} onChange={handleChange} required /></div>
                    <div className="cm-field-cargamensuales"><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} required /></div>
                    <div className="cm-field-cargamensuales"><label>Domicilio</label><input type="text" name="domicilio" value={formData.domicilio} onChange={handleChange} required /></div>
                    <div className="cm-field-cargamensuales"><label>Localidad</label><input type="text" name="localidad" value={formData.localidad} onChange={handleChange} required /></div>
                    <div className="cm-field-cargamensuales"><label>Domicilio Trabajo</label><input type="text" name="domicilioTrabajo" value={formData.domicilioTrabajo} onChange={handleChange} /></div>
                    <div className="cm-field-cargamensuales"><label>Tel. Particular</label><input type="text" name="telefonoParticular" value={formData.telefonoParticular} onChange={handleChange} /></div>
                    <div className="cm-field-cargamensuales"><label>Tel. Emergencia</label><input type="text" name="telefonoEmergencia" value={formData.telefonoEmergencia} onChange={handleChange} /></div>
                    <div className="cm-field-cargamensuales"><label>Tel. Trabajo</label><input type="text" name="telefonoTrabajo" value={formData.telefonoTrabajo} onChange={handleChange} /></div>
                  </div>

                  {/* Fotos */}
                  <div className="cm-grid-3-cargamensuales cm-photos-cargamensuales">
                    {renderFileInput("Foto Seguro", "fotoSeguro")}
                    {renderFileInput("Foto DNI", "fotoDNI")}
                    {renderFileInput("Foto Céd. Verde", "fotoCedulaVerde")}
                  </div>

                  {/* Vehículo */}
                  <div className="cm-grid-3-cargamensuales">
                    <div className="cm-field-cargamensuales"><label>Patente</label><input type="text" name="patente" value={formData.patente} onChange={handleChange} maxLength={10} required /></div>
                    <div className="cm-field-cargamensuales"><label>Marca</label><input type="text" name="marca" value={formData.marca} onChange={handleChange} /></div>
                    <div className="cm-field-cargamensuales"><label>Modelo</label><input type="text" name="modelo" value={formData.modelo} onChange={handleChange} /></div>
                    <div className="cm-field-cargamensuales"><label>Color</label><input type="text" name="color" value={formData.color} onChange={handleChange} /></div>
                    <div className="cm-field-cargamensuales"><label>Año</label><input type="number" name="anio" value={formData.anio} onChange={handleChange} /></div>
                    <div className="cm-field-cargamensuales"><label>Compañía Seguro</label><input type="text" name="companiaSeguro" value={formData.companiaSeguro} onChange={handleChange} /></div>
                  </div>

                  {/* Solo Tipo de Vehículo (centrado) */}
                  <div className="cm-type-center-wrapper">
                    <div className="cm-field-cargamensuales cm-type-center-field">
                      <label>Tipo de Vehículo</label>
                      <select
                        name="tipoVehiculo"
                        value={formData.tipoVehiculo}
                        onChange={handleChange}
                        className="select-cargamensuales"
                        required
                      >
                        <option value="">Seleccione</option>
                        {tiposVehiculo
                          .filter((t) => t?.mensual === true)
                          .map((tipo) => {
                            const capitalized = tipo.nombre
                              ? tipo.nombre.charAt(0).toUpperCase() + tipo.nombre.slice(1)
                              : "";
                            return (
                              <option key={tipo.nombre} value={tipo.nombre}>
                                {capitalized}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  </div>

                  {/* Acciones + Meses */}
                  <div className="cm-actions-cargamensuales">
                    <div className="cm-months-inline-cargamensuales">
                      <label htmlFor="mesesAbonar">Meses a abonar</label>
                      <select
                        id="mesesAbonar"
                        name="mesesAbonar"
                        value={formData.mesesAbonar}
                        onChange={handleChange}
                        className="cm-months-select-cargamensuales"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>{n} {n === 1 ? "mes" : "meses"}</option>
                        ))}
                      </select>
                    </div>

                    <button className="cm-btn-cargamensuales cm-btn--primary-cargamensuales" type="submit" disabled={loadingSave}>
                      {loadingSave ? "Guardando..." : "Guardar Abono (sin movimiento)"}
                    </button>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>

        {/* Modal informativo */}
        <ModalMensaje titulo={modal.titulo} mensaje={modal.mensaje} onClose={closeModal} />

        {/* Modal confirmación (custom) */}
        <ConfirmDialog
          open={confirmAbono.open}
          titulo={confirmAbono.titulo}
          mensaje={confirmAbono.mensaje}
          onConfirm={confirmAbono.onConfirm}
          onCancel={confirmAbono.onCancel}
        />

        {/* Modal de Cámara */}
        {modalCamAbierto && (
          <ModalMensaje
            titulo="Webcam"
            mensaje={capturingField ? `Tomar foto para: ${capturingField.replace("foto","Foto ")}` : "Vista previa de la cámara"}
            onClose={cerrarModalCam}
          >
            <div style={{ textAlign:"center" }}>
              {!fotoPreview ? (
                <>
                  <video ref={videoRef} autoPlay playsInline style={{ width:320, height:210, borderRadius:6, background:"#222" }}/>
                  <button className="guardarWebcamBtn" style={{ marginTop:8 }} onClick={tomarFoto}>Tomar Foto</button>
                </>
              ) : (
                <>
                  <img src={fotoPreview} alt="Foto tomada" style={{ width:320, borderRadius:6 }}/>
                  <div style={{ display:"flex", gap:8, justifyContent:"center", marginTop:8 }}>
                    <button className="guardarWebcamBtn" onClick={repetirFoto}>Repetir</button>
                    <button className="guardarWebcamBtn" onClick={confirmarFoto}>Confirmar</button>
                  </div>
                </>
              )}
            </div>
          </ModalMensaje>
        )}
      </div>
    </div>
  );
}
