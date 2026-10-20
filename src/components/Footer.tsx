import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-logos">
          <Image
            src="/LOGO-Negro (IMI+Gob+Gerencia)_1.png"
            alt="Instituto de Modernización e Innovación Corrientes"
            width={260}
            height={50}
            className="footer-logo-img"
          />
        </div>
        <p className="footer-text">
          © 2026 - Gobierno de la Provincia de Corrientes - IMI / IPECD
        </p>
      </div>
    </footer>
  );
}