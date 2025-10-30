// src/Operador/CargaMensuales/CargaMensualesDetalle.jsx
import React, { useEffect, useState } from "react";
import { FaArrowLeft, FaTrashAlt, FaEdit } from "react-icons/fa";
import "./CargaMensualesDetalle.css";
import ModalMensaje from "../ModalMensaje/ModalMensaje";

const API_BASE = "http://localhost:5000";
const API_PRECIOS = `${API_BASE}/api/precios`;
const API_CLIENTES = `${API_BASE}/api/clientes`;
const API_ABONOS = `${API_BASE}/api/abonos`;
const API_VEHICULOS = `${API_BASE}/api/vehiculos`;

export default function CargaMensualesDetalle({ clienteId, volver }) {
  const [cliente, setCliente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [vehiculoExpandido, setVehiculoExpandido] = useState(null);

  // Modales
  const [modalFotoUrl, setModalFotoUrl] = useState(null);
  const [mensajeModal, setMensajeModal] = useState(null);

  // Editar cliente
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editForm, setEditForm] = useState({
    nombreApellido: "",
    dniCuitCuil: "",
    email: "",
    domicilio: "",
    localidad: "",
    domicilioTrabajo: "",
    telefonoParticular: "",
    telefonoEmergencia: "",
    telefonoTrabajo: "",
  });

  // Editar vehículo (en realidad actualiza ABONO)
  const [vehEditOpen, setVehEditOpen] = useState(false);
  const [vehEditSaving, setVehEditSaving] = useState(false);
  const [vehEditError, setVehEditError] = useState("");
  const [vehEditAbonoId, setVehEditAbonoId] = useState(null);
  const [vehEditForm, setVehEditForm] = useState({
    patente: "",
    marca: "",
    modelo: "",
    anio: "",
    color: "",
    tipoVehiculo: "",
    companiaSeguro: "",
  });

  // Confirmar baja vehículo
  const [confirmDel, setConfirmDel] = useState(null); // { abonoId, patente }

  /* =================== Helpers de estado de abono =================== */
  const obtenerFinAbono = (cli) => {
    if (!cli) return null;
    let fin = cli.finAbono ? new Date(cli.finAbono) : null;
    if ((!fin || isNaN(fin)) && Array.isArray(cli.abonos) && cli.abonos.length) {
      for (const a of cli.abonos) {
        if (a && a.fechaExpiracion) {
          const f = new Date(a.fechaExpiracion);
          if (!isNaN(f) && (!fin || f > fin)) fin = f;
        }
      }
    }
    return fin || null;
  };

  const esAbonoActivo = (cli) => {
    const fin = obtenerFinAbono(cli);
    if (!fin) return false;
    const ahora = new Date();
    return fin >= ahora;
  };

  /* =================== Carga cliente =================== */
  const cargarCliente = async () => {
    try {
      if (!clienteId) {
        setError("No se proporcionó un ID de cliente");
        return;
      }
      const response = await fetch(`${API_CLIENTES}/id/${clienteId}`, {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || "Error al cargar cliente");
      }
      const data = await response.json();
      setCliente(data);
      setError(null);
    } catch (err) {
      console.error("Error al cargar cliente:", err);
      setError(err.message || "Error al cargar el cliente");
      setCliente(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargarCliente(); }, [clienteId]);

  useEffect(() => {
    const interval = setInterval(() => { cargarCliente(); }, 15000);
    return () => clearInterval(interval);
  }, []);

  /* =================== Formateos y labels =================== */
  const formatearFechaCorta = (fechaISO) => {
    if (!fechaISO) return "—";
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, "0");
    const mes = (fecha.getMonth() + 1).toString().padStart(2, "0");
    const anio = fecha.getFullYear().toString().slice(-2);
    return `${dia}/${mes}/${anio}`;
  };

  const capitalizeFirstLetter = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : "—";

  const normalize = (s) => (s || "")
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const getCocheraLabel = (cli) => {
    if (!cli) return null;
    const cocheraRaw = cli.cochera ?? cli.abonos?.[0]?.cochera ?? "";
    const exclusivaRaw = (typeof cli.exclusiva === "boolean") ? cli.exclusiva : !!cli.abonos?.[0]?.exclusiva;

    const c = normalize(cocheraRaw);
    if (c === "movil" || c === "móvil") return "COCHERA MÓVIL";
    if (c === "fija") return exclusivaRaw ? "COCHERA EXCLUSIVA" : "COCHERA FIJA";
    return null;
  };

  const getPisoFromCliente = (cli) => {
    if (!cli) return null;
    const directo = (cli.piso ?? cli.pisoAbono);
    if (directo !== undefined && directo !== null && directo !== "") return String(directo);
    if (Array.isArray(cli.abonos) && cli.abonos.length) {
      const withPiso = cli.abonos.find(a => a && a.piso !== undefined && a.piso !== null && a.piso !== "");
      if (withPiso) return String(withPiso.piso);
    }
    return null;
  };

  /* =================== Fotos documentos =================== */
  const abrirFoto = (abono, tipoFoto) => {
    const camposValidos = {
      dni: "fotoDNI",
      seguro: "fotoSeguro",
      cedulaVerde: "fotoCedulaVerde",
      cedulaAzul: "fotoCedulaAzul",
    };
    const campo = camposValidos[tipoFoto];
    if (!campo) {
      setMensajeModal({
        titulo: "Error",
        mensaje: "Tipo de foto desconocido",
        onClose: () => setMensajeModal(null)
      });
      return;
    }
    const nombre = abono[campo];
    if (!nombre || nombre === "") {
      setMensajeModal({
        titulo: "Aviso",
        mensaje: "No hay foto disponible",
        onClose: () => setMensajeModal(null)
      });
      return;
    }
    const raw = decodeURIComponent(nombre).trim();
    let rutaFoto;
    if (/^https?:\/\//i.test(raw)) {
      rutaFoto = raw;
    } else if (raw.startsWith("/uploads/")) {
      rutaFoto = `${API_BASE}${raw}`;
    } else if (raw.startsWith("/fotos/")) {
      rutaFoto = `${API_BASE}/uploads${raw}`;
    } else {
      rutaFoto = `${API_BASE}/uploads/fotos/${raw}`;
    }
    const urlConTimestamp = `${rutaFoto}?t=${Date.now()}`;
    setModalFotoUrl(urlConTimestamp);
  };
  const cerrarModalFoto = () => setModalFotoUrl(null);

  /* =================== Editar datos del cliente =================== */
  const openEditModal = () => {
    if (!cliente) return;
    setEditError("");
    setEditForm({
      nombreApellido: cliente.nombreApellido || "",
      dniCuitCuil: cliente.dniCuitCuil || "",
      email: cliente.email || "",
      domicilio: cliente.domicilio || "",
      localidad: cliente.localidad || "",
      domicilioTrabajo: cliente.domicilioTrabajo || "",
      telefonoParticular: cliente.telefonoParticular || "",
      telefonoEmergencia: cliente.telefonoEmergencia || "",
      telefonoTrabajo: cliente.telefonoTrabajo || "",
    });
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const validateEdit = () => {
    if (!editForm.nombreApellido.trim()) return "El nombre y apellido es obligatorio.";
    if (!editForm.dniCuitCuil.trim()) return "El DNI/CUIT/CUIL es obligatorio.";
    if (editForm.email && !/^\S+@\S+\.\S+$/.test(editForm.email)) return "Email inválido.";
    const telOk = (t) => !t || /^[0-9+\s()-]{6,}$/.test(t);
    if (!telOk(editForm.telefonoParticular)) return "Teléfono particular inválido.";
    if (!telOk(editForm.telefonoEmergencia)) return "Teléfono de emergencia inválido.";
    if (!telOk(editForm.telefonoTrabajo)) return "Teléfono de trabajo inválido.";
    return "";
  };

  const saveEdit = async () => {
    const v = validateEdit();
    if (v) { setEditError(v); return; }
    try {
      setEditSaving(true);
      setEditError("");
      const res = await fetch(`${API_CLIENTES}/${clienteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(editForm),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "No se pudo actualizar el cliente");
      setEditOpen(false);
      setMensajeModal({
        titulo: "Guardado",
        mensaje: "Cliente actualizado correctamente.",
        onClose: async () => {
          setMensajeModal(null);
          await cargarCliente();
        }
      });
    } catch (err) {
      console.error(err);
      setEditError(err.message || "Error inesperado al actualizar");
    } finally {
      setEditSaving(false);
    }
  };

  /* =================== Editar / Eliminar vehículo -> ABONOS =================== */
  const openEditVehiculo = (abono) => {
    if (!abono) return;
    setVehEditError("");
    setVehEditAbonoId(abono._id);
    setVehEditForm({
      patente: abono.patente || "",
      marca: abono.marca || "",
      modelo: abono.modelo || "",
      anio: abono.anio || "",
      color: abono.color || "",
      tipoVehiculo: abono.tipoVehiculo || "",
      companiaSeguro: abono.companiaSeguro || "",
    });
    setVehEditOpen(true);
  };

  const handleVehEditChange = (e) => {
    const { name, value } = e.target;
    setVehEditForm(prev => ({ ...prev, [name]: value }));
  };

  const validateVehEdit = () => {
    if (!vehEditForm.patente.trim()) return "La patente es obligatoria.";
    if (!vehEditForm.tipoVehiculo.trim()) return "El tipo de vehículo es obligatorio.";
    if (vehEditForm.anio && !/^\d{4}$/.test(String(vehEditForm.anio))) return "Año inválido (formato 4 dígitos).";
    return "";
  };

  const saveVehiculo = async () => {
    const v = validateVehEdit();
    if (v) { setVehEditError(v); return; }
    if (!vehEditAbonoId) {
      setVehEditError("No se pudo identificar el abono/vehículo a editar.");
      return;
    }
    try {
      setVehEditSaving(true);
      setVehEditError("");

      const payload = {
        patente: (vehEditForm.patente || "").toUpperCase(),
        marca: vehEditForm.marca || "",
        modelo: vehEditForm.modelo || "",
        anio: vehEditForm.anio ? Number(vehEditForm.anio) : undefined,
        color: vehEditForm.color || "",
        tipoVehiculo: vehEditForm.tipoVehiculo || "",
        companiaSeguro: vehEditForm.companiaSeguro || "",
      };
      const res = await fetch(`${API_ABONOS}/${vehEditAbonoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.msg || data?.message || "No se pudo actualizar el vehículo");
      }

      // Sync vehículo desde abono
      try {
        const syncRes = await fetch(`${API_VEHICULOS}/sync-from-abono/${vehEditAbonoId}`, {
          method: "PATCH",
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (!syncRes.ok) {
          let syncErrBody = {};
          try { syncErrBody = await syncRes.json(); } catch (_) {}
          if (syncRes.status === 409) {
            setVehEditError(syncErrBody?.msg || "Ya existe un vehículo con esa patente. Elegí otra.");
          } else {
            setVehEditError(syncErrBody?.msg || "No se pudo sincronizar el vehículo. Intentá nuevamente.");
          }
          return;
        }
      } catch (syncErr) {
        console.error("Error sync vehiculo:", syncErr);
        setVehEditError("Se guardó el abono, pero hubo un error al sincronizar el vehículo.");
        return;
      }

      setVehEditOpen(false);
      setMensajeModal({
        titulo: "Guardado",
        mensaje: "Vehículo/Abono actualizado correctamente.",
        onClose: async () => {
          setMensajeModal(null);
          await cargarCliente();
        }
      });
    } catch (err) {
      console.error(err);
      setVehEditError(err.message || "Error inesperado al actualizar");
    } finally {
      setVehEditSaving(false);
    }
  };

  const askDeleteVehiculo = (abono) => {
    setConfirmDel({ abonoId: abono._id, patente: abono.patente || "" });
  };

  const deleteVehiculo = async () => {
    if (!confirmDel?.abonoId) return;
    try {
      // Desactivar abono
      const res1 = await fetch(`${API_ABONOS}/${confirmDel.abonoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ activo: false })
      });
      const data1 = await res1.json().catch(() => ({}));
      if (!res1.ok) throw new Error(data1?.msg || data1?.message || "No se pudo desactivar el abono");

      // Desabonarlo en Vehículos y desvincular de cliente
      const res2 = await fetch(`${API_VEHICULOS}/${encodeURIComponent(confirmDel.patente)}/abonado`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ abonado: false, detachFromCliente: true })
      });
      const data2 = await res2.json().catch(() => ({}));
      if (!res2.ok) throw new Error(data2?.msg || data2?.message || "No se pudo actualizar el vehículo");

      // Desvincular id vehículo del abono (opcional)
      fetch(`${API_ABONOS}/${confirmDel.abonoId}/vehiculo`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({ vehiculoId: null })
      }).catch(() => {});

      // Optimistic UI
      setCliente(prev => {
        if (!prev) return prev;
        const nuevo = { ...prev };
        if (Array.isArray(nuevo.abonos)) {
          nuevo.abonos = nuevo.abonos.filter(a => a && a._id !== confirmDel.abonoId);
        }
        if (Array.isArray(nuevo.vehiculos)) {
          nuevo.vehiculos = nuevo.vehiculos.filter(v => v && v.patente !== confirmDel.patente);
        }
        return nuevo;
      });

      setConfirmDel(null);
      setMensajeModal({
        titulo: "Vehículo dado de baja",
        mensaje: "Se desactivó el abono y se quitó el vehículo del listado.",
        onClose: async () => {
          setMensajeModal(null);
          await cargarCliente();
        }
      });
    } catch (err) {
      console.error(err);
      setMensajeModal({
        titulo: "Error",
        mensaje: err.message || "Error al dar de baja el vehículo",
        onClose: () => setMensajeModal(null)
      });
    }
  };

  /* =================== Render =================== */
  if (cargando) {
    return (
      <div className="cmdet-scope">
        <div className="cmdet-header">
          <button className="cmdet-btn-ghost" onClick={volver}><FaArrowLeft /> <span>Volver</span></button>
          <h2 className="cmdet-title">Cargando…</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cmdet-scope">
        <div className="cmdet-header">
          <button className="cmdet-btn-ghost" onClick={volver}><FaArrowLeft /> <span>Volver</span></button>
          <h2 className="cmdet-title">Error</h2>
        </div>
        <div className="cmdet-card">
          <div className="cmdet-error">{error}</div>
          <div className="cmdet-muted">ID del cliente: {clienteId}</div>
        </div>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="cmdet-scope">
        <div className="cmdet-header">
          <button className="cmdet-btn-ghost" onClick={volver}><FaArrowLeft /> <span>Volver</span></button>
          <h2 className="cmdet-title">Cliente no encontrado</h2>
        </div>
        <div className="cmdet-card">
          <div>No se encontró ningún cliente con el ID: {clienteId}</div>
        </div>
      </div>
    );
  }

  const finDerivado = obtenerFinAbono(cliente);
  const abonoActivo = esAbonoActivo(cliente);
  const cocheraLabel = getCocheraLabel(cliente);
  const piso = getPisoFromCliente(cliente);
  const abonosActivos = Array.isArray(cliente.abonos)
    ? cliente.abonos.filter(a => a && a.activo !== false)
    : [];

  return (
    <div className="cmdet-scope">
      <div className="cmdet-header">
        <button className="cmdet-btn-ghost" onClick={volver}><FaArrowLeft /> <span>Volver</span></button>
        <div className="cmdet-header-right">
          <h2 className="cmdet-title">{cliente.nombreApellido}</h2>
          {piso && (
            <span className="cmdet-pill">N° de Cochera: {piso}</span>
          )}
          <button className="cmdet-btn-primary" onClick={openEditModal}>Editar</button>
        </div>
      </div>

      <div className={`cmdet-status ${abonoActivo ? "is-active" : "is-inactive"}`}>
        {abonoActivo ? (
          <>
            <span className="cmdet-status-text">ABONADO HASTA</span>
            <span className="cmdet-status-date">{formatearFechaCorta(finDerivado)}</span>
          </>
        ) : (
          <span className="cmdet-status-text">ABONO EXPIRADO</span>
        )}
      </div>

      <div className="cmdet-card">
        <div className="cmdet-veh-header">
          <h3>Vehículos ({abonosActivos.length})</h3>
          {cocheraLabel && (
            <span className={`cmdet-cochera-badge ${
              cocheraLabel.includes("EXCLUSIVA") ? "exclusiva" :
              cocheraLabel.includes("FIJA") ? "fija" : "movil"
            }`}>
              {cocheraLabel}
            </span>
          )}
        </div>

        {abonosActivos.length > 0 ? (
          <table className="cmdet-table">
            <thead>
              <tr>
                <th>Patente</th>
                <th>Marca</th>
                <th>Modelo</th>
                <th>Año</th>
                <th>Tipo</th>
              </tr>
            </thead>
            <tbody>
              {abonosActivos.map((abono) => {
                const expandido = vehiculoExpandido === abono._id;
                return (
                  <React.Fragment key={abono._id}>
                    <tr
                      onClick={() => setVehiculoExpandido(prev => prev === abono._id ? null : abono._id)}
                      className="cmdet-row"
                    >
                      <td>{abono.patente?.toUpperCase() || "—"}</td>
                      <td>{capitalizeFirstLetter(abono.marca)}</td>
                      <td>{capitalizeFirstLetter(abono.modelo)}</td>
                      <td>{abono.anio || "—"}</td>
                      <td>{capitalizeFirstLetter(abono.tipoVehiculo)}</td>
                    </tr>
                    {expandido && (
                      <tr className="cmdet-row-expanded">
                        <td colSpan="5">
                          <div className="cmdet-expanded">
                            <div className="cmdet-left">
                              <div className="cmdet-kv">
                                <p><strong>Color:</strong> {capitalizeFirstLetter(abono.color)}</p>
                                <p><strong>Seguro:</strong> {capitalizeFirstLetter(abono.companiaSeguro)}</p>
                              </div>
                              <div className="cmdet-docs">
                                <button onClick={() => abrirFoto(abono, "dni")}>DNI</button>
                                <button onClick={() => abrirFoto(abono, "seguro")}>Seguro</button>
                                <button onClick={() => abrirFoto(abono, "cedulaVerde")}>Céd. Verde</button>
                              </div>
                            </div>
                            <div className="cmdet-right">
                              <div className="cmdet-actions">
                                <button
                                  className="cmdet-btn-action edit"
                                  onClick={(e) => { e.stopPropagation(); openEditVehiculo(abono); }}
                                  title="Editar vehículo"
                                >
                                  <FaEdit /> <span>Editar</span>
                                </button>
                                {/* <button
                                  className="cmdet-btn-action del"
                                  onClick={(e) => { e.stopPropagation(); askDeleteVehiculo(abono); }}
                                  title="Eliminar vehículo"
                                >
                                  <FaTrashAlt /> <span>Eliminar</span>
                                </button> */}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="cmdet-empty">No hay vehículos registrados para este cliente.</div>
        )}
      </div>

      {/* Modal foto */}
      {modalFotoUrl && (
        <div className="cmdet-photo-overlay" onClick={cerrarModalFoto}>
          <div className="cmdet-photo-content" onClick={(e) => e.stopPropagation()}>
            <button className="cmdet-modal-close" onClick={cerrarModalFoto}>&times;</button>
            <img
              src={modalFotoUrl}
              alt="Documento del cliente"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "";
                setMensajeModal({
                  titulo: "Error",
                  mensaje: "No se pudo cargar la imagen. Por favor intente nuevamente.",
                  onClose: () => {
                    setMensajeModal(null);
                    cerrarModalFoto();
                  }
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de mensajes */}
      {mensajeModal && (
        <ModalMensaje
          titulo={mensajeModal.titulo}
          mensaje={mensajeModal.mensaje}
          onClose={mensajeModal.onClose}
        />
      )}

      {/* Modal Edición cliente */}
      {editOpen && (
        <ModalMensaje
          titulo="Editar Cliente"
          mensaje="Modificá los datos y guardá."
          onClose={() => setEditOpen(false)}
        >
          <div className="cmdet-edit-form">
            <div className="cmdet-grid2">
              <div className="form-item">
                <label>Nombre y Apellido</label>
                <input name="nombreApellido" type="text" value={editForm.nombreApellido} onChange={handleEditChange} autoFocus />
              </div>
              <div className="form-item">
                <label>DNI / CUIT / CUIL</label>
                <input name="dniCuitCuil" type="text" value={editForm.dniCuitCuil} onChange={handleEditChange} />
              </div>
              <div className="form-item">
                <label>Email</label>
                <input name="email" type="email" value={editForm.email} onChange={handleEditChange} />
              </div>
              <div className="form-item">
                <label>Localidad</label>
                <input name="localidad" type="text" value={editForm.localidad} onChange={handleEditChange} />
              </div>
              <div className="form-item">
                <label>Domicilio</label>
                <input name="domicilio" type="text" value={editForm.domicilio} onChange={handleEditChange} />
              </div>
              <div className="form-item">
                <label>Domicilio de Trabajo</label>
                <input name="domicilioTrabajo" type="text" value={editForm.domicilioTrabajo} onChange={handleEditChange} />
              </div>
              <div className="form-item">
                <label>Tel. Particular</label>
                <input name="telefonoParticular" type="text" value={editForm.telefonoParticular} onChange={handleEditChange} />
              </div>
              <div className="form-item">
                <label>Tel. Emergencia</label>
                <input name="telefonoEmergencia" type="text" value={editForm.telefonoEmergencia} onChange={handleEditChange} />
              </div>
              <div className="form-item">
                <label>Tel. Trabajo</label>
                <input name="telefonoTrabajo" type="text" value={editForm.telefonoTrabajo} onChange={handleEditChange} />
              </div>
            </div>
            {editError && <div className="cmdet-form-error">{editError}</div>}
            <div className="cmdet-edit-actions">
              <button className="cmdet-btn-ghost" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancelar</button>
              <button className="cmdet-btn-primary" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>
        </ModalMensaje>
      )}

      {/* Modal Edición vehículo */}
      {vehEditOpen && (
        <ModalMensaje
          titulo="Editar Vehículo"
          mensaje="Actualizá los datos del vehículo."
          onClose={() => setVehEditOpen(false)}
        >
          <div className="cmdet-edit-form">
            <div className="cmdet-grid2">
              <div className="form-item">
                <label>Patente</label>
                <input name="patente" type="text" value={vehEditForm.patente} onChange={handleVehEditChange} />
              </div>
              <div className="form-item">
                <label>Marca</label>
                <input name="marca" type="text" value={vehEditForm.marca} onChange={handleVehEditChange} />
              </div>
              <div className="form-item">
                <label>Modelo</label>
                <input name="modelo" type="text" value={vehEditForm.modelo} onChange={handleVehEditChange} />
              </div>
              <div className="form-item">
                <label>Año</label>
                <input name="anio" type="text" value={vehEditForm.anio} onChange={handleVehEditChange} placeholder="Ej: 2016" />
              </div>
              <div className="form-item">
                <label>Color</label>
                <input name="color" type="text" value={vehEditForm.color} onChange={handleVehEditChange} />
              </div>
              <div className="form-item">
                <label>Tipo de Vehículo</label>
                <input name="tipoVehiculo" type="text" value={vehEditForm.tipoVehiculo} onChange={handleVehEditChange} placeholder="Auto / Camioneta / Moto" />
              </div>
              <div className="form-item">
                <label>Compañía de Seguro</label>
                <input name="companiaSeguro" type="text" value={vehEditForm.companiaSeguro} onChange={handleVehEditChange} />
              </div>
            </div>
            {vehEditError && <div className="cmdet-form-error">{vehEditError}</div>}
            <div className="cmdet-edit-actions">
              <button className="cmdet-btn-ghost" onClick={() => setVehEditOpen(false)} disabled={vehEditSaving}>Cancelar</button>
              <button className="cmdet-btn-primary" onClick={saveVehiculo} disabled={vehEditSaving}>
                {vehEditSaving ? "Guardando..." : "Guardar vehículo"}
              </button>
            </div>
          </div>
        </ModalMensaje>
      )}

      {/* Confirmar baja vehículo */}
      {confirmDel && (
        <ModalMensaje
          titulo="Eliminar Vehículo"
          mensaje={`¿Seguro que querés dar de baja el vehículo ${confirmDel.patente || ""}? Esta acción lo quitará del abono y dejará de figurar como abonado.`}
          onClose={() => setConfirmDel(null)}
        >
          <div className="cmdet-confirm-actions">
            <button className="cmdet-btn-ghost" onClick={() => setConfirmDel(null)} disabled={vehEditSaving}>Cancelar</button>
            <button className="cmdet-btn-danger" onClick={deleteVehiculo} disabled={vehEditSaving}>
              Dar de baja
            </button>
          </div>
        </ModalMensaje>
      )}
    </div>
  );
}
