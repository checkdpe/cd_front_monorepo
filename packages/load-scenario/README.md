@acme/load-scenario

A simple modal to load saved simulation scenarios from the backoffice API.

Props:
- open: boolean
- onCancel: () => void
- onSelect: (payload: unknown) => void
- baseUrl?: string (defaults to https://api-dev.etiquettedpe.fr)
- initialRefAdeme?: string
- getAccessToken: () => Promise<string | null>

It performs GET /backoffice/simulation_scenario_saved?ref_ademe=... with the Cognito Bearer token when available and displays the results in a small table with a "load" action per row.


