import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { beforeAll, afterEach, afterAll } from "bun:test"
import { server } from "./src/stock-trading/mocks/server"
import { resetStockData } from "./src/stock-trading/mocks/handlers"

GlobalRegistrator.register()

beforeAll(() => server.listen({ onUnhandledRequest: "bypass" }))
afterEach(() => {
  server.resetHandlers()
  resetStockData()
})
afterAll(() => server.close())
