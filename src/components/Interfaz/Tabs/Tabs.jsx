import React from 'react';
import './Tabs.css'; 

function Tabs() {
  return (
    <div className="tabs">
        <div className="top">
            <div className="tab">
                <img src="https://cdn-icons-png.flaticon.com/512/1367/1367349.png" alt="Parking Ticket" className="tab-icon" />
            </div>
            <div className="tab closedTab">
                <img src="https://cdn-icons-png.flaticon.com/512/5571/5571453.png" alt="Calendar" className="tab-icon" />
            </div>
        </div>
        <div className="bottom">
            <div className="tab closedTab">
                <img src={require('../../../assets/planilla.png')} alt="Planillas" className="tab-icon" />
            </div>
            <div className="tab closedTab">
                <img src="https://icon-library.com/images/man-icon-png/man-icon-png-29.jpg" alt="Admin" className="tab-icon" />
            </div>
        </div>
    </div>
  );
}

export default Tabs;
