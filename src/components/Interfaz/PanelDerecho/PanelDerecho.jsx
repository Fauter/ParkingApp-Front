import React from 'react';
import './PanelDerecho.css';

import barrierIcon from '../../../../public/images/parking-barrier.svg';

function PanelDerecho({ barreraIzquierdaAbierta, barreraDerechaAbierta }) {
  const getColorFilter = (abierta) =>
    abierta
      ? 'brightness(0) saturate(100%) invert(58%) sepia(25%) saturate(980%) hue-rotate(72deg) brightness(92%) contrast(93%)' // Verde intermedio
      : 'brightness(0) saturate(100%) invert(18%) sepia(80%) saturate(4100%) hue-rotate(342deg) brightness(90%) contrast(97%)'; // Rojo menos naranja

  return (
    <div className="right-side">
      <div className="barreras-superior">
        <div className="barrera-container">
          <img
            src={barrierIcon}
            alt="Barrera Entrada"
            className="barrera-img"
            style={{
              filter: getColorFilter(barreraIzquierdaAbierta),
              transform: barreraIzquierdaAbierta ? 'rotate(-45deg)' : 'rotate(0deg)',
            }}
          />
          <span className="barrera-label">Entr.</span>
        </div>

        <div className="barrera-container">
          <img
            src={barrierIcon}
            alt="Barrera Salida"
            className="barrera-img"
            style={{
              filter: getColorFilter(barreraDerechaAbierta),
              transform: barreraDerechaAbierta ? 'rotate(-45deg)' : 'rotate(0deg)',
            }}
          />
          <span className="barrera-label">Sal.</span>
        </div>
      </div>
    </div>
  );
}

export default PanelDerecho;