import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaPlus } from 'react-icons/fa';
import './DetalleClienteCajero.css';
import ModalVehiculoCajero from './ModalVehiculoCajero';

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

  const cargarCliente = async () => {
    try {
      if (!clienteId) {
        setError('No se proporcionó un ID de cliente');
        return;
      }

      const response = await fetch(`https://api.garageia.com/api/clientes/id/${clienteId}`, {
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
    
    // Si es el primer día del mes, cobrar el precio completo
    if (diaActual === 1) {
      return precioMensual;
    }
    
    // Calcular precio proporcional
    return Math.round((precioMensual / totalDiasMes) * diasRestantesCalculados);
  };

  const calcularPrecioRenovacion = async () => {
    try {
      if (!cliente) return;

      // Verificar si el cliente tiene vehículos registrados
      if (!cliente.abonos || cliente.abonos.length === 0) {
        alert('El cliente no tiene vehículos registrados. Agregue un vehículo primero.');
        setModalAgregarVisible(true);
        return;
      }

      // Obtener precios actuales
      const response = await fetch('https://api.garageia.com/api/precios', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Error al obtener precios');
      }
      
      const precios = await response.json();
      const precioMensual = precios[cliente.precioAbono]?.mensual || 0;
      const precioProporcional = calcularPrecioProporcional(precioMensual);
      
      setPrecioRenovacion(precioProporcional);
      setModalRenovarVisible(true);
      
    } catch (error) {
      console.error('Error al calcular precio:', error);
      alert('Error al calcular precio de renovación');
    }
  };

  const registrarMovimientos = async (patente, monto, descripcion) => {
    try {
      const token = localStorage.getItem('token');
      const operador = localStorage.getItem('nombreUsuario') || 'Cajero';
      
      // Registrar movimiento general
      const movimientoData = {
        patente,
        operador,
        tipoVehiculo: cliente.precioAbono,
        metodoPago,
        factura,
        monto,
        descripcion,
        tipoTarifa: 'abono'
      };

      const movimientoRes = await fetch('https://api.garageia.com/api/movimientos/registrar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(movimientoData),
      });

      if (!movimientoRes.ok) throw new Error('Error al registrar movimiento');

      // Registrar movimiento del cliente
      const movimientoClienteData = {
        nombreApellido: cliente.nombreApellido,
        email: cliente.email || '',
        descripcion,
        monto,
        tipoVehiculo: cliente.precioAbono,
        operador,
        patente,
      };
      
      await fetch('https://api.garageia.com/api/movimientosclientes', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(movimientoClienteData),
      });

    } catch (error) {
      console.error("Error al registrar movimientos:", error);
      throw error;
    }
  };

  const handleRenovarAbono = async () => {
    try {
      setLoading(true);
      
      const operador = localStorage.getItem('nombreUsuario') || 'Cajero';
      const patente = cliente.abonos?.[0]?.patente || 'N/A';
      const descripcion = `Renovación abono ${cliente.precioAbono}`;
      
      // 1. Renovar el abono en el backend
      const response = await fetch(`https://api.garageia.com/api/clientes/${clienteId}/renovar-abono`, {
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
          tipoVehiculo: cliente.precioAbono,
          diasRestantes
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al renovar abono');
      }

      // 2. Registrar los movimientos
      await registrarMovimientos(patente, precioRenovacion, descripcion);

      // 3. Actualizar los datos del cliente
      await cargarCliente();
      
      setModalRenovarVisible(false);
      alert('Abono renovado exitosamente');
      
    } catch (error) {
      console.error('Error al renovar abono:', error);
      alert(error.message || 'Error al renovar abono');
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
      alert('Tipo de foto desconocido.');
      return;
    }

    const nombre = abono[campo];

    if (!nombre || nombre === '') {
      return alert('No hay foto disponible');
    }

    const nombreDecodificado = decodeURIComponent(nombre);

    let rutaFoto;
    if (nombreDecodificado.startsWith('/fotos/')) {
      rutaFoto = `https://api.garageia.com/uploads${nombreDecodificado}`;
    } else {
      rutaFoto = `https://api.garageia.com/uploads/fotos/${nombreDecodificado}`;
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

  return (
    <div className="detalle-cliente-cajero">
      <div className="header-detalle">
        <button onClick={volver} className="btn-volver"><FaArrowLeft /></button>
        <h2>{cliente.nombreApellido}</h2>
      </div>

      <div className="status-abono-container">
        <div className={`status-abono ${cliente.abonado ? 'activo' : 'inactivo'}`}>
          {cliente.abonado ? (
            <>
              <span className="status-text">ABONADO HASTA</span>
              <span className="status-fecha">{formatearFechaCorta(cliente.finAbono)}</span>
            </>
          ) : (
            <span className="status-text">ABONO EXPIRADO</span>
          )}
          {!cliente.abonado && (
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
                <p><strong>Tipo de vehículo:</strong> {cliente.precioAbono}</p>
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
                alert('No se pudo cargar la imagen. Por favor intente nuevamente.');
                cerrarModal();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DetalleClienteCajero;