import React, { useState, useEffect, useRef } from "react";
import ModalMensaje from "../ModalMensaje/ModalMensaje";
import "./Config.css";

const BASE_URL = "http://localhost:5000";
const LS_WEBCAM_KEY = "webcamDeviceId";
const LS_IP_KEY = "ipCamara";

function Config() {
  const [ipCamara, setIpCamara] = useState("");

  const [webcams, setWebcams] = useState([]);
  const [webcamDefault, setWebcamDefault] = useState("");
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = useRef(null);

  const [mensaje, setMensaje] = useState("");
  const [fotoUrl, setFotoUrl] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [loading, setLoading] = useState(false);

  const [impresoras, setImpresoras] = useState([]);
  const [impresoraDefault, setImpresoraDefault] = useState("");

  // ---------- Helpers ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const humanMediaError = (err) => {
    if (!err) return "Error desconocido de cámara";
    if (err.name === "NotAllowedError" || err.name === "SecurityError")
      return "Permiso denegado. Habilitá el acceso a la cámara en el navegador para 'localhost'.";
    if (err.name === "NotFoundError" || err.name === "OverconstrainedError")
      return "No se encontró esa cámara. Probá actualizar la lista o elegir otra.";
    if (err.name === "NotReadableError")
      return "La cámara está siendo usada por otra app. Cerrá 'Cámara' de Windows u otras apps.";
    return `Fallo de cámara: ${err.name || ""} ${err.message || ""}`;
  };

  async function stopStream(stream) {
    if (stream) {
      stream.getTracks().forEach((t) => {
        try { t.stop(); } catch {}
      });
    }
  }

  async function enumerateCams({ requestPermission = false } = {}) {
    try {
      // 1) Conseguir permiso primero para que los labels aparezcan y salgan todos los dispositivos
      if (requestPermission) {
        let tmp;
        try {
          tmp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (e) {
          // Si falla el permiso, igual intentamos enumerar para mostrar al menos algo
          console.warn("Permiso cámara falló, intentando enumerar igual:", e);
        } finally {
          await stopStream(tmp);
        }
      }

      // 2) Enumerar
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === "videoinput");

      // 3) Limpieza de duplicados por deviceId
      const seen = new Set();
      const unique = [];
      for (const c of cams) {
        if (!seen.has(c.deviceId)) {
          seen.add(c.deviceId);
          unique.push(c);
        }
      }

      // 4) Orden alfabético por label (para que no "salte")
      unique.sort((a, b) => (a.label || "").localeCompare(b.label || ""));

      setWebcams(unique);

      // 5) Elegir default:
      const saved = localStorage.getItem(LS_WEBCAM_KEY);
      const savedExists = unique.find((c) => c.deviceId === saved);
      if (saved && savedExists) {
        setWebcamDefault(saved);
      } else if (unique.length > 0) {
        setWebcamDefault(unique[0].deviceId);
      } else {
        setWebcamDefault("");
      }
    } catch (e) {
      console.error("No se pudo enumerar webcams:", e);
      setMensaje("❌ No se pudieron listar webcams. " + humanMediaError(e));
      setModalAbierto(true);
    }
  }

  // ---------- Cargas iniciales ----------
  useEffect(() => {
    async function fetchIp() {
      try {
        const res = await fetch(`${BASE_URL}/api/camara/get-ip`);
        if (!res.ok) throw new Error("No se pudo obtener IP");
        const data = await res.json();
        setIpCamara(data.ip);
        localStorage.setItem(LS_IP_KEY, data.ip);
      } catch (error) {
        console.error(error);
        setMensaje("⚠️ No se pudo cargar la IP desde backend");
        const savedIp = localStorage.getItem(LS_IP_KEY);
        if (savedIp) setIpCamara(savedIp);
      }
    }

    async function fetchImpresoras() {
      try {
        const res = await fetch(`${BASE_URL}/api/impresoras`);
        const data = await res.json();
        const lista = Array.isArray(data.impresoras) ? data.impresoras : [];
        setImpresoras(lista);

        if (data.default && lista.includes(data.default)) {
          setImpresoraDefault(data.default);
        } else if (lista.length > 0) {
          setImpresoraDefault(lista[0]);
        } else {
          setImpresoraDefault("");
        }
      } catch (e) {
        console.error("No se pudo obtener lista de impresoras:", e);
      }
    }

    // 🔑 Pide permiso y luego enumera (esto arregla que solo aparezca "Webcam 1")
    enumerateCams({ requestPermission: true });
    fetchIp();
    fetchImpresoras();
  }, []);

  // Vincular el stream al <video>
  useEffect(() => {
    if (videoRef.current && videoStream) {
      videoRef.current.srcObject = videoStream;
    }
  }, [videoStream]);

  // Persistir selección de webcam
  useEffect(() => {
    if (webcamDefault) {
      localStorage.setItem(LS_WEBCAM_KEY, webcamDefault);
    }
  }, [webcamDefault]);

  // ---------- Handlers ----------
  const handleChangeIP = (e) => setIpCamara(e.target.value);

  const guardarIP = async () => {
    try {
      setMensaje("💾 Guardando IP...");
      setModalAbierto(true);

      const response = await fetch(`${BASE_URL}/api/camara/set-ip`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ip: ipCamara }),
      });

      if (!response.ok) throw new Error("Error al guardar IP");

      localStorage.setItem(LS_IP_KEY, ipCamara);
      setMensaje("✅ IP guardada correctamente");
    } catch (error) {
      console.error(error);
      setMensaje("❌ Error al guardar IP");
    }
  };

  const testearCamara = async () => {
    try {
      setLoading(true);
      setMensaje("📸 Tomando foto de prueba...");
      setFotoUrl(null);
      setModalAbierto(true);

      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout al sacar foto")), 5000)
      );

      const response = await Promise.race([
        fetch(`${BASE_URL}/api/camara/sacarfoto-test`),
        timeout,
      ]);

      if (!response.ok) throw new Error("Error al sacar foto de prueba");

      await sleep(1200);
      const timestamp = Date.now();
      setFotoUrl(`${BASE_URL}/camara/sacarfoto/capturaTest.jpg?t=${timestamp}`);
      setMensaje("✅ Foto de prueba capturada");
    } catch (error) {
      console.error(error);
      setMensaje("❌ No se pudo capturar la foto de prueba");
      setFotoUrl(null);
    } finally {
      setLoading(false);
    }
  };

  const guardarImpresora = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/impresoras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ impresora: impresoraDefault }),
      });
      if (!res.ok) throw new Error("Error al guardar impresora");
      setMensaje("✅ Impresora guardada correctamente");
      setModalAbierto(true);
    } catch (err) {
      console.error(err);
      setMensaje("❌ No se pudo guardar la impresora");
      setModalAbierto(true);
    }
  };

  const testearWebCam = async () => {
    setModalAbierto(true);
    setMensaje("📷 Mostrando cámara...");
    setFotoUrl(null);

    // Si el ID es "default"/vacío, pedimos {video:true} sin 'exact'
    const useGeneric =
      !webcamDefault || webcamDefault === "default" || webcamDefault === "communications";

    try {
      const constraints = useGeneric
        ? { video: true }
        : { video: { deviceId: { exact: webcamDefault } } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setVideoStream(stream);

      // Tras obtener stream, re-enumeramos para que aparezcan labels reales si faltaban
      await enumerateCams({ requestPermission: false });
      setMensaje("✅ Cámara lista");
    } catch (error) {
      console.error(error);
      setMensaje("❌ No se pudo acceder a la webcam. " + humanMediaError(error));
      setVideoStream(null);
    }
  };

  const guardarWebCam = async () => {
    try {
      localStorage.setItem(LS_WEBCAM_KEY, webcamDefault);
      const res = await fetch(`${BASE_URL}/api/webcam`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webcam: webcamDefault }),
      });
      if (!res.ok) throw new Error("Error al guardar webcam");
      setMensaje("✅ Webcam guardada correctamente");
      setModalAbierto(true);
    } catch (err) {
      console.error(err);
      setMensaje("❌ No se pudo guardar la webcam");
      setModalAbierto(true);
    }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setMensaje("");
    setFotoUrl(null);
    if (videoStream) {
      stopStream(videoStream);
      setVideoStream(null);
    }
  };

  const actualizarLista = async () => {
    setMensaje("🔄 Actualizando lista de cámaras...");
    setModalAbierto(true);
    await enumerateCams({ requestPermission: true });
    setMensaje("✅ Lista actualizada");
  };

  return (
    <div className="config-container">
      <h2>Configuración</h2>

      <div className="campo-config">
        <label htmlFor="ip-camara">IP de la Cámara:</label>
        <input
          type="text"
          id="ip-camara"
          placeholder="Ej: 192.168.0.100"
          value={ipCamara}
          onChange={handleChangeIP}
        />
        <button onClick={guardarIP}>Guardar IP</button>
        <button onClick={testearCamara} disabled={loading}>
          {loading ? "Cargando..." : "Testear Cámara IP"}
        </button>
      </div>

      <div className="campo-config">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <label htmlFor="web_cam">Modelo Cámara (Webcam):</label>
        </div>

        <select
          id="web_cam"
          className="promoSelect"
          value={webcamDefault}
          onChange={(e) => setWebcamDefault(e.target.value)}
        >
          {webcams.length === 0 && <option value="">(sin cámaras detectadas)</option>}
          {webcams.map((cam, i) => (
            <option key={`${cam.deviceId || i}-${i}`} value={cam.deviceId}>
              {cam.label?.trim()
                ? cam.label
                : `Webcam ${i + 1}${cam.deviceId ? ` (${cam.deviceId.slice(0, 6)}…)` : ""}`}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="guardarWebCamBtn" onClick={guardarWebCam}>
            Guardar Webcam
          </button>
          <button onClick={testearWebCam}>Testear Webcam</button>
        </div>
      </div>

      <div className="ticketera-config">
        <h3>Ticketera</h3>
        <label htmlFor="impresora">Impresora predeterminada:</label>
        <select
          id="impresora"
          className="promoSelect"
          value={impresoraDefault}
          onChange={(e) => setImpresoraDefault(e.target.value)}
        >
          {impresoras.map((imp, i) => (
            <option key={i} value={imp}>
              {imp}
            </option>
          ))}
        </select>
        <button className="guardarTicketeraBtn" onClick={guardarImpresora}>
          Guardar impresora
        </button>
      </div>

      {modalAbierto && (
        <ModalMensaje titulo="Estado" mensaje={mensaje} onClose={cerrarModal}>
          {videoStream && (
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
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
            </div>
          )}

          {fotoUrl && (
            <div style={{ marginTop: "1rem", textAlign: "center" }}>
              <img
                src={fotoUrl}
                alt="Foto de prueba"
                style={{ width: "320px", height: "auto", borderRadius: "6px" }}
              />
            </div>
          )}
        </ModalMensaje>
      )}
    </div>
  );
}

export default Config;
