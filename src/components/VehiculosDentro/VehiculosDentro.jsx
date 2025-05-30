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
        // Filtramos: solo estadía actual con entrada no nula y sin salida
        const filtrados = data.filter(v =>
          v.estadiaActual &&
          v.estadiaActual.entrada &&
          !v.estadiaActual.salida
        );
        setVehiculos(filtrados.reverse());
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
