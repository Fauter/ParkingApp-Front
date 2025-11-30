import React from 'react';
import './ModalMensaje.css'; // tu CSS actual

function ModalMensaje({ titulo = "Mensaje", mensaje, onClose, children }) {
  if (!mensaje) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-contenedor" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{titulo}</h2>
          <button className="modal-cerrar" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">

          {/* 👇👇 FIX DEFINITIVO de salto de línea y legibilidad 👇👇 */}
          <div
            className="modal-mensaje-texto"
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: "1.35",
              marginBottom: "0.8rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            {String(mensaje || "")
              .split("\n")
              .map((line, idx) => (
                <div key={idx}>{line}</div>
              ))}
          </div>
          {/* ☝️ reemplaza al viejo <p>{mensaje}</p> */}

          {/* Renderizar aquí los children */}
          {children}
        </div>
      </div>
    </div>
  );
}

export default ModalMensaje;
