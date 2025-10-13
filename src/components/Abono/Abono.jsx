// Abono.jsx
import "./Abono.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
// ⬇️ Panel izquierdo (lista de clientes)
import DatosClientesAbono from "./DatosClientesAbono/DatosClientesAbonos";
import DatosAutoAbono from "./DatosAutoAbono/DatosAutoAbono";

function Abono() {
  const [datosVehiculo, setDatosVehiculo] = useState({
    patente: "",
    tipoVehiculo: "",
  });

  // ⬅️ nuevo: guardo el cliente elegido para prellenar el form derecho
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // ===== Traer datos del usuario logueado (igual que antes) =====
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/api/auth/profile", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const data = await response.json();

        if (response.ok) {
          setUser(data);
        } else {
          if (response.status === 401) {
            localStorage.removeItem("token");
            setUser(null);
            navigate("/login");
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, [navigate]);

  // ===== Cuando el usuario elige un cliente en la izquierda =====
  const handleElegirCliente = (cliente) => {
    // guardo el cliente elegido (para completar el formulario a la derecha)
    setClienteSeleccionado(cliente || null);

    // si el cliente tiene patente guardada, la llevamos al form derecho
    const patente = (cliente?.patente || "").toUpperCase().slice(0, 10);
    setDatosVehiculo((prev) => ({
      ...prev,
      patente,
      // tipoVehiculo lo dejás a elección del operador en el form derecho
    }));
  };

  return (
    <div className="contenidoCentral">
      {/* ⬅️ Lista de clientes (buscador + refresh + tabla) */}
      <div className="izquierdaAbono">
        <DatosClientesAbono onPickCliente={handleElegirCliente} />
      </div>

      {/* ➡️ Derecha: formulario (recibe datosVehiculo + clienteSeleccionado) */}
      <div className="derechaAbono">
        <DatosAutoAbono
          datosVehiculo={datosVehiculo}
          clienteSeleccionado={clienteSeleccionado}
          user={user}
        />
      </div>
    </div>
  );
}

export default Abono;
