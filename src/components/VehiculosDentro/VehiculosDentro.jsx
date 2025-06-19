import React, { useEffect, useState } from 'react';
import './VehiculosDentro.css';

function VehiculosDentro() {
  const [vehiculos, setVehiculos] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const [busqueda, setBusqueda] = useState('');
  const ITEMS_POR_PAGINA = 10;

  useEffect(() => {
    fetch('http://localhost:5000/api/vehiculos')
      .then(res => res.json())
      .then(data => {
        const filtrados = data.filter(v =>
          v.estadiaActual &&
          v.estadiaActual.entrada &&
          !v.estadiaActual.salida
        );
        setVehiculos(filtrados.reverse());
      })
      .catch(err => console.error('Error al cargar los vehículos:', err));
  }, []);

  const normalizar = str => str?.toString().toLowerCase().trim();

  const vehiculosFiltrados = vehiculos.filter(v =>
    normalizar(v.patente).includes(normalizar(busqueda))
  );

  const totalPaginas = Math.ceil(vehiculosFiltrados.length / ITEMS_POR_PAGINA);
  const vehiculosPaginados = vehiculosFiltrados.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  return (
    <div className="vehiculos-dentro">
      <h2 className="tituloDentro">Vehículos Dentro</h2>

      <input
        type="text"
        placeholder="Buscar por patente..."
        className="busqueda-clientes"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value);
          setPaginaActual(1); // Reinicia a la primera página al buscar
        }}
      />

      <div className="tabla-container">
        <table>
          <thead>
            <tr>
              <th>Patente</th>
              <th>Entrada</th>
              <th>Tipo de Vehículo</th>
            </tr>
          </thead>
          <tbody>
            {vehiculosPaginados.map(v => {
              const fechaEntrada = new Date(v.estadiaActual.entrada);
              const entradaValida = v.estadiaActual.entrada && !isNaN(fechaEntrada);
              return (
                <tr key={v._id}>
                  <td>{v.patente}</td>
                  <td>
                    {entradaValida
                      ? fechaEntrada.toLocaleString()
                      : 'Entrada no disponible'}
                  </td>
                  <td>{v.tipoVehiculo.charAt(0).toUpperCase() + v.tipoVehiculo.slice(1)}</td>
                </tr>
              );
            })}
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

export default VehiculosDentro;
