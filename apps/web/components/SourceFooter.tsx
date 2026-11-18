export function SourceFooter() {
  return (
    <footer className="footer">
      <div>
      <p>
        Datos: <a href="https://contenidosweb.prefecturanaval.gob.ar/alturas/">Prefectura Naval Argentina</a>. Sitio no
        oficial, hecho en Victoria. Los niveles de alerta y evacuación son los que publica Prefectura; ante una
        emergencia seguí las indicaciones de Defensa Civil.
      </p>
      <p className="footer-links">
        <a href="/api/stations">API pública</a>
        <a href="https://github.com/gastonpalav/rio-victoria">Código</a>
        <a href="/estado">Estado de los datos</a>
      </p>
      </div>
    </footer>
  );
}
