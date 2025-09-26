import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import './DetalleClienteCajero.css';
import ModalVehiculoCajero from './ModalVehiculoCajero';
import ModalMensaje from '../ModalMensaje/ModalMensaje';

function DetalleClienteCajero({ clienteId, volver }) {
  const [cliente, setCliente] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [vehiculoExpandido, setVehiculoExpandido] = useState(null);
  const [modalFotoUrl, setModalFotoUrl] = useState(null);
  const [modalAgregarVisible, setModalAgregarVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalRenovarVisible, setModalRenovarVisible] = useState(false);
  const [precioRenovacion, setPrecioRenovacion] = useState(0);
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [factura, setFactura] = useState('CC');
  const [diasRestantes, setDiasRestantes] = useState(0);
  const [mensajeModal, setMensajeModal] = useState(null);

  // === Estado y lógica del modal de edición ===
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

  // === Helpers de estado de abono (derivado por fecha) ===
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

  const cargarCliente = async () => {
    try {
      if (!clienteId) {
        setError('No se proporcionó un ID de cliente');
        return;
      }

      const response = await fetch(`http://localhost:5000/api/clientes/id/${clienteId}`, {
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
    } catch (error) {
      console.error('Error al cargar cliente:', error);
      setError(error.message || 'Error al cargar el cliente');
      setCliente(null);
    } finally {
      setCargando(false);
    }
  };

  const calcularPrecioProporcional = (precioMensual) => {
    const hoy = new Date();
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const totalDiasMes = ultimoDiaMes.getDate();
    const diaActual = hoy.getDate();
    const diasRestantesCalculados = totalDiasMes - diaActual + 1;

    setDiasRestantes(diasRestantesCalculados);

    if (diaActual === 1) {
      return precioMensual;
    }

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

      const response = await fetch('http://localhost:5000/api/precios', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener precios');
      }

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

      const response = await fetch(`http://localhost:5000/api/clientes/${clienteId}/renovar-abono`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          precio: precioRenovacion,
          metodoPago,
          factura,
          operador,
          patente,
          tipoVehiculo: tipo,
          diasRestantes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al renovar abono');
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

  useEffect(() => {
    cargarCliente();
  }, [clienteId]);

  useEffect(() => {
    const interval = setInterval(() => {
      cargarCliente();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatearFechaCorta = (fechaISO) => {
    if (!fechaISO) return '---';
    const fecha = new Date(fechaISO);
    const dia = fecha.getDate().toString().padStart(2, '0');
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const anio = fecha.getFullYear().toString().slice(-2);
    return `${dia}/${mes}/${anio}`;
  };

  const capitalizeFirstLetter = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '---';

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
      rutaFoto = `http://localhost:5000${raw}`;
    } else if (raw.startsWith('/fotos/')) {
      rutaFoto = `http://localhost:5000/uploads${raw}`;
    } else {
      rutaFoto = `http://localhost:5000/uploads/fotos/${raw}`;
    }

    const urlConTimestamp = `${rutaFoto}?t=${Date.now()}`;
    setModalFotoUrl(urlConTimestamp);
  };

  const cerrarModal = () => setModalFotoUrl(null);

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

  // ===== Modal Edición: helpers =====
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
    if (
      editForm.telefonoParticular &&
      !/^[0-9+\s()-]{6,}$/.test(editForm.telefonoParticular)
    ) return 'Teléfono particular inválido.';
    if (
      editForm.telefonoEmergencia &&
      !/^[0-9+\s()-]{6,}$/.test(editForm.telefonoEmergencia)
    ) return 'Teléfono de emergencia inválido.';
    if (
      editForm.telefonoTrabajo &&
      !/^[0-9+\s()-]{6,}$/.test(editForm.telefonoTrabajo)
    ) return 'Teléfono de trabajo inválido.';
    return '';
  };

  const saveEdit = async () => {
    const v = validateEdit();
    if (v) {
      setEditError(v);
      return;
    }
    try {
      setEditSaving(true);
      setEditError('');
      const res = await fetch(`http://localhost:5000/api/clientes/${clienteId}`, {
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

  if (cargando) {
    return <div className="detalle-cliente-cajero">Cargando...</div>;
  }

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

  return (
    <div className="detalle-cliente-cajero">
      <div className="header-detalle header-detalle--space">
        <div className="header-left">
          <button onClick={volver} className="btn-volver"><FaArrowLeft /></button>
          <h2>{cliente.nombreApellido}</h2>
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
            <button
              className="btn-renovar"
              onClick={calcularPrecioRenovacion}
            >
              RENOVAR
            </button>
          )}
        </div>
      </div>

      <div className="vehiculos-header">
        <h3>Vehículos ({cliente.abonos?.length || 0})</h3>
        <button
          className="btn-agregar-vehiculo"
          onClick={() => setModalAgregarVisible(true)}
          aria-label="Agregar vehículo"
        >
          <FaPlus />
        </button>
      </div>

      <div className="vehiculos-section">
        {cliente.abonos?.length > 0 ? (
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
              {cliente.abonos.map((abono) => {
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
                            <div className="detalles-adicionales">
                              <p><strong>Color:</strong> {capitalizeFirstLetter(abono.color)}</p>
                              <p><strong>Seguro:</strong> {capitalizeFirstLetter(abono.companiaSeguro)}</p>
                            </div>
                            <div className="botones-documentos">
                              <button onClick={() => abrirFoto(abono, 'dni')}>DNI</button>
                              <button onClick={() => abrirFoto(abono, 'seguro')}>Seguro</button>
                              <button onClick={() => abrirFoto(abono, 'cedulaVerde')}>Céd. Verde</button>
                              <button onClick={() => abrirFoto(abono, 'cedulaAzul')}>Céd. Azul</button>
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

      {modalRenovarVisible && (
        <div className="modal-renovar-overlay" onClick={() => setModalRenovarVisible(false)}>
          <div className="modal-renovar-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setModalRenovarVisible(false)}>
              &times;
            </button>

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

            <button
              onClick={handleRenovarAbono}
              className="btn-confirmar"
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Confirmar Renovación'}
            </button>
          </div>
        </div>
      )}

      {/* Modal para ver fotos */}
      {modalFotoUrl && (
        <div className="modal-foto-overlay" onClick={cerrarModal}>
          <div className="modal-foto-content" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={cerrarModal}>&times;</button>
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
                    cerrarModal();
                  }
                });
              }}
            />
          </div>
        </div>
      )}

      {/* Modal de mensajes generales */}
      {mensajeModal && (
        <ModalMensaje
          titulo={mensajeModal.titulo}
          mensaje={mensajeModal.mensaje}
          onClose={mensajeModal.onClose}
        />
      )}

      {/* Modal de Edición (usando ModalMensaje con children) */}
      {editOpen && (
        <ModalMensaje
          titulo="Editar Cliente"
          mensaje="Modificá los datos y guardá."
          onClose={() => setEditOpen(false)}
        >
          <div className="edit-form">
            <div className="grid-2">
              <div className="form-item">
                <label>Nombre y Apellido</label>
                <input
                  name="nombreApellido"
                  type="text"
                  value={editForm.nombreApellido}
                  onChange={handleEditChange}
                  autoFocus
                />
              </div>
              <div className="form-item">
                <label>DNI / CUIT / CUIL</label>
                <input
                  name="dniCuitCuil"
                  type="text"
                  value={editForm.dniCuitCuil}
                  onChange={handleEditChange}
                />
              </div>
              <div className="form-item">
                <label>Email</label>
                <input
                  name="email"
                  type="email"
                  value={editForm.email}
                  onChange={handleEditChange}
                />
              </div>
              <div className="form-item">
                <label>Localidad</label>
                <input
                  name="localidad"
                  type="text"
                  value={editForm.localidad}
                  onChange={handleEditChange}
                />
              </div>
              <div className="form-item">
                <label>Domicilio</label>
                <input
                  name="domicilio"
                  type="text"
                  value={editForm.domicilio}
                  onChange={handleEditChange}
                />
              </div>
              <div className="form-item">
                <label>Domicilio de Trabajo</label>
                <input
                  name="domicilioTrabajo"
                  type="text"
                  value={editForm.domicilioTrabajo}
                  onChange={handleEditChange}
                />
              </div>
              <div className="form-item">
                <label>Tel. Particular</label>
                <input
                  name="telefonoParticular"
                  type="text"
                  value={editForm.telefonoParticular}
                  onChange={handleEditChange}
                />
              </div>
              <div className="form-item">
                <label>Tel. Emergencia</label>
                <input
                  name="telefonoEmergencia"
                  type="text"
                  value={editForm.telefonoEmergencia}
                  onChange={handleEditChange}
                />
              </div>
              <div className="form-item">
                <label>Tel. Trabajo</label>
                <input
                  name="telefonoTrabajo"
                  type="text"
                  value={editForm.telefonoTrabajo}
                  onChange={handleEditChange}
                />
              </div>
            </div>

            {editError && <div className="form-error">{editError}</div>}

            <div className="edit-actions">
              <button className="btn-secundario" onClick={() => setEditOpen(false)} disabled={editSaving}>
                Cancelar
              </button>
              <button className="btn-primario" onClick={saveEdit} disabled={editSaving}>
                {editSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </ModalMensaje>
      )}
    </div>
  );
}

export default DetalleClienteCajero;
