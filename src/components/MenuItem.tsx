import React from 'react';

interface MenuItemProps {
  id: string;
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ id, icon, text, onClick }) => {
  return (
    <button className="menu-item" id={id} onClick={onClick}>
      <div className="menu-item-icon">{icon}</div>
      <span className="menu-item-text">{text}</span>
    </button>
  );
};

export default MenuItem;
