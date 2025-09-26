import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ModalVehiculoCajero.css";
import ModalMensaje from "../ModalMensaje/ModalMensaje";

const API = "http://localhost:5000";

const ModalVehiculoCajero = ({
  visible,
  onClose,
  onGuardarExitoso,
  formData,
  setFormData,
  loading,
  cliente,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tiposVehiculo, setTiposVehiculo] = useState([]);
  const [precios, setPrecios] = useState({});
  const [tiposLoading, setTiposLoading] = useState(false);
  const [tiposError, setTiposError] = useState(null);
  const [user, setUser] = useState(null);

  // ⚠️ Reemplazo de preview del back: calculamos local
  const [showDiferenciaModal, setShowDiferenciaModal] = useState(false);
  const [pagoDiferenciaData, setPagoDiferenciaData] = useState({ metodoPago: "", factura: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [mensajeModal, setMensajeModal] = useState(null);

  const navigate = useNavigate();

  const metodosPago = ["Efectivo", "Transferencia", "Débito", "Crédito", "QR"];
  const tiposFactura = ["CC", "A", "Final"];

  const formatARS = (n) => {
    if (typeof n !== "number" || Number.isNaN(n)) return "—";
    try {
      return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
    } catch {
      return String(n);
    }
  };
  const capitalizar = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

  // ====== Helpers cálculo local (idéntico a back) ======
  const getBaseMensualFront = (tipo) => {
    const key = String(tipo || "").toLowerCase();
    const cfg = precios?.[key];
    if (cfg && typeof cfg.mensual === "number") return cfg.mensual;
    // fallback de seguridad (no debería usarse porque cargamos /api/precios)
    const FALLBACK = { auto: 100000, camioneta: 160000, moto: 50000 };
    return FALLBACK[key] ?? 100000;
  };
  const getUltimoDiaMesFront = (hoy = new Date()) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    d.setHours(23, 59, 59, 999);
    return d;
  };
  const prorratearMontoFront = (base, hoy = new Date()) => {
    const ultimo = getUltimoDiaMesFront(hoy);
    const total = ultimo.getDate();
    const dia = hoy.getDate();
    const diasRestantes = dia === 1 ? total : total - dia + 1;
    const factor = diasRestantes / total;
    const proporcional = Math.round(base * factor);
    return { proporcional, diasRestantes: diasRestantes, totalDiasMes: total, factor };
  };

  // ====== Usuario (token/profile) ======
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }
      try {
        const response = await fetch(`${API}/api/auth/profile`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        if (response.ok) {
          setUser(data);
        } else if (response.status === 401) {
          localStorage.removeItem("token");
          navigate("/login");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setErrorMessage("Error al verificar usuario. Intente nuevamente.");
      }
    };
    if (visible) fetchUser();
  }, [visible, navigate]);

  // ====== Cargar tipos y precios ======
  useEffect(() => {
    if (!visible) return;
    const fetchData = async () => {
      setTiposLoading(true);
      setTiposError(null);
      try {
        const [tiposRes, preciosRes] = await Promise.all([
          fetch(`${API}/api/tipos-vehiculo`),
          fetch(`${API}/api/precios`),
        ]);
        if (!tiposRes.ok) throw new Error("Error al obtener tipos de vehículo");
        if (!preciosRes.ok) throw new Error("Error al obtener precios");

        const [tiposData, preciosData] = await Promise.all([
          tiposRes.json(),
          preciosRes.json(),
        ]);

        setTiposVehiculo(Array.isArray(tiposData) ? tiposData : []);
        setPrecios(preciosData || {});
      } catch (error) {
        console.error("Error fetching data:", error);
        setTiposError("No se pudieron cargar los datos necesarios");
      } finally {
        setTiposLoading(false);
      }
    };
    fetchData();
  }, [visible]);

  // ====== Cálculo local de diferencia cuando cambian inputs ======
  const checkUpgradeAndMaybeAsk = (nuevoTipo) => {
    if (!cliente || !cliente._id) return; // sin cliente, no corresponde aviso
    const tierActual = String(cliente?.precioAbono || "").toLowerCase();
    if (!tierActual) return; // sin tier actual => alta inicial (sin aviso)

    const baseActual = getBaseMensualFront(tierActual);
    const baseNuevo = getBaseMensualFront(nuevoTipo);
    if (baseNuevo > baseActual) {
      // hay upgrade
      const diffBase = baseNuevo - baseActual;
      const { proporcional } = prorratearMontoFront(diffBase);

      // abrimos modal de diferencia si método/factura no están listos
      if (!formData.metodoPago || !formData.factura) {
        setPagoDiferenciaData((prev) => ({
          metodoPago: prev.metodoPago || "",
          factura: prev.factura || "",
        }));
        setShowDiferenciaModal(true);
      }

      // guardamos valores de diferencia en formData temporalmente, por si querés usarlos
      setFormData((prev) => ({
        ...prev,
        __diffBase__: diffBase,
        __proporcional__: proporcional,
      }));
    } else {
      // no hay upgrade
      setShowDiferenciaModal(false);
      setFormData((prev) => {
        const clone = { ...prev };
        delete clone.__diffBase__;
        delete clone.__proporcional__;
        return clone;
      });
    }
  };

  const onInputChange = (e) => {
    const { name, type, files, value } = e.target;
    if (type === "file") {
      setFormData((prev) => ({ ...prev, [name]: files[0] || null }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (name === "tipoVehiculo") {
        checkUpgradeAndMaybeAsk(value);
      }
    }
  };

  const onPagoDiferenciaChange = (e) => {
    const { name, value } = e.target;
    setPagoDiferenciaData((prev) => ({ ...prev, [name]: value }));
  };

  const handleConfirmarPagoDiferencia = () => {
    if (!pagoDiferenciaData.metodoPago) {
      setErrorMessage("Debe seleccionar un método de pago");
      return;
    }
    if (!pagoDiferenciaData.factura) {
      setErrorMessage("Debe seleccionar un tipo de factura");
      return;
    }
    setFormData((prev) => ({
      ...prev,
      metodoPago: pagoDiferenciaData.metodoPago,
      factura: pagoDiferenciaData.factura,
    }));
    setShowDiferenciaModal(false);
    setErrorMessage("");
  };

  const handleCancelarPagoDiferencia = () => {
    setShowDiferenciaModal(false);
    setErrorMessage("");
  };

  // ====== Submit ======
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!user || !user.nombre) {
      setErrorMessage("No se pudo verificar el usuario. Por favor, inicie sesión nuevamente.");
      return;
    }

    const patente = formData.patente?.toUpperCase()?.trim() || "";
    const patenteRegex = /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/;
    if (!patenteRegex.test(patente)) {
      setErrorMessage("Patente inválida. Formato aceptado: ABC123 o AB123CD");
      return;
    }
    if (!formData.tipoVehiculo) {
      setErrorMessage("Debe seleccionar un tipo de vehículo");
      return;
    }
    if (!cliente || !cliente._id) {
      setErrorMessage("No se pudo identificar al cliente");
      return;
    }

    // Rechequear upgrade en el momento del submit
    const tierActual = String(cliente?.precioAbono || "").toLowerCase();
    if (tierActual) {
      const baseActual = getBaseMensualFront(tierActual);
      const baseNuevo = getBaseMensualFront(formData.tipoVehiculo);
      if (baseNuevo > baseActual && (!formData.metodoPago || !formData.factura)) {
        // falta completar medio/factura para la diferencia -> abrimos modal
        setShowDiferenciaModal(true);
        return;
      }
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Asegurar existencia del vehículo
      const vehiculosRes = await fetch(`${API}/api/vehiculos`);
      if (!vehiculosRes.ok) throw new Error("No se pudieron obtener los vehículos");
      const vehiculos = await vehiculosRes.json();
      const vehiculoExistente = vehiculos.find(
        (v) => (v.patente || "").toUpperCase() === patente
      );

      if (!vehiculoExistente) {
        const crearRes = await fetch(`${API}/api/vehiculos/sin-entrada`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ patente, tipoVehiculo: formData.tipoVehiculo }),
        });
        if (!crearRes.ok) {
          const errorData = await crearRes.json().catch(() => ({}));
          throw new Error(errorData.message || "Error al crear vehículo");
        }
      }

      // Armamos FormData para alta
      const abonoFormData = new FormData();
      abonoFormData.append("clienteId", cliente._id);
      abonoFormData.append("nombreApellido", cliente?.nombreApellido || "");
      abonoFormData.append("domicilio", cliente?.domicilio || "");
      abonoFormData.append("localidad", cliente?.localidad || "");
      abonoFormData.append("telefonoParticular", cliente?.telefonoParticular || "");
      abonoFormData.append("telefonoEmergencia", cliente?.telefonoEmergencia || "");
      abonoFormData.append("domicilioTrabajo", cliente?.domicilioTrabajo || "");
      abonoFormData.append("telefonoTrabajo", cliente?.telefonoTrabajo || "");
      abonoFormData.append("email", cliente?.email || "");
      abonoFormData.append("dniCuitCuil", cliente?.dniCuitCuil || "");
      abonoFormData.append("patente", patente);
      abonoFormData.append("marca", formData.marca || "");
      abonoFormData.append("modelo", formData.modelo || "");
      abonoFormData.append("color", formData.color || "");
      abonoFormData.append("anio", formData.anio || "");
      abonoFormData.append("companiaSeguro", formData.companiaSeguro || "");
      abonoFormData.append("tipoVehiculo", formData.tipoVehiculo || "");
      abonoFormData.append("metodoPago", formData.metodoPago || "Efectivo");
      abonoFormData.append("factura", formData.factura || "CC");
      if (formData.fotoSeguro) abonoFormData.append("fotoSeguro", formData.fotoSeguro);
      if (formData.fotoDNI) abonoFormData.append("fotoDNI", formData.fotoDNI);
      if (formData.fotoCedulaVerde) abonoFormData.append("fotoCedulaVerde", formData.fotoCedulaVerde);

      const abonoRes = await fetch(`${API}/api/abonos/agregar-abono`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        body: abonoFormData,
      });

      const abonoData = await abonoRes.json().catch(() => ({}));
      if (!abonoRes.ok) throw new Error(abonoData.message || "Error al registrar abono");

      // Reset
      setFormData({
        patente: "",
        marca: "",
        modelo: "",
        color: "",
        anio: "",
        companiaSeguro: "",
        tipoVehiculo: "",
        metodoPago: "",
        factura: "",
        fotoSeguro: null,
        fotoDNI: null,
        fotoCedulaVerde: null,
      });
      setPagoDiferenciaData({ metodoPago: "", factura: "" });

      setMensajeModal({
        titulo: "Éxito",
        mensaje: abonoData?.message || "¡Abono registrado correctamente!",
        onClose: () => {
          setMensajeModal(null);
          if (onGuardarExitoso) onGuardarExitoso();
          onClose();
        },
      });
    } catch (err) {
      console.error("Error en handleSubmit:", err);
      setErrorMessage(
        err.message || "Error al registrar el abono. Por favor, intente nuevamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!visible) return null;

  const renderFileInput = (label, name) => {
    const archivoCargado = formData[name] != null;
    return (
      <div className="modal-vehiculo-file-input">
        <label className="file-visible-label">{label}</label>
        <label className="file-label">
          <div className="icon-wrapper">📷</div>
          {archivoCargado ? (
            <div className="file-uploaded">✅</div>
          ) : (
            <div className="file-text">
              <span>Seleccionar</span>
              <span>Imagen</span>
            </div>
          )}
          <input
            type="file"
            name={name}
            accept="image/*"
            onChange={onInputChange}
            style={{ display: "none" }}
          />
        </label>
      </div>
    );
  };

  // ====== UI ======
  return (
    <>
      <div className="modal-vehiculo-overlay" onClick={onClose}>
        <div className="modal-vehiculo-content" onClick={(e) => e.stopPropagation()}>
          <form className="modal-vehiculo-form" onSubmit={handleSubmit}>
            {errorMessage && <div className="modal-error-message">{errorMessage}</div>}

            {/* Se removió el bannerPreview que mezclaba mensajes del back */}

            <div className="modal-vehiculo-image-row">
              {renderFileInput("Foto Seguro", "fotoSeguro")}
              {renderFileInput("Foto DNI", "fotoDNI")}
              {renderFileInput("Foto Céd. Verde", "fotoCedulaVerde")}
            </div>

            <div className="modal-vehiculo-form-group grid-2">
              <input
                className="modal-vehiculo-input"
                name="patente"
                placeholder="Patente"
                value={formData.patente || ""}
                onChange={(e) =>
                  setFormData({ ...formData, patente: e.target.value.toUpperCase() })
                }
                maxLength={8}
                required
              />
              <input
                className="modal-vehiculo-input"
                name="marca"
                placeholder="Marca"
                value={formData.marca || ""}
                onChange={onInputChange}
              />
              <input
                className="modal-vehiculo-input"
                name="modelo"
                placeholder="Modelo"
                value={formData.modelo || ""}
                onChange={onInputChange}
              />
              <input
                className="modal-vehiculo-input"
                name="color"
                placeholder="Color"
                value={formData.color || ""}
                onChange={onInputChange}
              />
              <input
                className="modal-vehiculo-input"
                name="anio"
                placeholder="Año"
                type="number"
                value={formData.anio || ""}
                onChange={onInputChange}
              />
              <input
                className="modal-vehiculo-input"
                name="companiaSeguro"
                placeholder="Compañía de Seguro"
                value={formData.companiaSeguro || ""}
                onChange={onInputChange}
              />

              <select
                id="tipoVehiculo"
                name="tipoVehiculo"
                value={formData.tipoVehiculo || ""}
                onChange={onInputChange}
                required
                className="modal-vehiculo-input"
                disabled={tiposLoading || !!tiposError}
              >
                <option value="" disabled>
                  {tiposLoading
                    ? "Cargando tipos de vehículo..."
                    : tiposError
                    ? "Error cargando tipos"
                    : "Seleccioná un tipo"}
                </option>
                {!tiposLoading &&
                  !tiposError &&
                  tiposVehiculo.map((tipo) => {
                    const nombre = tipo?.nombre || "";
                    const key = nombre.toLowerCase?.() ?? "";
                    const mensual = precios?.[key]?.mensual;
                    const labelPrecio =
                      typeof mensual === "number" ? `$${formatARS(mensual)}` : "N/A";
                    return (
                      <option key={nombre} value={nombre}>
                        {capitalizar(nombre)} - {labelPrecio}
                      </option>
                    );
                  })}
              </select>
            </div>

            <div className="modal-vehiculo-buttons">
              <button type="submit" disabled={loading || isSubmitting}>
                {loading || isSubmitting ? "Guardando..." : "Guardar"}
              </button>
              <button type="button" onClick={onClose} disabled={loading || isSubmitting}>
                Cerrar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal de diferencia (sólo si upgrade) */}
      {showDiferenciaModal && (() => {
        const tierActual = String(cliente?.precioAbono || "").toLowerCase();
        const baseActual = getBaseMensualFront(tierActual);
        const baseNuevo = getBaseMensualFront(formData.tipoVehiculo);
        const diffBase = Math.max(0, baseNuevo - baseActual);
        const { proporcional } = prorratearMontoFront(diffBase);

        return (
          <div className="modal-diferencia-overlay">
            <div className="modal-diferencia-content">
              <h3>Vas a meter un vehículo más caro</h3>

              <div style={{ lineHeight: 1.4, marginBottom: 10 }}>
                <div>• Diferencia mensual: ${formatARS(diffBase)}</div>
                <div>• A pagar HOY: ${formatARS(proporcional)}</div>
                <div style={{ marginTop: 8 }}>Esta diferencia cubre los días restantes del mes.</div>
              </div>

              <div className="modal-diferencia-form">
                <select
                  name="metodoPago"
                  value={pagoDiferenciaData.metodoPago}
                  onChange={onPagoDiferenciaChange}
                  required
                  className="modal-diferencia-input"
                >
                  <option value="" disabled>Método de pago</option>
                  {metodosPago.map((metodo) => (
                    <option key={metodo} value={metodo}>{metodo}</option>
                  ))}
                </select>
                <select
                  name="factura"
                  value={pagoDiferenciaData.factura}
                  onChange={onPagoDiferenciaChange}
                  required
                  className="modal-diferencia-input"
                >
                  <option value="" disabled>Tipo de factura</option>
                  {tiposFactura.map((tipo) => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              {errorMessage && <div className="modal-diferencia-error">{errorMessage}</div>}

              <div className="modal-diferencia-buttons">
                <button
                  type="button"
                  onClick={handleConfirmarPagoDiferencia}
                  className="confirmar-btn"
                >
                  Aceptar
                </button>
                <button
                  type="button"
                  onClick={handleCancelarPagoDiferencia}
                  className="cancelar-btn"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {mensajeModal && (
        <ModalMensaje
          titulo={mensajeModal.titulo}
          mensaje={mensajeModal.mensaje}
          onClose={mensajeModal.onClose}
        />
      )}
    </>
  );
};

export default ModalVehiculoCajero;
