import { HttpApi, HttpApiEndpoint, HttpApiGroup } from "@effect/platform"
import { Schema } from "effect"
import { Stock } from "./domain/model"

// ── Stock API Endpoints ──
const StocksGroup = HttpApiGroup.make("stocks", { topLevel: true })
  .add(
    HttpApiEndpoint.get("getAll", "/api/stocks")
      .addSuccess(Schema.Array(Stock)),
  )
  .add(
    HttpApiEndpoint.get("get", "/api/stocks/:symbol")
      .setPath(Schema.Struct({ symbol: Schema.String }))
      .addSuccess(Stock),
  )
  .add(
    HttpApiEndpoint.put("updatePrice", "/api/stocks/:symbol/price")
      .setPath(Schema.Struct({ symbol: Schema.String }))
      .setPayload(Schema.Struct({ price: Schema.Number }))
      .addSuccess(Stock),
  )

export const StockApi = HttpApi.make("StockApi").add(StocksGroup)
