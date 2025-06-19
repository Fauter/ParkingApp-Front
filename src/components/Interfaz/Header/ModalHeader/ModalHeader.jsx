import React from 'react';
import './ModalHeader.css';

function ModalHeader({ titulo, onClose, children }) {
  return (
    <div className="modal-backdrop">
      <div className="modal-contenedor">
        <div className="modal-header">
          <h2>{titulo}</h2>
          <button className="modal-cerrar" onClick={onClose}>X</button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export default ModalHeader;
