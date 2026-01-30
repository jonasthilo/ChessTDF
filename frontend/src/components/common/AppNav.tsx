import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import './AppNav.css';

interface AppNavProps {
  center?: ReactNode;
  right?: ReactNode;
}

export const AppNav = ({ center, right }: AppNavProps) => {
  const navigate = useNavigate();

  return (
    <nav className="app-nav">
      <div className="app-nav-left" onClick={() => navigate('/')}>
        <img
          src="/assets/logo/Chess-tdf-logo.png"
          alt="Chess Tower Defense"
          className="app-nav-logo"
        />
        <span className="app-nav-title">Chess Tower Defense</span>
      </div>
      {center && <div className="app-nav-center">{center}</div>}
      {right && <div className="app-nav-right">{right}</div>}
    </nav>
  );
};
