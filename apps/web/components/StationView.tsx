import { notFound } from "next/navigation";
import { ratePerDay } from "@rio/core/pure";
import { getInaForecast, getStationPage, getWind } from "@/lib/data";
import { Logo } from "./Logo";
import { Forecast } from "./Forecast";
import { Hero } from "./Hero";
import { InaForecast } from "./InaForecast";
import { Upstream } from "./Upstream";
import { StationPicker } from "./StationPicker";
import { ShareImage } from "./ShareImage";
import { SourceFooter } from "./SourceFooter";
import { WindBand } from "./WindBand";
import { YearFacts } from "./YearFacts";

export async function StationView({ slug }: { slug: string }) {
  const page = await getStationPage(slug);
  if (!page) notFound();
  const { station, upstream, options, series, from, to, yearMax, travel, daysAboveAlert, lastYearM, forecast, prefectureId } = page;
  const [wind, ina] = await Promise.all([getWind(slug), getInaForecast(prefectureId)]);
  const rate =
    station.heightM !== null && station.ts !== null ? ratePerDay(series, { ts: station.ts, heightM: station.heightM }) : null;
  return (
    <div className="page">
      <header className="topbar">
        <a href="/" className="home" aria-label="Inicio: el río en Victoria">
          <Logo />
        </a>
        <div className="topbar-tools">
          {station.heightM !== null && <ShareImage slug={station.slug} name={station.name} />}
          <StationPicker current={station.slug} options={options} />
        </div>
      </header>
      <main>
        <h1 className="sr-only">Altura del río en {station.name}</h1>
        <Hero key={station.slug} station={station} series={series} from={from} to={to} yearMax={yearMax} />
        <WindBand wind={wind} name={station.name} />
        <Upstream stations={upstream} here={station} travel={travel} />
        <Forecast forecast={forecast} station={station} inaShown={ina !== null} />
        <InaForecast ina={ina} station={station} withEstimate={forecast !== null} />
        <YearFacts rate={rate} daysAboveAlert={daysAboveAlert} lastYearM={lastYearM} nowM={station.heightM} alertM={station.alertM} evacuationM={station.evacuationM} />
      </main>
      <SourceFooter />
    </div>
  );
}
