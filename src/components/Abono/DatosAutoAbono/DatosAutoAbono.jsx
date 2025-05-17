import React, { useState, useEffect } from "react";
import { FaCamera, FaCheckCircle } from "react-icons/fa";
import './DatosAutoAbono.css';

function DatosAutoAbono({ datosVehiculo }) {
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
    metodoPago: "",
    factura: "",
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
      const res = await fetch("http://localhost:5000/api/tarifas");
      const data = await res.json();
      const abonosFiltrados = data.filter(t => t.tipo === "abono");
      setAbonos(abonosFiltrados);

      const abono = abonosFiltrados.find(t => t.nombre.toLowerCase() === "abono");
      if (abono) {
        setTarifaSeleccionadaId(abono._id);
        setTarifaSeleccionada(abono);
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

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (files && files.length > 0) {
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

    if (!tarifaSeleccionada) {
      alert("Por favor seleccioná una tarifa.");
      return;
    }

    const dias = Number(tarifaSeleccionada.dias);
    if (isNaN(dias)) {
      alert("La duración no es un número válido");
      return;
    }

    try {
      // Obtener precios y monto
      const preciosResponse = await fetch("http://localhost:5000/api/precios");
      const precios = await preciosResponse.json();

      const tipo = formData.tipoVehiculo.toLowerCase();
      const precioTipo = precios[tipo];
      const monto = precioTipo.abono; // asumimos que ahí está el precio correcto

      // Crear FormData para enviar al backend
      const data = new FormData();

      for (const key in formData) {
        data.append(key, formData[key]);
      }
      console.log(tarifaSeleccionada)
      data.append("nombreTarifa", tarifaSeleccionada.nombre);
      data.append("diasTarifa", tarifaSeleccionada.dias.toString());
      data.append("tarifaSeleccionada", JSON.stringify(tarifaSeleccionada));
      data.append("precio", monto);
      data.append("tipoTarifa", "abono"); // o la que corresponda

      // Enviar el abono al backend
      const abonoResponse = await fetch("http://localhost:5000/api/abonos/registrar-abono", {
        method: "POST",
        body: data,
      });

      if (!abonoResponse.ok) {
        alert("Error al guardar el abono.");
        return;
      }

      const abonoCreado = await abonoResponse.json();

      // Registrar movimiento general (Caja)
      const movimientoBody = {
        patente: formData.patente,
        operador: "Carlos",
        tipoVehiculo: formData.tipoVehiculo,
        metodoPago: formData.metodoPago,
        factura: formData.factura,
        monto,
        descripcion: "Pago por Abono",
        tipoTarifa: "abono",
      };

      const movimientoResponse = await fetch("http://localhost:5000/api/movimientos/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movimientoBody),
      });

      if (!movimientoResponse.ok) {
        alert("Abono guardado, pero falló el registro del movimiento en la caja.");
        return;
      }

      // Registrar movimiento cliente: Cobro (-)
      const movimientoCobro = {
        nombreApellido: formData.nombreApellido,
        email: formData.email,
        descripcion: "Abono abono",
        monto: -monto,
        tipo: "Cobro",
        operador: "Carlos",
        patente: formData.patente,
      };

      const cobroResponse = await fetch("http://localhost:5000/api/movimientosclientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movimientoCobro),
      });

      if (!cobroResponse.ok) {
        alert("Error al registrar el movimiento de cobro del cliente.");
        return;
      }

      // Registrar movimiento cliente: Pago (+)
      const movimientoPago = {
        nombreApellido: formData.nombreApellido,
        email: formData.email,
        descripcion: "Abono abono",
        monto,
        tipo: "Pago",
        operador: "Carlos",
        patente: formData.patente,
      };

      const pagoResponse = await fetch("http://localhost:5000/api/movimientosclientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movimientoPago),
      });

      if (!pagoResponse.ok) {
        alert("Cobro registrado, pero falló el registro del pago del cliente.");
        return;
      }

      alert("Abono, movimiento de caja y movimientos de cliente registrados exitosamente.");
    } catch (error) {
      console.error("Error al registrar:", error);
      alert("Ocurrió un error al registrar el abono.");
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
        <div className="selectorTarifa">
          <select
            name="tarifaSeleccionada"
            value={tarifaSeleccionadaId}
            onChange={handleAbonoChange}
            className="select-style-tarifa"
          >
            <option value="" disabled hidden>-- Elegí una tarifa --</option>
            {abonos.map((tarifa) => (
              <option key={tarifa._id} value={tarifa._id}>
                {tarifa.nombre} ({tarifa.dias} días)
              </option>
            ))}
          </select>
        </div>
        <div className="grid-3cols">
          <div><label>Nombre y Apellido</label><input type="text" name="nombreApellido" value={formData.nombreApellido} onChange={handleChange} /></div>
          <div><label>Domicilio</label><input type="text" name="domicilio" value={formData.domicilio} onChange={handleChange} /></div>
          <div><label>Localidad</label><input type="text" name="localidad" value={formData.localidad} onChange={handleChange} /></div>
          <div><label>Tel. Particular</label><input type="text" name="telefonoParticular" value={formData.telefonoParticular} onChange={handleChange} /></div>
          <div><label>Tel. Emergencia</label><input type="text" name="telefonoEmergencia" value={formData.telefonoEmergencia} onChange={handleChange} /></div>
          <div><label>Domicilio Trabajo</label><input type="text" name="domicilioTrabajo" value={formData.domicilioTrabajo} onChange={handleChange} /></div>
          <div><label>Tel. Trabajo</label><input type="text" name="telefonoTrabajo" value={formData.telefonoTrabajo} onChange={handleChange} /></div>
          <div><label>Email</label><input type="email" name="email" value={formData.email} onChange={handleChange} /></div>
        </div>

        <div className="grid-4cols fotos-grid">
          {renderFileInput("Foto Seguro", "fotoSeguro")}
          {renderFileInput("Foto DNI", "fotoDNI")}
          {renderFileInput("Foto Céd. Verde", "fotoCedulaVerde")}
          {renderFileInput("Foto Céd. Azul", "fotoCedulaAzul")}
        </div>

        <div className="grid-3cols">
          <div><label>Patente</label><input type="text" name="patente" value={formData.patente} onChange={handleChange} /></div>
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
              <option value="No">No</option>
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
