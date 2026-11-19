import { notFound } from "next/navigation";
import { ratePerDay } from "@rio/core/pure";
import { getStationPage, getWind } from "@/lib/data";
import { Logo } from "./Logo";
import { Hero } from "./Hero";
import { Upstream } from "./Upstream";
import { StationPicker } from "./StationPicker";
import { SourceFooter } from "./SourceFooter";
import { WindBand } from "./WindBand";
import { YearFacts } from "./YearFacts";

export async function StationView({ slug }: { slug: string }) {
  const page = await getStationPage(slug);
  if (!page) notFound();
  const { station, upstream, options, series, from, to, yearMax, travel, daysAboveAlert, lastYearM } = page;
  const wind = await getWind(slug);
  const rate =
    station.heightM !== null && station.ts !== null ? ratePerDay(series, { ts: station.ts, heightM: station.heightM }) : null;
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
        <Hero key={station.slug} station={station} series={series} from={from} to={to} yearMax={yearMax} />
        <WindBand wind={wind} name={station.name} />
        <Upstream stations={upstream} here={station} travel={travel} />
        <YearFacts rate={rate} daysAboveAlert={daysAboveAlert} lastYearM={lastYearM} nowM={station.heightM} alertM={station.alertM} evacuationM={station.evacuationM} />
      </main>
      <SourceFooter />
    </div>
  );
}
