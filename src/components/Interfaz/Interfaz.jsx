import './Interfaz.css';
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header/Header';
import PanelDerecho from './PanelDerecho/PanelDerecho';
import Operador from '../Operador/Operador';
import VehiculosDentro from '../VehiculosDentro/VehiculosDentro';
import Clientes from '../Clientes/Clientes';
import Background from '../Background/Background';
import Abono from '../Abono/Abono';
import Turnos from '../Turnos/Turnos';
import ModalHeader from './Header/ModalHeader/ModalHeader';

// Formatea el número con puntos cada 3 cifras
const formatearVisualmente = (valor) => {
  if (!valor) return '';
  return valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Limpia el número visual (quita puntos)
const limpiarNumero = (valor) => {
  return valor.replace(/\./g, '');
};

function Interfaz() {
  const [vistaActual, setVistaActual] = useState('operador');
  const [modalActivo, setModalActivo] = useState(null);

  const [recaudado, setRecaudado] = useState('');
  const [enCaja, setEnCaja] = useState('');
  const [confirmandoCaja, setConfirmandoCaja] = useState(false);

  const [montoParcial, setMontoParcial] = useState('');
  const [incidente, setIncidente] = useState('');

  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch('https://api.garageia.com/api/auth/profile', {
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
          navigate('/login');
        }
      } catch (error) {
        console.error('Error al obtener usuario:', error);
      }
    };

    fetchUser();
  }, [navigate]);

  const cerrarModal = () => {
    setModalActivo(null);
    setRecaudado('');
    setEnCaja('');
    setMontoParcial('');
    setIncidente('');
    setConfirmandoCaja(false);
  };

  const isCajaValida = () => {
    const rec = parseFloat(limpiarNumero(recaudado));
    const caja = parseFloat(limpiarNumero(enCaja));
    return !isNaN(rec) && !isNaN(caja) && rec >= 0 && caja >= 0 && rec >= caja;
  };

  const getFechaHora = () => {
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().slice(0, 5);
    return { fecha, hora };
  };

  const enviarCierreDeCaja = async () => {
    if (!user) return;
    const { fecha, hora } = getFechaHora();
    const totalRecaudado = parseFloat(limpiarNumero(recaudado));
    const dejoEnCaja = parseFloat(limpiarNumero(enCaja));
    const totalRendido = totalRecaudado - dejoEnCaja;

    const data = {
      fecha,
      hora,
      totalRecaudado,
      dejoEnCaja,
      totalRendido,
      operador: user.nombre,
    };

    try {
      const res = await fetch('https://api.garageia.com/api/cierresdecaja', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      const content = await res.json();

      if (res.ok) {
        localStorage.removeItem('token');
        if (localStorage.getItem('token')) {
          alert('No se pudo desloguear, no se realizó el cierre de caja.');
          return;
        }

        alert('¡Caja rendida correctamente! Has sido deslogueado.');
        cerrarModal();
        navigate('/login');
      } else {
        console.error('Error al rendir caja:', content);
        alert('Error al rendir caja: ' + (content.message || JSON.stringify(content)));
      }
    } catch (err) {
      console.error(err);
      alert('Error en la conexión.');
    }
  };

  const enviarCierreParcial = async () => {
    if (!user) return;
    const { fecha, hora } = getFechaHora();

    const monto = parseFloat(limpiarNumero(montoParcial));

    const dataCierreParcial = {
      fecha,
      hora,
      monto,
      operador: user.nombre,
    };

    try {
      const resCierreParcial = await fetch('https://api.garageia.com/api/cierresdecaja/parcial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(dataCierreParcial),
      });

      if (!resCierreParcial.ok) {
        alert('Error al registrar cierre parcial.');
        return;
      }

      const dataAlerta = {
        fecha,
        hora,
        tipoDeAlerta: `Cierre Parcial ($${monto.toLocaleString('es-AR')})`,
        operador: user.nombre,
      };

      const resAlerta = await fetch('https://api.garageia.com/api/alertas/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(dataAlerta),
      });

      if (!resAlerta.ok) {
        alert('Error al crear la alerta del cierre parcial.');
        return;
      }

      alert('Cierre parcial registrado y alerta creada.');
      cerrarModal();
    } catch (err) {
      console.error(err);
      alert('Error en la conexión.');
    }
  };

  const enviarIncidente = async () => {
    if (!user) return;
    const { fecha, hora } = getFechaHora();

    const data = {
      fecha,
      hora,
      texto: incidente,
      operador: user.nombre,
    };

    try {
      const res = await fetch('https://api.garageia.com/api/incidentes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      const content = await res.json();
      if (res.ok) {
        alert('Incidente registrado.');
        cerrarModal();
      } else {
        console.error('Error al registrar incidente:', content);
        alert('Error al registrar incidente: ' + (content.message || JSON.stringify(content)));
      }
    } catch (err) {
      console.error(err);
      alert('Error en la conexión.');
    }
  };

  return (
    <div className="interfaz">
      <Background />
      <Header cambiarVista={setVistaActual} vistaActiva={vistaActual} abrirModal={setModalActivo} />
      <div className="content">
        {vistaActual === 'operador' && <Operador />}
        {vistaActual === 'vehiculos' && <VehiculosDentro />}
        {vistaActual === 'clientes' && <Clientes />}
        {vistaActual === 'turnos' && <Turnos />}
        {vistaActual === 'abono' && <Abono />}
        <PanelDerecho />
      </div>

      {/* Modal: Cierre de Caja */}
      {modalActivo === 'cierredecaja' && (
        <ModalHeader titulo="Cierre de Caja" onClose={cerrarModal}>
          {!confirmandoCaja ? (
            <>
              <input
                type="text"
                className="modal-input"
                placeholder="Total Recaudado"
                value={formatearVisualmente(recaudado)}
                onChange={(e) => setRecaudado(limpiarNumero(e.target.value))}
              />
              <input
                type="text"
                className="modal-input"
                placeholder="Dejo en Caja"
                value={formatearVisualmente(enCaja)}
                onChange={(e) => setEnCaja(limpiarNumero(e.target.value))}
              />
              <button className="modal-btn" disabled={!isCajaValida()} onClick={() => setConfirmandoCaja(true)}>
                Confirmar
              </button>
            </>
          ) : (
            <>
              <p>Total Recaudado: ${formatearVisualmente(recaudado)}</p>
              <p>Dejo en Caja: ${formatearVisualmente(enCaja)}</p>
              <p>Total Rendido: ${formatearVisualmente(String(parseFloat(limpiarNumero(recaudado)) - parseFloat(limpiarNumero(enCaja))))}</p>
              <button className="modal-btn" onClick={() => setConfirmandoCaja(false)}>Modificar</button>
              <button className="modal-btn" onClick={enviarCierreDeCaja}>Confirmar</button>
            </>
          )}
        </ModalHeader>
      )}

      {/* Modal: Cierre Parcial */}
      {modalActivo === 'cierreparcial' && (
        <ModalHeader titulo="Cierre Parcial" onClose={cerrarModal}>
          <input
            type="text"
            className="modal-input"
            placeholder="Monto"
            value={formatearVisualmente(montoParcial)}
            onChange={(e) => setMontoParcial(limpiarNumero(e.target.value))}
          />
          <button className="modal-btn" onClick={enviarCierreParcial}>
            Confirmar
          </button>
        </ModalHeader>
      )}

      {/* Modal: Incidente */}
      {modalActivo === 'incidente' && (
        <ModalHeader titulo="Incidente" onClose={cerrarModal}>
          <textarea
            maxLength={300}
            rows={4}
            className="modal-input"
            placeholder="Describí el incidente (máx. 300 caracteres)"
            value={incidente}
            onChange={(e) => setIncidente(e.target.value)}
          />
          <button className="modal-btn" onClick={enviarIncidente}>Enviar</button>
        </ModalHeader>
      )}
    </div>
  );
}

export default Interfaz;
