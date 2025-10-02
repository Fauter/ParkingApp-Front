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

function DatosAutoAbono({ datosVehiculo, user }) {
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

  // Modal confirmación general
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
      setVideoStream(null); // <-- fix
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

  useEffect(() => {
    if (datosVehiculo) {
      setFormData((prev) => ({
        ...prev,
        patente: datosVehiculo.patente || "",
        tipoVehiculo: datosVehiculo.tipoVehiculo || "",
      }));
    }
  }, [datosVehiculo]);

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
    const proporcional = Math.round(base * factor);
    return { proporcional, diasRestantes, totalDiasMes: total, factor };
  };

  // 🔐 ensureCliente por DNI (solo crea si no existe) —> AHORA envía cochera/exclusiva/piso
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
      return encontrado._id;
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
    return nuevoCliente._id;
  };

  // ====== VALIDACIONES ======
  const validarPatente = (patente) => {
    const formatoViejo = /^[A-Z]{3}\d{3}$/;
    const formatoNuevo = /^[A-Z]{2}\d{3}[A-Z]{2}$/;
    return formatoViejo.test(patente) || formatoNuevo.test(patente);
  };

  const validarDNI = (dni) => {
    const s = String(dni || "").replace(/\D+/g, "");
    return s.length >= 7 && s.length <= 11;
  };

  // ====== Flujo de guardado con dos confirmaciones ======
  const finalizarSubmit = async () => {
    try {
      const patente = (formData.patente || "").toUpperCase();
      const clienteId = await ensureCliente();

      // === calcular precio dinámico (método + cochera + exclusiva) ===
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

      const { proporcional } = prorratearMontoFront(baseMensual);

      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, v);
      });
      fd.set("patente", patente);
      fd.set("cliente", clienteId);
      fd.set("operador", user?.nombre || "Sistema");
      fd.set("exclusiva", formData.exclusiva ? "true" : "false");

      // (informativo)
      fd.set("precio", String(baseMensual));
      fd.set("precioProrrateadoHoy", String(proporcional));
      fd.set("tierAbono", tierName);

      // 1) Registrar Abono
      const resp = await fetch(`${BASE_URL}/api/abonos/registrar-abono`, {
        method: "POST",
        body: fd,
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || err?.message || "Error al registrar abono.");
      }

      // 2) Crear Ticket en DB (tipo ABONO) — separado del ticket de entrada
      try {
        const payloadTicketAbono = {
          tipo: "abono",
          patente,
          cliente: clienteId,
          operador: user?.username || user?.nombre || "Sistema",
          metodoPago: formData.metodoPago,
          factura: formData.factura,
          tierAbono: tierName,
          baseMensual: baseMensual,
          montoProporcional: proporcional,
          tipoVehiculo: formData.tipoVehiculo,
          fecha: new Date().toISOString()
        };
        await fetch(`${BASE_URL}/api/tickets`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadTicketAbono)
        });
      } catch (e) {
        console.warn("⚠️ No se pudo crear el ticket ABONO en DB:", e);
      }

      // 3) Imprimir ticket de ABONO (usa la nueva ruta /api/tickets/imprimir-abono)
      try {
        const printRes = await fetch(`${BASE_URL}/api/tickets/imprimir-abono`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            proporcional: `${formatARS(proporcional)}`, // sin "$"; Python ya lo agrega
            patente
          }),
        });
        if (!printRes.ok) {
          const t = await printRes.text().catch(() => "");
          console.warn("⚠️ Falló impresión de ABONO:", t || printRes.status);
        }
      } catch (e) {
        console.warn("⚠️ No se pudo imprimir el ticket de ABONO:", e);
      }

      await fetchClientes(); // refresco local
      fetch(`${BASE_URL}/api/sync/run-now`, { method: "POST" }).catch(() => {});

      showModal("Éxito", `Abono registrado correctamente para ${patente}.`);

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
        exclusiva: false
      });
      setFileUploaded({
        fotoSeguro: false,
        fotoDNI: false,
        fotoCedulaVerde: false,
      });
    } catch (error) {
      console.error(error);
      showModal("Error", error?.message || "Ocurrió un error al guardar el abono.");
    }
  };

  const continuarFlujoDespuesDeConfirmacion = async () => {
    setConfirmAbono((s) => ({ ...s, open: false }));
    setLoading(true);
    try {
      const dni = (formData.dniCuitCuil || "").trim();
      const clienteExistente = (clientes || []).find(
        (c) => String(c.dniCuitCuil || "").trim() === dni
      );

      // 🔎 Preview “más caro” (ahora el back considera tier)
      const params = new URLSearchParams({
        tipoVehiculo: String(formData.tipoVehiculo || ""),
        metodoPago: String(formData.metodoPago || "Efectivo"),
        cochera: String(formData.cochera || "Móvil"),
        exclusiva: formData.cochera === "Fija" && formData.exclusiva ? "true" : "false",
      });
      if (clienteExistente?._id) {
        params.set("clienteId", clienteExistente._id);
      } else {
        const dni = (formData.dniCuitCuil || "").trim();
        if (dni) params.set("dniCuitCuil", dni);
      }

      let diffBase = 0;
      let montoHoy = 0;
      let baseActual = 0;
      let baseNuevo = 0;

      try {
        const r = await fetch(`${BASE_URL}/api/abonos/preview?${params.toString()}`, { cache: "no-store" });
        const pj = await r.json();
        if (r.ok && pj) {
          diffBase = Number(pj?.diffBase || 0);
          montoHoy = Number(pj?.monto || 0);
          baseActual = Number(pj?.baseActual || 0);
          baseNuevo = Number(pj?.baseNuevo || 0);
        } else {
          throw new Error(pj?.error || "No se pudo calcular la preview.");
        }
      } catch (e) {
        setLoading(false);
        return showModal("Error", e?.message || "No se pudo calcular la preview (precios). Revisá el catálogo.");
      }

      if (baseActual > 0 && diffBase > 0) {
        const tierNuevo = getTierName(formData.cochera || "Móvil", formData.exclusiva);

        setConfirmModal({
          open: true,
          titulo: "Vehículo más caro",
          mensaje:
            `Estás pasando a tier "${tierNuevo}".\n\n` +
            `• Diferencia mensual: $${formatARS(baseNuevo - baseActual)}\n` +
            `• A cobrar HOY: $${formatARS(montoHoy)}\n\n` +
            `¿Deseás continuar?`,
          onConfirm: async () => {
            setConfirmModal((s) => ({ ...s, open: false }));
            setLoading(true);
            await finalizarSubmit();
            setLoading(false);
          },
          onCancel: () => {
            setConfirmModal((s) => ({ ...s, open: false }));
            setLoading(false);
          },
        });
        return;
      }

      await finalizarSubmit();
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
      const patente = (formData.patente || "").toUpperCase();
      if (!validarPatente(patente))
        throw new Error("Patente inválida. Formatos permitidos: ABC123 o AB123CD.");
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

    // 2) Confirmación GENERAL
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
          `No hay precio cargado para "${(tipo||'').toLowerCase()}" en tier "${tierName}" (${metodo}). ` +
          `Actualizá el catálogo en ${metodo === 'Efectivo' ? '/api/precios' : '/api/precios?metodo=otros'}.`
        );
      }

      const { proporcional, diasRestantes, totalDiasMes } = prorratearMontoFront(baseMensual);

      const detalleCochera = [
        `Cochera: ${formData.cochera || "-"}`,
        `N° de Cochera: ${formData.piso || "-"}`,
        `Exclusiva: ${formData.exclusiva ? "Sí" : "No"}`
      ].join("\n");

      const msg =
        `Vas a hacer un Abono\n\n` +
        `Patente: ${patente}\n` +
        `Tipo: ${tipo}\n` +
        `Método de pago: ${metodo}\n` +
        `Factura: ${factura}\n\n` +
        `Mensual [${tierName}] (catálogo ${metodo === "Efectivo" ? "efectivo" : "otros"}): $${formatARS(baseMensual)}\n` +
        `A cobrar HOY (prorrateo ${diasRestantes}/${totalDiasMes}): $${formatARS(proporcional)}\n\n` +
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
      setFormData(prev => {
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
        setFormData(prev => ({ ...prev, exclusiva: Boolean(checked) }));
      }
      return;
    }

    if (name === "patente") {
      setFormData((prev) => ({ ...prev, patente: (value || "").toUpperCase() }));
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
              maxLength={8}
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
      {confirmAbono.open && (
        <ModalMensaje
          titulo={confirmAbono.titulo}
          mensaje={confirmAbono.mensaje}
          onClose={confirmAbono.onCancel}
        >
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
            <button className="guardarWebcamBtn" onClick={confirmAbono.onCancel}>
              Cancelar
            </button>
            <button className="guardarWebcamBtn" onClick={confirmAbono.onConfirm}>
              Confirmar
            </button>
          </div>
        </ModalMensaje>
      )}

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
