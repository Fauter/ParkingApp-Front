// ModalHeader.jsx
import React, { useRef, useEffect } from 'react';
import './ModalHeader.css';

function ModalHeader({ titulo, onClose, children }) {
  const contenedorRef = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="modal-backdrop">
      <div className="modal-contenedor" ref={contenedorRef}>
        <div className="modal-header">
          <h2>{titulo}</h2>
          <button className="modal-cerrar" onClick={onClose}>X</button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export default ModalHeader;
