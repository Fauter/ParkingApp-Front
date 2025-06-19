import React, { useState, useEffect } from "react";
import { FaCamera, FaCheckCircle } from "react-icons/fa";

import './DatosAutoAbono.css';

function DatosAutoAbono({ datosVehiculo, user }) {
  const [formData, setFormData] = useState({
    nombreApellido: "",
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
  const [abonos, setAbonos] = useState([]);
  const [tarifaSeleccionadaId, setTarifaSeleccionadaId] = useState("");
  const [tarifaSeleccionada, setTarifaSeleccionada] = useState(null);
  
  const [clientes, setClientes] = useState([]);
  const [nombreTemporal, setNombreTemporal] = useState(formData.nombreApellido);
  const [sugerencias, setSugerencias] = useState([]);
  
  useEffect(() => {
    const fetchTipos = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/tipos-vehiculo");
        const data = await res.json();
        setTiposVehiculo(data);
      } catch (err) {
        console.error("Error al cargar tipos de vehículo:", err);
      }
    };
    fetchTipos();
  }, []);

  useEffect(() => {
    const fetchClientes = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/clientes");
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
      if (formData.nombreApellido.trim().length >= 3) {
        buscarClientePorNombre(formData.nombreApellido);
      }
    }, 800);

    return () => clearTimeout(delayDebounce);
  }, [formData.nombreApellido]);

  useEffect(() => {
    const fetchTarifas = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/tarifas");
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

  const buscarClientePorNombre = async (nombre) => {
    try {
      const res = await fetch(`http://localhost:5000/api/clientes/${encodeURIComponent(nombre)}`);
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
          }));
        }
      }
    } catch (error) {
      console.error("Error buscando cliente:", error);
    }
  };

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
    });
    setNombreTemporal(cliente.nombreApellido);
    setSugerencias([]);
    
    // Hacer que el input pierda foco, usando ref (ver punto 3)
    if (inputRef.current) inputRef.current.blur();
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if (name === "patente") {
      // Convertir a mayúsculas y eliminar caracteres inválidos (solo letras y números)
      let newValue = value.toUpperCase().replace(/[^A-Z0-9]/g, "");

      // Validar formato permitido o vacío (para permitir borrar)
      // Formatos permitidos:
      // 3 letras + 3 números (6 caracteres) OR
      // 3 letras + 3 números + 2 letras (8 caracteres)
      // Para permitir escribir mientras escribe, aceptamos también valores intermedios con
      // hasta 8 caracteres y patrón parcial válido

      const regexPartial = /^([A-Z]{0,3})([0-9]{0,3})([A-Z]{0,2})?$/;

      if (newValue.length <= 8 && regexPartial.test(newValue)) {
        setFormData((prevData) => ({
          ...prevData,
          [name]: newValue,
        }));
      }
      // Si no cumple, no actualiza el estado (no se cambia el input)
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

    // Validar formato de patente
    const patente = formData.patente?.toUpperCase() || "";
    const patenteRegex = /^([A-Z]{3}\d{3}|[A-Z]{2}\d{3}[A-Z]{2})$/;
    if (!patenteRegex.test(patente)) {
      alert("Patente Inválida");
      console.log("Patente inválida:", patente);
      return;
    }
    console.log("Patente válida:", patente);

    try {
      // Obtener lista de vehículos para validar si ya existe la patente
      const vehiculosRes = await fetch("http://localhost:5000/api/vehiculos");
      if (!vehiculosRes.ok) throw new Error("No se pudieron obtener los vehículos");
      const vehiculos = await vehiculosRes.json();

      // Buscar si ya existe vehículo con esa patente
      const vehiculoExistente = vehiculos.find(v => v.patente.toUpperCase() === patente);
      if (vehiculoExistente) {
        console.log("Vehículo ya existe:", vehiculoExistente);
        // Seguimos normalmente
      } else {
        console.log("Vehículo no existe, creando...");
        const tipoVehiculo = formData.tipoVehiculo;
        if (!tipoVehiculo) {
          alert("Debe seleccionar tipo de vehículo");
          return;
        }

        const crearVehiculoRes = await fetch("http://localhost:5000/api/vehiculos/sin-entrada", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            patente,
            tipoVehiculo,
          }),
        });

        if (!crearVehiculoRes.ok) {
          let errorMsg = "Error al crear vehículo";
          try {
            const errorData = await crearVehiculoRes.json();
            console.error("Error al crear vehículo:", errorData);
            errorMsg = errorData.message || errorMsg;
          } catch {
            console.error("Respuesta no JSON al crear vehículo");
          }
          alert(errorMsg);
          return;
        }
        const nuevoVehiculo = await crearVehiculoRes.json();
        console.log("Vehículo creado:", nuevoVehiculo);
      }

      // Preparar formData para enviar abono (sin precio ni tarifaSeleccionada)
      const abonoFormData = new FormData();
      for (const key in formData) {
        if (formData[key]) abonoFormData.append(key, formData[key]);
      }

      // POST para registrar abono
      const abonoRes = await fetch("http://localhost:5000/api/abonos/registrar-abono", {
        method: "POST",
        body: abonoFormData,
      });

      if (!abonoRes.ok) {
        let errorMsg = "Error al registrar abono";
        try {
          const errorData = await abonoRes.json();
          console.error("Error al registrar abono:", errorData);
          errorMsg = errorData.message || errorMsg;
        } catch {
          console.error("Respuesta no JSON al registrar abono");
        }
        alert(errorMsg);
        return;
      }

      const abonoJson = await abonoRes.json();
      alert("¡Abono registrado correctamente!");
      console.log("Respuesta abono:", abonoJson);

      // Obtener precio calculado desde backend en la respuesta del abono
      const precioCalculadoBackend = abonoJson.abono.precio || 0;

      // Preparar payload para registrar movimiento usando precio calculado
      const movimientoPayload = {
        patente: formData.patente,
        operador: user.nombre,
        tipoVehiculo: formData.tipoVehiculo,
        metodoPago: formData.metodoPago,
        factura: formData.factura || "Sin factura",
        monto: precioCalculadoBackend,
        descripcion: "Pago Por Abono",
        tipoTarifa: "abono",
        dniCuitCuil: formData.dniCuitCuil || "",
      };

      console.log("Preparando datos para registrar movimiento...");
      console.log("Datos enviados a movimientos/registrar:", movimientoPayload);

      const movimientoRes = await fetch("http://localhost:5000/api/movimientos/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movimientoPayload),
      });

      console.log("Respuesta de movimientos/registrar recibida:", movimientoRes.status, movimientoRes.statusText);

      if (!movimientoRes.ok) {
        let errorData = {};
        try {
          errorData = await movimientoRes.json();
          console.error("Error al crear movimiento (detalle):", errorData);
        } catch {
          console.error("No se pudo parsear JSON del error de movimientos/registrar");
        }
        alert(`Error al crear movimiento: ${errorData.message || movimientoRes.statusText}`);
        return; // Paramos aquí porque no tiene sentido seguir si no se crea el movimiento
      }

      const movimientoResult = await movimientoRes.json();
      console.log("Movimiento registrado con éxito:", movimientoResult);

      // --- Aquí creamos el MovimientoCliente ---
      const movimientoClientePayload = {
        nombreApellido: formData.nombreApellido,
        email: formData.email,
        descripcion: `Abono`,
        monto: precioCalculadoBackend,
        tipoVehiculo: formData.tipoVehiculo,
        operador: user.nombre || 'Carlos', // usar el operador correcto
        patente: formData.patente,
      };

      const movimientoClienteRes = await fetch("http://localhost:5000/api/movimientosclientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movimientoClientePayload),
      });

      if (!movimientoClienteRes.ok) {
        const err = await movimientoClienteRes.json();
        console.error("Error al registrar MovimientoCliente:", err);
        alert(`Error al registrar MovimientoCliente: ${err.message || 'Error desconocido'}`);
        return;
      }

      const movimientoClienteResult = await movimientoClienteRes.json();
      console.log("MovimientoCliente registrado con éxito:", movimientoClienteResult);

      alert("¡Abono, movimiento y movimiento cliente registrados correctamente!");

      // Reseteo de formulario y estados
      setFormData({
        nombreApellido: '',
        domicilio: '',
        localidad: '',
        telefonoParticular: '',
        telefonoEmergencia: '',
        domicilioTrabajo: '',
        telefonoTrabajo: '',
        email: '',
        patente: '',
        marca: '',
        modelo: '',
        color: '',
        anio: '',
        companiaSeguro: '',
        metodoPago: '',
        factura: '',
        tipoVehiculo: '',
        fotoSeguro: null,
        fotoDNI: null,
        fotoCedulaVerde: null,
        fotoCedulaAzul: null,
        dniCuitCuil: '',
      });
      setFileUploaded({
        fotoSeguro: false,
        fotoDNI: false,
        fotoCedulaVerde: false,
        fotoCedulaAzul: false,
      });
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
          <div><label>Nombre y Apellido</label>
          <input
            type="text"
            name="nombreApellido"
            value={nombreTemporal}
            onChange={(e) => {
              setNombreTemporal(e.target.value);
              handleChange(e);
            }}
            autoComplete="off"
          />

          {sugerencias.length > 0 && (
            <ul className="sugerencias-lista">
              {sugerencias.map((cliente, index) => (
                <li
                  key={index}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    seleccionarCliente(cliente);
                  }}
                  className="sugerencia-item"
                >
                  {cliente.nombreApellido}
                </li>
              ))}
            </ul>
          )}</div>
          <div><label>DNI/CUIT/CUIL</label><input type="text" name="dniCuitCuil" value={formData.dniCuitCuil} onChange={handleChange} /></div>
          <div><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} /></div>
          <div><label>Domicilio</label><input type="text" name="domicilio" value={formData.domicilio} onChange={handleChange} /></div>
          <div><label>Localidad</label><input type="text" name="localidad" value={formData.localidad} onChange={handleChange} /></div>
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
          <div><label>Patente</label><input type="text" name="patente" value={formData.patente} onChange={handleChange} maxLength={8}/></div>
          <div><label>Marca</label><input type="text" name="marca" value={formData.marca} onChange={handleChange} /></div>
          <div><label>Modelo</label><input type="text" name="modelo" value={formData.modelo} onChange={handleChange} /></div>
          <div><label>Color</label><input type="text" name="color" value={formData.color} onChange={handleChange} /></div>
          <div><label>Año</label><input type="number" name="anio" value={formData.anio} onChange={handleChange} /></div>
          <div><label>Compañía Seguro</label><input type="text" name="companiaSeguro" value={formData.companiaSeguro} onChange={handleChange} /></div>
        </div>

        <div className="grid-3cols">
          <div>
            <label>Método de Pago</label>
            <select name="metodoPago" value={formData.metodoPago} onChange={handleChange} className="select-style">
              <option value="">Seleccione</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Débito">Débito</option>
              <option value="Crédito">Crédito</option>
              <option value="QR">QR</option>
            </select>
          </div>
          <div>
            <label>Factura</label>
            <select name="factura" value={formData.factura} onChange={handleChange} className="select-style">
              <option value="">Seleccione</option>
              <option value="CC">CC</option>
              <option value="A">A</option>
              <option value="Final">Final</option>
            </select>
          </div>
          <div>
            <label>Tipo de Vehículo</label>
            <select name="tipoVehiculo" value={formData.tipoVehiculo} onChange={handleChange} className="select-style">
              <option value="">Seleccione</option>
              {tiposVehiculo.map((tipo, index) => (
                <option key={index} value={tipo}>
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
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