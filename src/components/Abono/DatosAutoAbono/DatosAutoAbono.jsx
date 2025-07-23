import React, { useState, useEffect } from "react";
import { FaCamera, FaCheckCircle } from "react-icons/fa";
import ModalMensaje from "../../ModalMensaje/ModalMensaje";
import './DatosAutoAbono.css';

function DatosAutoAbono({ datosVehiculo, user }) {
  const [formData, setFormData] = useState({
    nombreApellido: "",
    dniCuitCuil: "",
    domicilio: "",
    localidad: "",
    telefonoParticular: "",
    telefonoEmergencia: "",
    domicilioTrabajo: "",
    telefonoTrabajo: "",
    email: "",
    patente: datosVehiculo?.patente || "",
    tipoVehiculo: datosVehiculo?.tipoVehiculo || "",
    marca: "",
    modelo: "",
    color: "",
    anio: "",
    companiaSeguro: "",
    metodoPago: "Efectivo",
    factura: "CC",
    fotoSeguro: null,
    fotoDNI: null,
    fotoCedulaVerde: null,
    fotoCedulaAzul: null,
  });

  const [fileUploaded, setFileUploaded] = useState({
    fotoSeguro: false,
    fotoDNI: false,
    fotoCedulaVerde: false,
    fotoCedulaAzul: false,
  });

  const [tiposVehiculo, setTiposVehiculo] = useState([]);
  const [precios, setPrecios] = useState({});
  const [clientes, setClientes] = useState([]);
  const [nombreTemporal, setNombreTemporal] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({
    show: false,
    title: "",
    message: "",
    icon: null,
    onClose: null
  });

  useEffect(() => {
    if (datosVehiculo) {
      setFormData(prev => ({
        ...prev,
        patente: datosVehiculo.patente || "",
        tipoVehiculo: datosVehiculo.tipoVehiculo || ""
      }));
    }
  }, [datosVehiculo]);

  // Cargar tipos de vehículo y precios
  useEffect(() => {
    const fetchData = async () => {
      try {
        const tiposRes = await fetch("http://localhost:5000/api/tipos-vehiculo");
        const tiposData = await tiposRes.json();
        setTiposVehiculo(tiposData);

        const preciosRes = await fetch("http://localhost:5000/api/precios");
        const preciosData = await preciosRes.json();
        setPrecios(preciosData);
      } catch (err) {
        console.error("Error al cargar datos:", err);
        showModal("Error", "Error al cargar datos de vehículos y precios", "error");
      }
    };
    fetchData();
  }, []);

  // Cargar clientes
  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/clientes");
        if (res.ok) {
          const data = await res.json();
          setClientes(data);
        }
      } catch (err) {
        console.error("Error al cargar clientes:", err);
        showModal("Error", "Error al cargar lista de clientes", "error");
      }
    };
    fetchClientes();
  }, []);

  // Buscar sugerencias de clientes
  useEffect(() => {
    if (nombreTemporal.trim().length >= 3) {
      const coincidencias = clientes.filter((c) =>
        c.nombreApellido.toLowerCase().includes(nombreTemporal.trim().toLowerCase())
      );
      setSugerencias(coincidencias);
    } else {
      setSugerencias([]);
    }
  }, [nombreTemporal, clientes]);

  const showModal = (title, message, icon = "info", onClose = null) => {
    setModal({
      show: true,
      title,
      message,
      icon,
      onClose: onClose || (() => setModal(prev => ({...prev, show: false})))
    });
  };

  const buscarClientePorNombre = async (nombre) => {
    try {
      const res = await fetch(`http://localhost:5000/api/clientes/nombre/${encodeURIComponent(nombre)}`);
      if (res.ok) {
        const cliente = await res.json();
        if (cliente) {
          setFormData(prev => ({
            ...prev,
            domicilio: cliente.domicilio || "",
            localidad: cliente.localidad || "",
            telefonoParticular: cliente.telefonoParticular || "",
            telefonoEmergencia: cliente.telefonoEmergencia || "",
            domicilioTrabajo: cliente.domicilioTrabajo || "",
            telefonoTrabajo: cliente.telefonoTrabajo || "",
            email: cliente.email || "",
            dniCuitCuil: cliente.dniCuitCuil || "",
            marca: cliente.marca || "",
            modelo: cliente.modelo || "",
            color: cliente.color || "",
            anio: cliente.anio || "",
            companiaSeguro: cliente.companiaSeguro || "",
            metodoPago: cliente.metodoPago || "Efectivo",
            factura: cliente.factura || "CC"
          }));
        }
      }
    } catch (error) {
      console.error("Error buscando cliente:", error);
      showModal("Error", "Error al buscar cliente", "error");
    }
  };

  const seleccionarCliente = (cliente) => {
    setFormData(prev => ({
      ...prev,
      nombreApellido: cliente.nombreApellido,
      domicilio: cliente.domicilio || "",
      localidad: cliente.localidad || "",
      telefonoParticular: cliente.telefonoParticular || "",
      telefonoEmergencia: cliente.telefonoEmergencia || "",
      domicilioTrabajo: cliente.domicilioTrabajo || "",
      telefonoTrabajo: cliente.telefonoTrabajo || "",
      email: cliente.email || "",
      dniCuitCuil: cliente.dniCuitCuil || "",
      marca: cliente.marca || "",
      modelo: cliente.modelo || "",
      color: cliente.color || "",
      anio: cliente.anio || "",
      companiaSeguro: cliente.companiaSeguro || "",
      metodoPago: cliente.metodoPago || "Efectivo",
      factura: cliente.factura || "CC"
    }));
    setNombreTemporal(cliente.nombreApellido);
    setSugerencias([]);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "patente") {
      const patenteUpper = value.toUpperCase();
      setFormData(prev => ({ ...prev, [name]: patenteUpper }));
    } else if (files && files.length > 0) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      setFileUploaded(prev => ({ ...prev, [name]: true }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const validarPatente = (patente) => {
    const formatoViejo = /^[A-Z]{3}\d{3}$/;
    const formatoNuevo = /^[A-Z]{2}\d{3}[A-Z]{2}$/;
    return formatoViejo.test(patente) || formatoNuevo.test(patente);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validación patente
      const patente = formData.patente.toUpperCase();
      if (!validarPatente(patente)) {
        showModal("Patente inválida", "Debe ser en formato ABC123 (viejo) o AB123CD (nuevo)", "error");
        setLoading(false);
        return;
      }

      // Verificar tipo de vehículo
      if (!formData.tipoVehiculo) {
        showModal("Datos incompletos", "Debe seleccionar tipo de vehículo", "error");
        setLoading(false);
        return;
      }

      // Paso 1: Buscar o crear vehículo
      const vehiculoRes = await fetch(`http://localhost:5000/api/vehiculos/${encodeURIComponent(patente)}`);
      let vehiculo = null;
      let vehiculoData = null;

      if (!vehiculoRes.ok) {
        vehiculoData = null;
      } else {
        vehiculoData = await vehiculoRes.json();
      }

      if (!vehiculoRes.ok || (vehiculoData && vehiculoData.msg === "Vehículo no encontrado")) {
        // Crear vehículo si no existe
        const nuevoVehiculoRes = await fetch('http://localhost:5000/api/vehiculos/sin-entrada', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            patente: patente,
            tipoVehiculo: formData.tipoVehiculo,
            abonado: false,
            turno: false
          }),
        });

        let nuevoVehiculoJson = null;
        try {
          nuevoVehiculoJson = await nuevoVehiculoRes.json();
        } catch {
          showModal("Error", "No se pudo interpretar la respuesta al crear el vehículo", "error");
          setLoading(false);
          return;
        }

        if (!nuevoVehiculoJson || !nuevoVehiculoJson._id) {
          // Retry para ver si ya está creado
          await new Promise(resolve => setTimeout(resolve, 500));
          const retryVehiculoRes = await fetch(`http://localhost:5000/api/vehiculos/${encodeURIComponent(patente)}`);
          if (!retryVehiculoRes.ok) {
            showModal("Error", "El vehículo no se creó correctamente y no se encontró en el retry. No se continuará con el proceso.", "error");
            setLoading(false);
            return;
          }
          const retryVehiculoJson = await retryVehiculoRes.json();
          if (!retryVehiculoJson || !retryVehiculoJson._id) {
            showModal("Error", "El vehículo no se creó correctamente y no se encontró en el retry. No se continuará con el proceso.", "error");
            setLoading(false);
            return;
          }
          vehiculo = retryVehiculoJson;
        } else {
          vehiculo = nuevoVehiculoJson;
        }
      } else {
        vehiculo = vehiculoData;
      }

      // Paso 2: Buscar o crear cliente
      const clientesRes = await fetch('http://localhost:5000/api/clientes');
      if (!clientesRes.ok) throw new Error('Error al obtener clientes');
      const clientes = await clientesRes.json();
      const clienteExistente = clientes.find(
        c => c.nombreApellido.trim().toLowerCase() === formData.nombreApellido.trim().toLowerCase()
      );

      let clienteId;
      if (clienteExistente) {
        clienteId = clienteExistente._id;
        
        // Actualizar cliente existente
        await fetch(`http://localhost:5000/api/clientes/${clienteExistente._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            nombreApellido: formData.nombreApellido,
            dniCuitCuil: formData.dniCuitCuil,
            domicilio: formData.domicilio,
            localidad: formData.localidad,
            telefonoParticular: formData.telefonoParticular,
            telefonoEmergencia: formData.telefonoEmergencia,
            domicilioTrabajo: formData.domicilioTrabajo,
            telefonoTrabajo: formData.telefonoTrabajo,
            email: formData.email,
            tipoVehiculo: formData.tipoVehiculo,
            precioAbono: formData.tipoVehiculo
          }),
        });
      } else {
        // Crear nuevo cliente
        const nuevoClienteRes = await fetch('http://localhost:5000/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nombreApellido: formData.nombreApellido,
            dniCuitCuil: formData.dniCuitCuil,
            domicilio: formData.domicilio,
            localidad: formData.localidad,
            telefonoParticular: formData.telefonoParticular,
            telefonoEmergencia: formData.telefonoEmergencia,
            domicilioTrabajo: formData.domicilioTrabajo,
            telefonoTrabajo: formData.telefonoTrabajo,
            email: formData.email,
            precioAbono: formData.tipoVehiculo
          }),
        });
        if (!nuevoClienteRes.ok) throw new Error('Error al crear cliente');
        const nuevoCliente = await nuevoClienteRes.json();
        if (!nuevoCliente._id) throw new Error('No se pudo crear cliente');
        clienteId = nuevoCliente._id;
      }

      // Paso 3: Registrar abono
      const abonoFormData = new FormData();
      for (const key in formData) {
        if (formData[key] !== null && formData[key] !== undefined) {
          abonoFormData.append(key, formData[key]);
        }
      }
      abonoFormData.set('patente', patente);
      abonoFormData.append('cliente', clienteId);

      if (formData.fotoSeguro) abonoFormData.append('fotoSeguro', formData.fotoSeguro);
      if (formData.fotoDNI) abonoFormData.append('fotoDNI', formData.fotoDNI);
      if (formData.fotoCedulaVerde) abonoFormData.append('fotoCedulaVerde', formData.fotoCedulaVerde);
      if (formData.fotoCedulaAzul) abonoFormData.append('fotoCedulaAzul', formData.fotoCedulaAzul);

      const abonoRes = await fetch('http://localhost:5000/api/abonos/registrar-abono', {
        method: 'POST',
        body: abonoFormData,
      });
      if (!abonoRes.ok) throw new Error('Error al registrar abono');

      const abonoJson = await abonoRes.json();
      const precioCalculadoBackend = abonoJson.abono.precio;

      // Registrar movimiento
      const movimientoRes = await fetch('http://localhost:5000/api/movimientos/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patente: patente,
          operador: user.nombre,
          tipoVehiculo: formData.tipoVehiculo,
          metodoPago: formData.metodoPago,
          factura: formData.factura || 'Sin factura',
          monto: precioCalculadoBackend,
          descripcion: `Pago Por Abono`,
          tipoTarifa: `abono`
        }),
      });
      if (!movimientoRes.ok) throw new Error('Error al registrar movimiento');

      // Registrar movimiento del cliente
      const movimientoClientePayload = {
        nombreApellido: formData.nombreApellido,
        email: formData.email,
        descripcion: `Abono`,
        monto: precioCalculadoBackend,
        tipoVehiculo: formData.tipoVehiculo,
        operador: user.nombre,
        patente: patente,
      };
      const movimientoClienteRes = await fetch('http://localhost:5000/api/movimientosclientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movimientoClientePayload),
      });
      if (!movimientoClienteRes.ok) {
        const err = await movimientoClienteRes.json();
        throw new Error(`Error al registrar MovimientoCliente: ${err.message}`);
      }

      showModal("Éxito", "Abono registrado correctamente", "success", () => {
        // Resetear formulario
        setFormData({
          nombreApellido: "",
          dniCuitCuil: "",
          domicilio: "",
          localidad: "",
          telefonoParticular: "",
          telefonoEmergencia: "",
          domicilioTrabajo: "",
          telefonoTrabajo: "",
          email: "",
          patente: datosVehiculo?.patente || "",
          tipoVehiculo: datosVehiculo?.tipoVehiculo || "",
          marca: "",
          modelo: "",
          color: "",
          anio: "",
          companiaSeguro: "",
          metodoPago: "Efectivo",
          factura: "CC",
          fotoSeguro: null,
          fotoDNI: null,
          fotoCedulaVerde: null,
          fotoCedulaAzul: null,
        });
        setFileUploaded({
          fotoSeguro: false,
          fotoDNI: false,
          fotoCedulaVerde: false,
          fotoCedulaAzul: false,
        });
        setNombreTemporal("");
      });

    } catch (error) {
      console.error(error);
      showModal("Error", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const renderFileInput = (label, name) => (
    <div className="file-input-wrapper">
      <label className="file-visible-label">{label}</label>
      <label className="file-label">
        <div className="icon-wrapper">
          <FaCamera className="icon" />
        </div>
        {fileUploaded[name] ? (
          <div className="file-uploaded">
            <FaCheckCircle color="#4caf50" size={20} />
          </div>
        ) : (
          <div className="file-text">
            <span>Seleccionar</span>
            <span>Imagen</span>
          </div>
        )}
        <input type="file" name={name} accept="image/*" onChange={handleChange} />
      </label>
    </div>
  );

  return (
    <div className="abono-container">
      <form className="abono-form" onSubmit={handleSubmit} encType="multipart/form-data">
        {/* DATOS CLIENTE */}
        <div className="grid-3cols">
          <div>
            <label>Nombre y Apellido</label>
            <input
              type="text"
              name="nombreApellido"
              value={nombreTemporal}
              onChange={(e) => {
                setNombreTemporal(e.target.value);
                setFormData(prev => ({ ...prev, nombreApellido: e.target.value }));
              }}
              autoComplete="off"
              required
            />
            {sugerencias.length > 0 && (
              <ul className="sugerencias-lista">
                {sugerencias.map((cliente, index) => (
                  <li
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      seleccionarCliente(cliente);
                    }}
                    className="sugerencia-item"
                  >
                    {cliente.nombreApellido}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div><label>DNI/CUIT/CUIL</label><input type="text" name="dniCuitCuil" value={formData.dniCuitCuil} onChange={handleChange} required /></div>
          <div><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} required /></div>
          <div><label>Domicilio</label><input type="text" name="domicilio" value={formData.domicilio} onChange={handleChange} required /></div>
          <div><label>Localidad</label><input type="text" name="localidad" value={formData.localidad} onChange={handleChange} required /></div>
          <div><label>Domicilio Trabajo</label><input type="text" name="domicilioTrabajo" value={formData.domicilioTrabajo} onChange={handleChange} /></div>
          <div><label>Tel. Particular</label><input type="text" name="telefonoParticular" value={formData.telefonoParticular} onChange={handleChange} /></div>
          <div><label>Tel. Emergencia</label><input type="text" name="telefonoEmergencia" value={formData.telefonoEmergencia} onChange={handleChange} /></div>
          <div><label>Tel. Trabajo</label><input type="text" name="telefonoTrabajo" value={formData.telefonoTrabajo} onChange={handleChange} /></div>
        </div>

        {/* DATOS VEHICULO */}
        <div className="grid-4cols fotos-grid">
          {renderFileInput("Foto Seguro", "fotoSeguro")}
          {renderFileInput("Foto DNI", "fotoDNI")}
          {renderFileInput("Foto Céd. Verde", "fotoCedulaVerde")}
          {renderFileInput("Foto Céd. Azul", "fotoCedulaAzul")}
        </div>

        <div className="grid-3cols">
          <div><label>Patente</label><input type="text" name="patente" value={formData.patente} onChange={handleChange} maxLength={8} required /></div>
          <div><label>Marca</label><input type="text" name="marca" value={formData.marca} onChange={handleChange} /></div>
          <div><label>Modelo</label><input type="text" name="modelo" value={formData.modelo} onChange={handleChange} /></div>
          <div><label>Color</label><input type="text" name="color" value={formData.color} onChange={handleChange} /></div>
          <div><label>Año</label><input type="number" name="anio" value={formData.anio} onChange={handleChange} /></div>
          <div><label>Compañía Seguro</label><input type="text" name="companiaSeguro" value={formData.companiaSeguro} onChange={handleChange} /></div>
        </div>

        <div className="grid-3cols">
          <div>
            <label>Método de Pago</label>
            <select name="metodoPago" value={formData.metodoPago} onChange={handleChange} className="select-style" required>
              <option value="Efectivo">Efectivo</option>
              <option value="Débito">Débito</option>
              <option value="Crédito">Crédito</option>
              <option value="QR">QR</option>
            </select>
          </div>
          <div>
            <label>Factura</label>
            <select name="factura" value={formData.factura} onChange={handleChange} className="select-style">
              <option value="CC">CC</option>
              <option value="A">A</option>
              <option value="Final">Final</option>
            </select>
          </div>
          <div>
            <label>Tipo de Vehículo</label>
            <select 
              name="tipoVehiculo" 
              value={formData.tipoVehiculo} 
              onChange={handleChange} 
              className="select-style" 
              required
            >
              <option value="">Seleccione</option>
              {tiposVehiculo.map((tipo, index) => (
                <option key={index} value={tipo}>
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)} - 
                  ${precios[tipo]?.mensual?.toLocaleString() || "N/A"}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Abono'}
        </button>
      </form>

      <ModalMensaje
        show={modal.show}
        title={modal.title}
        message={modal.message}
        icon={modal.icon}
        onClose={modal.onClose}
      />
    </div>
  );
}

export default DatosAutoAbono;