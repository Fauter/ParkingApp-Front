import React, { useState, useEffect } from "react";
import { FaCamera, FaCheckCircle } from "react-icons/fa";
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
    precioAbono: ""
  });

  const [fileUploaded, setFileUploaded] = useState({
    fotoSeguro: false,
    fotoDNI: false,
    fotoCedulaVerde: false,
    fotoCedulaAzul: false,
  });

  const [tiposVehiculo, setTiposVehiculo] = useState([]);
  const [precios, setPrecios] = useState({});
  const [abonos, setAbonos] = useState([]);
  const [tarifaSeleccionadaId, setTarifaSeleccionadaId] = useState("");
  const [tarifaSeleccionada, setTarifaSeleccionada] = useState(null);
  const [clientes, setClientes] = useState([]);
  const [nombreTemporal, setNombreTemporal] = useState(formData.nombreApellido);
  const [sugerencias, setSugerencias] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const tiposRes = await fetch("https://api.garageia.com/api/tipos-vehiculo");
        const tiposData = await tiposRes.json();
        setTiposVehiculo(tiposData);

        const preciosRes = await fetch("https://api.garageia.com/api/precios");
        const preciosData = await preciosRes.json();
        setPrecios(preciosData);
      } catch (err) {
        console.error("Error al cargar datos:", err);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await fetch("https://api.garageia.com/api/clientes");
        if (res.ok) {
          const data = await res.json();
          setClientes(data);
        }
      } catch (err) {
        console.error("Error al traer todos los clientes:", err);
      }
    };
    fetchClientes();
  }, []);

  useEffect(() => {
    if (datosVehiculo) {
      setFormData(prev => ({
        ...prev,
        patente: datosVehiculo?.patente || prev.patente,
        tipoVehiculo: datosVehiculo?.tipoVehiculo || prev.tipoVehiculo,
      }));
    }
  }, [datosVehiculo]);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (nombreTemporal.trim().length >= 3) {
        buscarClientePorNombre(nombreTemporal);
      }
    }, 800);

    return () => clearTimeout(delayDebounce);
  }, [nombreTemporal]);

  useEffect(() => {
    const fetchTarifas = async () => {
      try {
        const res = await fetch("https://api.garageia.com/api/tarifas");
        const data = await res.json();
        const abonosFiltrados = data.filter(t => t.tipo === "abono");
        setAbonos(abonosFiltrados);

        const abono = abonosFiltrados.find(t => t.nombre.toLowerCase() === "abono");
        if (abono) {
          setTarifaSeleccionadaId(abono._id);
          setTarifaSeleccionada(abono);
        }
      } catch (error) {
        console.error("Error al cargar tarifas:", error);
      }
    };
    fetchTarifas();
  }, []);

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

  const buscarClientePorNombre = async (nombre) => {
    try {
      const res = await fetch(`https://api.garageia.com/api/clientes/nombre/${encodeURIComponent(nombre)}`);
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
            marca: cliente.marca || "",
            modelo: cliente.modelo || "",
            color: cliente.color || "",
            anio: cliente.anio || "",
            companiaSeguro: cliente.companiaSeguro || "",
            metodoPago: cliente.metodoPago || "",
            factura: cliente.factura || "",
            dniCuitCuil: cliente.dniCuitCuil || "",
            precioAbono: cliente.precioAbono || ""
          }));
        }
      }
    } catch (error) {
      console.error("Error buscando cliente:", error);
    }
  };

  const seleccionarCliente = (cliente) => {
    setFormData({
      ...formData,
      nombreApellido: cliente.nombreApellido,
      domicilio: cliente.domicilio || "",
      localidad: cliente.localidad || "",
      telefonoParticular: cliente.telefonoParticular || "",
      telefonoEmergencia: cliente.telefonoEmergencia || "",
      domicilioTrabajo: cliente.domicilioTrabajo || "",
      telefonoTrabajo: cliente.telefonoTrabajo || "",
      email: cliente.email || "",
      dniCuitCuil: cliente.dniCuitCuil || "",
      precioAbono: cliente.precioAbono || ""
    });
    setNombreTemporal(cliente.nombreApellido);
    setSugerencias([]);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "patente") {
      let newValue = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
      const regexPartial = /^([A-Z]{0,3})([0-9]{0,3})([A-Z]{0,2})?$/;

      if (newValue.length <= 8 && regexPartial.test(newValue)) {
        setFormData((prevData) => ({
          ...prevData,
          [name]: newValue,
        }));
      }
    } else if (files && files.length > 0) {
      setFormData((prevData) => ({
        ...prevData,
        [name]: files[0],
      }));
      setFileUploaded((prevUploaded) => ({
        ...prevUploaded,
        [name]: true,
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: value,
      }));
    }
  };

  const handleAbonoChange = (e) => {
    const id = e.target.value;
    setTarifaSeleccionadaId(id);
    const tarifa = abonos.find((t) => t._id === id);
    setTarifaSeleccionada(tarifa);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const patente = formData.patente?.toUpperCase() || "";
    const patenteRegex = /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/;
    if (!patenteRegex.test(patente)) {
      alert("Patente Inválida");
      return;
    }

    try {
      // Verificar si el vehículo existe o crearlo
      const vehiculosRes = await fetch("https://api.garageia.com/api/vehiculos");
      if (!vehiculosRes.ok) throw new Error("No se pudieron obtener los vehículos");
      const vehiculos = await vehiculosRes.json();

      const vehiculoExistente = vehiculos.find(v => v.patente.toUpperCase() === patente);
      if (!vehiculoExistente) {
        const tipoVehiculo = formData.tipoVehiculo;
        if (!tipoVehiculo) {
          alert("Debe seleccionar tipo de vehículo");
          return;
        }

        const crearVehiculoRes = await fetch("https://api.garageia.com/api/vehiculos/sin-entrada", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ patente, tipoVehiculo }),
        });

        if (!crearVehiculoRes.ok) {
          const errorData = await crearVehiculoRes.json().catch(() => ({}));
          alert(errorData.message || "Error al crear vehículo");
          return;
        }
      }

      // Paso 1: Buscar o crear cliente
      const clientesRes = await fetch('https://api.garageia.com/api/clientes');
      if (!clientesRes.ok) throw new Error('Error al obtener clientes');
      const clientes = await clientesRes.json();
      const clienteExistente = clientes.find(
        c => c.nombreApellido.trim().toLowerCase() === formData.nombreApellido.trim().toLowerCase()
      );

      let clienteId;
      if (clienteExistente) {
        clienteId = clienteExistente._id;
        
        // Actualizar precioAbono del cliente si corresponde
        if (formData.tipoVehiculo) {
          const precioMensual = precios[formData.tipoVehiculo]?.mensual || 0;
          if (clienteExistente.precioAbono === '' || precioMensual > (precios[clienteExistente.precioAbono]?.mensual || 0)) {
            await fetch(`https://api.garageia.com/api/clientes/${clienteExistente._id}/actualizar-precio-abono`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                tipoVehiculo: formData.tipoVehiculo,
                precioMensual: precioMensual
              }),
            });
          }
        }
      } else {
        // Crear nuevo cliente
        const nuevoClienteRes = await fetch('https://api.garageia.com/api/clientes', {
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

      // Registrar el abono
      const abonoFormData = new FormData();
      for (const key in formData) {
        if (formData[key] !== null && formData[key] !== undefined) {
          abonoFormData.append(key, formData[key]);
        }
      }

      const abonoRes = await fetch("https://api.garageia.com/api/abonos/registrar-abono", {
        method: "POST",
        body: abonoFormData,
      });

      if (!abonoRes.ok) {
        const errorData = await abonoRes.json().catch(() => ({}));
        alert(errorData.message || "Error al registrar abono");
        return;
      }

      const abonoJson = await abonoRes.json();
      const precioAbono = abonoJson.abono.precio;
      
      // Registrar movimiento
      const movimientoRes = await fetch('https://api.garageia.com/api/movimientos/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patente: formData.patente,
          operador: user.nombre,
          tipoVehiculo: formData.tipoVehiculo,
          metodoPago: formData.metodoPago,
          factura: formData.factura || 'Sin factura',
          monto: precioAbono,
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
        monto: precioAbono,
        tipoVehiculo: formData.tipoVehiculo,
        operador: user.nombre,
        patente: formData.patente,
      };
      const movimientoClienteRes = await fetch('https://api.garageia.com/api/movimientosclientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(movimientoClientePayload),
      });
      if (!movimientoClienteRes.ok) {
        const err = await movimientoClienteRes.json();
        throw new Error(`Error al registrar MovimientoCliente: ${err.message}`);
      }

      alert("¡Abono registrado correctamente!");

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
        patente: "",
        marca: "",
        modelo: "",
        color: "",
        anio: "",
        companiaSeguro: "",
        metodoPago: "Efectivo",
        factura: "CC",
        tipoVehiculo: "",
        fotoSeguro: null,
        fotoDNI: null,
        fotoCedulaVerde: null,
        fotoCedulaAzul: null,
        precioAbono: ""
      });
      setFileUploaded({
        fotoSeguro: false,
        fotoDNI: false,
        fotoCedulaVerde: false,
        fotoCedulaAzul: false,
      });
      setNombreTemporal("");
      setTarifaSeleccionadaId("");
      setTarifaSeleccionada(null);

    } catch (err) {
      console.error("Error en handleSubmit:", err.message);
      alert("Error al registrar el abono. Por favor, intentá nuevamente.");
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
            <select name="tipoVehiculo" value={formData.tipoVehiculo} onChange={handleChange} className="select-style" required>
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

        <button type="submit">Guardar Abono</button>
      </form>
    </div>
  );
}

export default DatosAutoAbono;