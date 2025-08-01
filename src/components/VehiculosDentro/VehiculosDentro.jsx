import React, { useEffect, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import './VehiculosDentro.css';
import { useNavigate } from 'react-router-dom';
import ModalMensaje from '../ModalMensaje/ModalMensaje'; 

function ModalAudit({ titulo, onClose, children }) {
  return (
    <div className="modal-backdrop-audit">
      <div className="modal-contenedor-audit">
        <div className="modal-header-audit">
          <h2>{titulo}</h2>
          <button className="modal-cerrar-audit" onClick={onClose}>X</button>
        </div>
        <div className="modal-body-audit">
          {children}
        </div>
      </div>
    </div>
  );
}

function VehiculosDentro() {
  const [vehiculos, setVehiculos] = useState([]);
  const [vehiculosTemporales, setVehiculosTemporales] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const [vehiculosChequeados, setVehiculosChequeados] = useState([]);
  const [generandoAuditoria, setGenerandoAuditoria] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tiposVehiculo, setTiposVehiculo] = useState([]);
  const [nuevoVehiculo, setNuevoVehiculo] = useState({
    patente: '',
    marca: '',
    modelo: '',
    color: '',
    tipoVehiculo: 'auto'
  });
  const [user, setUser] = useState(null);
  const [modalMensaje, setModalMensaje] = useState(''); // ✅ Estado para mensajes

  const navigate = useNavigate();
  const ITEMS_POR_PAGINA = 10;

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('http://localhost:5000/api/auth/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (response.ok) {
          setUser(data);
        } else if (response.status === 401) {
          localStorage.removeItem('token');
          setUser(null);
          navigate('/login');
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      }
    };

    const cargarDatos = async () => {
      try {
        const responseVehiculos = await fetch('http://localhost:5000/api/vehiculos');
        const dataVehiculos = await responseVehiculos.json();
        const filtrados = dataVehiculos.filter(v => 
          v.estadiaActual && v.estadiaActual.entrada && !v.estadiaActual.salida
        );
        setVehiculos(filtrados.reverse());

        const responseTipos = await fetch('http://localhost:5000/api/tipos-vehiculo');
        const dataTipos = await responseTipos.json();
        setTiposVehiculo(dataTipos);
      } catch (err) {
        console.error('Error al cargar los datos:', err);
      }
    };

    fetchUser();
    cargarDatos();
  }, [navigate]);

  const normalizar = str => str?.toString().toLowerCase().trim();
  const vehiculosCombinados = [...vehiculos, ...vehiculosTemporales];

  const vehiculosFiltrados = vehiculosCombinados.filter(v =>
    normalizar(v.patente).includes(normalizar(busqueda))
  );

  const totalPaginas = Math.ceil(vehiculosFiltrados.length / ITEMS_POR_PAGINA);
  const vehiculosPaginados = vehiculosFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  const handleCheckVehiculo = (id) => {
    setVehiculosChequeados(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id) 
        : [...prev, id]
    );
  };

  const agregarVehiculoTemporal = () => {
    if (!nuevoVehiculo.patente) {
      setModalMensaje('La patente es obligatoria');
      return;
    }

    const vehiculoTemporal = {
      ...nuevoVehiculo,
      _id: `temp-${Date.now()}`,
      esTemporal: true,
      estadiaActual: {
        entrada: new Date().toISOString()
      }
    };

    setVehiculosTemporales(prev => [...prev, vehiculoTemporal]);
    setVehiculosChequeados(prev => [...prev, vehiculoTemporal._id]);

    setNuevoVehiculo({
      patente: '',
      marca: '',
      modelo: '',
      color: '',
      tipoVehiculo: 'auto'
    });
    setModalAbierto(false);
  };

  const handlePatenteChange = (e) => {
    const valor = e.target.value.toUpperCase().replace(/\s/g, '');
    const regexParcial = /^[A-Z]{0,3}[0-9]{0,3}[A-Z]{0,2}$/;
    if (valor === "" || regexParcial.test(valor)) {
      setNuevoVehiculo({ ...nuevoVehiculo, patente: valor });
    }
  };

  const crearAlertaConflicto = async (tipoConflicto) => {
    const fecha = new Date().toISOString().split('T')[0];
    const hora = new Date().toLocaleTimeString();

    const dataAlerta = {
      fecha,
      hora,
      tipoDeAlerta: `Conflicto Auditoría: ${tipoConflicto}`,
      operador: user.nombre,
    };

    try {
      const resAlerta = await fetch('http://localhost:5000/api/alertas/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(dataAlerta),
      });

      if (!resAlerta.ok) {
        console.error('Error al crear la alerta de conflicto');
      }
    } catch (err) {
      console.error('Error al enviar la alerta:', err);
    }
  };

  const generarAuditoria = async () => {
    if (vehiculosChequeados.length === 0 && vehiculosTemporales.length === 0) {
      setModalMensaje('Por favor seleccione al menos un vehículo para auditar o agregue vehículos temporales');
      return;
    }

    setGenerandoAuditoria(true);

    try {
      const operador = user?.nombre || 'Operador Desconocido';

      const idsNormales = vehiculosChequeados.filter(id => !id.toString().startsWith('temp-'));
      const vehiculosTemporalesAuditados = vehiculosTemporales;

      const response = await fetch('http://localhost:5000/api/auditorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vehiculos: idsNormales,
          vehiculosTemporales: vehiculosTemporalesAuditados,
          operador 
        }),
      });

      if (!response.ok) throw new Error('Error al generar auditoría');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `auditoria-vehiculos-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Detectar conflictos
      const todosLosVehiculosEnSistema = vehiculos.length;
      const vehiculosNoVerificados = todosLosVehiculosEnSistema - idsNormales.length;
      const hayVehiculosTemporales = vehiculosTemporales.length > 0;

      if (vehiculosNoVerificados > 0 && hayVehiculosTemporales) {
        setModalMensaje('Atención: Auditoría generada con CONFLICTO. Hay vehículos no verificados y vehículos temporales.');
        await crearAlertaConflicto('Vehículos no verificados y vehículos temporales agregados');
      } else if (vehiculosNoVerificados > 0) {
        setModalMensaje('Atención: Auditoría generada con CONFLICTO. Hay vehículos no verificados.');
        await crearAlertaConflicto('Vehículos no verificados');
      } else if (hayVehiculosTemporales) {
        setModalMensaje('Atención: Auditoría generada con CONFLICTO. Hay vehículos temporales agregados.');
        await crearAlertaConflicto('Vehículos temporales agregados');
      }

      setVehiculosChequeados([]);
      setVehiculosTemporales([]);
    } catch (error) {
      console.error('Error:', error);
      setModalMensaje('Error al generar el reporte de auditoría');
    } finally {
      setGenerandoAuditoria(false);
    }
  };

  return (
    <div className="vehiculos-dentro">
      <h2 className="tituloDentro">Vehículos Dentro</h2>

      <div className="search-container-vehiculos">
        <div className="search-content">
          <input
            type="text"
            placeholder="Buscar por patente..."
            className="busqueda-vehiculos"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPaginaActual(1);
            }}
          />
          <div className="botones-auditoria">
            <button 
              onClick={generarAuditoria} 
              disabled={generandoAuditoria}
              className="boton-auditoria"
            >
              {generandoAuditoria ? (
                <>
                  <span className="spinner"></span>
                  Generando...
                </>
              ) : (
                <>
                  <span className="icon-auditoria">📋</span>
                  Generar Auditoría
                </>
              )}
            </button> 
            <button 
              onClick={() => setModalAbierto(true)}
              className="boton-auditoria"
            >
              <FiPlus className="icon-agregar" />
            </button>
          </div>
        </div>
      </div>

      <div className="tabla-container">
        <table>
          <thead>
            <tr>
              <th>Patente</th>
              <th>Entrada</th>
              <th>Tipo de Vehículo</th>
              <th>Auditoría</th>
            </tr>
          </thead>
          <tbody>
            {vehiculosPaginados.map(v => {
              const fechaEntrada = v.estadiaActual?.entrada ? new Date(v.estadiaActual.entrada) : null;
              const entradaValida = fechaEntrada && !isNaN(fechaEntrada);
              const estaChequeado = vehiculosChequeados.includes(v._id);
              const esTemporal = v._id.toString().startsWith('temp-');

              return (
                <tr key={v._id} className={`${estaChequeado ? 'checked' : ''} ${esTemporal ? 'vehiculo-temporal' : ''}`}>
                  <td>{v.patente}</td>
                  <td>{entradaValida ? fechaEntrada.toLocaleString() : 'Entrada no disponible'}</td>
                  <td>{v.tipoVehiculo?.charAt(0).toUpperCase() + v.tipoVehiculo?.slice(1) || 'Desconocido'}</td>
                  <td>
                    <input 
                      type="checkbox" 
                      checked={esTemporal || estaChequeado}
                      onChange={() => !esTemporal && handleCheckVehiculo(v._id)}
                      className="check-auditoria"
                      disabled={esTemporal}
                    />
                  </td>
                </tr>
              );
            })}

            {/* Filas vacías para mantener siempre 10 visibles */}
            {Array.from({ length: ITEMS_POR_PAGINA - vehiculosPaginados.length }).map((_, i) => (
              <tr key={`empty-${i}`} className="fila-vacia">
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="paginado">
          <button
            disabled={paginaActual === 1}
            onClick={() => setPaginaActual(paginaActual - 1)}
          >
            Anterior
          </button>
          <span>Página {paginaActual} de {totalPaginas}</span>
          <button
            disabled={paginaActual === totalPaginas}
            onClick={() => setPaginaActual(paginaActual + 1)}
          >
            Siguiente
          </button>
        </div>
      </div>

      {modalAbierto && (
        <ModalAudit titulo="Agregar Vehículo Temporal" onClose={() => setModalAbierto(false)}>
          <div className="form-group-audit">
            <label>Patente*</label>
            <input
              type="text"
              value={nuevoVehiculo.patente}
              onChange={handlePatenteChange}
              placeholder="Ej: ABC123 o AB123CD"
              required
              maxLength={7}
              className="modal-input-audit"
            />
          </div>
          <div className="form-group-audit">
            <label>Marca</label>
            <input
              type="text"
              value={nuevoVehiculo.marca}
              onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, marca: e.target.value})}
              placeholder="Ej: Ford"
              className="modal-input-audit"
            />
          </div>
          <div className="form-group-audit">
            <label>Modelo</label>
            <input
              type="text"
              value={nuevoVehiculo.modelo}
              onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, modelo: e.target.value})}
              placeholder="Ej: Fiesta"
              className="modal-input-audit"
            />
          </div>
          <div className="form-group-audit">
            <label>Color</label>
            <input
              type="text"
              value={nuevoVehiculo.color}
              onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, color: e.target.value})}
              placeholder="Ej: Rojo"
              className="modal-input-audit"
            />
          </div>
          <div className="form-group-audit">
            <label>Tipo de Vehículo</label>
            <select
              value={nuevoVehiculo.tipoVehiculo}
              onChange={(e) => setNuevoVehiculo({...nuevoVehiculo, tipoVehiculo: e.target.value})}
              className="modal-input-audit"
            >
              {tiposVehiculo.map(tipo => (
                <option key={tipo} value={tipo}>
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-botones-audit">
            <button onClick={() => setModalAbierto(false)} className="boton-cancelar-audit">
              Cancelar
            </button>
            <button onClick={agregarVehiculoTemporal} className="boton-confirmar-audit">
              Agregar
            </button>
          </div>
        </ModalAudit>
      )}

      {/* ✅ ModalMensaje visible si hay mensaje */}
      {modalMensaje && (
        <ModalMensaje mensaje={modalMensaje} onClose={() => setModalMensaje('')} />
      )}
    </div>
  );
}

export default VehiculosDentro;
