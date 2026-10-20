// Contract fixture: OpenAPI v1 plus SearchExercisesRequestValidator/repository.
// Synthetic records only. No real credentials or account data.
const http = require("node:http")

const exercises = Array.from({ length: 23 }, (_, index) => ({
  id: `10000000-0000-0000-0000-${String(index + 1).padStart(12, "0")}`,
  name: `Fixture press ${String(index + 1).padStart(2, "0")}`,
}))

http
  .createServer((req, res) => {
    const url = new URL(req.url, "http://simulation")
    const send = (status, body) => {
      res.writeHead(status, { "Content-Type": "application/json" })
      res.end(JSON.stringify(body))
    }
    if (req.method !== "GET" || url.pathname !== "/api/workout/Exercise/search")
      return send(501, { detail: "Endpoint outside this search simulation." })
    if (req.headers.authorization !== "Bearer simulation-session")
      return send(401, { title: "Unauthorized", status: 401 })
    const name = (url.searchParams.get("Name") ?? "").trim()
    const page = Number(url.searchParams.get("Page") ?? 1)
    const pageSize = Number(url.searchParams.get("PageSize") ?? 20)
    if (
      !name ||
      name.length > 255 ||
      !Number.isInteger(page) ||
      page < 1 ||
      page > 2147483647 ||
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize > 100 ||
      (page - 1) * pageSize > 2147483647
    )
      return send(400, {
        title: "Validation failed",
        status: 400,
        errors: { Name: ["Provide a valid name and pagination."] },
      })
    const matches = exercises.filter((item) =>
      item.name.toLowerCase().includes(name.toLowerCase())
    )
    send(200, {
      items: matches.slice((page - 1) * pageSize, page * pageSize),
      page,
      pageSize,
      totalCount: matches.length,
    })
  })
  .listen(process.env.PORT)
