import { ogSize, stationOgImage } from "@/lib/og";

export const alt = "Altura del río Paraná en Victoria";
export const size = ogSize;
export const contentType = "image/png";

export default async function Image() {
  return stationOgImage("victoria");
}
