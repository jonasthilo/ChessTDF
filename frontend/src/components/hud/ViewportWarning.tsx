import { useState, useEffect } from 'react';
import './ViewportWarning.css';

export const ViewportWarning = () => {
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    const checkViewport = () => {
      // Minimum width needed: left sidebar (180px) + canvas (800px with 10% margin = 720px content) + right sidebar (280px) + gaps/padding (~60px) = 1240px
      // Minimum height needed: header (~50px) + canvas (400px with 10% margin = 360px content) + padding (~40px) = 450px
      const minWidth = 1240;
      const minHeight = 450;

      const isToSmall = window.innerWidth < minWidth || window.innerHeight < minHeight;
      setShowWarning(isToSmall);
    };

    checkViewport();
    window.addEventListener('resize', checkViewport);

    return () => window.removeEventListener('resize', checkViewport);
  }, []);

  if (!showWarning) return null;

  return (
    <div className="viewport-warning">
      <span className="warning-icon">⚠</span>
      <span className="warning-text">Viewport too small - some content may be cut off</span>
    </div>
  );
};
