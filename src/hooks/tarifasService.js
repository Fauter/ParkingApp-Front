import { useState, useEffect } from "react";

export function useTarifasData() {
  const [tarifas, setTarifas] = useState([]);
  const [precios, setPrecios] = useState({});
  const [tiposVehiculo, setTiposVehiculo] = useState([]);
  const [parametros, setParametros] = useState({
    fraccionarDesde: 0,
    toleranciaInicial: 0,
    permitirCobroAnticipado: false,
  });

  useEffect(() => {
    fetch("http://localhost:5000/api/precios", {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => setPrecios(data))
      .catch(() => setPrecios({}));

    fetch("http://localhost:5000/api/tipos-vehiculo", {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => setTiposVehiculo(data))
      .catch(() => setTiposVehiculo([]));

    fetch("http://localhost:5000/api/parametros", {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => setParametros(data))
      .catch(() => setParametros({}));
  }, []);

  useEffect(() => {
    fetch("http://localhost:5000/api/tarifas", {
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => setTarifas(data))
      .catch(() => setTarifas([]));
  }, []);

  return { tarifas, precios, tiposVehiculo, parametros };
}

export async function calcularTarifaAPI({
  tipoVehiculo,
  inicio,
  dias,
  hora,
  tarifaAbono,
  tipoTarifa,
  tarifas,
  precios,
  parametros,
}) {
  try {
    const response = await fetch("http://localhost:5000/api/calcular-tarifa", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include',
      body: JSON.stringify({
        detalle: { tipoVehiculo, inicio, dias, hora, tarifaAbono, tipoTarifa },
        tarifas,
        precios,
        parametros,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error || "Error al calcular tarifa");
    }

    return await response.json();
  } catch (err) {
    throw err;
  }
}
