import React, { useState, useEffect, useRef } from "react";
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

  const inputRefs = {
    fotoSeguro: useRef(null),
    fotoDNI: useRef(null),
    fotoCedulaVerde: useRef(null),
    fotoCedulaAzul: useRef(null),
  };

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

  const formatARS = (n) => {
    if (typeof n !== "number") return null;
    try {
      return new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(n);
    } catch {
      return n.toString();
    }
  };

  const showModal = (title, message, icon = "info", onClose = null) => {
    setModal({
      show: true,
      title,
      message,
      icon,
      onClose: onClose || (() => setModal(prev => ({...prev, show: false})))
    });
  };

  const fetchClientes = async () => {
    try {
      const res = await fetch("http://localhost:5000/api/clientes");
      if (res.ok) {
        const data = await res.json();
        setClientes(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error al cargar clientes:", err);
      showModal("Error", "Error al cargar lista de clientes", "error");
    }
  };

  useEffect(() => {
    if (datosVehiculo) {
      setFormData(prev => ({
        ...prev,
        patente: datosVehiculo.patente || "",
        tipoVehiculo: datosVehiculo.tipoVehiculo || ""
      }));
    }
  }, [datosVehiculo]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const tiposRes = await fetch("http://localhost:5000/api/tipos-vehiculo");
        const tiposData = await tiposRes.json();
        setTiposVehiculo(Array.isArray(tiposData) ? tiposData : []);

        const preciosRes = await fetch("http://localhost:5000/api/precios");
        const preciosData = await preciosRes.json();
        setPrecios(preciosData || {});
      } catch (err) {
        console.error("Error al cargar datos:", err);
        showModal("Error", "Error al cargar datos de vehículos y precios", "error");
      }
    };
    fetchData();
  }, []);

  useEffect(() => { fetchClientes(); }, []);

  useEffect(() => {
    if (nombreTemporal.trim().length >= 3) {
      const coincidencias = clientes.filter((c) =>
        (c.nombreApellido || "").toLowerCase().includes(nombreTemporal.trim().toLowerCase())
      );
      setSugerencias(coincidencias);
    } else {
      setSugerencias([]);
    }
  }, [nombreTemporal, clientes]);

  const seleccionarCliente = (cliente) => {
    setFormData(prev => ({
      ...prev,
      nombreApellido: cliente.nombreApellido || "",
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
    setNombreTemporal(cliente.nombreApellido || "");
    setSugerencias([]);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "patente") {
      const patenteUpper = (value || "").toUpperCase();
      setFormData(prev => ({ ...prev, [name]: patenteUpper }));
      return;
    }
    if (files && files.length > 0) {
      setFormData(prev => ({ ...prev, [name]: files[0] }));
      setFileUploaded(prev => ({ ...prev, [name]: true }));
      return;
    }
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validarPatente = (patente) => {
    const formatoViejo = /^[A-Z]{3}\d{3}$/;
    const formatoNuevo = /^[A-Z]{2}\d{3}[A-Z]{2}$/;
    return formatoViejo.test(patente) || formatoNuevo.test(patente);
  };

  // 🔐 ensureCliente: ahora busca por dni/email además de nombre
  const ensureCliente = async () => {
    const nombre = (formData.nombreApellido || "").trim().toLowerCase();
    const dni = (formData.dniCuitCuil || "").trim();
    const email = (formData.email || "").trim().toLowerCase();

    const candidato =
      (clientes || []).find(c => (c.dniCuitCuil || '').trim() === dni) ||
      (clientes || []).find(c => (c.email || '').trim().toLowerCase() === email) ||
      (clientes || []).find(c => (c.nombreApellido || '').trim().toLowerCase() === nombre);

    if (candidato && candidato._id) {
      // actualiza datos básicos
      const putRes = await fetch(`http://localhost:5000/api/clientes/${candidato._id}`, {
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
          email: formData.email
        }),
      });
      if (putRes.ok) return candidato._id;
      // si falló, continúa con creación
    }

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
        precioAbono: formData.tipoVehiculo || ""
      }),
    });

    if (!nuevoClienteRes.ok) throw new Error('Error al crear cliente');
    const nuevoCliente = await nuevoClienteRes.json();
    if (!nuevoCliente._id) throw new Error('No se pudo crear cliente');
    return nuevoCliente._id;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const patente = (formData.patente || "").toUpperCase();

      if (!validarPatente(patente)) throw new Error("Patente inválida (ABC123 o AB123CD)");
      if (!formData.tipoVehiculo) throw new Error("Debe seleccionar tipo de vehículo");
      if (!formData.nombreApellido?.trim()) throw new Error("Debe ingresar el nombre del cliente");
      if (!formData.email?.trim()) throw new Error("Debe ingresar un email");

      const clienteId = await ensureCliente();

      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, v);
      });
      fd.set('patente', patente);
      fd.set('cliente', clienteId);
      fd.set('operador', user?.nombre || 'Sistema');

      const resp = await fetch('http://localhost:5000/api/abonos/registrar-abono', {
        method: 'POST',
        body: fd,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.message || 'Error al registrar abono');
      }

      // refrescar clientes para que las sugerencias queden al día
      await fetchClientes();

      // opcional: forzar un SYNC inmediato (si el backend lo tiene habilitado)
      fetch('http://localhost:5000/api/sync/run-now', { method: 'POST' }).catch(() => {});

      showModal(
        "Éxito",
        `Abono registrado correctamente para ${patente}.`,
        "success",
        () => {
          setModal(prev => ({...prev, show: false}));
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
        }
      );

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
      <label className="file-label" onClick={() => inputRefs[name]?.current?.click()}>
        <div className="icon-wrapper">
          <FaCamera className="icon" />
        </div>
        {fileUploaded[name] ? (
          <div className="file-uploaded">
            <FaCheckCircle size={20} />
          </div>
        ) : (
          <div className="file-text">
            <span>Sacar</span>
            <span>Foto</span>
          </div>
        )}
        <input
          ref={inputRefs[name]}
          type="file"
          name={name}
          accept="image/*"
          onChange={handleChange}
          style={{ display: "none" }}
        />
      </label>
    </div>
  );

  return (
    <div className="abono-container">
      <form className="abono-form" onSubmit={handleSubmit} encType="multipart/form-data">
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
                {sugerencias.map((cliente) => (
                  <li
                    key={cliente._id}
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
              {tiposVehiculo.map((tipo) => {
                const mensual = precios?.[tipo.nombre.toLowerCase()]?.mensual;
                const labelPrecio = typeof mensual === "number" ? `$${formatARS(mensual)}` : "N/A";
                const capitalized = tipo.nombre.charAt(0).toUpperCase() + tipo.nombre.slice(1);
                return (
                  <option key={tipo.nombre} value={tipo.nombre}>
                    {capitalized} - {labelPrecio}
                  </option>
                );
              })}
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
