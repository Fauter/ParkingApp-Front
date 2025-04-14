import React from 'react';
import './Header.css'; 

function Header() {
  return (
    <header className="topbar">
      <h1>Parking</h1>
      <div className="menu">
        <button>Operador</button>
        <button>Caja</button>
        <button>Abono</button>
        <a href="https://admin.ofiflex.com.ar" className="menu-button">Admin</a>
      </div>
    </header>
  );
}

export default Header;
