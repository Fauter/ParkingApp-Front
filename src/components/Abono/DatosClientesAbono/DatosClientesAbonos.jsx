// DatosClientesAbonos.jsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export default function DatosClientesAbonos({
  onPickCliente, // callback(cliente)
}) {
  const [clientes, setClientes] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cooldownLeft, setCooldownLeft] = useState(0);
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

  const softRefresh = useCallback(async () => {
    if (isRefreshing || cooldownLeft > 0) return;
    setIsRefreshing(true);
    try {
      await fetchClientes();
    } finally {
      setIsRefreshing(false);
      startCooldown();
    }
  }, [fetchClientes, isRefreshing, cooldownLeft, startCooldown]);

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
          title="Refrescar lista"
        >
          {isRefreshing ? "Actualizando…" : cooldownLeft > 0 ? `Refrescar (${cooldownLeft})` : "Refrescar"}
        </button>
      </div>

      <div className="dca-tablebox">
        <table className="dca-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>DNI/CUIT</th>
              <th>Email</th>
              <th>Cochera</th>
              {/* ⛔ columna Patente removida */}
              <th style={{ width: 64 }}></th>
            </tr>
          </thead>
          <tbody>
            {showSkeleton ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={`sk-${i}`} className="dca-skel-row">
                  <td><div className="dca-skel dca-w60" /></td>
                  <td><div className="dca-skel dca-w40" /></td>
                  <td><div className="dca-skel dca-w70" /></td>
                  <td><div className="dca-skel dca-w40" /></td>
                  <td><div className="dca-skel dca-w20" /></td>
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="dca-empty">No hay clientes que coincidan.</div>
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const cochera = normCocheraFront(c?.cochera) || "—";
                const piso = c?.piso ? ` • N° ${c.piso}` : "";
                const exclusiva = c?.exclusiva ? " • Exclusiva" : "";
                return (
                  <tr key={c._id || `${c.dniCuitCuil}-${c.email}`}>
                    <td>{c?.nombreApellido || "—"}</td>
                    <td>{c?.dniCuitCuil || "—"}</td>
                    <td className="dca-ellipsis">{c?.email || "—"}</td>
                    <td>{cochera}{piso}{exclusiva}</td>
                    <td>
                      <button
                        className="dca-pick"
                        onClick={() => onPickCliente && onPickCliente(c)}
                        title="Enviar a la derecha"
                        aria-label="Enviar a la derecha"
                      >
                        <FaArrowRight />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
