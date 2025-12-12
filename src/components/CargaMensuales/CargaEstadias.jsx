// src/Operador/CargaEstadias/CargaEstadias.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import ModalMensaje from "../ModalMensaje/ModalMensaje";
import { FaSyncAlt } from "react-icons/fa";
import { HiArrowRight } from "react-icons/hi";
import "../CargaMensuales/CargaMensuales.css";

import {
  useTarifasData,
  calcularAmbosPrecios,
  armarParametrosTiempo,
} from "../../hooks/tarifasService";

const TOKEN_KEY = "token";
const OPERADOR_KEY = "operador";
const BASE_URL = "http://localhost:5000";

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

const pad2 = (n) => String(n).padStart(2, "0");
const toDate = (iso) => { try { return iso ? new Date(iso) : null; } catch { return null; } };
const formatDateShort = (iso) => {
  const d = toDate(iso);
  if (!d) return "—";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
};
const formatTimeHHMM = (iso) => {
  const d = toDate(iso);
  if (!d) return "—";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
const ddmmFromYYYYMMDD = (s) => {
  if (!s || typeof s !== "string" || s.length < 10) return "-- / --";
  const [y, m, d] = s.split("-");
  return `${pad2(d)} / ${pad2(m)}`;
};
const combineISO = (dateStr, timeStr) => {
  if (!dateStr) return "";
  const t = timeStr && timeStr.length ? timeStr : "00:00";
  return `${dateStr}T${t}`;
};

const DBG = true;
const log = (...a) => DBG && console.log("[CargaEstadias]", ...a);
const group = (t) => DBG && console.group("[CargaEstadias]", t);
const groupEnd = () => DBG && console.groupEnd();

/**
 * 🔹 Nombre de operador para enviar al backend:
 *    1) username
 *    2) "Nombre Apellido"
 *    3) email
 *    4) "Operador Desconocido"
 */
function buildOperadorNombre(op) {
  if (!op) return "Operador Desconocido";
  const username = (op.username || "").trim();
  const nombre = (op.nombre || "").trim();
  const apellido = (op.apellido || "").trim();
  const email = (op.email || "").trim();
  const full = `${nombre} ${apellido}`.trim();
  return username || full || email || "Operador Desconocido";
}

function padTicket10(n) {
  if (n == null) return "0000000000";
  const s = String(n).replace(/\D/g, "");
  return s.padStart(10, "0").slice(-10);
}

export default function CargaEstadias() {
  const navigate = useNavigate();
  const operador = useMemo(() => readOperador(), []);
  const token = useMemo(() => localStorage.getItem(TOKEN_KEY) || "", []);
  const authHeaders = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const { tarifas, preciosEfectivo, preciosOtros, parametros } = useTarifasData();

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(OPERADOR_KEY);
    navigate("/login", { replace: true });
  };

  /* —— Lista —— */
  const [vehiculos, setVehiculos] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

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
  useEffect(() => () => { if (cooldownTimerRef.current) clearInterval(cooldownTimerRef.current); }, []);

  const fetchVehiculos = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/vehiculos`, { cache: "no-store", headers: authHeaders });
      if (!res.ok) throw new Error("No se pudo cargar la lista de vehículos");
      const data = await res.json();
      setVehiculos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  const softRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try { await fetchVehiculos(); } finally { setIsRefreshing(false); startCooldown(); }
  }, [fetchVehiculos, isRefreshing, startCooldown]);

  useEffect(() => { fetchVehiculos(); }, [fetchVehiculos]);

  const dentroAhora = useMemo(
    () => (vehiculos || []).filter((v) => Boolean(v?.estadiaActual?.entrada) && !Boolean(v?.estadiaActual?.salida)),
    [vehiculos]
  );

  const filteredVehiculos = useMemo(() => {
    const base = dentroAhora;
    const term = q.trim().toLowerCase();
    if (!term) return base;
    return base.filter((v) => {
      const pat = String(v?.patente || "").toLowerCase();
      const tipo = String(v?.tipoVehiculo || "").toLowerCase();
      const op = String(v?.operador || "").toLowerCase();
      return pat.includes(term) || tipo.includes(term) || op.includes(term);
    });
  }, [dentroAhora, q]);

  /* —— Tipos de vehículo (para crear si no existe) —— */
  const [tipos, setTipos] = useState([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState(""); // placeholder vacío hasta elegir

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${BASE_URL}/api/tipos-vehiculo`, { cache: "no-store" });
        if (!r.ok) throw new Error("No se pudo cargar tipos de vehículo");
        const arr = await r.json();
        const list = Array.isArray(arr) ? arr : [];
        setTipos(list);
      } catch (e) {
        console.error("Error cargando tipos-vehiculo:", e);
      }
    })();
  }, []); // una vez

  /* —— Form —— */
  const [form, setForm] = useState({
    patente: "",
    entradaDate: "",
    entradaTime: "",
    salidaDate: "",
    salidaTime: "",
  });

  const [vehiculoSel, setVehiculoSel] = useState(null);
  const [metodoPago, setMetodoPago] = useState(null);
  const [factura, setFactura] = useState(null);

  const [promos, setPromos] = useState([]);
  const [promoSeleccionada, setPromoSeleccionada] = useState(null);

  const [costoEfectivo, setCostoEfectivo] = useState(null);
  const [costoOtros, setCostoOtros] = useState(null);
  const [costoBase, setCostoBase] = useState(0);
  const [totalConDescuento, setTotalConDescuento] = useState(0);
  const [tiempoHoras, setTiempoHoras] = useState(0);
  const [tarifaAplicada, setTarifaAplicada] = useState(null);

  const entradaDateRef = useRef(null);
  const salidaDateRef = useRef(null);
  const patenteInputRef = useRef(null);

  const openDatePicker = useCallback((ref) => {
    const el = ref?.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try { el.showPicker(); return; } catch {}
    }
    el.focus({ preventScroll: true });
    el.click();
  }, []);

  // Helpers de validación para "no permitir salida < entrada"
  const entradaCompleta = useMemo(
    () => Boolean(form.entradaDate && form.entradaTime),
    [form.entradaDate, form.entradaTime]
  );
  const salidaHabilitada = entradaCompleta; // no te deja poner salida hasta que haya entrada COMPLETA

  // 🚫 NUEVO: NUNCA autocompletar salida. Solo validar y, si queda inválida, limpiar.
  const normalizarSalidaContraEntrada = useCallback((draft) => {
    // Requiere ENTRADA completa
    if (!(draft.entradaDate && draft.entradaTime)) return draft;
    // Solo actuar si el usuario cargó AMBOS campos de salida
    if (!(draft.salidaDate && draft.salidaTime)) return draft;

    const eISO = combineISO(draft.entradaDate, draft.entradaTime);
    const sISO = combineISO(draft.salidaDate, draft.salidaTime);
    if (!eISO || !sISO) return draft;

    const dE = new Date(eISO);
    const dS = new Date(sISO);
    if (isNaN(dE) || isNaN(dS)) return draft;

    // Si la salida es anterior a la entrada, NO copiar —> limpiar salida
    if (dS < dE) {
      return {
        ...draft,
        salidaDate: "",
        salidaTime: "",
      };
    }
    return draft;
  }, []);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    if (name === "patente") {
      setForm((p) => ({ ...p, patente: (value || "").toUpperCase().slice(0, 10) }));
      return;
    }

    // Control fino: no permitir setear salida SIN entrada
    if (name === "salidaDate" || name === "salidaTime") {
      if (!salidaHabilitada) return; // bloquea si no hay entrada completa
      setForm((p) => {
        const draft = { ...p, [name]: value };
        return normalizarSalidaContraEntrada(draft);
      });
      return;
    }

    if (name === "entradaDate" || name === "entradaTime") {
      setForm((p) => {
        const draft = { ...p, [name]: value };
        // Si ajusto entrada y la salida ya estaba cargada pero quedó inválida, limpiar salida
        return normalizarSalidaContraEntrada(draft);
      });
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  };

  const cargarVehiculoPorPatente = useCallback(async (patente) => {
    const p = (patente || "").trim().toUpperCase();
    if (!p) { setVehiculoSel(null); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/vehiculos/${p}`, { headers: { "Content-Type": "application/json", ...authHeaders } });
      if (!res.ok) { setVehiculoSel(null); return; }
      const data = await res.json();
      setVehiculoSel(data);

      // Completar entrada si ya existe (NO tocar salida)
      if (data?.estadiaActual?.entrada) {
        const d = new Date(data.estadiaActual.entrada);
        setForm((prev) => {
          const next = {
            ...prev,
            patente: p,
            entradaDate: `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`,
            entradaTime: `${pad2(d.getHours())}:${pad2(d.getMinutes())}`,
            // salida intacta (vacía)
            salidaDate: "",
            salidaTime: "",
          };
          return next;
        });
      } else {
        setForm((prev) => ({ ...prev, patente: p }));
      }
    } catch {
      setVehiculoSel(null);
    }
  }, [authHeaders]);

  const cargarEnFormulario = (v) => {
    const entradaISO = v?.estadiaActual?.entrada || null;
    let dateStr = "";
    let timeStr = "";
    if (entradaISO) {
      const d = new Date(entradaISO);
      dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
      timeStr = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }
    const next = {
      patente: v?.patente?.toUpperCase() || "",
      entradaDate: dateStr,
      entradaTime: timeStr,
      salidaDate: "",
      salidaTime: "",
    };
    setForm(next);
    setMetodoPago(null);
    setFactura(null);
    setPromoSeleccionada(null);
    setTarifaAplicada(null);
    setCostoEfectivo(null);
    setCostoOtros(null);
    setCostoBase(0);
    setTotalConDescuento(0);
    setTiempoHoras(0);
    setVehiculoSel(v || null);

    if (dateStr) {
      setTimeout(() => salidaDateRef.current?.focus({ preventScroll: true }), 0);
    }
  };

  const resetForm = () => {
    setForm({
      patente: "",
      entradaDate: "",
      entradaTime: "",
      salidaDate: "",
      salidaTime: "",
    });
    setMetodoPago(null);
    setFactura(null);
    setPromoSeleccionada(null);
    setTarifaAplicada(null);
    setCostoEfectivo(null);
    setCostoOtros(null);
    setCostoBase(0);
    setTotalConDescuento(0);
    setTiempoHoras(0);
    setVehiculoSel(null);
    setTimeout(() => patenteInputRef.current?.focus({ preventScroll: true }), 0);
  };

  /* —— Promos —— */
  useEffect(() => {
    let timer = null;
    const loadPromos = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/promos`, { cache: "no-store" });
        if (!res.ok) throw new Error("Promos fetch failed");
        const data = await res.json();
        setPromos(Array.isArray(data) ? data : []);
        setPromoSeleccionada((prev) => prev && !data.find(p => p._id === prev._id) ? null : prev);
      } catch (err) {
        console.error("Error cargando promociones", err);
      }
    };
    loadPromos();
    timer = setInterval(loadPromos, 180000);
    const onVis = () => document.visibilityState === "visible" && loadPromos();
    const onOnline = () => loadPromos();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", onOnline);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  const handleSeleccionPromo = (e) => {
    const idSeleccionado = e.target.value;
    const promo = promos.find((p) => p._id === idSeleccionado);
    setPromoSeleccionada(promo || null);
  };

  /* —— Cálculo —— */
  const entradaISO = useMemo(
    () => combineISO(form.entradaDate, form.entradaTime),
    [form.entradaDate, form.entradaTime]
  );

  // ✅ NUEVO: salidaISO solo existe si hay fecha **y** hora de salida (no se completa con la de entrada)
  const salidaISO  = useMemo(
    () => (form.salidaDate && form.salidaTime ? combineISO(form.salidaDate, form.salidaTime) : ""),
    [form.salidaDate, form.salidaTime]
  );

  useEffect(() => { if (form.patente) cargarVehiculoPorPatente(form.patente); }, [form.patente, cargarVehiculoPorPatente]);

  // Mostrar precio sólo cuando hay: tipo + entrada(fecha+hora) + salida(fecha+hora)
  const tipoParaCalculo = (vehiculoSel?.tipoVehiculo) || tipoSeleccionado || null;
  const puedeCalcularPrecio = Boolean(
    tipoParaCalculo &&
    form.entradaDate && form.entradaTime &&
    form.salidaDate  && form.salidaTime
  );

  const recomputeTarifa = useCallback(async () => {
    if (!puedeCalcularPrecio) {
      // Mientras falte algo, mantener todo en 0
      setCostoEfectivo(0);
      setCostoOtros(0);
      setCostoBase(0);
      setTotalConDescuento(0);
      setTiempoHoras(0);
      setTarifaAplicada(null);
      return;
    }

    const dEntrada = new Date(entradaISO);
    const dSalida  = new Date(salidaISO);
    if (isNaN(dEntrada) || isNaN(dSalida) || dSalida <= dEntrada) {
      // Defensa adicional
      setCostoEfectivo(0);
      setCostoOtros(0);
      setCostoBase(0);
      setTotalConDescuento(0);
      setTiempoHoras(0);
      setTarifaAplicada(null);
      return;
    }

    group("CALC auto");
    try {
      // =========================
      // FIX SEMANA + cálculo oficial
      // =========================

      // Obtener parámetros base de tiempo
      let { dias, horasFormateadas } = armarParametrosTiempo(entradaISO, salidaISO);

      // Detectar si existen precios de "semana" en el tipo
      const preciosTipo =
        (preciosEfectivo?.[tipoParaCalculo]) ||
        (preciosOtros?.[tipoParaCalculo]) ||
        {};

      const tieneSemana = preciosTipo["semana"] != null;

      // Regla: Si supera 6 días y existe precio semana, se aplica semana
      if (tieneSemana && dias >= 7) {
        dias = 7;
        horasFormateadas = "00:00";
      }

      // Calcular horas aprox solo para UI
      const [hh, mm] = horasFormateadas.split(":").map(Number);
      const horasAprox = dias * 24 + (mm > 0 ? hh + 1 : hh);
      setTiempoHoras(horasAprox);

      // Cálculo oficial de tarifas
      const { costoEfectivo: ce, costoOtros: co } = await calcularAmbosPrecios({
        tipoVehiculo: tipoParaCalculo,
        inicio: entradaISO,
        dias,
        hora: horasFormateadas,
        tarifas,
        preciosEfectivo,
        preciosOtros,
        parametros,
      });

      setCostoEfectivo(typeof ce === "number" ? ce : 0);
      setCostoOtros(typeof co === "number" ? co : 0);

      let base = 0;
      if (metodoPago === "Efectivo") base = ce || 0;
      else if (metodoPago) base = co || 0;
      else base = ce || co || 0;

      const desc = promoSeleccionada?.descuento || 0;
      const total = base * (1 - desc / 100);

      setCostoBase(base);
      setTotalConDescuento(total);
      setTarifaAplicada(null);
    } catch (e) {
      console.error("Error cálculo manual:", e.message);
      setCostoEfectivo(0);
      setCostoOtros(0);
      setCostoBase(0);
      setTotalConDescuento(0);
      setTiempoHoras(0);
    } finally {
      groupEnd();
    }
  }, [
    puedeCalcularPrecio,
    entradaISO,
    salidaISO,
    tipoParaCalculo,
    metodoPago,
    promoSeleccionada,
    tarifas,
    preciosEfectivo,
    preciosOtros,
    parametros
  ]);

  // Auto-recalc al cambiar datos relevantes
  useEffect(() => { recomputeTarifa(); }, [recomputeTarifa]);

  useEffect(() => {
    if (!puedeCalcularPrecio) {
      setCostoBase(0);
      setTotalConDescuento(0);
      return;
    }
    let base = 0;
    if (metodoPago === "Efectivo") base = (costoEfectivo ?? 0);
    else if (metodoPago) base = (costoOtros ?? 0);
    else base = (costoEfectivo ?? costoOtros ?? 0);

    const desc = promoSeleccionada?.descuento || 0;
    setCostoBase(base);
    setTotalConDescuento(base * (1 - desc / 100));
  }, [metodoPago, promoSeleccionada, costoEfectivo, costoOtros, puedeCalcularPrecio]);

  /* —— Modal —— */
  const [modal, setModal] = useState({ titulo: "", mensaje: "" });
  const closeModal = () => setModal({ titulo: "", mensaje: "" });
  const showModal = (titulo, mensaje) => setModal({ titulo, mensaje });

  /* —— Acciones (con ticket de counter SIEMPRE) —— */

  const onEnterPatente = async () => {
    const p = (form.patente || "").trim().toUpperCase();
    if (!p) return;
    await cargarVehiculoPorPatente(p);
    setTimeout(() => salidaDateRef.current?.focus({ preventScroll: true }), 0);
  };

  // Crear vehículo **CON entrada** para consumir ticket en el back
  const crearVehiculoConEntrada = async ({ patente, tipoVehiculo, entradaISO }) => {
    const pat = (patente || "").trim().toUpperCase();
    if (!pat || !tipoVehiculo) throw new Error("Faltan datos para crear el vehículo (patente/tipo).");
    if (!form.entradaTime) throw new Error("Ingresá la hora de ENTRADA.");
    const operadorNombre = buildOperadorNombre(operador);

    log("Creando vehículo CON entrada (consume counter):", pat, "tipo:", tipoVehiculo);
    const r = await fetch(`${BASE_URL}/api/vehiculos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        patente: pat,
        tipoVehiculo,
        abonado: false,
        turno: false,
        operador: operadorNombre,
        entrada: new Date(entradaISO).toISOString(),
      }),
    });
    const json = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(json?.msg || "No se pudo crear el vehículo con entrada.");
    const veh = json?.vehiculo || json;
    setVehiculoSel(veh);
    return veh;
  };

  // Registrar ENTRADA (si el vehículo existe)
  const registrarEntradaEnExistente = async ({ patente, entradaISO }) => {
    if (!form.entradaTime) throw new Error("Ingresá la hora de ENTRADA.");
    const operadorNombre = buildOperadorNombre(operador);
    const res = await fetch(`${BASE_URL}/api/vehiculos/${patente}/registrarEntrada`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        entrada: new Date(entradaISO).toISOString(),
        operador: operadorNombre,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.msg || "No se pudo registrar la entrada.");
    return json?.vehiculo || json;
  };

  // SOLO ENTRADA
  const guardarEntrada = async () => {
    if (!form.patente) return showModal("Error", "Ingresá una patente.");
    if (!form.entradaDate) return showModal("Error", "Ingresá fecha de entrada.");
    if (!form.entradaTime) return showModal("Error", "Ingresá hora de entrada.");

    try {
      const p = form.patente.toUpperCase().trim();

      // Cargar/crear vehículo
      let veh = vehiculoSel;
      if (!veh) {
        await cargarVehiculoPorPatente(p);
        veh = vehiculoSel;
      }

      const entradaISOlocal = combineISO(form.entradaDate, form.entradaTime);

      if (!veh) {
        if (!tipoSeleccionado) return showModal("Error", "Seleccioná el tipo de vehículo.");
        veh = await crearVehiculoConEntrada({ patente: p, tipoVehiculo: tipoSeleccionado, entradaISO: entradaISOlocal });
      } else {
        // Si ya tenía entrada activa, no pisar
        if (veh?.estadiaActual?.entrada && !veh?.estadiaActual?.salida) {
          return showModal("Atención", "Este vehículo ya tiene una entrada registrada. No se puede pisar.");
        }
        veh = await registrarEntradaEnExistente({ patente: p, entradaISO: entradaISOlocal });
      }

      // Asegurar cache local y obtener ticket asignado
      await cargarVehiculoPorPatente(p);
      const assignedTicket = (veh?.estadiaActual?.ticket != null)
        ? veh.estadiaActual.ticket
        : (vehiculoSel?.estadiaActual?.ticket);

      const ticketStr = assignedTicket != null ? padTicket10(assignedTicket) : "—";

      showModal(
        "Éxito",
        `✅ Entrada registrada para ${p} a las ${formatTimeHHMM(entradaISOlocal)} del ${formatDateShort(entradaISOlocal)}.\nTicket asignado: ${ticketStr}`
      );

      // 👉 Limpiar y refrescar
      resetForm();
      await softRefresh();
    } catch (e) {
      console.error(e);
      showModal("Error", e.message || "No se pudo registrar la entrada.");
    }
  };

  // ENTRADA + SALIDA
  const guardarSalidaYMovimiento = async () => {
    if (!form.patente) return showModal("Error", "Ingresá una patente.");
    if (!form.entradaDate) return showModal("Error", "Ingresá fecha de entrada.");
    if (!form.entradaTime) return showModal("Error", "Ingresá hora de entrada.");
    if (!form.salidaDate) return showModal("Error", "Ingresá fecha de salida.");
    if (!form.salidaTime) return showModal("Error", "Ingresá hora de salida.");

    const entradaISOlocal = combineISO(form.entradaDate, form.entradaTime);
    const salidaISOlocal  = combineISO(form.salidaDate, form.salidaTime);

    const dE = new Date(entradaISOlocal), dS = new Date(salidaISOlocal);
    if (isNaN(dE) || isNaN(dS) || dS <= dE) return showModal("Error", "La salida debe ser posterior a la entrada.");
    if (!metodoPago || !factura) return showModal("Error", "Seleccioná método de pago y tipo de factura.");

    try {
      const p = form.patente.toUpperCase().trim();

      // 0) Asegurar vehículo
      let veh = vehiculoSel;
      if (!veh) {
        await cargarVehiculoPorPatente(p);
        veh = vehiculoSel;
      }
      if (!veh) {
        if (!tipoSeleccionado) return showModal("Error", "Seleccioná el tipo de vehículo.");
        veh = await crearVehiculoConEntrada({ patente: p, tipoVehiculo: tipoSeleccionado, entradaISO: entradaISOlocal });
      }

      // 1) Si no hay entrada activa, registrarla ahora
      if (!veh?.estadiaActual?.entrada) {
        await registrarEntradaEnExistente({ patente: p, entradaISO: entradaISOlocal });
        await cargarVehiculoPorPatente(p);
      }

      const diffMs = dS - dE;
      const horas = Math.max(Math.ceil(diffMs / (1000 * 60 * 60)), 1);
      const descripcion = `Pago por ${horas} Hora${horas > 1 ? "s" : ""}`;

      // 2) Registrar salida
      const resSalida = await fetch(`${BASE_URL}/api/vehiculos/${p}/registrarSalida`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          salida: new Date(salidaISOlocal).toISOString(),
          costo: totalConDescuento,
          tarifa: tarifaAplicada || null,
          tiempoHoras: horas,
          metodoPago: metodoPago,
          factura: factura,
          tipoTarifa: "hora",
          descripcion
        }),
      });
      const jsonSalida = await resSalida.json().catch(() => ({}));
      if (!resSalida.ok) throw new Error(jsonSalida?.msg || "Error al registrar salida.");

      // 3) Registrar movimiento explícito (compatibilidad)
      const operadorPayload = operador ? {
        username: operador.username,
        nombre: operador.nombre,
        apellido: operador.apellido,
        email: operador.email,
        _id: operador._id || operador.id
      } : undefined;

      const datosMovimiento = {
        patente: p,
        tipoVehiculo: (vehiculoSel?.tipoVehiculo || tipoSeleccionado || "Desconocido"),
        metodoPago,
        factura,
        descripcion,
        monto: totalConDescuento,
        tipoTarifa: "hora",
        ...(operadorPayload ? { operador: operadorPayload } : {}),
        ...(operador?.username ? { operadorUsername: operador.username } : {}),
        ...(operador?._id || operador?.id ? { operadorId: (operador._id || operador.id).toString() } : {}),
        ...(promoSeleccionada ? {
          promo: {
            _id: promoSeleccionada._id,
            nombre: promoSeleccionada.nombre,
            descuento: promoSeleccionada.descuento,
          }
        } : {})
      };

      const resMov = await fetch(`${BASE_URL}/api/movimientos/registrar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(datosMovimiento),
      });
      const jsonMov = await resMov.json().catch(() => ({}));
      if (!resMov.ok || !jsonMov?.movimiento) throw new Error(jsonMov?.msg || "Error al registrar movimiento.");

      // 4) Informar ticket
      await cargarVehiculoPorPatente(p);
      const assignedTicket = (vehiculoSel?.historialEstadias || []).slice(-1)[0]?.ticket
        ?? vehiculoSel?.estadiaActual?.ticket
        ?? null;
      const ticketStr = assignedTicket != null ? padTicket10(assignedTicket) : "—";

      showModal("Éxito", `✅ Salida y movimiento registrados para ${p}.\nTicket de la estadía: ${ticketStr}`);

      // 👉 Limpiar y refrescar
      resetForm();
      await softRefresh();
    } catch (e) {
      console.error(e);
      showModal("Error", e.message || "No se pudo completar la operación.");
    }
  };

  const showSkeleton = loading || isRefreshing;

  const hayEntrada = Boolean(form.entradaDate || form.entradaTime);
  const haySalida  = Boolean(form.salidaDate  || form.salidaTime);

  // Atributos de restricción para salida
  const salidaDateMin = form.entradaDate || undefined;
  const sameDay = form.entradaDate && form.salidaDate && form.entradaDate === form.salidaDate;
  const salidaTimeMin = sameDay ? (form.entradaTime || undefined) : undefined;

  return (
    <div className="cm-scope-cargamensuales">
      <div className="cm-page-cargamensuales">
        {/* Topbar */}
        <div className="cm-topbar-cargamensuales">
          <div className="cm-top-left-cargamensuales">
            <h1 className="cm-title-cargamensuales">Carga de Estadías</h1>
            <span className="cm-role-cargamensuales">{operador?.role || "rol"}</span>
          </div>
          <div className="cm-top-right-cargamensuales">
            <nav className="cm-navtabs-cargamensuales" aria-label="Secciones">
              <button
                type="button"
                className="cm-tab-cargamensuales"
                onClick={() => navigate("/operador/carga-mensuales")}
              >
                Mensuales
              </button>
              <button
                type="button"
                className="cm-tab-cargamensuales is-active"
                aria-current="page"
                onClick={() => navigate("/operador/carga-estadias")}
              >
                Forzar Ticket Manual
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

        {/* Contenido */}
        <div className="cm-container-cargamensuales">
          <div className="cm-grid-cargamensuales">
            {/* Left */}
            <section className="cm-left-cargamensuales">
              <div className="cm-search-cargamensuales">
                <input
                  className="input-wide-cargamensuales"
                  placeholder="Buscar por patente, tipo o operador…"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                <button
                  className={`cm-btn-cargamensuales cm-btn--ghost-cargamensuales cm-btn--refresh-cargamensuales ${isRefreshing ? "is-busy" : ""}`}
                  onClick={() => { if (!isRefreshing && cooldownLeft === 0) { softRefresh(); } }}
                  type="button"
                  disabled={isRefreshing || cooldownLeft > 0}
                  aria-busy={isRefreshing ? "true" : "false"}
                  title="Refrescar"
                >
                  <FaSyncAlt className={isRefreshing ? "cm-spin-cargamensuales" : ""} size={12} />
                  <span style={{ marginLeft: 6 }}>
                    {cooldownLeft > 0 ? `Refrescar (${cooldownLeft})` : "Refrescar"}
                  </span>
                </button>
              </div>

              <div className="cm-left-static-cargamensuales">
                <div className="cm-left-scrollbox-cargamensuales">
                  <table className="cm-table-cargamensuales cm-table-cargaestadias">
                    <thead>
                      <tr>
                        <th>Patente</th>
                        <th>Tipo</th>
                        <th>Entrada</th>
                      </tr>
                    </thead>
                    <tbody>
                      {showSkeleton ? (
                        Array.from({ length: 8 }).map((_, i) => (
                          <tr key={`sk-${i}`} className="cm-skel-row-cargamensuales">
                            <td><div className="cm-skel cm-skel--w60" /></td>
                            <td><div className="cm-skel cm-skel--w40" /></td>
                            <td><div className="cm-skel cm-skel--w60" /></td>
                          </tr>
                        ))
                      ) : filteredVehiculos.length === 0 ? (
                        <tr>
                          <td colSpan={3}>
                            <div className="cm-empty-cargamensuales">No hay vehículos dentro en este momento.</div>
                          </td>
                        </tr>
                      ) : (
                        filteredVehiculos.map((v) => {
                          const entradaISOv = v?.estadiaActual?.entrada || null;
                          return (
                            <tr
                              key={v._id || v.patente}
                              onClick={() => cargarEnFormulario(v)}
                              style={{ cursor: "pointer" }}
                            >
                              <td>{v?.patente || "—"}</td>
                              <td>{v?.tipoVehiculo || "—"}</td>
                              <td>
                                <div className="ce-datecell">
                                  <div className="ce-date">{formatDateShort(entradaISOv)}</div>
                                  <div className="ce-time">{formatTimeHHMM(entradaISOv)}</div>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="cm-meta-cargamensuales">
                  Total adentro: {dentroAhora.length} · Filtrados: {filteredVehiculos.length}
                </div>
              </div>
            </section>

            {/* Right: formulario */}
            <section className="cm-right-cargamensuales">
              <div className="cm-right-static-cargamensuales">
                <form onSubmit={(e) => e.preventDefault()} className="cm-page-cargamensuales ce-formpage">
                  {/* Patente + Tipo */}
                  <div className="ce-row-plate">
                    <div className="cm-field-cargamensuales ce-platefield">
                      <label>Patente</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input
                          ref={patenteInputRef}
                          type="text"
                          name="patente"
                          value={form.patente}
                          onChange={handleFormChange}
                          onKeyDown={(e) => { if (e.key === "Enter") onEnterPatente(); }}
                          className="input-wide-cargamensuales ce-input ce-plate"
                          required
                          maxLength={10}
                          autoComplete="off"
                          placeholder="Ingresá la patente"
                        />
                        {/* Selector de tipo (para crear si no existe) */}
                        <select
                          className="input-wide-cargamensuales ce-input"
                          value={vehiculoSel?.tipoVehiculo || tipoSeleccionado}
                          onChange={(e) => setTipoSeleccionado(e.target.value)}
                          disabled={!!vehiculoSel?.tipoVehiculo}
                          title={vehiculoSel?.tipoVehiculo ? `Tipo detectado: ${vehiculoSel.tipoVehiculo}` : "Tipo del vehículo (para crear si no existe)"}
                          style={{ maxWidth: 180 }}
                          required={!vehiculoSel?.tipoVehiculo}
                        >
                          {vehiculoSel?.tipoVehiculo ? (
                            <option value={vehiculoSel.tipoVehiculo}>{vehiculoSel.tipoVehiculo}</option>
                          ) : (
                            <>
                              <option value="" disabled>Tipo de vehículo</option>
                              {tipos.length === 0 && <option value="" disabled>Cargando tipos…</option>}
                              {tipos.map(t => (
                                <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
                              ))}
                            </>
                          )}
                        </select>

                        <button
                          type="button"
                          className="cm-btn-cargamensuales cm-btn--ghost-cargamensuales"
                          onClick={onEnterPatente}
                          title="Buscar"
                          aria-label="Buscar"
                        >
                          <HiArrowRight size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Entrada / Salida */}
                  <div className="ce-row-times">
                    {/* Entrada */}
                    <div className="cm-field-cargamensuales">
                      <label>Entrada</label>
                      <div className="ce-datetimegroup">
                        <div
                          className="ce-datebox ce-input"
                          onClick={() => openDatePicker(entradaDateRef)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && openDatePicker(entradaDateRef)}
                        >
                          <span className="ce-dateoverlay">{ddmmFromYYYYMMDD(form.entradaDate)}</span>
                          <input
                            ref={entradaDateRef}
                            type="date"
                            name="entradaDate"
                            value={form.entradaDate}
                            onChange={handleFormChange}
                            className="ce-date-native"
                            required
                          />
                        </div>
                        <input
                          type="time"
                          name="entradaTime"
                          value={form.entradaTime}
                          onChange={handleFormChange}
                          className="input-wide-cargamensuales ce-input ce-timeinp"
                          required
                        />
                      </div>
                    </div>

                    {/* Salida */}
                    <div className="cm-field-cargamensuales">
                      <label>Salida</label>
                      <div className="ce-datetimegroup" aria-disabled={!salidaHabilitada}>
                        <div
                          className="ce-datebox ce-input"
                          onClick={() => salidaHabilitada && openDatePicker(salidaDateRef)}
                          role={salidaHabilitada ? "button" : undefined}
                          tabIndex={salidaHabilitada ? 0 : -1}
                          onKeyDown={(e) => (salidaHabilitada && (e.key === "Enter" || e.key === " ") && openDatePicker(salidaDateRef))}
                          style={!salidaHabilitada ? { opacity: 0.5, pointerEvents: "none" } : undefined}
                          title={!salidaHabilitada ? "Completá fecha y hora de ENTRADA primero" : undefined}
                        >
                          <span className="ce-dateoverlay">{ddmmFromYYYYMMDD(form.salidaDate)}</span>
                          <input
                            ref={salidaDateRef}
                            type="date"
                            name="salidaDate"
                            value={form.salidaDate}
                            onChange={handleFormChange}
                            className="ce-date-native"
                            disabled={!salidaHabilitada}
                            min={salidaDateMin}
                          />
                        </div>
                        <input
                          type="time"
                          name="salidaTime"
                          value={form.salidaTime}
                          onChange={handleFormChange}
                          className="input-wide-cargamensuales ce-input ce-timeinp"
                          disabled={!salidaHabilitada}
                          min={salidaTimeMin}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Acciones */}
                  <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                    {!haySalida ? (
                      <button
                        className="cm-btn-cargamensuales cm-btn--ghost-cargamensuales"
                        type="button"
                        onClick={guardarEntrada}
                        title="Registrar entrada"
                      >
                        Registrar Entrada
                      </button>
                    ) : (
                      <div style={{ padding: "8px 0", fontSize: 12, opacity: 0.8 }}>
                        (Tarifa actualizada en tiempo real)
                      </div>
                    )}

                    <button
                      className="cm-btn-cargamensuales cm-btn--ghost-cargamensuales"
                      type="button"
                      onClick={resetForm}
                    >
                      Limpiar
                    </button>
                  </div>

                  {/* Precio / Pago */}
                  <div className="dp-cargaestadias" style={{ marginTop: 16 }}>
                    <div className="dp-precioTotal-cargaestadias">
                      <div className="dp-precioContainer-cargaestadias">
                        ${Number(puedeCalcularPrecio ? (totalConDescuento || 0) : 0).toLocaleString("es-AR")}
                      </div>
                      <div className="dp-promo-cargaestadias dp-promo--onlyselect">
                        <select
                          className="dp-promoSelect-cargaestadias"
                          value={promoSeleccionada?._id || "none"}
                          onChange={handleSeleccionPromo}
                          disabled={!puedeCalcularPrecio}
                          title={!puedeCalcularPrecio ? "Completá tipo + entrada (fecha/hora) + salida (fecha/hora) para aplicar promos" : undefined}
                        >
                          <option value="none">Seleccioná una Promo</option>
                          {promos?.map((p) => (
                            <option key={p._id} value={p._id}>{p.nombre} ({p.descuento}%)</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="dp-especificaciones-cargaestadias">
                      <div>
                        <div className="dp-title-cargaestadias">Método de Pago</div>
                        <div className="dp-row-cargaestadias dp-row--center-ce">
                          {["Efectivo", "Transferencia", "Débito", "Crédito", "QR"].map((m) => {
                            const selected = metodoPago === m;
                            return (
                              <div
                                key={m}
                                className={`dp-chip-cargaestadias ${selected ? "selected" : ""}`}
                                data-selected={selected ? "true" : "false"}
                                aria-selected={selected}
                                aria-pressed={selected}
                                onClick={() => setMetodoPago(m)}
                                title={selected ? `Seleccionado: ${m}` : m}
                                style={selected ? { boxShadow: "0 0 0 2px currentColor inset" } : undefined}
                              >
                                {m}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="dp-title-cargaestadias">Factura</div>
                        <div className="dp-row-cargaestadias dp-row--center-ce">
                          {["CC", "A", "Final"].map((f) => {
                            const selected = factura === f;
                            return (
                              <div
                                key={f}
                                className={`dp-chip-cargaestadias ${selected ? "selected" : ""}`}
                                data-selected={selected ? "true" : "false"}
                                aria-selected={selected}
                                aria-pressed={selected}
                                onClick={() => setFactura(f)}
                                title={selected ? `Seleccionado: ${f}` : f}
                                style={selected ? { boxShadow: "0 0 0 2px currentColor inset" } : undefined}
                              >
                                {f}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="dp-actions-cargaestadias" style={{ gap: 8 }}>
                      <button
                        className="cm-btn-cargamensuales cm-btn--primary-cargamensuales"
                        type="button"
                        onClick={guardarSalidaYMovimiento}
                        disabled={!entradaCompleta || !form.salidaDate || !form.salidaTime}
                        title={!entradaCompleta || !form.salidaDate || !form.salidaTime ? "Completá entrada y salida (fecha y hora) para habilitar" : "Registrar salida y movimiento"}
                      >
                        Guardar Salida + Movimiento
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </section>
          </div>
        </div>

        <ModalMensaje titulo={modal.titulo} mensaje={modal.mensaje} onClose={closeModal} />
      </div>
    </div>
  );
}
