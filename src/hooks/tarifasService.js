import { useEffect, useRef, useState } from "react";

/** ============ Config ============ */
const BASE_URL = "http://localhost:5000";
const POLL_MS = 180000; // 3 minutos

async function fetchJsonNoStore(url, { signal } = {}) {
  // IMPORTANTE: sin headers extras que disparen preflight “cache-control/pragma”
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    signal,
  });
  if (!res.ok) throw new Error(`Fetch failed: ${url} -> ${res.status}`);
  return res.json();
}

/** Stringify estable (ordena keys) para comparar objetos complejos sin ruido de orden */
function stableStringify(value) {
  const seen = new WeakSet();
  const sorter = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  const stringify = (val) => {
    if (val && typeof val === "object") {
      if (seen.has(val)) return '"__CYCLE__"';
      seen.add(val);
      if (Array.isArray(val)) return `[${val.map(stringify).join(",")}]`;
      const keys = Object.keys(val).sort(sorter);
      return `{${keys.map((k) => `${JSON.stringify(k)}:${stringify(val[k])}`).join(",")}}`;
    }
    return JSON.stringify(val);
  };

  return stringify(value);
}

/** Pequeño hash rápido (no críptico) para token de cambio */
function hashToken(str) {
  let h = 2166136261 >>> 0; // FNV-1a base
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * Hook centralizado del catálogo
 * - Trae tarifas, preciosEfectivo, preciosOtros, tiposVehiculo, parametros
 * - Polling + revalidación por foco/online
 * - Solo actualiza estado si hubo cambios reales (token de cambio)
 * - Fallbacks locales para /api/precios
 */
export function useTarifasData() {
  const [tarifas, setTarifas] = useState([]);
  const [preciosEfectivo, setPreciosEfectivo] = useState({});
  const [preciosOtros, setPreciosOtros] = useState({});
  const [tiposVehiculo, setTiposVehiculo] = useState([]);
  const [parametros, setParametros] = useState({
    fraccionarDesde: 0,
    toleranciaInicial: 0,
    permitirCobroAnticipado: false,
  });
  const [lastUpdateToken, setLastUpdateToken] = useState(null);

  const timerRef = useRef(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(false);

  const loadAll = async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      // ======= precios efectivo con fallback =======
      let pCash = {};
      try {
        pCash = await fetchJsonNoStore(`${BASE_URL}/api/precios`, { signal: abortRef.current.signal });
        console.log("[Catalog] precios efectivo OK: /api/precios");
      } catch (e1) {
        console.warn("[Catalog] /api/precios falló, pruebo /api/precios?metodo=efectivo");
        pCash = await fetchJsonNoStore(`${BASE_URL}/api/precios?metodo=efectivo`, { signal: abortRef.current.signal });
        console.log("[Catalog] precios efectivo OK: /api/precios?metodo=efectivo");
      }

      // ======= precios otros (si falla, dejo {}) =======
      let pOther = {};
      try {
        pOther = await fetchJsonNoStore(`${BASE_URL}/api/precios?metodo=otros`, { signal: abortRef.current.signal });
        console.log("[Catalog] precios otros OK: /api/precios?metodo=otros");
      } catch (e2) {
        console.warn("[Catalog] precios otros NO disponibles, continuo con {}");
        pOther = {};
      }

      const [t, tv, pa] = await Promise.all([
        fetchJsonNoStore(`${BASE_URL}/api/tarifas`, { signal: abortRef.current.signal }),
        fetchJsonNoStore(`${BASE_URL}/api/tipos-vehiculo`, { signal: abortRef.current.signal }),
        fetchJsonNoStore(`${BASE_URL}/api/parametros`, { signal: abortRef.current.signal }),
      ]);

      const next = {
        tarifas: Array.isArray(t) ? t : [],
        preciosEfectivo: pCash || {},
        preciosOtros: pOther || {},
        tiposVehiculo: Array.isArray(tv) ? tv : [],
        parametros: pa || {},
      };

      const token = hashToken(
        stableStringify(next.tarifas) +
          "|" +
          stableStringify(next.preciosEfectivo) +
          "|" +
          stableStringify(next.preciosOtros) +
          "|" +
          stableStringify(next.tiposVehiculo) +
          "|" +
          stableStringify(next.parametros)
      );

      if (token !== lastUpdateToken) {
        if (!mountedRef.current) return;
        setTarifas(next.tarifas);
        setPreciosEfectivo(next.preciosEfectivo);
        setPreciosOtros(next.preciosOtros);
        setTiposVehiculo(next.tiposVehiculo);
        setParametros(next.parametros);
        setLastUpdateToken(token);

        console.log("[Catalog] actualizado →", {
          tarifas: next.tarifas.length,
          preciosEfectivo: Object.keys(next.preciosEfectivo || {}).length,
          preciosOtros: Object.keys(next.preciosOtros || {}).length,
          tiposVehiculo: next.tiposVehiculo.length,
          parametros: Object.keys(next.parametros || {}).length,
        });
      }
    } catch (e) {
      if (e?.name !== "AbortError") {
        console.error("useTarifasData loadAll:", e);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    loadAll(); // primera carga

    timerRef.current = setInterval(loadAll, POLL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") loadAll();
    };
    const onOnline = () => loadAll();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", onOnline);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { tarifas, preciosEfectivo, preciosOtros, tiposVehiculo, parametros, lastUpdateToken };
}

/* ===== Algoritmo de cálculo (equivalente al back) ===== */
function calcularConCatalogo({
  tipoVehiculo,
  inicio,
  dias,
  hora,
  tarifas,
  precios,
  parametros,
}) {
  if (!tipoVehiculo) throw new Error("Debe seleccionar un tipo de vehículo.");

  const entrada = inicio ? new Date(inicio) : new Date();
  if (isNaN(entrada)) throw new Error("Fecha de inicio inválida");

  const [h, m] = (hora || "00:00").split(":").map(Number);
  const salida = new Date(entrada);
  salida.setDate(salida.getDate() + Number(dias || 0));
  salida.setHours(salida.getHours() + (h || 0));
  salida.setMinutes(salida.getMinutes() + (m || 0));

  let minutosTotales = Math.ceil((salida - entrada) / 60000);
  if (minutosTotales <= 0) return { costo: 0, detalle: "Total: $0" };

  const tipoVehiculoKey = String(tipoVehiculo || "").toLowerCase();
  const fraccionarDesdeMinutos = Number(parametros?.fraccionarDesde || 0);

  const tarifasHora = (tarifas || [])
    .filter((t) => t.tipo === "hora")
    .map((t) => ({
      ...t,
      totalMin: (Number(t.dias || 0) * 1440) + (Number(t.horas || 0) * 60) + Number(t.minutos || 0),
      nombreKey: String(t.nombre || "").toLowerCase(),
      precio: precios?.[tipoVehiculoKey]?.[String(t.nombre || "").toLowerCase()] ?? Infinity,
    }))
    .sort((a, b) => a.totalMin - b.totalMin);

  if (!tarifasHora.length) throw new Error("No hay tarifas horarias configuradas.");

  const maxMinutos = minutosTotales + Math.max(...tarifasHora.map((t) => t.totalMin));
  const dp = Array(maxMinutos + 1).fill(Infinity);
  const backtrack = Array(maxMinutos + 1).fill(null);
  dp[0] = 0;

  for (let i = 0; i <= minutosTotales; i++) {
    if (!isFinite(dp[i])) continue;
    for (const tarifa of tarifasHora) {
      const { totalMin, precio, nombreKey } = tarifa;

      if (
        fraccionarDesdeMinutos > 0 &&
        i < fraccionarDesdeMinutos &&
        totalMin < fraccionarDesdeMinutos
      ) {
        continue;
      }

      const siguiente = i + totalMin;
      const nuevo = dp[i] + Number(precio || Infinity);
      if (nuevo < dp[siguiente]) {
        dp[siguiente] = nuevo;
        backtrack[siguiente] = { nombreKey, totalMin, precio: Number(precio || 0) };
      }
    }
  }

  let mejorCosto = Infinity;
  let mejorIndice = -1;
  for (let i = minutosTotales; i < dp.length; i++) {
    if (dp[i] < mejorCosto) {
      mejorCosto = dp[i];
      mejorIndice = i;
    }
  }
  if (mejorIndice === -1 || !isFinite(mejorCosto)) {
    throw new Error("No hay precios configurados correctamente para este tipo de vehículo.");
  }

  const tarifasUsadas = {};
  let i = mejorIndice;
  while (i > 0 && backtrack[i]) {
    const { nombreKey, totalMin, precio } = backtrack[i];
    tarifasUsadas[nombreKey] = tarifasUsadas[nombreKey] || { cantidad: 0, precio };
    tarifasUsadas[nombreKey].cantidad += 1;
    i -= totalMin;
  }

  let resumen = "";
  let costoTotal = 0;
  for (const [nombre, { cantidad, precio }] of Object.entries(tarifasUsadas)) {
    const parcial = cantidad * precio;
    resumen += `${cantidad} x ${nombre.charAt(0).toUpperCase() + nombre.slice(1)} = $${parcial}\n`;
    costoTotal += parcial;
  }

  resumen = resumen.trim() + `\n\nTotal: $${costoTotal}`;
  return { costo: Number(costoTotal || 0), detalle: resumen };
}

/**
 * Calcula con ambos catálogos y devuelve ambos totales.
 * Retorna: { costoEfectivo, costoOtros, detalleEfectivo, detalleOtros }
 */
export async function calcularAmbosPrecios({
  tipoVehiculo,
  inicio,
  dias,
  hora,
  tarifas,
  preciosEfectivo,
  preciosOtros,
  parametros,
}) {
  const { costo: ce, detalle: de } = calcularConCatalogo({
    tipoVehiculo, inicio, dias, hora, tarifas, precios: preciosEfectivo, parametros,
  });
  const { costo: co, detalle: doo } = calcularConCatalogo({
    tipoVehiculo, inicio, dias, hora, tarifas, precios: preciosOtros, parametros,
  });

  console.log("[Tarifa] doble cálculo →", {
    tipoVehiculo,
    dias,
    hora,
    efectivo: ce,
    otros: co,
  });

  return {
    costoEfectivo: ce,
    costoOtros: co,
    detalleEfectivo: de,
    detalleOtros: doo,
  };
}

/** (compat con tu back; no la usamos para “otros”) */
export async function calcularTarifaAPI({
  tipoVehiculo,
  inicio,
  dias,
  hora,
  tarifaAbono,
  tipoTarifa,
  tarifas,
  precios,
  parametros,
}) {
  const url = `${BASE_URL}/api/calcular-tarifa`;
  const payload = {
    detalle: { tipoVehiculo, inicio, dias, hora, tarifaAbono, tipoTarifa },
    tarifas,
    precios,
    parametros,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    let err = {};
    try { err = await response.json(); } catch {}
    throw new Error(err.error || "Error al calcular tarifa");
  }
  return response.json();
}

/** Helper que ya usás desde tus componentes */
export function armarParametrosTiempo(entradaISO, salidaISO) {
  const entrada = new Date(entradaISO);
  const salida = new Date(salidaISO);
  const diffMs = Math.max(salida - entrada, 0);

  const dias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const restoMs = diffMs - dias * 24 * 60 * 60 * 1000;
  const horas = Math.floor(restoMs / (1000 * 60 * 60));
  const minutos = Math.ceil((restoMs - horas * 60 * 60 * 1000) / (1000 * 60));

  const hh = String(horas).padStart(2, "0");
  const mm = String(minutos).padStart(2, "0");
  return { dias, horasFormateadas: `${hh}:${mm}` };
}
