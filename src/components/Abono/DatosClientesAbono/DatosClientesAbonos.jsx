// DatosClientesAbonos.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  Fragment,
} from "react";
import { FaArrowRight } from "react-icons/fa";
import "./DatosClientesAbonos.css";

const BASE_URL = "http://localhost:5000";
const COOLDOWN_SECONDS = 5;

const normCocheraFront = (raw) => {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "fija") return "Fija";
  if (v === "móvil" || v === "movil") return "Móvil";
  return "";
};

// Formateador DNI con puntos
const formatDNI = (raw) => {
  const v = String(raw || "").replace(/\D/g, "");
  if (!v) return "";
  if (v.length <= 3) return v;

  const len = v.length;
  let firstGroupLen = len % 3;
  if (firstGroupLen === 0) firstGroupLen = 3;

  let result = v.slice(0, firstGroupLen);
  for (let i = firstGroupLen; i < len; i += 3) {
    result += "." + v.slice(i, i + 3);
  }
  return result;
};

export default function DatosClientesAbonos({ onPickCliente }) {
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const [cocherasMap, setCocherasMap] = useState({});
  const [cocherasLoading, setCocherasLoading] = useState({});

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
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/clientes`, { cache: "no-store" });
      if (!res.ok) throw new Error("No se pudo cargar la lista de clientes");
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCocherasByCliente = useCallback(async (clienteId) => {
    if (!clienteId) return;

    // Si ya cargamos las cocheras antes, no repetimos
    if (cocherasMap[clienteId]) return;

    setCocherasLoading((prev) => ({ ...prev, [clienteId]: true }));

    try {
      const res = await fetch(`${BASE_URL}/api/cocheras/cliente/${clienteId}`);
      if (res.ok) {
        const data = await res.json();
        setCocherasMap((prev) => ({ ...prev, [clienteId]: data }));
      } else {
        setCocherasMap((prev) => ({ ...prev, [clienteId]: [] }));
      }
    } catch (e) {
      console.error(e);
      setCocherasMap((prev) => ({ ...prev, [clienteId]: [] }));
    } finally {
      setCocherasLoading((prev) => ({ ...prev, [clienteId]: false }));
    }
  }, [cocherasMap]);

  const softRefresh = useCallback(
    async () => {
      if (isRefreshing || cooldownLeft > 0) return;
      setIsRefreshing(true);
      try {
        await fetchClientes();
        setCocherasMap({});
      } finally {
        setIsRefreshing(false);
        startCooldown();
      }
    },
    [fetchClientes, isRefreshing, cooldownLeft, startCooldown]
  );

  useEffect(() => {
    fetchClientes();
  }, [fetchClientes]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return clientes;
    return clientes.filter((c) => {
      const nombre = String(c?.nombreApellido || "").toLowerCase();
      const dni = String(c?.dniCuitCuil || "").toLowerCase();
      const email = String(c?.email || "").toLowerCase();
      const patente = String(c?.patente || "").toLowerCase();
      return (
        nombre.includes(term) ||
        dni.includes(term) ||
        email.includes(term) ||
        patente.includes(term)
      );
    });
  }, [clientes, q]);

  const showSkeleton = loading || isRefreshing;

  const buildCocheraLabel = (k) => {
    const tipo = normCocheraFront(k?.tipo) || "—";
    const piso = k?.piso ? ` • N° ${k.piso}` : "";
    const exclusiva = k?.exclusiva ? " • Exclusiva" : "";
    return `${tipo}${piso}${exclusiva}`;
  };

  const handlePickCochera = (cliente, cocheraSnap) => {
    if (!onPickCliente) return;
    const cocheraNorm = normCocheraFront(cocheraSnap?.tipo);
    const payload = {
      ...cliente,
      cochera: cocheraNorm,
      piso: cocheraSnap?.piso || "",
      exclusiva: !!cocheraSnap?.exclusiva,
      cocheraSeleccionadaId: cocheraSnap?._id || null,
    };
    onPickCliente(payload);
  };

  return (
    <div className="dca-wrap">
      <div className="dca-header">
        <input
          className="dca-search"
          placeholder="Buscar por nombre, DNI, email o patente…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          className={`dca-refresh ${isRefreshing ? "is-busy" : ""}`}
          onClick={softRefresh}
          disabled={isRefreshing || cooldownLeft > 0}
        >
          {isRefreshing
            ? "Actualizando…"
            : cooldownLeft > 0
            ? `Refrescar (${cooldownLeft})`
            : "Refrescar"}
        </button>
      </div>

      <div className="dca-tablebox">
        <table className="dca-table">
          <colgroup>
            <col style={{ width: "34%" }} />
            <col style={{ width: "18%" }} />
            <col style={{ width: "38%" }} />
            <col style={{ width: "10%" }} />
          </colgroup>

          <thead>
            <tr>
              <th>Nombre</th>
              <th>DNI/CUIT</th>
              <th>Email</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {showSkeleton ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`sk-${i}`} className="dca-skel-row">
                  <td><div className="dca-skel dca-w60" /></td>
                  <td><div className="dca-skel dca-w40" /></td>
                  <td><div className="dca-skel dca-w70" /></td>
                  <td><div className="dca-skel dca-w20" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="dca-empty">No hay clientes que coincidan.</div>
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const clienteId = c._id;
                const keyCliente = clienteId || `${c.dniCuitCuil}-${c.email}`;

                // Lazy load obligatorio para cada cliente
                if (!cocherasMap[clienteId] && !cocherasLoading[clienteId]) {
                  fetchCocherasByCliente(clienteId);
                }

                const cocheras = cocherasMap[clienteId] || [];
                const isCocheraLoading = cocherasLoading[clienteId];

                return (
                  <Fragment key={keyCliente}>
                    <tr className="dca-client-row">
                      <td>{c?.nombreApellido || "—"}</td>
                      <td>{formatDNI(c?.dniCuitCuil)}</td>
                      <td className="dca-email">{c?.email || "—"}</td>
                      <td></td>
                    </tr>

                    {isCocheraLoading ? (
                      <tr className="dca-cochera-row-empty">
                        <td></td>
                        <td></td>
                        <td className="dca-ellipsis dca-cochera-label-empty">
                          (Cargando cocheras…)
                        </td>
                        <td></td>
                      </tr>
                    ) : cocheras.length === 0 ? (
                      <tr className="dca-cochera-row-empty">
                        <td></td>
                        <td></td>
                        <td className="dca-ellipsis dca-cochera-label-empty">
                          (Sin cocheras registradas)
                        </td>
                        <td></td>
                      </tr>
                    ) : (
                      cocheras.map((k, idx) => {
                        const rowKey = k._id || `${keyCliente}-co-${idx}`;
                        return (
                          <tr key={rowKey} className="dca-cochera-row">
                            <td></td>
                            <td></td>
                            <td className="dca-ellipsis dca-cochera-label">
                              {buildCocheraLabel(k)}
                            </td>
                            <td>
                              <button
                                className="dca-pick"
                                onClick={() => handlePickCochera(c, k)}
                              >
                                <FaArrowRight />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
