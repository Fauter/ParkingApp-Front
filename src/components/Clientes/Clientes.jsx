import React, { useEffect, useState } from 'react';
import './Clientes.css';

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const ITEMS_POR_PAGINA = 10;

  useEffect(() => {
    fetch('https://api.garageia.com/api/clientes')
      .then(res => res.json())
      .then(data => {
        setClientes(data.reverse());
      })
      .catch(err => console.error('Error al cargar los clientes:', err));
  }, []);

  const formatearDNI = (valor) => {
    if (!valor) return '';
    return valor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const normalizar = str => str?.toString().toLowerCase().trim();

  const clientesFiltrados = clientes.filter(cliente => {
    const termino = normalizar(busqueda);
    return (
      normalizar(cliente.nombreApellido)?.includes(termino) ||
      normalizar(cliente.dniCuitCuil)?.includes(termino) ||
      cliente.vehiculos?.some(v => normalizar(v.patente)?.includes(termino))
    );
  });

  const totalPaginas = Math.ceil(clientesFiltrados.length / ITEMS_POR_PAGINA);
  const clientesPaginados = clientesFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  return (
    <div className="clientes-dentro">
      <h2 className="tituloClientesDentro">Clientes Abonados</h2>

      <input
        type="text"
        placeholder="Buscar por nombre, DNI o patente..."
        className="busqueda-clientes"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setPaginaActual(1); // Reiniciar a la primera página al buscar
        }}
      />

      <div className="tabla-container">
        <table>
          <thead>
            <tr>
              <th>Nombre y Apellido</th>
              <th>DNI/CUIT/CUIL</th>
              <th>Vehículos</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {clientesPaginados.map(cliente => (
              <tr key={cliente._id}>
                <td>{cliente.nombreApellido}</td>
                <td>{formatearDNI(cliente.dniCuitCuil)}</td>
                <td>{cliente.vehiculos.map(v => v.patente).join(', ') || '—'}</td>
                <td>
                  {cliente.abonado ? (
                    <span className="estado-abonado">ABONADO</span>
                  ) : (
                    <button className="estado-renovar">RENOVAR</button>
                  )}
                </td>
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
    </div>
  );
}

export default Clientes;
