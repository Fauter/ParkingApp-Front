import React, { useState, useEffect, useRef, useCallback } from "react";
import "./DatosAutoEntrada.css";
import ModalMensaje from "../../ModalMensaje/ModalMensaje";
import AutoPlaceHolder from "../../../../public/images/placeholder.png";
import AutoPlaceHolderNoimage from "../../../../public/images/placeholderNoimage.png";

const BASE_URL = "http://localhost:5000";
const CATALOG_POLL_MS = 180000; // 3 min
const CATALOG_VERSION_KEY = "catalogVersion";
const BC_NAME = "catalog-updated";

let bc;
try { bc = new BroadcastChannel(BC_NAME); } catch {}

/* ---------- Utils ---------- */
const hash = (obj) => {
  const s = JSON.stringify(obj);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  return (h >>> 0).toString(36);
};

const norm = (s) =>
  (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

const makeAbsolute = (url) => {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("/")) return `${BASE_URL}${url}`;
  return url;
};

const isPriceValid = (v) => typeof v === "number" && isFinite(v) && v > 0;

/* ===========================================================
   Componente
=========================================================== */
function DatosAutoEntrada({
  user,
  ticketPendiente,
  onClose,
  timestamp,
  setTicketPendiente = () => {},
  autoFocusOnMount = false,
}) {
  const [patente, setPatente] = useState("");
  const [tipoVehiculo, setTipoVehiculo] = useState("");

  // Catálogos crudos
  const [precios, setPrecios] = useState({});
  const [tiposVehiculoApi, setTiposVehiculoApi] = useState([]);

  // Nombres de tarifas que son de tipo "hora" (normalizados)
  const [tarifasHoraKeys, setTarifasHoraKeys] = useState([]);

  // Derivado: opciones filtradas para el select
  const [tiposVehiculoDisponibles, setTiposVehiculoDisponibles] = useState([]);

  // Modal de mensajes
  const [modalMensaje, setModalMensaje] = useState("");
  const [modalTitulo, setModalTitulo] = useState("Atención");
  const [mostrarModal, setMostrarModal] = useState(false);

  const [fotoUrl, setFotoUrl] = useState(AutoPlaceHolder);

  const abortRef = useRef(null);
  const lastHashesRef = useRef({ precios: "", tipos: "", tarifasHora: "" });
  const patenteRef = useRef(null);

  // ✅ Autoenfoque SOLO si el componente está en modal
  useEffect(() => {
    if (autoFocusOnMount) {
      const t = setTimeout(() => patenteRef.current?.focus({ preventScroll: true }), 0);
      return () => clearTimeout(t);
    }
  }, [autoFocusOnMount]);

  const setIfChanged = (setter, key, data) => {
    const h = hash(data);
    if (h !== lastHashesRef.current[key]) {
      lastHashesRef.current[key] = h;
      setter(data);
    }
  };

  const mostrarMensaje = (titulo, mensaje) => {
    setModalTitulo(titulo);
    setModalMensaje(mensaje);
    setMostrarModal(true);
  };

  /* ---------- Fetchers ---------- */
  const fetchPrecios = useCallback(async () => {
    try {
      let data = null;

      // 1) intento estándar
      try {
        const res = await fetch(`${BASE_URL}/api/precios`, { cache: "no-store" });
        if (!res.ok) throw new Error(`GET /api/precios -> ${res.status}`);
        data = await res.json();
        console.log("[Entrada] precios OK via /api/precios");
      } catch (e1) {
        console.warn("[Entrada] /api/precios falló, probando fallback /api/precios?metodo=efectivo", e1?.message);
        // 2) fallback efectivo
        const res2 = await fetch(`${BASE_URL}/api/precios?metodo=efectivo`, { cache: "no-store" });
        if (!res2.ok) throw new Error(`GET /api/precios?metodo=efectivo -> ${res2.status}`);
        data = await res2.json();
        console.log("[Entrada] precios OK via /api/precios?metodo=efectivo");
      }

      setIfChanged(setPrecios, "precios", data || {});
    } catch (error) {
      console.error("Error al obtener los precios (ambos intentos):", error);
      // Sólo muestro modal si NO tengo nada actualmente
      if (!precios || Object.keys(precios).length === 0) {
        mostrarMensaje("Error", "No se pudieron cargar los precios.");
      }
    }
  }, [precios]);

  const fetchTiposVehiculo = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/tipos-vehiculo`, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar los tipos de vehículo");
      const data = await res.json();
      setIfChanged(setTiposVehiculoApi, "tipos", Array.isArray(data) ? data : []);
    } catch (error) {
      mostrarMensaje("Error", "No se pudieron cargar los tipos de vehículo.");
      console.error("Error al obtener los tipos de vehículo:", error);
    }
  }, []);

  const fetchTarifasHora = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/tarifas`, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudieron cargar las tarifas");
      const all = await res.json();
      const keys = (Array.isArray(all) ? all : [])
        .filter(t => norm(t.tipo) === "hora")
        .map(t => norm(t.nombre))
        .filter((v, i, a) => a.indexOf(v) === i);
      setIfChanged(setTarifasHoraKeys, "tarifasHora", keys);
    } catch (error) {
      mostrarMensaje("Error", "No se pudieron cargar las tarifas.");
      console.error("Error al obtener las tarifas:", error);
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      abortRef.current?.abort?.();
      const controller = new AbortController();
      abortRef.current = controller;
      await Promise.all([fetchPrecios(), fetchTiposVehiculo(), fetchTarifasHora()]);
    } catch {}
  }, [fetchPrecios, fetchTiposVehiculo, fetchTarifasHora]);

  /* ---------- Ciclo de vida: carga y refresco ---------- */
  useEffect(() => {
    let timer = null;
    loadAll();

    timer = setInterval(loadAll, CATALOG_POLL_MS);

    const onVis = () => document.visibilityState === "visible" && loadAll();
    const onFocus = () => loadAll();
    const onOnline = () => loadAll();

    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);

    const onStorage = (ev) => {
      if (ev.key === CATALOG_VERSION_KEY) loadAll();
    };
    window.addEventListener("storage", onStorage);

    if (bc) {
      bc.onmessage = (msg) => {
        if (msg?.data?.type === "catalog-version") loadAll();
      };
    }

    return () => {
      abortRef.current?.abort?.();
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("storage", onStorage);
      if (bc) bc.onmessage = null;
    };
  }, [loadAll]);

  /* ---------- Foto del ticket/captura ---------- */
  useEffect(() => {
    const verificarFoto = async () => {
      if (ticketPendiente) {
        const candidate = ticketPendiente.fotoUrl
          ? makeAbsolute(ticketPendiente.fotoUrl)
          : `${BASE_URL}/camara/sacarfoto/captura.jpg`;
        const url = `${candidate}?t=${timestamp}`;
        try {
          const res = await fetch(url, { method: "HEAD" });
          if (res.ok) setFotoUrl(url);
          else setFotoUrl(AutoPlaceHolderNoimage);
        } catch {
          setFotoUrl(AutoPlaceHolderNoimage);
        }
      } else {
        setFotoUrl(AutoPlaceHolder);
      }
    };
    verificarFoto();
  }, [ticketPendiente, timestamp]);

  /* ---------- Filtrado: SOLO tipos con hora === true y precio 'hora' > 0 ---------- */
  useEffect(() => {
    if (!Array.isArray(tiposVehiculoApi) || tiposVehiculoApi.length === 0) {
      setTiposVehiculoDisponibles([]);
      return;
    }
    if (!precios || typeof precios !== "object") {
      setTiposVehiculoDisponibles([]);
      return;
    }

    // Normalizo el mapa de precios por tipo y sus claves
    const preciosNormPorTipo = {};
    for (const [tipo, mapa] of Object.entries(precios)) {
      const inner = {};
      if (mapa && typeof mapa === "object") {
        for (const [k, v] of Object.entries(mapa)) inner[norm(k)] = v;
      }
      preciosNormPorTipo[norm(tipo)] = inner;
    }

    // Criterio: tipos con hora === true y precio 'hora' válido (> 0)
    const filtrados = tiposVehiculoApi.filter(({ nombre, hora }) => {
      if (!hora) return false;
      const tipoN = norm(nombre);
      const mapa = preciosNormPorTipo[tipoN];
      if (!mapa) return false;
      const precioHora = mapa["hora"]; // ya normalizado arriba
      return isPriceValid(precioHora);
    });

    setTiposVehiculoDisponibles(filtrados);
  }, [tiposVehiculoApi, precios]);

  /* ---------- Acciones ---------- */
  const eliminarFotoTemporal = async () => {
    try {
      await fetch(`${BASE_URL}/api/vehiculos/eliminar-foto-temporal`, { method: "DELETE" });
    } catch (error) {
      console.error("Error al eliminar foto temporal:", error);
    }
  };

  const resetearEstadoCompleto = () => {
    setPatente("");
    setTipoVehiculo("");
    setFotoUrl(AutoPlaceHolder);
    setTicketPendiente(null);
  };

  const handleCerrarModal = () => {
    setMostrarModal(false);
    setModalMensaje("");
    if (modalTitulo === "Éxito") {
      resetearEstadoCompleto();
      if (typeof onClose === "function") onClose();
      if (typeof setTicketPendiente === "function") setTicketPendiente(null);
    }
  };

  const handleEntrada = async () => {
    if (!user) return mostrarMensaje("Atención", "No estás logueado.");
    if (!ticketPendiente) return mostrarMensaje("Atención", "Primero generá un ticket con BOT.");

    const regexCompleto = /^([A-Z]{3}[0-9]{3}|[A-Z]{2}[0-9]{3}[A-Z]{2})$/;
    if (!regexCompleto.test(patente)) return mostrarMensaje("Patente inválida", "Formato ABC123 o AB123CD.");

    if (!patente || !tipoVehiculo) return mostrarMensaje("Faltan datos", "Patente y tipo de vehículo.");

    const sigueSiendoValido = tiposVehiculoDisponibles.some(t => norm(t.nombre) === norm(tipoVehiculo));
    if (!sigueSiendoValido) return mostrarMensaje("Sin precios válidos", "El tipo de vehículo seleccionado ya no es válido.");

    try {
      const fotoUrlActual = ticketPendiente.fotoUrl
        ? makeAbsolute(ticketPendiente.fotoUrl)
        : `${BASE_URL}/camara/sacarfoto/captura.jpg`;

      const resAsociar = await fetch(
        `${BASE_URL}/api/tickets/${ticketPendiente._id}/asociar`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patente,
            tipoVehiculo,
            operadorNombre: user.nombre,
            fotoUrl: fotoUrlActual,
          }),
        }
      );
      const dataAsociar = await resAsociar.json();
      if (!resAsociar.ok) throw new Error(dataAsociar.msg || "Error al asociar ticket");

      // Registrar entrada
      const checkResponse = await fetch(`${BASE_URL}/api/vehiculos/${patente}`);
      if (checkResponse.ok) {
        const entradaResponse = await fetch(
          `${BASE_URL}/api/vehiculos/${patente}/registrarEntrada`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              operador: user.nombre,
              metodoPago: "Efectivo",
              monto: precios[norm(tipoVehiculo)]?.hora ?? precios[norm(tipoVehiculo)]?.["hora"],
              ticket: ticketPendiente.ticket,
              entrada: ticketPendiente.creadoEn,
              fotoUrl: fotoUrlActual,
            }),
          }
        );
        if (!entradaResponse.ok) throw new Error("Error al registrar entrada");
      } else {
        const vehiculoResponse = await fetch(`${BASE_URL}/api/vehiculos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patente,
            tipoVehiculo,
            abonado: false,
            operador: user.nombre,
            ticket: ticketPendiente.ticket,
            entrada: ticketPendiente.creadoEn,
            fotoUrl: fotoUrlActual,
          }),
        });
        if (!vehiculoResponse.ok) throw new Error("Error al registrar vehículo");
      }

      await eliminarFotoTemporal();

      setPatente("");
      setTipoVehiculo("");
      setFotoUrl(AutoPlaceHolder);
      mostrarMensaje("Éxito", `Entrada registrada para ${patente}.`);
    } catch (error) {
      console.error("Error:", error.message);
      mostrarMensaje("Error", error.message || "Ocurrió un error");
    }
  };

  const handlePatenteChange = (e) => {
    const valor = e.target.value.toUpperCase();
    const regexParcial = /^[A-Z]{0,3}[0-9]{0,3}[A-Z]{0,2}$/;
    if (valor === "" || regexParcial.test(valor)) setPatente(valor);
  };

  /* ---------- Render ---------- */
  return (
    <div className="datosAutoEntrada">
      <div className="fotoAutoEntrada">
        <img
          src={fotoUrl}
          alt="Foto auto"
          className="foto-vehiculo"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = AutoPlaceHolderNoimage;
          }}
        />
      </div>

      <div className="formularioAuto">
        <label htmlFor="patente">Patente</label>
        <input
          id="patente"
          ref={patenteRef}
          type="text"
          placeholder="Ingrese la patente"
          value={patente}
          onChange={handlePatenteChange}
          className="inputPatente"
          maxLength={8}
        />

        <label htmlFor="tipoVehiculo">Tipo de Vehículo</label>
        <select
          id="tipoVehiculo"
          value={tipoVehiculo}
          onChange={(e) => setTipoVehiculo(e.target.value)}
          className="selectVehiculo"
        >
          <option value="">Seleccione un tipo</option>
          {tiposVehiculoDisponibles.map(({ nombre }) => (
            <option key={nombre} value={nombre}>
              {nombre.charAt(0).toUpperCase() + nombre.slice(1)}
            </option>
          ))}
        </select>

        <button className="btn-entrada" onClick={handleEntrada}>
          Registrar Entrada
        </button>
      </div>

      <ModalMensaje
        titulo={modalTitulo}
        mensaje={modalMensaje}
        onClose={handleCerrarModal}
        mostrar={mostrarModal}
      />
    </div>
  );
}

export default DatosAutoEntrada;
