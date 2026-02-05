import * as AtomHttpApi from "@effect-atom/atom/AtomHttpApi"
import { FetchHttpClient } from "@effect/platform"
import { StockApi } from "./api"

const baseUrl =
  typeof window !== "undefined" && window.location?.protocol?.startsWith("http")
    ? ""
    : "http://localhost"

export class StockApiClient extends AtomHttpApi.Tag<StockApiClient>()(
  "StockApiClient",
  {
    api: StockApi,
    httpClient: FetchHttpClient.layer,
    baseUrl,
  },
) {}
