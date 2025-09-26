import React, { useState, useEffect, useRef } from "react";
import { FaCamera, FaCheckCircle } from "react-icons/fa";
import ModalMensaje from "../../ModalMensaje/ModalMensaje";
import './DatosAutoAbono.css';

const BASE_URL = "http://localhost:5000";
const CATALOG_POLL_MS = 180000; // 3 min

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
  });

  const [fileUploaded, setFileUploaded] = useState({
    fotoSeguro: false,
    fotoDNI: false,
    fotoCedulaVerde: false,
  });

  // refs de inputs (compatibilidad)
  const inputRefs = {
    fotoSeguro: useRef(null),
    fotoDNI: useRef(null),
    fotoCedulaVerde: useRef(null),
  };

  const [tiposVehiculo, setTiposVehiculo] = useState([]);
  const [precios, setPrecios] = useState({});
  const [clientes, setClientes] = useState([]); // seguimos cargando para ensureCliente, pero sin sugerencias UI
  const [loading, setLoading] = useState(false);

  // ===== Modal de mensajes genéricos =====
  const [modal, setModal] = useState({ titulo: "", mensaje: "" });
  const closeModal = () => setModal({ titulo: "", mensaje: "" });
  const showModal = (titulo, mensaje) => setModal({ titulo, mensaje });

  // ======= Webcam (usa selección de Config.jsx) =======
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [modalCamAbierto, setModalCamAbierto] = useState(false);
  const [videoStream, setVideoStream] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [capturingField, setCapturingField] = useState(null);
  const videoRef = useRef(null);

  // Lee selección guardada por Config.jsx -> backend y luego localStorage
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
      return "No se encontró esa cámara. Probá actualizar la lista en Config o desconectar/volver a conectar.";
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

    // convertir dataURL a Blob/File y guardarlo en formData
    const dataUrl = fotoPreview;
    const res = await fetch(dataUrl);
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
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  useEffect(() => {
    return () => {
      if (videoStream) {
        try { videoStream.getTracks().forEach((t) => t.stop()); } catch {}
      }
    };
  }, [videoStream]);

  // ===== Formato ARS =====
  const formatARS = (n) => {
    if (typeof n !== "number") return null;
    try {
      return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
    } catch {
      return n?.toString() ?? "";
    }
  };

  // ===== Clientes / tipos / precios =====
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
      setFormData(prev => ({
        ...prev,
        patente: datosVehiculo.patente || "",
        tipoVehiculo: datosVehiculo.tipoVehiculo || ""
      }));
    }
  }, [datosVehiculo]);

  // ===== Auto-refresh de tipos y precios =====
  useEffect(() => {
    let timer = null;

    const fetchTiposYPrecios = async () => {
      try {
        const [tiposRes, preciosRes] = await Promise.all([
          fetch(`${BASE_URL}/api/tipos-vehiculo`, { cache: "no-store" }),
          fetch(`${BASE_URL}/api/precios`, { cache: "no-store" }),
        ]);

        if (!tiposRes.ok) throw new Error("No se pudo cargar tipos de vehículo");
        if (!preciosRes.ok) throw new Error("No se pudo cargar precios");

        const tiposData = await tiposRes.json();
        const preciosData = await preciosRes.json();

        setTiposVehiculo(Array.isArray(tiposData) ? tiposData : []);
        setPrecios(preciosData || {});
      } catch (err) {
        console.error("Error al cargar datos:", err);
        showModal("Error", "Error al cargar datos de vehículos y precios.");
      }
    };

    fetchTiposYPrecios(); // primera

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

  // Cargamos clientes una vez (para ensureCliente por DNI). NO hay sugerencias por nombre.
  useEffect(() => { fetchClientes(); }, []);

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "patente") {
      const patenteUpper = (value || "").toUpperCase();
      setFormData(prev => ({ ...prev, [name]: patenteUpper }));
      return;
    }
    if (files && files.length > 0) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      setFileUploaded(prev => ({ ...prev, [name]: true }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validarPatente = (patente) => {
    const formatoViejo = /^[A-Z]{3}\d{3}$/;       // ABC123
    const formatoNuevo = /^[A-Z]{2}\d{3}[A-Z]{2}$/; // AB123CD
    return formatoViejo.test(patente) || formatoNuevo.test(patente);
  };

  const validarDNI = (dni) => {
    const s = String(dni || '').replace(/\D+/g, '');
    return s.length >= 7 && s.length <= 11; // tolera DNI / CUIT / CUIL
  };

  // 🔐 ensureCliente: SOLO por DNI/CUIT/CUIL
  const ensureCliente = async () => {
    const dni = (formData.dniCuitCuil || '').trim();
    if (!validarDNI(dni)) throw new Error('DNI/CUIT/CUIL inválido');

    // 1) Buscar en cache local (clientes)
    const encontrado = (clientes || []).find(c => String(c.dniCuitCuil || '').trim() === dni);

    if (encontrado && encontrado._id) {
      // Actualizamos datos básicos y devolvemos _id
      try {
        const putRes = await fetch(`${BASE_URL}/api/clientes/${encontrado._id}`, {
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
            email: formData.email
          }),
        });
        if (putRes.ok) return encontrado._id;
      } catch (_) { /* si falla, creamos nuevo igual */ }
    }

    // 2) Crear nuevo cliente (si no existía por DNI)
    const nuevoClienteRes = await fetch(`${BASE_URL}/api/clientes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        precioAbono: formData.tipoVehiculo || ""
      }),
    });

    if (!nuevoClienteRes.ok) {
      const err = await nuevoClienteRes.json().catch(() => ({}));
      throw new Error(err?.message || 'Error al crear cliente');
    }
    const nuevoCliente = await nuevoClienteRes.json();
    if (!nuevoCliente._id) throw new Error('No se pudo crear cliente');
    return nuevoCliente._id;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const patente = (formData.patente || "").toUpperCase();

      if (!validarPatente(patente)) throw new Error("Patente inválida. Formatos permitidos: ABC123 o AB123CD.");
      if (!formData.tipoVehiculo) throw new Error("Debe seleccionar el tipo de vehículo.");
      if (!formData.nombreApellido?.trim()) throw new Error("Debe ingresar el nombre y apellido del cliente.");
      if (!validarDNI(formData.dniCuitCuil)) throw new Error("DNI/CUIT/CUIL inválido.");
      if (!formData.email?.trim()) throw new Error("Debe ingresar un email.");

      const clienteId = await ensureCliente();

      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, v);
      });
      fd.set('patente', patente);
      fd.set('cliente', clienteId);
      fd.set('operador', user?.nombre || 'Sistema');

      const resp = await fetch(`${BASE_URL}/api/abonos/registrar-abono`, {
        method: 'POST',
        body: fd,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.message || 'Error al registrar abono.');
      }

      // refrescamos cache de clientes por si se creó uno nuevo
      await fetchClientes();
      fetch(`${BASE_URL}/api/sync/run-now`, { method: 'POST' }).catch(() => {});

      showModal("Éxito", `Abono registrado correctamente para ${patente}.`);

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
      });
      setFileUploaded({
        fotoSeguro: false,
        fotoDNI: false,
        fotoCedulaVerde: false,
      });

    } catch (error) {
      console.error(error);
      showModal("Error", error?.message || "Ocurrió un error al guardar el abono.");
    } finally {
      setLoading(false);
    }
  };

  // === Render del “selector de archivo” que abre la cámara ===
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
          <div><label>Domicilio</label><input type="text" name="domicilio" value={formData.domicilio} onChange={handleChange} required /></div>
          <div><label>Localidad</label><input type="text" name="localidad" value={formData.localidad} onChange={handleChange} required /></div>
          <div><label>Domicilio Trabajo</label><input type="text" name="domicilioTrabajo" value={formData.domicilioTrabajo} onChange={handleChange} /></div>
          <div><label>Tel. Particular</label><input type="text" name="telefonoParticular" value={formData.telefonoParticular} onChange={handleChange} /></div>
          <div><label>Tel. Emergencia</label><input type="text" name="telefonoEmergencia" value={formData.telefonoEmergencia} onChange={handleChange} /></div>
          <div><label>Tel. Trabajo</label><input type="text" name="telefonoTrabajo" value={formData.telefonoTrabajo} onChange={handleChange} /></div>
        </div>

        <div className="grid-3cols fotos-grid">
          {renderFileInput("Foto Seguro", "fotoSeguro")}
          {renderFileInput("Foto DNI", "fotoDNI")}
          {renderFileInput("Foto Céd. Verde", "fotoCedulaVerde")}
        </div>

        <div className="grid-3cols">
          <div><label>Patente</label><input type="text" name="patente" value={formData.patente} onChange={handleChange} maxLength={8} required /></div>
          <div><label>Marca</label><input type="text" name="marca" value={formData.marca} onChange={handleChange} /></div>
          <div><label>Modelo</label><input type="text" name="modelo" value={formData.modelo} onChange={handleChange} /></div>
          <div><label>Color</label><input type="text" name="color" value={formData.color} onChange={handleChange} /></div>
          <div><label>Año</label><input type="number" name="anio" value={formData.anio} onChange={handleChange} /></div>
          <div><label>Compañía Seguro</label><input type="text" name="companiaSeguro" value={formData.companiaSeguro} onChange={handleChange} /></div>
        </div>

        <div className="grid-3cols">
          <div>
            <label>Método de Pago</label>
            <select name="metodoPago" value={formData.metodoPago} onChange={handleChange} className="select-style" required>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Débito">Débito</option>
              <option value="Crédito">Crédito</option>
              <option value="QR">QR</option>
            </select>
          </div>
          <div>
            <label>Factura</label>
            <select name="factura" value={formData.factura} onChange={handleChange} className="select-style">
              <option value="CC">CC</option>
              <option value="A">A</option>
              <option value="Final">Final</option>
            </select>
          </div>
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
              {tiposVehiculo.map((tipo) => {
                const mensual = precios?.[tipo.nombre?.toLowerCase?.() ?? ""]?.mensual;
                const labelPrecio = typeof mensual === "number" ? `$${formatARS(mensual)}` : "N/A";
                const capitalized = tipo.nombre ? (tipo.nombre.charAt(0).toUpperCase() + tipo.nombre.slice(1)) : "";
                return (
                  <option key={tipo.nombre} value={tipo.nombre}>
                    {capitalized} - {labelPrecio}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Abono'}
        </button>
      </form>

      {/* Modal de mensajes genéricos */}
      <ModalMensaje
        titulo={modal.titulo}
        mensaje={modal.mensaje}
        onClose={closeModal}
      />

      {/* Modal de Cámara */}
      {modalCamAbierto && (
        <ModalMensaje
          titulo="Webcam"
          mensaje={
            capturingField
              ? `Tomar foto para: ${capturingField.replace('foto', 'Foto ')}`
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
                  style={{
                    width: "320px",
                    height: "240px",
                    borderRadius: "6px",
                    background: "#222",
                  }}
                />
                <button
                  className="guardarWebcamBtn"
                  style={{ marginTop: "1rem" }}
                  onClick={tomarFoto}
                >
                  Tomar Foto
                </button>
              </>
            ) : (
              <>
                <img
                  src={fotoPreview}
                  alt="Foto tomada"
                  style={{ width: "320px", borderRadius: "6px" }}
                />
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
