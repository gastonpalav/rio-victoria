import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { formatArt, getLastRuns } from "@rio/core";
import { Logo } from "@/components/Logo";
import { publicError } from "@/lib/public-error";
import { SourceFooter } from "@/components/SourceFooter";
import { getDb, getStationsData, READINGS_TAG } from "@/lib/data";

export const metadata: Metadata = { title: "Estado de los datos — regla" };

async function getStatus() {
  "use cache";
  cacheLife({ stale: 30, revalidate: 60, expire: 3600 });
  cacheTag(READINGS_TAG);
  const runs = await getLastRuns(getDb(), 10);
  const { stations } = await getStationsData();
  return { runs, victoria: stations.find((s) => s.slug === "victoria") ?? null };
}

export default async function EstadoPage() {
  const { runs, victoria } = await getStatus();
  return (
    <div className="page">
      <header className="topbar">
        <a href="/" className="home" aria-label="regla, inicio">
          <Logo />
        </a>
      </header>
      <main className="block">
        <h1>Estado de los datos</h1>
        <p className="lead">
          Cada 30 minutos se lee la tabla de alturas de Prefectura. Una vez por día se rellenan huecos con su historial.
        </p>
        <p>
          Última lectura de Victoria:{" "}
          <strong>{victoria?.ts ? formatArt(new Date(victoria.ts)) : "sin datos"}</strong>
          {victoria?.stale ? " (atrasada)" : ""}
        </p>
        <div className="table-wrap">
          <table className="runs">
            <thead>
              <tr>
                <th scope="col">Inicio</th>
                <th scope="col">Tipo</th>
                <th scope="col">Resultado</th>
                <th scope="col">Nuevas</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id}>
                  <td>{formatArt(new Date(r.startedAt))}</td>
                  <td>{r.kind}</td>
                  <td>{r.ok === null ? "en curso" : r.ok ? "bien" : `falló: ${publicError(r.error) ?? ""}`}</td>
                  <td>{r.inserted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      <SourceFooter />
    </div>
  );
}
