import { useEffect, useRef, useState } from "react";

/** ============ Config ============ */
const BASE_URL = "http://localhost:5000";
const POLL_MS = 180000; // 3 minutos

async function fetchJson(url, { signal } = {}) {
  // cache: 'no-store' para evitar cualquier cacheo intermedio
  const res = await fetch(url, {
    cache: "no-store",
    credentials: "include",
    signal,
    headers: {
      // Evitar caches intermedios agresivos (CDN, proxy)
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
  if (!res.ok) throw new Error(`Fetch failed: ${url} -> ${res.status}`);
  return res.json();
}

/** Stringify estable (ordena keys) para comparar objetos complejos sin ruido de orden */
function stableStringify(value) {
  const allKeys = [];
  const seen = new WeakSet();

  const sorter = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  const stringify = (val) => {
    if (val && typeof val === "object") {
      if (seen.has(val)) return '"__CYCLE__"';
      seen.add(val);

      if (Array.isArray(val)) {
        return `[${val.map(stringify).join(",")}]`;
      }
      const keys = Object.keys(val).sort(sorter);
      return `{${keys
        .map((k) => `${JSON.stringify(k)}:${stringify(val[k])}`)
        .join(",")}}`;
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
 * - Trae tarifas, precios, tiposVehiculo, parametros
 * - Polling + revalidación por foco/online
 * - Solo actualiza estado si hubo cambios reales (token de cambio)
 */
export function useTarifasData() {
  const [tarifas, setTarifas] = useState([]);
  const [precios, setPrecios] = useState({});
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
    // Evitar solapar llamadas
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    try {
      const [t, p, tv, pa] = await Promise.all([
        fetchJson(`${BASE_URL}/api/tarifas`, { signal: abortRef.current.signal }),
        fetchJson(`${BASE_URL}/api/precios`, { signal: abortRef.current.signal }),
        fetchJson(`${BASE_URL}/api/tipos-vehiculo`, { signal: abortRef.current.signal }),
        fetchJson(`${BASE_URL}/api/parametros`, { signal: abortRef.current.signal }),
      ]);

      const next = {
        tarifas: Array.isArray(t) ? t : [],
        precios: p || {},
        tiposVehiculo: Array.isArray(tv) ? tv : [],
        parametros: pa || {},
      };

      // Generar firma estable del conjunto
      const token = hashToken(
        stableStringify(next.tarifas) +
          "|" +
          stableStringify(next.precios) +
          "|" +
          stableStringify(next.tiposVehiculo) +
          "|" +
          stableStringify(next.parametros)
      );

      // Solo setear estado si cambió la firma
      if (token !== lastUpdateToken) {
        if (!mountedRef.current) return; // por si desmontó en medio
        setTarifas(next.tarifas);
        setPrecios(next.precios);
        setTiposVehiculo(next.tiposVehiculo);
        setParametros(next.parametros);
        setLastUpdateToken(token);
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

    // polling
    timerRef.current = setInterval(loadAll, POLL_MS);

    // revalidar al volver a foco
    const onVisibility = () => {
      if (document.visibilityState === "visible") loadAll();
    };
    // revalidar al volver online
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
  }, []); // se monta una vez

  return { tarifas, precios, tiposVehiculo, parametros, lastUpdateToken };
}

/** ===== API cálculo (sin cambios funcionales) ===== */
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
    try {
      err = await response.json();
    } catch {}
    throw new Error(err.error || "Error al calcular tarifa");
  }
  return response.json();
}
