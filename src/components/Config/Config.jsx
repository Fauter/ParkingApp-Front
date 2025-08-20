import React, { useState, useEffect } from "react";
import ModalMensaje from "../ModalMensaje/ModalMensaje";
import "./Config.css";

const BASE_URL = "http://localhost:5000";

function Config() {
  const [ipCamara, setIpCamara] = useState("");

  const [webcams, setWebcams] = useState([]);
  const [webcamDefault, setWebcamDefault] = useState("");
  const [videoStream, setVideoStream] = useState(null);
  const videoRef = React.useRef(null);

  const [mensaje, setMensaje] = useState("");
  const [fotoUrl, setFotoUrl] = useState(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [loading, setLoading] = useState(false);

  const [impresoras, setImpresoras] = useState([]);
  const [impresoraDefault, setImpresoraDefault] = useState("");

  useEffect(() => {
    async function fetchIp() {
      try {
        const res = await fetch(`${BASE_URL}/api/camara/get-ip`);
        if (!res.ok) throw new Error("No se pudo obtener IP");
        const data = await res.json();
        setIpCamara(data.ip);
        localStorage.setItem("ipCamara", data.ip);
      } catch (error) {
        console.error(error);
        setMensaje("⚠️ No se pudo cargar la IP desde backend");
        const savedIp = localStorage.getItem("ipCamara");
        if (savedIp) setIpCamara(savedIp);
      }
    }

    async function fetchImpresoras() {
      try {
        const res = await fetch(`${BASE_URL}/api/impresoras`);
        const data = await res.json();
        setImpresoras(data.impresoras || []);

        // Importante: asegurar que default esté dentro de las impresoras recibidas
        if (data.default && data.impresoras.includes(data.default)) {
          setImpresoraDefault(data.default);
        } else if (data.impresoras.length > 0) {
          setImpresoraDefault(data.impresoras[0]);
        } else {
          setImpresoraDefault("");
        }
      } catch (e) {
        console.error("No se pudo obtener lista de impresoras:", e);
      }
    }
    async function fetchWebcams() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === "videoinput");
        setWebcams(cams);
        if (cams.length > 0) setWebcamDefault(cams[0].deviceId);
      } catch (e) {
        console.error("No se pudo obtener webcams:", e);
      }
    }

    fetchWebcams();
    fetchIp();
    fetchImpresoras();
  }, []);
  useEffect(() => {
  if (videoRef.current && videoStream) {
    videoRef.current.srcObject = videoStream;
  }
}, [videoStream]);

  const handleChange = (e) => setIpCamara(e.target.value);

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

      localStorage.setItem("ipCamara", ipCamara);
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

      await new Promise((r) => setTimeout(r, 2000));

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

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: webcamDefault ? { exact: webcamDefault } : undefined,
        },
      });
      setVideoStream(stream);
    } catch (error) {
      setMensaje("❌ No se pudo acceder a la webcam");
      setVideoStream(null);
    }
  };

  const GuardarWebCam = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/impresoras`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ impresora: impresoraDefault }),
      });
      if (!res.ok) throw new Error("Error al guardar impresora");
      setMensaje("✅ WebCam guardada correctamente");
      setModalAbierto(true);
    } catch (err) {
      console.error(err);
      setMensaje("❌ No se pudo guardar la WEBCAM");
      setModalAbierto(true);
    }
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setMensaje("");
    setFotoUrl(null);
    if (videoStream) {
      videoStream.getTracks().forEach((track) => track.stop());
      setVideoStream(null);
    }
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
          onChange={handleChange}
        />
        <button onClick={guardarIP}>Guardar IP</button>
        <button onClick={testearCamara} disabled={loading}>
          {loading ? "Cargando..." : "Testear Cámara"}
        </button>
      </div>

      <div className="campo-config">
        <label htmlFor="web-cam">modelo Cámara:</label>
        <select
          id="web_cam"
          className="promoSelect"
          value={webcamDefault}
          onChange={(e) => setWebcamDefault(e.target.value)}
        >
          {webcams.map((cam, i) => (
            <option key={cam.deviceId} value={cam.deviceId}>
              {cam.label || `Webcam ${i + 1}`}
            </option>
          ))}
        </select>
        <button className="guardarWebCamBtn" onClick={GuardarWebCam}>
          Guardar Foto
        </button>
        <button
        onClick={testearWebCam} disabled={loading}
        >
          {loading ? "Cargando..." : "Testear Cámara"}
        </button>
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
                style={{
                  width: "320px",
                  height: "240px",
                  borderRadius: "6px",
                  background: "#222",
                }}
              />
            </div>
          )}
          {/* Si quieres mostrar la foto capturada, agrega aquí fotoUrl */}
        </ModalMensaje>
      )}
    </div>
  );
}

export default Config;
