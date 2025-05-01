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

  const calcularFechaExpiracion = (fecha) => {
    const fechaCreacion = new Date(fecha);
    fechaCreacion.setMonth(fechaCreacion.getMonth() + 1);
    const lastDay = new Date(fechaCreacion.getFullYear(), fechaCreacion.getMonth() + 1, 0).getDate();
    if (fechaCreacion.getDate() > lastDay) {
      fechaCreacion.setDate(lastDay);
    }
    return fechaCreacion.toISOString().split("T")[0];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fechaExpiracion = calcularFechaExpiracion(new Date());
    const data = new FormData();

    for (const key in formData) {
      data.append(key, formData[key]);
    }
    data.append("fechaExpiracion", fechaExpiracion);

    try {
      // 1. Obtener precios desde la API
      const preciosResponse = await fetch("http://localhost:5000/api/precios");
      if (!preciosResponse.ok) {
        alert("Error al obtener los precios.");
        return;
      }
      const precios = await preciosResponse.json();

      // 2. Obtener el monto según tipo de vehículo
      const tipo = formData.tipoVehiculo.toLowerCase();
      const precioTipo = precios[tipo];
      if (!precioTipo || !precioTipo.mensual) {
        alert("No se encontró el precio mensual para el tipo de vehículo seleccionado.");
        return;
      }

      const monto = precioTipo.mensual;

      // 3. Crear el abono
      const abonoResponse = await fetch("http://localhost:5000/api/abonos", {
        method: "POST",
        body: data,
      });

      if (!abonoResponse.ok) {
        alert("Error al guardar el abono.");
        return;
      }

      // 4. Registrar el movimiento
      const movimientoBody = {
        patente: formData.patente,
        operador: "Carlos",
        tipoVehiculo: formData.tipoVehiculo,
        metodoPago: formData.metodoPago,
        factura: formData.factura,
        monto,
        descripcion: "Pago por Mensual",
        tipoTarifa: "mensual",
      };

      const movimientoResponse = await fetch("http://localhost:5000/api/movimientos/registrar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(movimientoBody),
      });

      if (!movimientoResponse.ok) {
        console.error("Error al registrar el movimiento");
        alert("Abono guardado, pero falló el registro del movimiento.");
        return;
      }

      alert("Abono y movimiento guardados exitosamente.");

      // 5. Resetear formulario
      setFormData({
        nombreApellido: "",
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
        metodoPago: "",
        factura: "",
        tipoVehiculo: "",
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

    } catch (err) {
      console.error("Error de conexión:", err);
      alert("Error de conexión.");
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
