import { notFound } from "next/navigation";
import { getStationPage } from "@/lib/data";
import { Logo } from "./Logo";
import { Hero } from "./Hero";
import { HeightChart } from "./HeightChart";
import { Upstream } from "./Upstream";
import { StationPicker } from "./StationPicker";
import { SourceFooter } from "./SourceFooter";

export async function StationView({ slug }: { slug: string }) {
  const page = await getStationPage(slug);
  if (!page) notFound();
  const { station, upstream, options, series, from, to } = page;
  return (
    <div className="page">
      <header className="topbar">
        <a href="/" className="home" aria-label="regla, inicio (Victoria)">
          <Logo />
        </a>
        <StationPicker current={station.slug} options={options} />
      </header>
      <main>
        <h1 className="sr-only">Altura del río en {station.name}</h1>
        <Hero station={station} />
        <HeightChart
          key={station.slug}
          slug={station.slug}
          initial={series}
          initialFrom={from}
          to={to}
          alertM={station.alertM}
          evacuationM={station.evacuationM}
        />
        <Upstream stations={upstream} />
      </main>
      <SourceFooter />
    </div>
  );
}
