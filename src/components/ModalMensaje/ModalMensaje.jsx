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
          <p>{mensaje}</p>
          {/* Renderizar aquí los children */}
          {children}
        </div>
      </div>
    </div>
  );
}

export default ModalMensaje;
