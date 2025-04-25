import React, { useState } from "react";
import { FaCamera, FaCheckCircle } from "react-icons/fa";
import './DatosAutoAbono.css';

function DatosAutoAbono() {
  const [formData, setFormData] = useState({
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

    // Añadimos todos los datos de formData a FormData
    for (const key in formData) {
      data.append(key, formData[key]);
    }

    data.append("fechaExpiracion", fechaExpiracion);

    // Verificando el contenido de 'data' antes de enviar
    for (let [key, value] of data.entries()) {
      console.log("Archivo enviado o valor de campo:", key, value);
    }

    try {
      const response = await fetch("http://localhost:5000/api/abonos", {
        method: "POST",
        body: data,
      });

      if (response.ok) {
        alert("Abono guardado exitosamente.");
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
      } else {
        alert("Error al guardar el abono.");
      }
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
      <h2>Nuevo Abono</h2>
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

        <button type="submit">Guardar Abono</button>
      </form>
    </div>
  );
}

export default DatosAutoAbono;
