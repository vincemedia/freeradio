/**
 * table: tokens — what a gate can ask somebody to hold.
 *
 * BSV is the base currency: it is the default for any bare amount, it is what
 * satoshis denominate, and every other token's value is quoted through it.
 * Ecosystem tokens inherit their issuer's mark, so a NUTRI amount carries the
 * same Mycelia glyph a Mycelia handle does and the provenance is legible
 * without a legend.
 */
import type { Token } from "./schema";

export const tokens: Token[] = [
  {
    id: "bsv",
    symbol: "BSV",
    name: "Bitcoin SV",
    ecosystem: null,
    icon: "/tokens/bsv.svg",
    color: "#EAB300",
    decimals: 8,
    base: true,
    protocol: "native",
    blurb:
      "The base currency. Amounts without a token are BSV, and satoshis are its smallest unit.",
    usdPerUnit: 72.5,
  },
  {
    id: "eursv",
    symbol: "EURsv",
    name: "Euro Stablecoin",
    ecosystem: null,
    icon: "/tokens/eursv.svg",
    color: "#3D5AE0",
    decimals: 2,
    protocol: "BSV-21",
    blurb: "A euro-denominated stablecoin on BSV, fully backed 1:1.",
    usdPerUnit: 1.08,
  },
  {
    id: "usdsv",
    symbol: "USDsv",
    name: "US Dollar Stablecoin",
    ecosystem: null,
    icon: "/tokens/usdsv.svg",
    color: "#2E7D5B",
    decimals: 2,
    protocol: "BSV-21",
    blurb: "A dollar-denominated stablecoin on BSV, fully backed 1:1.",
    usdPerUnit: 1.0,
  },
  {
    id: "nutri",
    symbol: "NUTRI",
    name: "Nutrient Density Credit",
    ecosystem: "mycelia",
    color: "#4E9A51",
    decimals: 2,
    protocol: "BSV-21",
    blurb:
      "Issued by Mycelia against measured nutrient density. Held by growers and labs in the network.",
    usdPerUnit: 3.4,
  },
  {
    id: "nex",
    symbol: "NEX",
    name: "Nexus Credit",
    ecosystem: "nexus",
    color: "#4353FF",
    decimals: 2,
    protocol: "BSV-21",
    blurb: "The credit Nexus issues for hub services and overlay bandwidth.",
    usdPerUnit: 0.42,
  },
];

export function getToken(id: string): Token | undefined {
  return tokens.find((t) => t.id === id);
}
