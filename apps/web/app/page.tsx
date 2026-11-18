import type { Metadata } from "next";
import { StationView } from "@/components/StationView";
import { stationMetadata } from "@/lib/meta";

export async function generateMetadata(): Promise<Metadata> {
  return stationMetadata("victoria", "/");
}

export default function Home() {
  return <StationView slug="victoria" />;
}
