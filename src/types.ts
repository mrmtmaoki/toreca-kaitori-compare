export interface ScrapedPrice {
  /** Raw card name as shown by the shop */
  rawName: string;
  /** Rarity as shown by the shop, if available */
  rarity: string | null;
  /** Card number / model number (e.g. "BETB-JP049"), if available */
  cardNumber: string | null;
  /** Buy (kaitori) price in JPY */
  price: number;
  /** The page this price was scraped from */
  sourceUrl: string;
  /** Product photo URL, if the shop's listing includes one */
  imageUrl?: string | null;
  /** ポケモンカード's elemental type (炎/水/草 etc.), when this shop's raw
   * data happens to carry it — a card-level fact independent of price, so
   * it's backfilled onto cards.pokemon_type (see src/db.ts
   * updatePokemonType) rather than treated like a price field. */
  pokemonType?: string | null;
}

export interface ShopScraper {
  /** Unique slug used as the shops.name key */
  shopId: string;
  /** Human readable shop name */
  displayName: string;
  /** Fetch and parse buy prices for a given target page/category */
  scrape(targetUrl: string): Promise<ScrapedPrice[]>;
}
