export type Fetcher = (url: string) => Promise<string>;

export const PREFECTURA_BASE = "https://contenidosweb.prefecturanaval.gob.ar/alturas/";
export const historyUrl = (id: number, days: number) => `${PREFECTURA_BASE}?page=historico&tiempo=${days}&id=${id}`;

const USER_AGENT = `rio-victoria/1.0${process.env.REPO_URL ? ` (+${process.env.REPO_URL})` : ""}`;

export const fetchPrefectura: Fetcher = async (url) => {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
    signal: AbortSignal.timeout(20_000),
  });
  if (res.status !== 200) throw new Error(`Prefectura respondió ${res.status} para ${url}`);
  return res.text();
};
