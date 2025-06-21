import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./ModalVehiculoCajero.css";

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
  const [showDiferenciaModal, setShowDiferenciaModal] = useState(false);
  const [diferenciaAPagar, setDiferenciaAPagar] = useState(0);
  const [pagoDiferenciaData, setPagoDiferenciaData] = useState({
    metodoPago: "",
    factura: "",
  });
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  const metodosPago = ["Efectivo", "Débito", "Crédito", "QR"];
  const tiposFactura = ["CC", "A", "Final"];

  // Obtener usuario autenticado
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('https://api.garageia.com/api/auth/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();
        if (response.ok) {
          setUser(data);
        } else if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        setErrorMessage("Error al verificar usuario. Intente nuevamente.");
      }
    };

    if (visible) fetchUser();
  }, [visible, navigate]);

  // Obtener tipos de vehículo y precios
  useEffect(() => {
    if (!visible) return;

    const fetchData = async () => {
      setTiposLoading(true);
      setTiposError(null);
      
      try {
        const [tiposRes, preciosRes] = await Promise.all([
          fetch("https://api.garageia.com/api/tipos-vehiculo"),
          fetch("https://api.garageia.com/api/precios")
        ]);

        if (!tiposRes.ok) throw new Error("Error al obtener tipos de vehículo");
        if (!preciosRes.ok) throw new Error("Error al obtener precios");

        const [tiposData, preciosData] = await Promise.all([
          tiposRes.json(),
          preciosRes.json()
        ]);

        setTiposVehiculo(tiposData);
        setPrecios(preciosData);
      } catch (error) {
        console.error("Error fetching data:", error);
        setTiposError("No se pudieron cargar los datos necesarios");
      } finally {
        setTiposLoading(false);
      }
    };

    fetchData();
  }, [visible]);

  const calcularDiferencia = (nuevoTipo, tipoActual) => {
    if (!tipoActual || !cliente?.finAbono) return 0;

    const hoy = new Date();
    const finAbono = new Date(cliente.finAbono);
    const diffTime = Math.max(0, finAbono - hoy);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 0) return 0;

    const precioNuevo = precios[nuevoTipo]?.mensual || 0;
    const precioActual = precios[tipoActual]?.mensual || 0;
    const diferenciaDiaria = (precioNuevo - precioActual) / 30;
    
    return Math.round(diferenciaDiaria * diffDays);
  };

  const verificarDiferencia = (nuevoTipo) => {
    const tipoActual = cliente?.precioAbono;
    
    if (!tipoActual || !nuevoTipo) return false;
    if (!precios[nuevoTipo] || !precios[tipoActual]) return false;

    const precioNuevo = precios[nuevoTipo]?.mensual || 0;
    const precioActual = precios[tipoActual]?.mensual || 0;
    
    if (precioNuevo > precioActual) {
      const diferencia = calcularDiferencia(nuevoTipo, tipoActual);
      if (diferencia > 0) {
        setDiferenciaAPagar(diferencia);
        setShowDiferenciaModal(true);
        return true;
      }
    }
    return false;
  };

  const onInputChange = (e) => {
    const { name, type, files, value } = e.target;
    
    if (type === "file") {
      setFormData(prev => ({
        ...prev,
        [name]: files[0] || null,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
      
      // Verificar diferencia solo cuando cambia el tipo de vehículo
      if (name === "tipoVehiculo") {
        verificarDiferencia(value);
      }
    }
  };

  const onPagoDiferenciaChange = (e) => {
    const { name, value } = e.target;
    setPagoDiferenciaData(prev => ({
      ...prev,
      [name]: value,
    }));
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

    setFormData(prev => ({
      ...prev,
      metodoPago: pagoDiferenciaData.metodoPago,
      factura: pagoDiferenciaData.factura,
    }));

    setShowDiferenciaModal(false);
    setErrorMessage("");
  };

  const handleCancelarPagoDiferencia = () => {
    setShowDiferenciaModal(false);
    setFormData(prev => ({
      ...prev,
      tipoVehiculo: cliente?.precioAbono || "",
    }));
    setErrorMessage("");
  };

  const registrarMovimientosDiferencia = async (patente, diferencia) => {
    try {
      // Registrar movimiento general
      const movimientoData = {
        patente,
        operador: user.nombre,
        tipoVehiculo: formData.tipoVehiculo,
        metodoPago: formData.metodoPago,
        factura: formData.factura || 'Sin factura',
        monto: diferencia,
        descripcion: `Diferencia por cambio a abono más caro (${formData.tipoVehiculo})`,
        tipoTarifa: 'abono'
      };

      const movimientoRes = await fetch('https://api.garageia.com/api/movimientos/registrar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(movimientoData),
      });

      if (!movimientoRes.ok) throw new Error('Error al registrar movimiento');

      // Registrar movimiento del cliente
      const movimientoClienteData = {
        nombreApellido: cliente.nombreApellido,
        email: cliente.email || '',
        descripcion: `Diferencia por cambio a abono más caro (${formData.tipoVehiculo})`,
        monto: diferencia,
        tipoVehiculo: formData.tipoVehiculo,
        operador: user.nombre,
        patente: patente,
      };
      
      await fetch('https://api.garageia.com/api/movimientosclientes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(movimientoClienteData),
      });

    } catch (error) {
      console.error("Error al registrar movimientos:", error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Validaciones iniciales
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

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      // Verificar si el vehículo ya existe
      const vehiculosRes = await fetch("https://api.garageia.com/api/vehiculos");
      if (!vehiculosRes.ok) throw new Error("No se pudieron obtener los vehículos");
      const vehiculos = await vehiculosRes.json();

      const vehiculoExistente = vehiculos.find(v => v.patente.toUpperCase() === patente);

      // Crear vehículo si no existe
      if (!vehiculoExistente) {
        const crearRes = await fetch("https://api.garageia.com/api/vehiculos/sin-entrada", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ 
            patente, 
            tipoVehiculo: formData.tipoVehiculo 
          }),
        });

        if (!crearRes.ok) {
          const errorData = await crearRes.json().catch(() => ({}));
          throw new Error(errorData.message || "Error al crear vehículo");
        }
      }

      // Preparar datos para el abono
      const abonoFormData = new FormData();
      
      // Datos del cliente
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
      
      // Datos del vehículo
      abonoFormData.append("patente", patente);
      abonoFormData.append("marca", formData.marca || "");
      abonoFormData.append("modelo", formData.modelo || "");
      abonoFormData.append("color", formData.color || "");
      abonoFormData.append("anio", formData.anio || "");
      abonoFormData.append("companiaSeguro", formData.companiaSeguro || "");
      abonoFormData.append("tipoVehiculo", formData.tipoVehiculo || "");
      
      // Datos de pago
      abonoFormData.append("metodoPago", formData.metodoPago || "");
      abonoFormData.append("factura", formData.factura || "Sin factura");
      
      // Archivos
      if (formData.fotoSeguro) abonoFormData.append("fotoSeguro", formData.fotoSeguro);
      if (formData.fotoDNI) abonoFormData.append("fotoDNI", formData.fotoDNI);
      if (formData.fotoCedulaVerde) abonoFormData.append("fotoCedulaVerde", formData.fotoCedulaVerde);
      if (formData.fotoCedulaAzul) abonoFormData.append("fotoCedulaAzul", formData.fotoCedulaAzul);

      // Registrar el abono
      const abonoRes = await fetch("https://api.garageia.com/api/abonos/agregar-abono", {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: abonoFormData,
      });

      if (!abonoRes.ok) {
        const errorData = await abonoRes.json().catch(() => ({}));
        throw new Error(errorData.message || "Error al registrar abono");
      }

      // Actualizar precioAbono del cliente si es necesario
      if (cliente?.abonado && formData.tipoVehiculo) {
        const precioMensual = precios[formData.tipoVehiculo]?.mensual || 0;
        
        await fetch(`https://api.garageia.com/api/clientes/${cliente._id}/actualizar-precio-abono`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ 
            tipoVehiculo: formData.tipoVehiculo,
            precioMensual: precioMensual
          }),
        });
      }

      // Verificar y registrar diferencia si corresponde
      const tipoActual = cliente?.precioAbono;
      const nuevoTipo = formData.tipoVehiculo;
      
      if (tipoActual && nuevoTipo) {
        const precioNuevo = precios[nuevoTipo]?.mensual || 0;
        const precioActual = precios[tipoActual]?.mensual || 0;
        
        if (precioNuevo > precioActual) {
          const diferencia = calcularDiferencia(nuevoTipo, tipoActual);
          
          if (diferencia > 0 && formData.metodoPago && formData.factura) {
            await registrarMovimientosDiferencia(patente, diferencia);
          }
        }
      }

      // Éxito - resetear formulario
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
        fotoCedulaAzul: null,
      });

      setPagoDiferenciaData({
        metodoPago: "",
        factura: "",
      });

      alert("¡Abono registrado correctamente!");
      if (onGuardarExitoso) onGuardarExitoso();
      onClose();
    } catch (err) {
      console.error("Error en handleSubmit:", err);
      setErrorMessage(err.message || "Error al registrar el abono. Por favor, intente nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

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

  if (!visible) return null;

  return (
    <>
      <div className="modal-vehiculo-overlay" onClick={onClose}>
        <div className="modal-vehiculo-content" onClick={(e) => e.stopPropagation()}>
          <form className="modal-vehiculo-form" onSubmit={handleSubmit}>
            {errorMessage && (
              <div className="modal-error-message">
                {errorMessage}
              </div>
            )}

            <div className="modal-vehiculo-image-row">
              {renderFileInput("Foto Seguro", "fotoSeguro")}
              {renderFileInput("Foto DNI", "fotoDNI")}
              {renderFileInput("Foto Céd. Verde", "fotoCedulaVerde")}
              {renderFileInput("Foto Céd. Azul", "fotoCedulaAzul")}
            </div>

            <div className="modal-vehiculo-form-group grid-2">
              <input
                className="modal-vehiculo-input"
                name="patente"
                placeholder="Patente"
                value={formData.patente || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    patente: e.target.value.toUpperCase(),
                  })
                }
                maxLength={7}
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
                  tiposVehiculo.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo.charAt(0).toUpperCase() + tipo.slice(1)} - 
                      ${precios[tipo]?.mensual?.toLocaleString() || "N/A"}
                    </option>
                  ))}
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

      {/* Modal para pagar diferencia */}
      {showDiferenciaModal && (
        <div className="modal-diferencia-overlay">
          <div className="modal-diferencia-content">
            <h3>Cambio a abono más caro</h3>
            <p>El vehículo seleccionado tiene un abono más caro que el actual.</p>
            <p className="diferencia-monto">
              Diferencia a pagar: <strong>${diferenciaAPagar.toLocaleString()}</strong>
            </p>
            <p className="diferencia-info">
              Esta diferencia cubre los días restantes del abono actual.
            </p>
            
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
            
            {errorMessage && (
              <div className="modal-diferencia-error">
                {errorMessage}
              </div>
            )}
            
            <div className="modal-diferencia-buttons">
              <button 
                type="button" 
                onClick={handleConfirmarPagoDiferencia}
                className="confirmar-btn"
              >
                Confirmar Pago
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
      )}
    </>
  );
};

export default ModalVehiculoCajero;