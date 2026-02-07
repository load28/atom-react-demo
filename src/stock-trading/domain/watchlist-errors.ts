import { Data } from "effect"
import type { WatchlistId, AlertId } from "./watchlist-model"

export class WatchlistNotFound extends Data.TaggedError("WatchlistNotFound")<{
  readonly id: WatchlistId
}> {}

export class AlertNotFound extends Data.TaggedError("AlertNotFound")<{
  readonly id: AlertId
}> {}

export class DuplicateSymbolInWatchlist extends Data.TaggedError("DuplicateSymbolInWatchlist")<{
  readonly symbol: string
}> {}
