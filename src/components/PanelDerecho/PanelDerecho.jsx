import React from 'react';
import './PanelDerecho.css'; 

function PanelDerecho() {
  return (
    <div className="right-side">

        {/* ABRIR BARRERA */}
        <a href="" className="emergency-btn">
          <img src={require('../../assets/barrier_alert.png')} alt="Barrera Cerrada" />
          <div>
            <p>Apertura</p>
            <p>Emergencia</p>
          </div>
        </a>
        

        {/* Barreras */}
        <div className="barrier-icons">
          <div className="barrier-high"><img src={require('../../assets/abierta.png')} alt="Barrera Abierta" /></div>
          <div className="barrier-low"><img src={require('../../assets/cerrada1.png')} alt="Barrera Cerrada" /></div>
        </div>

        {/* Autos Totales */}
        <div className="totals">
          <div>
            <div className="totalsTitle">Total Fijos</div>
            <div className="totalsQuantity">
              <img src={require('../../assets/verde.png')} alt="Luz Verde" />
              <div>30</div>
            </div>
          </div>
          <div>
            <div className="totalsTitle">Total Móvil</div>
            <div className="totalsQuantity">
              <img src={require('../../assets/roja.png')} alt="Luz Roja" />
              <div>65</div>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div className="contact">
          <div className="contactIcon"><img src={require('../../assets/correo.png')} alt="Correo" /></div>
          <div className="contactIcon"><img src={require('../../assets/whatsapp.png')} alt="Whatsapp" /></div>
        </div>
    </div>
  );
}

export default PanelDerecho;