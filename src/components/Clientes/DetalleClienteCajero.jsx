// DetalleClienteCajero.jsx
import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaPlus, FaTrashAlt, FaEdit } from 'react-icons/fa';
import './DetalleClienteCajero.css';
import ModalVehiculoCajero from './ModalVehiculoCajero';
import ModalMensaje from '../ModalMensaje/ModalMensaje';

const API_BASE = 'http://localhost:5000';
const API_PRECIOS = `${API_BASE}/api/precios`;
const API_CLIENTES = `${API_BASE}/api/clientes`;
const API_ABONOS = `${API_BASE}/api/abonos`;
const API_VEHICULOS = `${API_BASE}/api/vehiculos`; // 👈 ya lo tenías

function DetalleClienteCajero({ clienteId, volver }) {
  const [cliente, setCliente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [vehiculoExpandido, setVehiculoExpandido] = useState(null);

  // Modales
  const [modalFotoUrl, setModalFotoUrl] = useState(null);
  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [modalRenovarVisible, setModalRenovarVisible] = useState(false);
  const [mensajeModal, setMensajeModal] = useState(null);

  // Renovación
  const [loading, setLoading] = useState(false);
  const [precioRenovacion, setPrecioRenovacion] = useState(0);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [factura, setFactura] = useState('CC');
  const [diasRestantes, setDiasRestantes] = useState(0);

  // Modal editar datos del cliente
  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editForm, setEditForm] = useState({
    nombreApellido: '',
    dniCuitCuil: '',
    email: '',
    domicilio: '',
    localidad: '',
    domicilioTrabajo: '',
    telefonoParticular: '',
    telefonoEmergencia: '',
    telefonoTrabajo: '',
  });

  // Modal editar "vehículo" (en realidad actualiza campos del ABONO)
  const [vehEditOpen, setVehEditOpen] = useState(false);
  const [vehEditSaving, setVehEditSaving] = useState(false);
  const [vehEditError, setVehEditError] = useState('');
  const [vehEditAbonoId, setVehEditAbonoId] = useState(null);
  const [vehEditForm, setVehEditForm] = useState({
    patente: '',
    marca: '',
    modelo: '',
    anio: '',
    color: '',
    tipoVehiculo: '',
    companiaSeguro: '',
  });

  // Modal confirmación eliminar vehículo
  const [confirmDel, setConfirmDel] = useState(null); // { abonoId, patente }

  // Form alta vehículo (lo usás en ModalVehiculoCajero)
  const [formData, setFormData] = useState({
    patente: '',
    marca: '',
    modelo: '',
    anio: '',
    color: '',
    tipoVehiculo: '',
    companiaSeguro: '',
    metodoPago: '',
    factura: '',
    fotoDNI: null,
    fotoSeguro: null,
    fotoCedulaVerde: null,
    fotoCedulaAzul: null,
  });

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
        setError('No se proporcionó un ID de cliente');
        return;
      }
      const response = await fetch(`${API_CLIENTES}/id/${clienteId}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al cargar cliente');
      }
      const data = await response.json();
      setCliente(data);
      setError(null);
    } catch (err) {
      console.error('Error al cargar cliente:', err);
      setError(err.message || 'Error al cargar el cliente');
      setCliente(null);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarCliente();
  }, [clienteId]);

  useEffect(() => {
    const interval = setInterval(() => {
      cargarCliente();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  /* =================== Formateos y labels =================== */
  const formatearFechaCorta = (fechaISO) => {
    if (!fechaISO) return '---';
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear().toString().slice(-2);
    return `${dia}/${mes}/${anio}`;
  };

  const capitalizeFirstLetter = (str) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '---';

  const normalize = (s) => (s || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const getCocheraLabel = (cli) => {
    if (!cli) return null;
    const cocheraRaw = cli.cochera ?? cli.abonos?.[0]?.cochera ?? '';
    const exclusivaRaw = (typeof cli.exclusiva === 'boolean') ? cli.exclusiva : !!cli.abonos?.[0]?.exclusiva;

    const c = normalize(cocheraRaw);
    if (c === 'movil' || c === 'móvil') return 'COCHERA MOVIL';
    if (c === 'fija') return exclusivaRaw ? 'COCHERA EXCLUSIVA' : 'COCHERA FIJA';
    return null;
  };

  const getPisoFromCliente = (cli) => {
    if (!cli) return null;
    const directo = (cli.piso ?? cli.pisoAbono);
    if (directo !== undefined && directo !== null && directo !== '') return String(directo);
    if (Array.isArray(cli.abonos) && cli.abonos.length) {
      const withPiso = cli.abonos.find(a => a && a.piso !== undefined && a.piso !== null && a.piso !== '');
      if (withPiso) return String(withPiso.piso);
    }
    return null;
  };

  /* =================== Fotos documentos =================== */
  const abrirFoto = (abono, tipoFoto) => {
    const camposValidos = {
      dni: 'fotoDNI',
      seguro: 'fotoSeguro',
      cedulaVerde: 'fotoCedulaVerde',
      cedulaAzul: 'fotoCedulaAzul'
    };
    const campo = camposValidos[tipoFoto];
    if (!campo) {
      setMensajeModal({
        titulo: 'Error',
        mensaje: 'Tipo de foto desconocido',
        onClose: () => setMensajeModal(null)
      });
      return;
    }
    const nombre = abono[campo];
    if (!nombre || nombre === '') {
      setMensajeModal({
        titulo: 'Aviso',
        mensaje: 'No hay foto disponible',
        onClose: () => setMensajeModal(null)
      });
      return;
    }
    const raw = decodeURIComponent(nombre).trim();
    let rutaFoto;
    if (/^https?:\/\//i.test(raw)) {
      rutaFoto = raw;
    } else if (raw.startsWith('/uploads/')) {
      rutaFoto = `${API_BASE}${raw}`;
    } else if (raw.startsWith('/fotos/')) {
      rutaFoto = `${API_BASE}/uploads${raw}`;
    } else {
      rutaFoto = `${API_BASE}/uploads/fotos/${raw}`;
    }
    const urlConTimestamp = `${rutaFoto}?t=${Date.now()}`;
    setModalFotoUrl(urlConTimestamp);
  };
  const cerrarModalFoto = () => setModalFotoUrl(null);

  /* =================== Renovación =================== */
  const calcularPrecioProporcional = (precioMensual) => {
    const hoy = new Date();
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const totalDiasMes = ultimoDiaMes.getDate();
    const diaActual = hoy.getDate();
    const diasRestantesCalculados = totalDiasMes - diaActual + 1;
    setDiasRestantes(diasRestantesCalculados);
    if (diaActual === 1) return precioMensual;
    return Math.round((precioMensual / totalDiasMes) * diasRestantesCalculados);
  };

  const calcularPrecioRenovacion = async () => {
    try {
      if (!cliente) return;
      if (!cliente.abonos || cliente.abonos.length === 0) {
        setMensajeModal({
          titulo: 'Atención',
          mensaje: 'El cliente no tiene vehículos registrados. Agregue un vehículo primero.',
          onClose: () => {
            setMensajeModal(null);
            setModalAgregarVisible(true);
          }
        });
        return;
      }
      const response = await fetch(API_PRECIOS, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (!response.ok) throw new Error('Error al obtener precios');
      const precios = await response.json();
      const tipo = (cliente.precioAbono || cliente.abonos?.[0]?.tipoVehiculo || '').toLowerCase();
      const precioMensual = precios?.[tipo]?.mensual || 0;
      const precioProporcional = calcularPrecioProporcional(precioMensual);
      setPrecioRenovacion(precioProporcional);
      setModalRenovarVisible(true);
    } catch (error) {
      console.error('Error al calcular precio:', error);
      setMensajeModal({
        titulo: 'Error',
        mensaje: 'Error al calcular precio de renovación',
        onClose: () => setMensajeModal(null)
      });
    }
  };

  const handleRenovarAbono = async () => {
    try {
      setLoading(true);
      const operador = localStorage.getItem('nombreUsuario') || 'Cajero';
      const patente = cliente.abonos?.[0]?.patente || 'N/A';
      const tipo = (cliente.precioAbono || cliente.abonos?.[0]?.tipoVehiculo || '');
      const response = await fetch(`${API_ABONOS}/renovar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          clienteId,
          metodoPago,
          factura,
          operador,
          patente,
          cochera: cliente.abonos?.[0]?.cochera || 'Móvil',
          exclusiva: !!cliente.abonos?.[0]?.exclusiva,
          mesesAbonar: 1,
          tipoVehiculo: tipo
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.message || errorData?.error || 'Error al renovar abono');
      }
      await cargarCliente();
      setModalRenovarVisible(false);
      setMensajeModal({
        titulo: 'Éxito',
        mensaje: 'Abono renovado exitosamente',
        onClose: () => setMensajeModal(null)
      });
    } catch (error) {
      console.error('Error al renovar abono:', error);
      setMensajeModal({
        titulo: 'Error',
        mensaje: error.message || 'Error al renovar abono',
        onClose: () => setMensajeModal(null)
      });
    } finally {
      setLoading(false);
    }
  };

  /* =================== Alta vehículo =================== */
  const handleGuardarExitoso = async () => {
    setLoading(true);
    try {
      await cargarCliente();
    } finally {
      setLoading(false);
      setModalAgregarVisible(false);
      setFormData({
        patente: '',
        marca: '',
        modelo: '',
        anio: '',
        color: '',
        tipoVehiculo: '',
        companiaSeguro: '',
        metodoPago: '',
        factura: '',
        fotoDNI: null,
        fotoSeguro: null,
        fotoCedulaVerde: null,
        fotoCedulaAzul: null,
      });
    }
  };

  /* =================== Editar datos del cliente =================== */
  const openEditModal = () => {
    if (!cliente) return;
    setEditError('');
    setEditForm({
      nombreApellido: cliente.nombreApellido || '',
      dniCuitCuil: cliente.dniCuitCuil || '',
      email: cliente.email || '',
      domicilio: cliente.domicilio || '',
      localidad: cliente.localidad || '',
      domicilioTrabajo: cliente.domicilioTrabajo || '',
      telefonoParticular: cliente.telefonoParticular || '',
      telefonoEmergencia: cliente.telefonoEmergencia || '',
      telefonoTrabajo: cliente.telefonoTrabajo || '',
    });
    setEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const validateEdit = () => {
    if (!editForm.nombreApellido.trim()) return 'El nombre y apellido es obligatorio.';
    if (!editForm.dniCuitCuil.trim()) return 'El DNI/CUIT/CUIL es obligatorio.';
    if (editForm.email && !/^\S+@\S+\.\S+$/.test(editForm.email)) return 'Email inválido.';
    const telOk = (t) => !t || /^[0-9+\s()-]{6,}$/.test(t);
    if (!telOk(editForm.telefonoParticular)) return 'Teléfono particular inválido.';
    if (!telOk(editForm.telefonoEmergencia)) return 'Teléfono de emergencia inválido.';
    if (!telOk(editForm.telefonoTrabajo)) return 'Teléfono de trabajo inválido.';
    return '';
  };

  const saveEdit = async () => {
    const v = validateEdit();
    if (v) { setEditError(v); return; }
    try {
      setEditSaving(true);
      setEditError('');
      const res = await fetch(`${API_CLIENTES}/${clienteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'No se pudo actualizar el cliente');
      setEditOpen(false);
      setMensajeModal({
        titulo: 'Guardado',
        mensaje: 'Cliente actualizado correctamente.',
        onClose: async () => {
          setMensajeModal(null);
          await cargarCliente();
        }
      });
    } catch (err) {
      console.error(err);
      setEditError(err.message || 'Error inesperado al actualizar');
    } finally {
      setEditSaving(false);
    }
  };

  /* =================== Editar / Eliminar vehículo -> ABONOS =================== */
  const openEditVehiculo = (abono) => {
    if (!abono) return;
    setVehEditError('');
    setVehEditAbonoId(abono._id);
    setVehEditForm({
      patente: abono.patente || '',
      marca: abono.marca || '',
      modelo: abono.modelo || '',
      anio: abono.anio || '',
      color: abono.color || '',
      tipoVehiculo: abono.tipoVehiculo || '',
      companiaSeguro: abono.companiaSeguro || '',
    });
    setVehEditOpen(true);
  };

  const handleVehEditChange = (e) => {
    const { name, value } = e.target;
    setVehEditForm(prev => ({ ...prev, [name]: value }));
  };

  const validateVehEdit = () => {
    if (!vehEditForm.patente.trim()) return 'La patente es obligatoria.';
    if (!vehEditForm.tipoVehiculo.trim()) return 'El tipo de vehículo es obligatorio.';
    if (vehEditForm.anio && !/^\d{4}$/.test(String(vehEditForm.anio))) return 'Año inválido (formato 4 dígitos).';
    return '';
  };

  const saveVehiculo = async () => {
    const v = validateVehEdit();
    if (v) { setVehEditError(v); return; }
    if (!vehEditAbonoId) {
      setVehEditError('No se pudo identificar el abono/vehículo a editar.');
      return;
    }
    try {
      setVehEditSaving(true);
      setVehEditError('');

      // 1) Actualizo el ABONO
      const payload = {
        patente: (vehEditForm.patente || '').toUpperCase(),
        marca: vehEditForm.marca || '',
        modelo: vehEditForm.modelo || '',
        anio: vehEditForm.anio ? Number(vehEditForm.anio) : undefined,
        color: vehEditForm.color || '',
        tipoVehiculo: vehEditForm.tipoVehiculo || '',
        companiaSeguro: vehEditForm.companiaSeguro || '',
      };
      const res = await fetch(`${API_ABONOS}/${vehEditAbonoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // muestra mensaje coherente, incluyendo 409
        throw new Error(data?.msg || data?.message || 'No se pudo actualizar el vehículo');
      }

      // 2) Sincronizar el VEHÍCULO con lo que quedó en el Abono
      //    PATCH /api/vehiculos/sync-from-abono/:abonoId
      try {
        const syncRes = await fetch(`${API_VEHICULOS}/sync-from-abono/${vehEditAbonoId}`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!syncRes.ok) {
          let syncErrBody = {};
          try { syncErrBody = await syncRes.json(); } catch (_) {}
          if (syncRes.status === 409) {
            setVehEditError(syncErrBody?.msg || 'Ya existe un vehículo con esa patente. Elegí otra.');
          } else {
            setVehEditError(syncErrBody?.msg || 'No se pudo sincronizar el vehículo. Intentá nuevamente.');
          }
          return; // dejo el modal abierto para corrección
        }
      } catch (syncErr) {
        console.error('Error sync vehiculo:', syncErr);
        setVehEditError('Se guardó el abono, pero hubo un error al sincronizar el vehículo.');
        return;
      }

      // Éxito
      setVehEditOpen(false);
      setMensajeModal({
        titulo: 'Guardado',
        mensaje: 'Vehículo/Abono actualizado correctamente.',
        onClose: async () => {
          setMensajeModal(null);
          await cargarCliente();
        }
      });
    } catch (err) {
      console.error(err);
      setVehEditError(err.message || 'Error inesperado al actualizar');
    } finally {
      setVehEditSaving(false);
    }
  };

  const askDeleteVehiculo = (abono) => {
    setConfirmDel({ abonoId: abono._id, patente: abono.patente || '' });
  };

  const deleteVehiculo = async () => {
    if (!confirmDel?.abonoId) return;
    try {
      setLoading(true);

      // 1) Desactivar el abono (activo=false)
      const res1 = await fetch(`${API_ABONOS}/${confirmDel.abonoId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ activo: false })
      });
      const data1 = await res1.json().catch(() => ({}));
      if (!res1.ok) throw new Error(data1?.msg || data1?.message || 'No se pudo desactivar el abono');

      // 2) Desabonarlo en Vehículos y sacarlo del array cliente.vehiculos
      const res2 = await fetch(`${API_VEHICULOS}/${encodeURIComponent(confirmDel.patente)}/abonado`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ abonado: false, detachFromCliente: true })
      });
      const data2 = await res2.json().catch(() => ({}));
      if (!res2.ok) throw new Error(data2?.msg || data2?.message || 'No se pudo actualizar el vehículo');

      // 3) (Opcional) Desvincular el vehículo del abono (si existe el endpoint)
      fetch(`${API_ABONOS}/${confirmDel.abonoId}/vehiculo`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ vehiculoId: null })
      }).catch(() => { /* es opcional */ });

      // 4) Optimistic UI
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
        titulo: 'Vehículo dado de baja',
        mensaje: 'Se desactivó el abono y se quitó el vehículo del listado.',
        onClose: async () => {
          setMensajeModal(null);
          await cargarCliente();
        }
      });
    } catch (err) {
      console.error(err);
      setMensajeModal({
        titulo: 'Error',
        mensaje: err.message || 'Error al dar de baja el vehículo',
        onClose: () => setMensajeModal(null)
      });
    } finally {
      setLoading(false);
    }
  };

  /* =================== Render =================== */
  if (cargando) return <div className="detalle-cliente-cajero">Cargando...</div>;

  if (error) {
    return (
      <div className="detalle-cliente-cajero">
        <div className="header-detalle">
          <h2>Error</h2>
          <button onClick={volver} className="btn-volver">← Volver a clientes</button>
        </div>
        <p className="error-message">{error}</p>
        <p>ID del cliente: {clienteId}</p>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="detalle-cliente-cajero">
        <div className="header-detalle">
          <h2>Cliente no encontrado</h2>
          <button onClick={volver} className="btn-volver">← Volver a clientes</button>
        </div>
        <p>No se encontró ningún cliente con el ID: {clienteId}</p>
      </div>
    );
  }

  const finDerivado = obtenerFinAbono(cliente);
  const abonoActivo = esAbonoActivo(cliente);
  const cocheraLabel = getCocheraLabel(cliente);
  const piso = getPisoFromCliente(cliente);

  // Solo listamos abonos activos
  const abonosActivos = Array.isArray(cliente.abonos)
    ? cliente.abonos.filter(a => a && a.activo !== false)
    : [];

  return (
    <div className="detalle-cliente-cajero">
      <div className="header-detalle header-detalle--space">
        <div className="header-left">
          <button onClick={volver} className="btn-volver"><FaArrowLeft /></button>
          <h2 className="titulo-cliente">{cliente.nombreApellido}</h2>
          {piso && (
            <span className="piso-square" title={`Piso ${piso}`} aria-label={`Piso ${piso}`}>
              N° de Cochera: {piso}
            </span>
          )}
        </div>
        <div className="header-actions">
          <button className="btn-editar" onClick={openEditModal} title="Editar datos del cliente">
            Editar
          </button>
        </div>
      </div>

      <div className="status-abono-container">
        <div className={`status-abono ${abonoActivo ? 'activo' : 'inactivo'}`}>
          {abonoActivo ? (
            <>
              <span className="status-text">ABONADO HASTA</span>
              <span className="status-fecha">{formatearFechaCorta(finDerivado)}</span>
            </>
          ) : (
            <span className="status-text">ABONO EXPIRADO</span>
          )}
          {!abonoActivo && (
            <button className="btn-renovar" onClick={calcularPrecioRenovacion}>RENOVAR</button>
          )}
        </div>
      </div>

      <div className="vehiculos-header">
        <div className="vehiculos-title">
          <h3>Vehículos ({abonosActivos.length})</h3>
          {cocheraLabel && (
            <span
              className={
                `cochera-badge ` +
                (cocheraLabel.includes('EXCLUSIVA') ? 'exclusiva' :
                 cocheraLabel.includes('FIJA') ? 'fija' : 'movil')
              }
              title={cocheraLabel}
            >
              {cocheraLabel}
            </span>
          )}
        </div>
        {/* <button
          className="btn-agregar-vehiculo"
          onClick={() => setModalAgregarVisible(true)}
          aria-label="Agregar vehículo"
          title="Agregar vehículo"
        >
          <FaPlus />
        </button> */}
      </div>

      <div className="vehiculos-section">
        {abonosActivos.length > 0 ? (
          <table className="tabla-vehiculos">
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
                      className="fila-vehiculo"
                    >
                      <td>{abono.patente?.toUpperCase() || '---'}</td>
                      <td>{capitalizeFirstLetter(abono.marca)}</td>
                      <td>{capitalizeFirstLetter(abono.modelo)}</td>
                      <td>{abono.anio || '---'}</td>
                      <td>{capitalizeFirstLetter(abono.tipoVehiculo)}</td>
                    </tr>
                    {expandido && (
                      <tr className="fila-expandida">
                        <td colSpan="5">
                          <div className="expandido-contenido">
                            <div className="expandido-left">
                              <div className="detalles-adicionales">
                                <p><strong>Color:</strong> {capitalizeFirstLetter(abono.color)}</p>
                                <p><strong>Seguro:</strong> {capitalizeFirstLetter(abono.companiaSeguro)}</p>
                              </div>
                              <div className="botones-documentos">
                                <button onClick={() => abrirFoto(abono, 'dni')}>DNI</button>
                                <button onClick={() => abrirFoto(abono, 'seguro')}>Seguro</button>
                                <button onClick={() => abrirFoto(abono, 'cedulaVerde')}>Céd. Verde</button>
                              </div>
                            </div>
                            <div className="expandido-right">
                              <div className="vehiculo-actions">
                                <button
                                  className="btn-vehiculo editar"
                                  onClick={(e) => { e.stopPropagation(); openEditVehiculo(abono); }}
                                  title="Editar vehículo"
                                >
                                  <FaEdit /> <span>Editar</span>
                                </button>
                                {/* <button
                                  className="btn-vehiculo eliminar"
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
          <div className="sin-vehiculos">
            <p>No hay vehículos registrados para este cliente.</p>
          </div>
        )}
      </div>

      {/* Alta vehículo */}
      {modalAgregarVisible && (
        <ModalVehiculoCajero
          visible={modalAgregarVisible}
          onClose={() => setModalAgregarVisible(false)}
          onGuardarExitoso={handleGuardarExitoso}
          formData={formData}
          setFormData={setFormData}
          loading={loading}
          cliente={cliente}
        />
      )}

      {/* Renovación */}
      {modalRenovarVisible && (
        <div className="modal-renovar-overlay" onClick={() => setModalRenovarVisible(false)}>
          <div className="modal-renovar-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setModalRenovarVisible(false)}>&times;</button>
            <div className="modal-renovar-header">
              <h3>Renovar Abono</h3>
            </div>
            <div className="detalles-renovacion">
              <p><strong>Tipo de vehículo:</strong> {cliente.precioAbono || cliente.abonos?.[0]?.tipoVehiculo || '---'}</p>
              <p><strong>Días restantes del mes:</strong> {diasRestantes}</p>
              <p><strong>Precio a cobrar:</strong> ${precioRenovacion}</p>
              <div className="form-group">
                <label>Método de pago:</label>
                <select
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Débito">Débito</option>
                  <option value="Crédito">Crédito</option>
                  <option value="QR">QR</option>
                </select>
              </div>
              <div className="form-group">
                <label>Tipo de factura:</label>
                <select
                  value={factura}
                  onChange={(e) => setFactura(e.target.value)}
                  className="form-control"
                  required
                >
                  <option value="CC">CC</option>
                  <option value="A">A</option>
                  <option value="Final">Final</option>
                </select>
              </div>
            </div>
            <button onClick={handleRenovarAbono} className="btn-confirmar" disabled={loading}>
              {loading ? 'Procesando...' : 'Confirmar Renovación'}
            </button>
          </div>
        </div>
      )}

      {/* Modal foto */}
      {modalFotoUrl && (
        <div className="modal-foto-overlay" onClick={cerrarModalFoto}>
          <div className="modal-foto-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={cerrarModalFoto}>&times;</button>
            <img
              src={modalFotoUrl}
              alt="Documento del cliente"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '';
                setMensajeModal({
                  titulo: 'Error',
                  mensaje: 'No se pudo cargar la imagen. Por favor intente nuevamente.',
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
          <div className="edit-form">
            <div className="grid-2">
              {/* ...campos... */}
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
            {editError && <div className="form-error">{editError}</div>}
            <div className="edit-actions">
              <button className="btn-secundario" onClick={() => setEditOpen(false)} disabled={editSaving}>Cancelar</button>
              <button className="btn-primario" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </ModalMensaje>
      )}

      {/* Modal Edición vehículo (campos del Abono) */}
      {vehEditOpen && (
        <ModalMensaje
          titulo="Editar Vehículo"
          mensaje="Actualizá los datos del vehículo."
          onClose={() => setVehEditOpen(false)}
        >
          <div className="edit-form">
            <div className="grid-2">
              {/* ...campos... */}
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
            {vehEditError && <div className="form-error">{vehEditError}</div>}
            <div className="edit-actions">
              <button className="btn-secundario" onClick={() => setVehEditOpen(false)} disabled={vehEditSaving}>Cancelar</button>
              <button className="btn-primario" onClick={saveVehiculo} disabled={vehEditSaving}>
                {vehEditSaving ? 'Guardando...' : 'Guardar vehículo'}
              </button>
            </div>
          </div>
        </ModalMensaje>
      )}

      {/* Modal confirmar eliminación vehículo */}
      {confirmDel && (
        <ModalMensaje
          titulo="Eliminar Vehículo"
          mensaje={`¿Seguro que querés dar de baja el vehículo ${confirmDel.patente || ''}? Esta acción lo quitará del abono y dejará de figurar como abonado.`}
          onClose={() => setConfirmDel(null)}
        >
          <div className="confirm-actions">
            <button className="btn-secundario" onClick={() => setConfirmDel(null)} disabled={loading}>
              Cancelar
            </button>
            <button className="btn-eliminar" onClick={deleteVehiculo} disabled={loading}>
              {loading ? 'Procesando...' : 'Dar de baja'}
            </button>
          </div>
        </ModalMensaje>
      )}
    </div>
  );
}

export default DetalleClienteCajero;
