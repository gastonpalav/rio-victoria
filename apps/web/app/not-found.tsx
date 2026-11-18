import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="page">
      <header className="topbar">
        <a href="/" className="home" aria-label="regla, inicio">
          <Logo />
        </a>
      </header>
      <main className="block">
        <h1>No encontramos ese puerto</h1>
        <p className="lead">
          Puede que Prefectura no lo publique. <a href="/">Volver a Victoria</a>
        </p>
      </main>
    </div>
  );
}
