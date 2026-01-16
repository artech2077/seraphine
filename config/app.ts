export type AppConfig = {
  name: string
  locale: string
  currency: string
  defaultVatRate: number
  vatRates: number[]
}

export const appConfig: AppConfig = {
  name: "Seraphine",
  locale: "fr-MA",
  currency: "MAD",
  defaultVatRate: 7,
  vatRates: [0, 7, 10, 14, 20],
}
