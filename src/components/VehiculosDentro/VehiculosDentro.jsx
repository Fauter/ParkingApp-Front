import React, { useEffect, useState } from 'react';
import './VehiculosDentro.css';

function VehiculosDentro() {
  const [vehiculos, setVehiculos] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const ITEMS_POR_PAGINA = 10;

  useEffect(() => {
    fetch('https://api.garageia.com/api/vehiculos')
      .then(res => res.json())
      .then(data => {
        const filtrados = data.filter(v => v.estadiaActual && !v.estadiaActual.salida);
        setVehiculos(filtrados.reverse()); // ya los revierte acá
      })
      .catch(err => console.error('Error al cargar los vehículos:', err));
  }, []);

  const totalPaginas = Math.ceil(vehiculos.length / ITEMS_POR_PAGINA);
  const vehiculosPaginados = vehiculos.slice(
    (paginaActual - 1) * ITEMS_POR_PAGINA,
    paginaActual * ITEMS_POR_PAGINA
  );

  return (
    <div className="vehiculos-dentro">
      <h2 className="tituloDentro">Vehículos Dentro</h2>
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
            {vehiculosPaginados.map(v => (
              <tr key={v._id}>
                <td>{v.patente}</td>
                <td>{new Date(v.estadiaActual.entrada).toLocaleString()}</td>
                <td>{v.tipoVehiculo.charAt(0).toUpperCase() + v.tipoVehiculo.slice(1)}</td>
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

export default VehiculosDentro;
