import type { Metadata } from "next";
import { StationView } from "@/components/StationView";
import { stationMetadata } from "@/lib/meta";

export function generateStaticParams() {
  return [{ slug: "victoria" }, { slug: "parana" }, { slug: "rosario" }];
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return stationMetadata(slug, `/${slug}`);
}

export default async function StationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <StationView slug={slug} />;
}
