import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppNav } from './AppNav';
import { VersionDisplay } from './VersionDisplay';
import '../../styles/shared.css';

interface ScreenLayoutProps {
  className?: string;
  navCenter?: ReactNode;
  navRight?: ReactNode;
  showBackButton?: boolean;
  watermarks?: boolean;
  scrollable?: boolean;
  heading?: string;
  headingClassName?: string;
  subtitle?: string;
  cards?: ReactNode;
  children: ReactNode;
}

export const ScreenLayout = ({
  className,
  navCenter,
  navRight,
  showBackButton,
  watermarks,
  scrollable,
  heading,
  headingClassName,
  subtitle,
  cards,
  children,
}: ScreenLayoutProps) => {
  const navigate = useNavigate();

  const resolvedRight =
    navRight ??
    (showBackButton ? (
      <button className="btn btn-dark" onClick={() => navigate('/')}>
        Back
      </button>
    ) : undefined);

  const hasHero = heading || subtitle || watermarks;

  return (
    <div className={`screen ${className ?? ''}`}>
      <AppNav center={navCenter} right={resolvedRight} />

      {hasHero ? (
        <main className={scrollable ? 'screen-hero-scroll' : 'screen-hero'}>
          {watermarks && (
            <>
              <img
                src="/assets/logo/Chess-tdf-logo.png"
                alt=""
                className="screen-watermark screen-watermark-left"
                aria-hidden="true"
              />
              <img
                src="/assets/logo/Chess-tdf-logo.png"
                alt=""
                className="screen-watermark screen-watermark-right"
                aria-hidden="true"
              />
            </>
          )}
          {heading && (
            <h1 className={`screen-heading ${headingClassName ?? ''}`}>{heading}</h1>
          )}
          {subtitle && <p className="screen-subtitle">{subtitle}</p>}
          {children}
        </main>
      ) : (
        children
      )}

      {cards && <section className="screen-cards">{cards}</section>}

      <VersionDisplay />
    </div>
  );
};
