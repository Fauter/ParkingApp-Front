// DetalleClienteCajero.jsx
import React, { useEffect, useState } from 'react';
import { FaArrowLeft, FaPlus, FaTrashAlt, FaEdit, FaCheck, FaTimes } from 'react-icons/fa';
import './DetalleClienteCajero.css';
import ModalVehiculoCajero from './ModalVehiculoCajero';
import ModalMensaje from '../ModalMensaje/ModalMensaje';

const API_BASE = 'http://localhost:5000';
const API_PRECIOS = `${API_BASE}/api/precios`;
const API_CLIENTES = `${API_BASE}/api/clientes`;
const API_ABONOS = `${API_BASE}/api/abonos`;
const API_VEHICULOS = `${API_BASE}/api/vehiculos`;
const API_COCHERAS = `${API_BASE}/api/cocheras`; // 👈 nuevo: endpoint de cocheras

// ====================== CÁLCULO REAL DE PRECIOS ======================
const getAbonoPrecioByMetodo = (
  tipoVehiculo,
  metodoPago,
  cocheraTipo,
  exclusiva,
  catalogo
) => {
  if (!catalogo) return 0;
  if (!tipoVehiculo) return 0;

  // normalizar clave
  const key = tipoVehiculo.toLowerCase().trim();
  const cat = catalogo[key];
  if (!cat) return 0;

  // Determinar la key correcta según tipo de cochera
  let cocheraKey = "móvil";
  if (cocheraTipo === "Fija") {
    cocheraKey = exclusiva ? "exclusiva" : "fija";
  }

  // El catálogo YA VIENE filtrado por metodoPago
  // Entonces acá simplemente tomamos el valor directo
  const precio = cat[cocheraKey];

  // fallback si falta el campo
  if (!precio || isNaN(precio)) return 0;

  return precio;
};

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

  // Catálogo Precios
  const [catalogoPrecios, setCatalogoPrecios] = useState(null);
  useEffect(() => {
    const cargarCatalogo = async () => {
      try {
        const metodo = metodoPago === "Efectivo" ? "efectivo" : "otros";
        const r = await fetch(`${API_PRECIOS}?metodo=${metodo}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const data = await r.json();
        setCatalogoPrecios(data);
      } catch (err) {
        console.error("Error cargando catálogo", err);
      }
    };

    cargarCatalogo();
  }, [metodoPago]);

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

  // Cocheras + vehículos agrupados por cochera
  const [cocherasConVehiculos, setCocherasConVehiculos] = useState([]); // [{ cocheraId, tipo, piso, exclusiva, vehiculos:[abonos...] }]
  const [cocherasLoading, setCocherasLoading] = useState(false);

  // Edición inline del número de cochera (piso)
  const [editingCocheraId, setEditingCocheraId] = useState(null);
  const [editingCocheraTipo, setEditingCocheraTipo] = useState('Fija');
  const [editingCocheraExclusiva, setEditingCocheraExclusiva] = useState(false);
  const [confirmDelCochera, setConfirmDelCochera] = useState(null);
  const [editingCocheraPiso, setEditingCocheraPiso] = useState('');
  const [editingCocheraSaving, setEditingCocheraSaving] = useState(false);
  const [editingCocheraError, setEditingCocheraError] = useState('');

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

  // 🔧 Toma el abono correcto para una patente (activo y más reciente)
  const elegirAbonoPorPatente = (abonosCliente, patenteUpper) => {
    if (!Array.isArray(abonosCliente) || !patenteUpper) return null;

    const mismos = abonosCliente.filter(a =>
      a && String(a.patente || '').toUpperCase() === patenteUpper
    );
    if (!mismos.length) return null;

    const ordenarPorFecha = (x, y) => {
      const fx = new Date(x.fechaExpiracion || x.fechaCreacion || 0);
      const fy = new Date(y.fechaExpiracion || y.fechaCreacion || 0);
      return fy - fx; // más nuevo primero
    };

    const activos = mismos.filter(a => a.activo !== false);
    if (activos.length) return [...activos].sort(ordenarPorFecha)[0];

    return [...mismos].sort(ordenarPorFecha)[0];
  };

  /* =================== Helpers de estado de abono =================== */
  const obtenerFinAbonoCliente = (cli) => {
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

  const esAbonoActivoCliente = (cli) => {
    const fin = obtenerFinAbonoCliente(cli);
    if (!fin) return false;
    const ahora = new Date();
    return fin >= ahora;
  };

  // 🔹 Versión por COCHERA: trabaja sobre el array de abonos (coch.vehiculos)
  const obtenerFinAbonoDeAbonos = (abonos) => {
    if (!Array.isArray(abonos) || !abonos.length) return null;
    let fin = null;
    for (const a of abonos) {
      if (!a || !a.fechaExpiracion) continue;
      const f = new Date(a.fechaExpiracion);
      if (!isNaN(f) && (!fin || f > fin)) fin = f;
    }
    return fin;
  };

  const esAbonoActivoDeAbonos = (abonos) => {
    const fin = obtenerFinAbonoDeAbonos(abonos);
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

  // Vehículos del cliente (desde /api/vehiculos)
  const [vehiculosCliente, setVehiculosCliente] = useState([]);

  useEffect(() => {
    const fetchVehiculosCliente = async () => {
      if (!cliente || !cliente._id) {
        setVehiculosCliente([]);
        return;
      }

      try {
        const res = await fetch(API_VEHICULOS, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (!res.ok) {
          console.error('No se pudieron cargar vehículos (status)', res.status);
          return;
        }

        const data = await res.json();

        const propios = Array.isArray(data)
          ? data.filter(v => v.cliente && String(v.cliente._id) === String(cliente._id))
          : [];

        setVehiculosCliente(propios);
      } catch (err) {
        console.error('Error cargando vehículos del cliente:', err);
      }
    };

    fetchVehiculosCliente();
  }, [cliente]);

  useEffect(() => {
    cargarCliente();
  }, [clienteId]);

  /* =================== Carga cocheras del cliente =================== */
  useEffect(() => {
    const fetchCocherasCliente = async () => {
      if (!cliente || !Array.isArray(cliente.cocheras) || cliente.cocheras.length === 0) {
        setCocherasConVehiculos([]);
        return;
      }

      try {
        setCocherasLoading(true);

        const abonosCliente = Array.isArray(cliente.abonos) ? cliente.abonos : [];
        const resultado = [];

        for (const c of cliente.cocheras) {
          if (!c || !c.cocheraId) continue;

          try {
            const res = await fetch(`${API_COCHERAS}/${c.cocheraId}`, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            });
            if (!res.ok) continue;

            const cocheraData = await res.json();
            const vehiculosCochera = Array.isArray(cocheraData.vehiculos)
              ? cocheraData.vehiculos
              : [];
            const vehiculosAbonos = [];

            for (const v of vehiculosCochera) {
              const patenteUpper = (v?.patente || '').toUpperCase();

              // 🔹 1) Buscar el VEHÍCULO real del cliente
              const vehiculoDoc = vehiculosCliente.find((veh) =>
                (veh._id && v._id && String(veh._id) === String(v._id)) ||
                ((veh.patente || '').toUpperCase() === patenteUpper)
              );

              // 🔹 2) Buscar el ABONO por patente (activo o el último que matchee)
              const abonoMatch = elegirAbonoPorPatente(cliente.abonos || [], patenteUpper);;

              if (!vehiculoDoc && !abonoMatch) {
                console.warn(
                  '[DetalleClienteCajero] Vehículo en cochera sin datos de vehículo ni abono:',
                  patenteUpper
                );
                continue;
              }

              // 🔥 MERGE INTELIGENTE: evita que el abono PISE datos del vehículo
              const mergeAbonoVehiculo = (vehiculo, abono) => {
              // 1) ID REAL del vehículo — PRIORIDAD:
              //    a) vehiculo._id
              //    b) abono.vehiculo (si backend lo vinculó)
              //    c) null (pero casi nunca debe ocurrir)
              const realVehiculoId =
                vehiculo?._id ||
                abono?.vehiculo ||
                null;

              return {
                // ID PRINCIPAL: si existe vehículo real, el ID debe ser el del vehículo
                _id: realVehiculoId || abono._id,

                vehiculoId: realVehiculoId,        // <── SIEMPRE EL REAL
                abonoId: abono?._id || null,

                patente: abono?.patente || vehiculo?.patente || '',
                tipoVehiculo: abono?.tipoVehiculo || vehiculo?.tipoVehiculo || '',

                marca: abono?.marca || vehiculo?.marca || '',
                modelo: abono?.modelo || vehiculo?.modelo || '',
                color: abono?.color || vehiculo?.color || '',
                anio: abono?.anio || vehiculo?.anio || '',
                companiaSeguro: abono?.companiaSeguro || vehiculo?.companiaSeguro || '',

                precio: abono?.precio ?? vehiculo?.precio ?? null,
                fechaExpiracion: abono?.fechaExpiracion ?? vehiculo?.fechaExpiracion ?? null,
                fechaCreacion: abono?.fechaCreacion ?? vehiculo?.fechaCreacion ?? null,
                activo: abono?.activo ?? vehiculo?.activo ?? false,

                cochera: abono?.cochera || vehiculo?.cochera || '',
                piso: abono?.piso ?? vehiculo?.piso ?? '',
                exclusiva: abono?.exclusiva ?? vehiculo?.exclusiva ?? false,
              };
            };

              // 🔥 USAR MERGE REAL
              vehiculosAbonos.push(
                mergeAbonoVehiculo(vehiculoDoc, abonoMatch)
              );
            }

            resultado.push({
              cocheraId: cocheraData._id || c.cocheraId,
              tipo: cocheraData.tipo ?? c.cochera,
              piso: cocheraData.piso ?? c.piso,
              exclusiva: typeof cocheraData.exclusiva === 'boolean'
                ? cocheraData.exclusiva
                : !!c.exclusiva,
              vehiculos: vehiculosAbonos, // 🔥 Ahora son los abonos correctos
            });
          } catch (err) {
            console.error('Error cargando cochera cliente:', c.cocheraId, err);
          }
        }

        setCocherasConVehiculos(resultado);
      } finally {
        setCocherasLoading(false);
      }
    };

    fetchCocherasCliente();
  }, [cliente, vehiculosCliente]);

  useEffect(() => {
    if (!modalRenovarVisible) return;

    if (cocheraEnRenovacion && abonosEnRenovacion.length > 0) {
      // recalcular usando los mismos datos, pero otro método de pago
      calcularPrecioRenovacionCochera({
        ...cocheraEnRenovacion,
        vehiculos: abonosEnRenovacion
      });
      return;
    }

    if (!cocheraEnRenovacion && abonosEnRenovacion.length > 0) {
      calcularPrecioRenovacionCliente();
    }
  }, [metodoPago, catalogoPrecios]);
  
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

  const buildCocheraHeaderLabel = (tipo, piso, exclusiva) => {
    const t = (tipo || '').toString().trim().toLowerCase();
    let base;
    if (t === 'móvil' || t === 'movil') base = 'Cochera Móvil';
    else if (t === 'fija') base = exclusiva ? 'Cochera Exclusiva' : 'Cochera Fija';
    else base = 'Cochera';
    if (piso !== undefined && piso !== null && piso !== '') {
      return `${base} • N° ${piso}`;
    }
    return base;
  };

  /* =================== Edición número de cochera (piso) =================== */
  const startEditCochera = (coch) => {
    if (!coch || !coch.cocheraId) return;
    setEditingCocheraError('');
    setEditingCocheraId(coch.cocheraId);
    setEditingCocheraPiso(coch.piso ?? '');
    setEditingCocheraTipo(coch.tipo || 'Fija');
    setEditingCocheraExclusiva(!!coch.exclusiva);
  };

  const cancelEditCochera = () => {
    setEditingCocheraId(null);
    setEditingCocheraPiso('');
    setEditingCocheraTipo('Fija');
    setEditingCocheraExclusiva(false);
    setEditingCocheraError('');
  };

  const saveCocheraFull = async () => {
    if (!editingCocheraId) {
      setEditingCocheraError("No se pudo identificar la cochera.");
      return;
    }

    // Construcción correcta del payload según tipo
    let payload;

    if (editingCocheraTipo === "Móvil") {
      payload = {
        tipo: "Móvil",
        piso: "",
        exclusiva: false
      };
    } else {
      const pisoTrim = (editingCocheraPiso || "").trim();
      if (!pisoTrim) {
        setEditingCocheraError("El número de cochera no puede estar vacío.");
        return;
      }

      payload = {
        tipo: "Fija",
        piso: pisoTrim,
        exclusiva: !!editingCocheraExclusiva
      };
    }

    try {
      setEditingCocheraSaving(true);
      setEditingCocheraError("");

      const res = await fetch(`${API_COCHERAS}/${editingCocheraId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "No se pudo actualizar la cochera");

      // actualizar UI local
      setCocherasConVehiculos((prev) =>
        prev.map((c) =>
          c.cocheraId === editingCocheraId
            ? { ...c, ...payload }
            : c
        )
      );

      cancelEditCochera();
    } catch (err) {
      setEditingCocheraError(err.message);
    } finally {
      setEditingCocheraSaving(false);
    }
  };

  const deleteCochera = async () => {
    if (!confirmDelCochera?.cocheraId) return;

    try {
      setLoading(true);

      // DELETE /api/cocheras/:id
      const res = await fetch(`${API_COCHERAS}/${confirmDelCochera.cocheraId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || 'No se pudo eliminar la cochera');
      }

      // Refrescar cliente y sus cocheras
      await cargarCliente();

      setConfirmDelCochera(null);
      setMensajeModal({
        titulo: 'Cochera eliminada',
        mensaje: 'La cochera fue eliminada correctamente.',
        onClose: () => setMensajeModal(null)
      });
    } catch (err) {
      console.error('Error al eliminar cochera:', err);
      setMensajeModal({
        titulo: 'Error',
        mensaje: err.message || 'Error inesperado al eliminar cochera',
        onClose: () => setMensajeModal(null)
      });
    } finally {
      setLoading(false);
    }
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
  const calcularPrecioProporcional = (precioMensualTotal) => {
    const hoy = new Date();
    const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    const totalDiasMes = ultimoDiaMes.getDate();
    const diaActual = hoy.getDate();
    const diasRestantesCalculados = totalDiasMes - diaActual + 1;
    setDiasRestantes(diasRestantesCalculados);
    if (diaActual === 1) return precioMensualTotal;
    return Math.round((precioMensualTotal / totalDiasMes) * diasRestantesCalculados);
  };

  // 🔹 Cochera que se está renovando (o null si es renovación legacy por cliente)
  const [cocheraEnRenovacion, setCocheraEnRenovacion] = useState(null);
  const [abonosEnRenovacion, setAbonosEnRenovacion] = useState([]);

  // 🟦 Renovación por COCHERA (nuevo flujo)
  const calcularPrecioRenovacionCochera = (coch) => {
    if (!cliente || !catalogoPrecios) return;

    const abonosCochera = Array.isArray(coch.vehiculos) ? coch.vehiculos : [];
    if (!abonosCochera.length) {
      setMensajeModal({
        titulo: "Atención",
        mensaje: "Esta cochera no tiene vehículos.",
        onClose: () => setMensajeModal(null),
      });
      return;
    }

    let precioMensualTotal = 0;

    abonosCochera.forEach((a) => {
      const p = getAbonoPrecioByMetodo(
        a.tipoVehiculo,
        metodoPago,
        coch.tipo,
        coch.exclusiva,
        catalogoPrecios
      );
      precioMensualTotal += p;
    });

    const precioProporcional = calcularPrecioProporcional(precioMensualTotal);

    setPrecioRenovacion(precioProporcional);
    setCocheraEnRenovacion({
      cocheraId: coch.cocheraId,
      tipo: coch.tipo,
      piso: coch.tipo === "Fija" ? String(coch.piso || "").trim() : "",
      exclusiva: !!coch.exclusiva,
    });
    setAbonosEnRenovacion(abonosCochera);
    setModalRenovarVisible(true);
  };

  // 🟦 Renovación LEGACY por cliente completo (solo si NO hay cocheras[])
  const calcularPrecioRenovacionCliente = async () => {
    try {
      if (!cliente) return;

      const abonosActivos = Array.isArray(cliente.abonos)
        ? cliente.abonos.filter(a => a && a.activo !== false)
        : [];

      if (!abonosActivos.length) {
        setMensajeModal({
          titulo: 'Atención',
          mensaje: 'El cliente no tiene vehículos con abono activo. Agregá un vehículo primero.',
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

      let precioMensualTotal = 0;

      abonosActivos.forEach((a) => {
        const tipoKey = (a.tipoVehiculo || '').toLowerCase().trim();
        const precioBase = precios?.[tipoKey]?.mensual || 0;

        let precioFinal = precioBase;

        if (metodoPago !== 'Efectivo') {
          // precio “otros” según cochera del abono
          const cocheraKey =
            a.exclusiva ? 'exclusiva' :
            a.cochera === 'Fija' ? 'fija' :
            'móvil';

          const precioOtros = precios?.[tipoKey]?.[cocheraKey] || precioBase;

          if (precioOtros > 0) precioFinal = precioOtros;
        }

        precioMensualTotal += precioFinal;
      });

      const precioProporcional = calcularPrecioProporcional(precioMensualTotal);
      setPrecioRenovacion(precioProporcional);
      setCocheraEnRenovacion(null); // contexto "cliente completo"
      setAbonosEnRenovacion(abonosActivos);
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

      if (!Array.isArray(abonosEnRenovacion) || abonosEnRenovacion.length === 0) {
        setMensajeModal({
          titulo: 'Error',
          mensaje: 'No hay abonos seleccionados para renovar.',
          onClose: () => setMensajeModal(null),
        });
        return;
      }

      // 🔁 Renovamos TODOS los abonos seleccionados (una cochera o todo el cliente)
      for (const abonoRef of abonosEnRenovacion) {
        if (!abonoRef) continue;

        const tipo = (abonoRef.tipoVehiculo || cliente.precioAbono || '');
        const body = {
          clienteId,
          metodoPago,
          factura,
          operador,

          patente: abonoRef.patente || 'N/A',
          tipoVehiculo: tipo,

          cochera: cocheraEnRenovacion?.tipo || abonoRef.cochera || 'Móvil',
          piso: cocheraEnRenovacion?.piso || abonoRef.piso || '',
          exclusiva: cocheraEnRenovacion
            ? !!cocheraEnRenovacion.exclusiva
            : !!abonoRef.exclusiva,

          mesesAbonar: 1,
        };

        const response = await fetch(`${API_ABONOS}/renovar`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData?.message || errorData?.error || 'Error al renovar abono');
        }
      }

      // ========= CREAR MOVIMIENTO =========
      try {
        const movimientoBody = {
          tipo: "Ingreso",
          origen: "ABONO",
          monto: precioRenovacion,
          metodoPago: metodoPago,
          factura: factura,
          descripcion: "Renovación de Abono",
          clienteId: clienteId,
          operador: operador,
          detalle: {
            cocheraId: cocheraEnRenovacion?.cocheraId || null,
            abonos: abonosEnRenovacion.map(a => ({
              abonoId: a._id || null,
              patente: a.patente || null
            }))
          }
        };

        await fetch(`${API_BASE}/api/movimientos/registrar`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            patente: abonosEnRenovacion[0]?.patente || "ABONO",
            tipoVehiculo: abonosEnRenovacion[0]?.tipoVehiculo || "abono",                        
            metodoPago: metodoPago,                        // obligatorio
            factura: factura,                              // obligatorio
            monto: precioRenovacion,                       // obligatorio
            descripcion: "Renovación de Abono",            // obligatorio
            cliente: clienteId,                            // opcional
            operador: operador,                            // robusto
            tipoTarifa: "abono",                           // opcional
            promo: null,                                   // opcional
            fotoUrl: null,                                 // opcional
            detalle: {
              cocheraId: cocheraEnRenovacion?.cocheraId || null,
              abonos: abonosEnRenovacion.map(a => ({
                abonoId: a._id || null,
                patente: a.patente || null
              }))
            }
          }),
        });
      } catch (err) {
        console.error("Error creando movimiento:", err);
      }

      await cargarCliente();
      setModalRenovarVisible(false);
      setMensajeModal({
        titulo: 'Éxito',
        mensaje: 'Abono renovado exitosamente.',
        onClose: () => setMensajeModal(null),
      });
    } catch (error) {
      console.error('Error al renovar abono:', error);
      setMensajeModal({
        titulo: 'Error',
        mensaje: error.message || 'Error al renovar abono',
        onClose: () => setMensajeModal(null),
      });
    } finally {
      setLoading(false);
      setCocheraEnRenovacion(null);
      setAbonosEnRenovacion([]);
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
  const openEditVehiculo = (item) => {
    if (!item) return;
    setVehEditError('');

    // ⚠️ item puede venir como:
    // - { abonoId, vehiculoId, ... } (cocheras)
    // - { _id del abono, vehiculo: ObjectId } (legacy sin cochera)

    const abonoIdReal =
      item.abonoId ||                   // merge inteligente (cocheras)
      (item._id && item.vehiculoId ? item._id : null) ||   // fallback legacy
      null;

    if (!abonoIdReal) {
      setVehEditError('No se pudo identificar el abono para editar.');
      return;
    }

    setVehEditAbonoId(abonoIdReal);

    setVehEditForm({
      patente: item.patente || '',
      marca: item.marca || '',
      modelo: item.modelo || '',
      anio: item.anio || '',
      color: item.color || '',
      tipoVehiculo: item.tipoVehiculo || '',
      companiaSeguro: item.companiaSeguro || '',
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

  // 🔥 Ahora guardamos también la cochera de la que sale el vehículo
  const askDeleteVehiculo = (item, cocheraId = null) => {
    setConfirmDel({
      patente: item.patente || '',
      cocheraId: cocheraId || null,
      vehiculoId:
        item.vehiculoId ||                  // merge inteligente
        (item.vehiculo ? item.vehiculo._id : null) ||   // fallback backend
        null,
      abonoId:
        item.abonoId ||                     // merge inteligente
        (item._id && !item.vehiculoId ? item._id : null) ||  // fallback legacy
        null,
    });
  };

  const deleteVehiculo = async () => {
    if (!confirmDel) return;

    try {
      setLoading(true);

      const vehiculoIdReal = confirmDel.vehiculoId;
      if (!vehiculoIdReal) throw new Error("ID de vehículo inexistente.");

      // 1) Si viene de una cochera → removerlo correctamente
      if (confirmDel.cocheraId) {
        const r1 = await fetch(`${API_COCHERAS}/remover-vehiculo`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            cocheraId: confirmDel.cocheraId,
            vehiculoId: vehiculoIdReal,
          }),
        });

        const d1 = await r1.json().catch(() => ({}));
        if (!r1.ok) throw new Error(d1?.message || d1?.msg || "Error removiendo vehículo de la cochera.");
      }

      // 2) ⚠️ NO HACER NADA ACÁ
      // El vehículo YA fue correctamente desabonado en:
      // POST /api/cocheras/remover-vehiculo
      // Volver a tocar el flag rompe la consistencia con Abonos / Sync.

      // 3) Si hay abonoId → desvincular
      if (confirmDel.abonoId) {
        await fetch(`${API_ABONOS}/${confirmDel.abonoId}/vehiculo`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ vehiculoId: null }),
        }).catch(() => {});
      }

      // 4) Refrescar vista
      setConfirmDel(null);
      setMensajeModal({
        titulo: "Vehículo eliminado",
        mensaje: "El vehículo fue removido correctamente.",
        onClose: async () => {
          setMensajeModal(null);
          await cargarCliente();
        },
      });

    } catch (err) {
      console.error(err);
      // cierro el modal de confirmación para que no quede "debajo"
      setConfirmDel(null);
      setMensajeModal({
        titulo: "Error",
        mensaje: err.message || "Error al eliminar vehículo.",
        onClose: () => setMensajeModal(null),
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

  const finDerivado = obtenerFinAbonoCliente(cliente);
  const abonoActivo = esAbonoActivoCliente(cliente);

  const clienteCocherasArr = Array.isArray(cliente.cocheras) ? cliente.cocheras : [];
  const multipleCocheras = clienteCocherasArr.length > 1;

  const cocheraLabel = multipleCocheras ? null : getCocheraLabel(cliente);
  const piso = multipleCocheras ? null : getPisoFromCliente(cliente);

  // Solo listamos abonos activos
  const abonosActivos = Array.isArray(cliente.abonos)
    ? cliente.abonos.filter(a => a && a.activo !== false)
    : [];

  // Abonos activos que ya están asignados a alguna cochera (por abonoId REAL)
  const abonosEnCocherasIds = new Set();
  cocherasConVehiculos.forEach(c => {
    (c.vehiculos || []).forEach(v => {
      if (v && v.abonoId) abonosEnCocherasIds.add(String(v.abonoId));
    });
  });

  const abonosSinCochera = abonosActivos.filter(a => 
    !abonosEnCocherasIds.has(String(a._id)) && a.vehiculo !== null
  );

  return (
    <div className="detalle-cliente-cajero">
      <div className="header-detalle header-detalle--space">
        <div className="header-left">
          <button onClick={volver} className="btn-volver"><FaArrowLeft /></button>
          <h2 className="titulo-cliente">{cliente.nombreApellido}</h2>
        </div>
        <div className="header-actions">
          <button className="btn-editar" onClick={openEditModal} title="Editar datos del cliente">
            Editar
          </button>
        </div>
      </div>

      {/* Status-abono LEGACY: solo si el cliente NO tiene cocheras[] */}
      {clienteCocherasArr.length === 0 && (
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
              <button className="btn-renovar" onClick={calcularPrecioRenovacionCliente}>
                RENOVAR
              </button>
            )}
          </div>
        </div>
      )}

      <div className="vehiculos-header">
        <div className="vehiculos-title">
          <h3>
            Vehículos ({
              cocherasConVehiculos.reduce((acc, c) => acc + (c.vehiculos?.length || 0), 0)
            })
          </h3>
          {multipleCocheras && clienteCocherasArr.length > 0 && (
            <span className="cocheras-count">
              ({clienteCocherasArr.length} cocheras)
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
        {cocherasLoading && (
          <div className="cocheras-loading">Cargando cocheras...</div>
        )}

        {clienteCocherasArr.length > 0 ? (
          <>
            {/* Vehículos agrupados por cochera */}
            {cocherasConVehiculos.map((coch) => {
              const tipoNorm = (coch.tipo || '').toString().trim().toLowerCase();
              const badgeClass = coch.exclusiva
                ? 'exclusiva'
                : tipoNorm === 'fija'
                  ? 'fija'
                  : 'movil';

              const vehiculos = coch.vehiculos || [];
              const vehiculosActivos = vehiculos.filter(a => a && a.activo !== false);
              const isEditingThis = editingCocheraId === coch.cocheraId;

              return (
                <div key={coch.cocheraId} className="cochera-group">
                  {/* ================= HEADER + ESTADO TODO JUNTO ================= */}
                  <div className="status-abono-container cochera-status">
                    <div
                      className={`status-abono ${
                        vehiculosActivos.length > 0 && esAbonoActivoDeAbonos(vehiculosActivos)
                          ? 'activo'
                          : 'inactivo'
                      }`}
                    >
                      {/* === IZQUIERDA: Título / Edición cochera === */}
                      <div className="cochera-header-left">
                        {/* MODO VISUAL */}
                        {!isEditingThis && (
                          <span className="cochera-piso-label">
                            {coch.tipo === 'Fija'
                              ? coch.exclusiva
                                ? 'Cochera Exclusiva'
                                : 'Cochera Fija'
                              : 'Cochera Móvil'}
                            {coch.piso ? ` • N° ${coch.piso}` : ''}
                          </span>
                        )}

                        {/* MODO EDICIÓN */}
                        {isEditingThis && (
                          <span className="cochera-edit-wrapper">
                            <select
                              className="cochera-edit-select"
                              value={editingCocheraTipo}
                              onChange={(e) => setEditingCocheraTipo(e.target.value)}
                            >
                              <option value="Fija">Fija</option>
                              <option value="Móvil">Móvil</option>
                            </select>

                            <input
                              type="text"
                              className="cochera-edit-input"
                              placeholder="N°"
                              value={editingCocheraTipo === 'Fija' ? editingCocheraPiso : ''}
                              disabled={editingCocheraTipo !== 'Fija'}
                              onChange={(e) => setEditingCocheraPiso(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveCocheraFull();
                                if (e.key === 'Escape') cancelEditCochera();
                              }}
                            />

                            <label
                              className={`cochera-edit-exc-label ${
                                editingCocheraTipo !== 'Fija' ? 'disabled' : ''
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={editingCocheraTipo !== 'Fija'}
                                checked={editingCocheraTipo === 'Fija' ? editingCocheraExclusiva : false}
                                onChange={(e) => setEditingCocheraExclusiva(e.target.checked)}
                              />
                              Exclusiva
                            </label>

                            <button className="btn-icono btn-cochera-guardar" onClick={saveCocheraFull}>
                              <FaCheck />
                            </button>

                            <button className="btn-icono btn-cochera-cancelar" onClick={cancelEditCochera}>
                              <FaTimes />
                            </button>
                          </span>
                        )}

                        {/* Botones edición/borrar en modo normal */}
                        {!isEditingThis && (
                          <>
                            <button
                              className="btn-icono btn-editar-cochera"
                              onClick={() => startEditCochera(coch)}
                            >
                              <FaEdit />
                            </button>

                            <button
                              className="btn-icono btn-editar-cochera"
                              onClick={() =>
                                setConfirmDelCochera({
                                  cocheraId: coch.cocheraId,
                                  tipo: coch.tipo,
                                  piso: coch.piso,
                                })
                              }
                            >
                              <FaTrashAlt />
                            </button>
                          </>
                        )}
                      </div>

                      {/* === DERECHA: Estado del ABONO === */}
                      <div className="cochera-header-right">
                        {(() => {
                          const fin = obtenerFinAbonoDeAbonos(vehiculosActivos);
                          const activo =
                            vehiculosActivos.length > 0 && esAbonoActivoDeAbonos(vehiculosActivos);

                          return activo && fin ? (
                            <>
                              <span className="status-text">ABONADO HASTA</span>
                              <span className="status-fecha">{formatearFechaCorta(fin)}</span>
                            </>
                          ) : (
                            <>
                              <span className="status-text">ABONO EXPIRADO</span>
                              <button className="btn-renovar" onClick={() => calcularPrecioRenovacionCochera(coch)}>
                                RENOVAR
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    {isEditingThis && editingCocheraError && (
                      <div className="cochera-edit-error">{editingCocheraError}</div>
                    )}
                  </div>
                  {/* ================= FIN HEADER ================= */}

                  {isEditingThis && editingCocheraError && (
                    <div className="cochera-edit-error">{editingCocheraError}</div>
                  )}
                
                  {vehiculos.length > 0 ? (
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
                        {vehiculos.map((abono) => {
                          const expandido = vehiculoExpandido === abono._id;
                          return (
                            <React.Fragment key={abono._id}>
                              <tr
                                onClick={() =>
                                  setVehiculoExpandido((prev) =>
                                    prev === abono._id ? null : abono._id
                                  )
                                }
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
                                          <p>
                                            <strong>Color:</strong>{' '}
                                            {capitalizeFirstLetter(abono.color)}
                                          </p>
                                          <p>
                                            <strong>Seguro:</strong>{' '}
                                            {capitalizeFirstLetter(abono.companiaSeguro)}
                                          </p>
                                        </div>
                                        <div className="botones-documentos">
                                          <button onClick={() => abrirFoto(abono, 'dni')}>
                                            DNI
                                          </button>
                                          <button onClick={() => abrirFoto(abono, 'seguro')}>
                                            Seguro
                                          </button>
                                          <button
                                            onClick={() => abrirFoto(abono, 'cedulaVerde')}
                                          >
                                            Céd. Verde
                                          </button>
                                        </div>
                                      </div>
                                      <div className="expandido-right">
                                        <div className="vehiculo-actions">
                                          {/* <button
                                            className="btn-vehiculo editar"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openEditVehiculo(abono);
                                            }}
                                            title="Editar vehículo"
                                          >
                                            <FaEdit /> <span>Editar</span>
                                          </button> */}
                                          <button
                                            className="btn-vehiculo eliminar"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              askDeleteVehiculo(abono, coch.cocheraId); // ← ABONO YA TIENE vehiculoId REAL
                                            }}
                                            title="Eliminar vehículo"
                                          >
                                            <FaTrashAlt /> <span>Eliminar</span>
                                          </button>
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
                      <p>No hay vehículos registrados para esta cochera.</p>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Vehículos activos SIN cochera — SOLO si el cliente NO tiene cocheras */}
            {clienteCocherasArr.length === 0 && abonosSinCochera.length > 0 && (
              <div className="cochera-group cochera-sin-asignar">
                <div className="cochera-group-header">
                  <h4>Vehículos sin cochera asignada</h4>
                </div>
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
                    {abonosSinCochera.map((abono) => {
                      const expandido = vehiculoExpandido === abono._id;
                      return (
                        <React.Fragment key={abono._id}>
                          <tr
                            onClick={() =>
                              setVehiculoExpandido(prev =>
                                prev === abono._id ? null : abono._id
                              )
                            }
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
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openEditVehiculo(abono);
                                        }}
                                      >
                                        Editar
                                      </button>
                                      <button
                                        className="btn-vehiculo eliminar"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          askDeleteVehiculo(abono, null);
                                        }}
                                      >
                                        Eliminar
                                      </button>
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
              </div>
            )}

            {cocherasConVehiculos.length === 0 && abonosActivos.length === 0 && (
              <div className="sin-vehiculos">
                <p>No hay vehículos registrados para este cliente.</p>
              </div>
            )}
          </>
        ) : (
          // Fallback legacy: sin cocheras[] en cliente, muestro todo junto como antes
          <>
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
                                    <button
                                      className="btn-vehiculo editar"
                                      onClick={(e) => { e.stopPropagation(); askDeleteVehiculo(abono); }}
                                      title="Eliminar vehículo"
                                    >
                                      <FaTrashAlt /> <span>Eliminar</span>
                                    </button>
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
          </>
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
              <p>
                <strong>Renovando:</strong>{' '}
                {cocheraEnRenovacion
                  ? `Cochera ${cocheraEnRenovacion.tipo}${cocheraEnRenovacion.piso ? ' • N° ' + cocheraEnRenovacion.piso : ''}${cocheraEnRenovacion.exclusiva ? ' (Exclusiva)' : ''}`
                  : 'Cliente completo'}
              </p>

              <p><strong>Vehículos incluidos:</strong> {abonosEnRenovacion.length}</p>

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
          mensaje={`¿Seguro que querés quitar el vehículo ${
            confirmDel.patente || ""
          } de esta cochera? El vehículo dejará de estar asignado a la cochera.`}
          onClose={() => setConfirmDel(null)}
        >
          <div className="confirm-actions">
            <button className="btn-secundario" onClick={() => setConfirmDel(null)} disabled={loading}>
              Cancelar
            </button>
            <button className="btn-editar" onClick={deleteVehiculo} disabled={loading}>
              {loading ? 'Procesando...' : 'Dar de baja'}
            </button>
          </div>
        </ModalMensaje>
      )}
      {confirmDelCochera && (
        <ModalMensaje
          titulo="Eliminar Cochera"
          mensaje={`¿Seguro que querés eliminar la cochera ${confirmDelCochera.tipo} Nº ${confirmDelCochera.piso}?`}
          onClose={() => setConfirmDelCochera(null)}
        >
          <div className="confirm-actions">
            <button
              className="btn-secundario"
              onClick={() => setConfirmDelCochera(null)}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              className="btn-editar"
              onClick={deleteCochera}
              disabled={loading}
            >
              {loading ? 'Procesando...' : 'Eliminar'}
            </button>
          </div>
        </ModalMensaje>
      )}
    </div>
  );
}

export default DetalleClienteCajero;
