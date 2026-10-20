# Exercise search simulation

This local stand-in follows the inspected OpenAPI v1 search response and backend name/pagination validation. It uses 23 synthetic records and a fixed dummy bearer value, and does not model production authentication, account visibility, or database behavior. The Postman CLI was signed out during implementation, so no published owner mock was searched or downloaded.

Run with Postman CLI 1.70+:

```sh
postman simulation run postman/simulations/exercise-search.sim.yaml --port 4900 --output ndjson --no-history
```

In another terminal, exercise the real app transport and search adapter:

```sh
EXERCISE_SEARCH_SIMULATION_URL=http://127.0.0.1:4900/exercise-api node --import tsx --test src/lib/domain/exercise-search.test.ts
```

The test checks two pages, durable catalog merging, and HTTP 400/401 handling. Confirm corresponding requests in the simulation output. Stop the simulation with Ctrl+C. The HTTP test skips in the ordinary test suite unless its simulation URL is supplied; unit/query tests run without a server. No deployment or shared Postman workspace is required.
