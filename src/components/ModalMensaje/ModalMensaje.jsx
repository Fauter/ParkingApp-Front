import React from 'react';
import './ModalMensaje.css'; // usarás el CSS que ya tenés o podés crear uno propio similar

function ModalMensaje({ titulo = "Mensaje", mensaje, onClose }) {
  if (!mensaje) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-contenedor" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{titulo}</h2>
          <button className="modal-cerrar" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p>{mensaje}</p>
        </div>
      </div>
    </div>
  );
}

export default ModalMensaje;
