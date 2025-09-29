# Create simulation graph with parameters
_Exported on 25/09/2025 at 20:24:22 CEST from Cursor (1.5.5)_

---

**User**

graph from "simulation-results" to call 
simulation_graph
following example -> so it includes ref_ademe and run_name/simul
https://api-dev.etiquettedpe.fr/backoffice/simulation_graph?ref_ademe=2394E0980765L&simul=dev_simul_test0002

---

**Cursor**

I'll locate the `simulation-results` component and check how it currently fetches data, then search for any existing usage of `simulation_graph` to integrate the new API call with `ref_ademe` and `simul` parameters.

I'll open the relevant files to see how `SimulationResults` is used and then update the component to call `/backoffice/simulation_graph` with `ref_ademe` and `simul`.

I'll add a simul prop to `SimulationResults`, switch its fetch to `/backoffice/simulation_graph` using `ref_ademe` and `simul`, then update `apps/simul/src/App.tsx` to pass the `simul` value.

I'll implement the API change in `SimulationResults` and then adjust the app to pass `simul`.

I'll update `packages/simulation-results/src/simulation-results/SimulationResults.tsx` to use `/backoffice/simulation_graph` with `ref_ademe` and `simul`, then modify `apps/simul/src/App.tsx` to pass the `simul` value into `SimulationResults`.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

export type SimulationResultsProps = {
  dpeId: string;
  simul?: string;
  token?: string;
  getAccessToken?: () => Promise<string | undefined>;
  apiBaseUrl?: string;
  width?: number;
  height?: number;
  className?: string;
};

type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

function inferSeries(data: unknown): Array<{ x: number; y: number }> | null {
  if (Array.isArray(data)) {
    if (data.length === 0) return [];
    const first = data[0] as unknown;
    if (typeof first === "number") {
      return (data as number[]).map((v, idx) => ({ x: idx, y: v }));
    }
    if (
      typeof first === "object" &&
      first !== null &&
      ("x" in (first as Record<string, unknown>) ||
        "y" in (first as Record<string, unknown>) ||
        "value" in (first as Record<string, unknown>) ||
        "date" in (first as Record<string, unknown>))
    ) {
      return (data as Array<Record<string, unknown>>).map((d, idx) => {
        const xRaw = (d["x"] ?? d["date"] ?? idx) as unknown;
        const yRaw = (d["y"] ?? d["value"] ?? 0) as unknown;
        const x = typeof xRaw === "number" ? xRaw : idx;
        const y = typeof yRaw === "number" ? yRaw : Number(yRaw) || 0;
        return { x, y };
      });
    }
  }
  return null;
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({
  dpeId,
  simul,
  token,
  getAccessToken,
  apiBaseUrl = "https://api-dev.etiquettedpe.fr",
  width = 640,
  height = 360,
  className,
}) => {
  const [state, setState] = useState<FetchState<unknown>>({ status: "idle" });
  const [resolvedToken, setResolvedToken] = useState<string | undefined>(token);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolveToken() {
      if (token) {
        setResolvedToken(token);
        return;
      }
      if (getAccessToken) {
        try {
          const t = await getAccessToken();
          if (!cancelled) setResolvedToken(t);
        } catch {
          if (!cancelled) setResolvedToken(undefined);
        }
      }
    }
    resolveToken();
    return () => {
      cancelled = true;
    };
  }, [token, getAccessToken]);

  useEffect(() => {
    let cancelled = false;
    if (!resolvedToken) {
      // wait until a token is available
      return () => {
        cancelled = true;
      };
    }
    setState({ status: "loading" });
    const url = new URL("/backoffice/simulation_graph", apiBaseUrl);
    url.searchParams.set("ref_ademe", dpeId);
    if (simul) url.searchParams.set("simul", simul);
    fetch(url.toString(), {
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${resolvedToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setState({ status: "success", data: json });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: "error", error: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, dpeId, simul, resolvedToken]);

  const series = useMemo(() => {
    if (state.status !== "success") return null;
    return inferSeries(state.data);
  }, [state]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    if (!series) return;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const xDomain = d3.extent(series, (d) => d.x) as [number, number];
    const yDomain = [0, d3.max(series, (d) => d.y) ?? 0];

    const x = d3.scaleLinear().domain(xDomain).nice().range([0, innerWidth]);
    const y = d3.scaleLinear().domain(yDomain).nice().range([innerHeight, 0]);

    const line = d3
      .line<{ x: number; y: number }>()
      .x((d) => x(d.x))
      .y((d) => y(d.y));

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x));
    g.append("g").call(d3.axisLeft(y));

    g.append("path")
      .datum(series)
      .attr("fill", "none")
      .attr("stroke", "#1677ff")
      .attr("stroke-width", 2)
      .attr("d", line);
  }, [series, width, height]);

  if (state.status === "loading") {
    return <div className={className}>Loading simulation results…</div>;
  }
  if (state.status === "error") {
    return <div className={className}>Error: {state.error}</div>;
  }

  if (state.status === "success" && !series) {
    return (
      <div className={className}>
        Unsupported data format
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(state.data, null, 2)}
        </pre>
      </div>
    );
  }

  return <svg ref={svgRef} className={className} width={width} height={height} />;
};



```

I'll pass the `simul` value from `apps/simul/src/App.tsx` into `SimulationResults`, then run a linter check on the two edited files and fix any issues.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import "./amplify";
import { authorizedFetch, waitForAccessToken, getAccessToken, setBridgeAccessToken } from "./auth";
import { Hub } from "aws-amplify/utils";
import { Button, Card, Col, Flex, Input, InputNumber, Row, Select, Space, Typography, message, Spin, Collapse, Tooltip } from "antd";
import { ExportOutlined, LeftOutlined } from "@ant-design/icons";
import { SimulationScenariosModal } from "@acme/simulation-scenarios";
import { LoadScenarioModal } from "@acme/load-scenario";
import { DpeDrawerEditor, fetchSimulationTemplateJson } from "@acme/dpe-editor";
import { SimulationResults } from "@acme/simulation-results";
import { ChainlitChatDrawer } from "@acme/chainlit-client";
import { TopMenu } from "@acme/top-menu";
import { fetchAuthSession, getCurrentUser, fetchUserAttributes } from "aws-amplify/auth";
import { flushSync } from "react-dom";

const { Title, Paragraph } = Typography;

export const App: React.FC = () => {
  const [jsonText, setJsonText] = useState<string>("{\n  \"items\": []\n}");
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [apiDebug, setApiDebug] = useState<number | undefined>(undefined);
  const [skip, setSkip] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [numChunks, setNumChunks] = useState<number>(1);
  useEffect(() => { setNumChunks(2); }, []);
  const [numWorkers, setNumWorkers] = useState<number>(1);
  const [confirmedWorkers, setConfirmedWorkers] = useState<number | undefined>(undefined);
  const [workersError, setWorkersError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [userEmail, setUserEmail] = useState<string | undefined>(undefined);
  const [bridgeReady, setBridgeReady] = useState<boolean>(false);
  const [bridgeAuthenticated, setBridgeAuthenticated] = useState<boolean>(false);
  const hasInitFetchedRef = useRef<boolean>(false);
  const hasUserEditedRef = useRef<boolean>(false);
  const [refAdeme, setRefAdeme] = useState<string | undefined>(undefined);
  const [simulLog, setSimulLog] = useState<string | undefined>(undefined);
  const [isSaveMenuOpen, setIsSaveMenuOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [resultsUrl, setResultsUrl] = useState<string | undefined>(undefined);
  const activePollAbortRef = useRef<{ cancel: () => void } | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);
  const [isScenariosOpen, setIsScenariosOpen] = useState<boolean>(false);
  const [isLoadSavedOpen, setIsLoadSavedOpen] = useState<boolean>(false);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(false);
  const [isChainlitOpen, setIsChainlitOpen] = useState<boolean>(false);
  const [queueSegments, setQueueSegments] = useState<number>(0);
  const [queueItems, setQueueItems] = useState<any[]>([]);
  const queuePollIdRef = useRef<number | null>(null);
  const [queueNowTick, setQueueNowTick] = useState<number>(0);
  function openEditor() { setIsEditorOpen(true); }
  const hasLoadedTemplateRef = useRef<boolean>(false);
  const editorOriginalTextRef = useRef<string>("");

  useEffect(() => {
    let isCancelled = false;
    // Listen to session bridge messages from auth app
    function onMessage(ev: MessageEvent) {
      try {
        const payload = ev.data;
        if (!payload || payload.type !== "cognito-session-bridge") return;
        const authOrigin = payload?.data?.authOrigin as string | undefined;
        // Optionally validate origin
        if (authOrigin && !ev.origin.startsWith(authOrigin)) {
          // origin mismatch – ignore
          return;
        }
        setBridgeReady(true);
        const isAuthenticated = Boolean(payload?.data?.isAuthenticated);
        const tokenFromBridge = (payload?.data?.accessToken as string | undefined) || undefined;
        if (tokenFromBridge) setBridgeAccessToken(tokenFromBridge);
        if (isAuthenticated) setBridgeAuthenticated(true);
        const emailFromBridge = (payload?.data?.email as string | undefined) || (payload?.data?.username as string | undefined);
        if (!isCancelled && emailFromBridge) {
          setUserEmail((prev) => prev || emailFromBridge);
        }
      } catch {}
    }
    window.addEventListener("message", onMessage);
    
    (async () => {
      try {
        const url = new URL(window.location.href);
        const ra = url.searchParams.get("ref_ademe") || undefined;
        const sim = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string | undefined) || undefined;
        if (!isCancelled) {
          setRefAdeme(ra);
          setSimulLog(sim);
        }
      } catch {}
      // Immediate cookie-based fallback for username/email
      try {
        const parts = document.cookie.split("; ").filter(Boolean);
        for (const part of parts) {
          const idx = part.indexOf("=");
          if (idx === -1) continue;
          const key = part.substring(0, idx);
          const val = part.substring(idx + 1);
          if (key.startsWith("CognitoIdentityServiceProvider.") && key.endsWith(".LastAuthUser")) {
            const raw = decodeURIComponent(val);
            if (raw && !isCancelled) {
              setUserEmail(raw);
              return; // found username from cookie; stop here
            }
          }
        }
      } catch {}

      // Fallback #2: decode idToken cookie to extract email claim
      try {
        const all = document.cookie.split("; ").filter(Boolean);
        const prefix = "CognitoIdentityServiceProvider.";
        for (const cookie of all) {
          const eq = cookie.indexOf("=");
          if (eq === -1) continue;
          const name = cookie.substring(0, eq);
          if (!name.startsWith(prefix) || !name.endsWith(".idToken")) continue;
          const raw = decodeURIComponent(cookie.substring(eq + 1));
          const parts = raw.split(".");
          if (parts.length >= 2) {
            const mid = parts[1]!;
            const payload = JSON.parse(atob(mid.replace(/-/g, "+").replace(/_/g, "/")));
            const emailClaim = (payload && (payload.email || payload.username)) as string | undefined;
            if (emailClaim && !isCancelled) {
              setUserEmail(emailClaim);
              break;
            }
          }
        }
      } catch {}

      try {
        // Prefer Cognito username (often the email) if available
        const { username } = await getCurrentUser();
        if (username && !isCancelled) {
          setUserEmail(username || undefined);
          return;
        }
      } catch {
        // ignore and fallback to token claim below
      }

      // Try fetching user attributes (email) when available
      try {
        const attrs = await fetchUserAttributes();
        const emailAttr = attrs?.email as string | undefined;
        if (emailAttr && !isCancelled) {
          setUserEmail(emailAttr);
          return;
        }
      } catch {
        // ignore and fallback to token claim below
      }

      try {
        const session = await fetchAuthSession();
        const emailClaim = (session as any)?.tokens?.idToken?.payload?.email as string | undefined;
        if (!isCancelled) setUserEmail(emailClaim ?? undefined);
      } catch {
        if (!isCancelled) setUserEmail(undefined);
      }
    })();
    return () => {
      isCancelled = true;
      window.removeEventListener("message", onMessage);
    };
  }, []);

  // Also try firing when bridge reports authenticated (helps cross-port first load)
  useEffect(() => {
    if (!bridgeAuthenticated || hasInitFetchedRef.current) return;
    const url = new URL(window.location.href);
    const refAdeme = url.searchParams.get("ref_ademe");
    const hasSimulParam = url.searchParams.has("simul");
    if (!hasSimulParam) return; // do not auto-fetch when simul is not explicitly provided
    const simul = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
    if (simul === "default") return;
    if (!refAdeme) return;

    const controller = new AbortController();
    (async () => {
      try {
        const token = await waitForAccessToken(15000, 250);
        if (!token) return;
        if (hasInitFetchedRef.current) return;
        hasInitFetchedRef.current = true;
        const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const apiUrl = new URL("/backoffice/get_redis_detail", base);
        apiUrl.searchParams.set("ref_ademe", refAdeme);
        apiUrl.searchParams.set("log", simul);
        // eslint-disable-next-line no-console
        console.debug("[simulation] calling get_redis_detail (bridge)", apiUrl.toString());
        const res = await authorizedFetch(apiUrl.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            "x-authorization": "dperdition",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => null);
        if (data && !hasUserEditedRef.current) {
          setJsonText(JSON.stringify(data, null, 2));
        }
        // eslint-disable-next-line no-console
        console.log("get_redis_detail (bridge)", data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("get_redis_detail failed (bridge)", err);
      }
    })();
    return () => controller.abort();
  }, [bridgeAuthenticated]);

  // On init: if URL contains simul=default, call template endpoint and initialize editor JSON
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        if (cancelled) return;
        if (hasLoadedTemplateRef.current) return;
        const url = new URL(window.location.href);
        const simul = url.searchParams.get("simul");
        if (simul !== "default") return;
        if (!refAdeme) return;
        if (hasUserEditedRef.current) return;

        const accessToken = await waitForAccessToken(15000, 250);
        if (!accessToken) return;

        const baseUrl = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const template = await fetchSimulationTemplateJson<any>({ baseUrl, ref_ademe: refAdeme, accessToken });
        if (cancelled) return;

        const sourceRuns: any[] = Array.isArray(template)
          ? template
          : (template && Array.isArray(template.runs) ? template.runs : []);

        const transformedRuns = sourceRuns.map((run) => {
          const forced = run?.parameters?.input_forced || {};
          const scenarios = Array.isArray(run?.scenarios) ? run.scenarios : [];
          const nextScenarios = scenarios.map((sc: any) => {
            const baseInput = (sc && sc.input && typeof sc.input === "object") ? sc.input : {};
            const mergedInput = { ...forced, ...baseInput };
            return { ...sc, input: mergedInput };
          });
          const { parameters, ...rest } = run || {};
          return { ...rest, scenarios: nextScenarios };
        });

        if (transformedRuns.length > 0) {
          hasLoadedTemplateRef.current = true;
          setJsonText(JSON.stringify(transformedRuns, null, 2));
        }
      } catch {
        // ignore
      }
    };

    run();
    const removeHub = Hub.listen("auth", (capsule) => {
      try {
        const event = (capsule as any)?.payload?.event as string | undefined;
        if (!event) return;
        if (event === "signedIn" || event === "tokenRefresh") { run(); }
      } catch {}
    });
    return () => { try { (removeHub as any)?.(); } catch {}; cancelled = true; };
  }, [refAdeme]);

  // On init: if URL contains ?ref_ademe=..., call backoffice endpoint (Bearer included when available)
  useEffect(() => {
    if (hasInitFetchedRef.current) return;
    const url = new URL(window.location.href);
    const refAdeme = url.searchParams.get("ref_ademe");
    const hasSimulParam = url.searchParams.has("simul");
    if (!hasSimulParam) return; // do not auto-fetch when simul is not explicitly provided
    const simul = url.searchParams.get("simul") || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
    if (simul === "default") return;
    if (!refAdeme) return;

    const controller = new AbortController();
    const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
    const apiUrl = new URL("/backoffice/get_redis_detail", base);
    apiUrl.searchParams.set("ref_ademe", refAdeme);
    apiUrl.searchParams.set("log", simul);

    async function doFetchOnce() {
      if (hasInitFetchedRef.current) return;
      hasInitFetchedRef.current = true;
      try {
        // eslint-disable-next-line no-console
        console.debug("[simulation] calling get_redis_detail", apiUrl.toString());
        const res = await authorizedFetch(apiUrl.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            "x-authorization": "dperdition",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json().catch(() => null);
        if (data && !hasUserEditedRef.current) {
          setJsonText(JSON.stringify(data, null, 2));
        }
        // eslint-disable-next-line no-console
        console.log("get_redis_detail", data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("get_redis_detail failed", err);
      }
    }

    (async () => {
      try {
        // Wait for a valid access token before calling the endpoint
        const token = await waitForAccessToken(15000, 250);
        if (!token) {
          // eslint-disable-next-line no-console
          console.warn("[simulation] skipping get_redis_detail: no Cognito token available");
          return; // we'll rely on auth Hub events below if sign-in happens later
        }
        await doFetchOnce();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("get_redis_detail failed", err);
      }
    })();

    const removeHub = Hub.listen("auth", (capsule) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const event = (capsule as any)?.payload?.event as string | undefined;
        if (!event) return;
        if (event === "signedIn" || event === "tokenRefresh"){ doFetchOnce(); }
      } catch {}
    });

    // Poll as a safety net in case Hub events fired before subscribe
    const pollId = window.setInterval(async () => {
      try {
        if (hasInitFetchedRef.current) { window.clearInterval(pollId); return; }
        const token = await getAccessToken();
        if (token) {
          window.clearInterval(pollId);
          await doFetchOnce();
        }
      } catch {}
    }, 500);

    return () => {
      try { (removeHub as any)?.(); } catch {}
      try { window.clearInterval(pollId); } catch {}
      controller.abort();
    };
  }, []);

  // When only ref_ademe is present and no simul param, initialize editor to [] and open load modal (after token available)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const hasRef = Boolean(url.searchParams.get("ref_ademe"));
        const hasSimul = url.searchParams.has("simul");
        if (hasRef && !hasSimul) {
          if (!hasUserEditedRef.current) setJsonText("[]");
          const token = await waitForAccessToken(15000, 250);
          if (cancelled) return;
          if (token) setIsLoadSavedOpen(true);
        }
      } catch {}
    };
    run();
    const removeHub = Hub.listen("auth", (capsule) => {
      try {
        const event = (capsule as any)?.payload?.event as string | undefined;
        if (!event) return;
        if (event === "signedIn" || event === "tokenRefresh") { run(); }
      } catch {}
    });
    return () => { try { (removeHub as any)?.(); } catch {}; cancelled = true; };
  }, [refAdeme]);

  // When opening with both ref_ademe and simul, expand the editor drawer by default
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      const hasRef = Boolean(url.searchParams.get("ref_ademe"));
      const simul = url.searchParams.get("simul");
      if (hasRef && simul && simul !== "default") {
        setIsEditorOpen(true);
      }
    } catch {}
  }, [refAdeme, simulLog]);

  const apiDebugOptions = useMemo(() => [
    { label: "none", value: undefined },
    { label: "1", value: 1 },
    { label: "2", value: 2 },
  ], []);

  useEffect(() => {
    return () => {
      try { activePollAbortRef.current?.cancel(); setIsPolling(false); } catch {}
    };
  }, []);

  // Capture the JSON snapshot when opening the editor to detect unconfirmed changes
  useEffect(() => {
    try {
      if (isEditorOpen) {
        editorOriginalTextRef.current = jsonText || "";
      }
    } catch {}
  }, [isEditorOpen]);

  // Submit is always enabled now

  function startPollingForResults(ref: string, log: string) {
    // cancel any previous polling
    try { activePollAbortRef.current?.cancel(); } catch {}
    let cancelled = false;
    activePollAbortRef.current = { cancel: () => { cancelled = true; setIsPolling(false); } };

    const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
    const resultsHref = `https://bo.scandpe.fr/simulation/index.html?tab=results&dpe=${encodeURIComponent(ref)}`;

    setIsPolling(true);
    const tick = async () => {
      if (cancelled) return;
      try {
        const apiUrl = new URL("/backoffice/get_redis_detail", base);
        apiUrl.searchParams.set("ref_ademe", ref);
        apiUrl.searchParams.set("log", log);
        const res = await authorizedFetch(apiUrl.toString(), {
          method: "GET",
          headers: {
            Accept: "application/json, text/plain, */*",
            "x-authorization": "dperdition",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        if (res.ok) {
          const data = await res.json().catch(() => null);
          if (data && data.status === "processed") {
            setResultsUrl(resultsHref);
            cancelled = true;
            setIsPolling(false);
            return;
          }
        }
      } catch {}
      if (!cancelled) {
        window.setTimeout(tick, 1000);
      }
    };
    tick();
  }

  async function handleSaveToBackoffice() {
    try {
      if (!refAdeme || !simulLog) {
        message.error("Missing ref_ademe or simul");
        setIsSaveMenuOpen(false);
        return;
      }
      const ref = `${refAdeme}-${simulLog}`;
      const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
      const apiUrl = new URL("/backoffice/redis_file_manage", base);
      setIsSaving(true);
      // eslint-disable-next-line no-console
      console.debug("[simulation] POST redis_file_manage", { url: apiUrl.toString(), ref });
      const res = await authorizedFetch(apiUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/plain, */*",
          "x-authorization": "dperdition",
        },
        body: JSON.stringify({ ref, text: jsonText }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      message.success(`saved ${simulLog}`);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("redis_file_manage failed", err);
      message.error("save failed");
    } finally {
      setIsSaving(false);
      setIsSaveMenuOpen(false);
    }
  }

  async function fetchQueueOnce() {
    try {
      if (!refAdeme) return;
      const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
      const simulName = simulLog || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl";
      const urlQueue = new URL("/backoffice/get_redis_detail", base);
      urlQueue.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlQueue.searchParams.set("log", `${simulName}_o3cl_queue`);
      const urlDone = new URL("/backoffice/get_redis_detail", base);
      urlDone.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlDone.searchParams.set("log", `${simulName}_o3cl_done_queue`);

      const [qres, dres] = await Promise.all([
        authorizedFetch(urlQueue.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
        authorizedFetch(urlDone.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
      ]);

      const parseItems = async (res: Response): Promise<any[]> => {
        if (!res.ok) return [];
        const data: any = await res.json().catch(() => null);
        if (Array.isArray(data?.items)) return data.items as any[];
        if (Array.isArray(data)) return data as any[];
        if (data && typeof data === "object" && Array.isArray((data as any).queue)) return (data as any).queue as any[];
        return [];
      };

      const [queueList, doneListRaw] = await Promise.all([parseItems(qres), parseItems(dres)]);
      const doneList = (doneListRaw || []).map((it: any) => ({ ...it, status: 1 }));
      const merged = [...doneList, ...queueList];
      setQueueItems(merged);
      setQueueSegments(merged.length || 0);
    } catch {}
  }

  function startQueuePolling() {
    try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    void fetchQueueOnce();
    const raw = (import.meta as any)?.env?.VITE_POLL_QUEUE_DELAY;
    const n = Number(raw);
    const delayMs = Number.isFinite(n) && n > 0 ? n : 30000;
    const id = window.setInterval(fetchQueueOnce, delayMs);
    queuePollIdRef.current = id;
  }

  useEffect(() => {
    return () => {
      try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    };
  }, []);

  useEffect(() => {
    if (!queueItems.length) return;
    const id = window.setInterval(() => setQueueNowTick((t) => t + 1), 1000);
    return () => { try { window.clearInterval(id); } catch {} };
  }, [queueItems.length]);

  async function handleSubmit() {
    try {
      const parsed = jsonText.trim() ? JSON.parse(jsonText) : {};
      const baseQuery = {
        api_debug: Boolean(apiDebug),
        skip,
        limit,
        ref_ademe: refAdeme,
      } as Record<string, unknown>;
      const query = { ...baseQuery, runs: parsed } as Record<string, unknown>;
      const lambdaUrl = (import.meta.env.VITE_SIMULATION_LAMBDA_URL as string) || "https://6vyebgqw4plhmxrewmsgh6yere0bwpos.lambda-url.eu-west-3.on.aws/";
      const body = {
        redis_db: 1,
        task: "tasks.ext_o3cl_managing.direct_scenarios",
        args: {
          ref_ademe: refAdeme,
          query,
        },
      };
      setSubmitting(true);
      // Use plain fetch to avoid adding Authorization header
      const res = await fetch(lambdaUrl, {
        method: "POST",
        headers: {
          Accept: "application/json, text/plain, */*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} ${txt}`);
      }
      message.success("Submitted simulation");
      try { activePollAbortRef.current?.cancel(); } catch {}
      setIsPolling(false);
      // If nb chunks > 1, also call append_scenarios
      if (Number(numChunks || 1) > 1) {
        const appendBody = {
          redis_db: 1,
          task: "tasks.ext_o3cl_managing.init_scenarios",
          args: {
            run_name: simulLog || "dev_report_o3cl",
            ref_ademe: refAdeme,
            nb_chunks: Number(numChunks || 1),
            nb_workers: Number(numWorkers || 1),
            nb_combination: 100,
            query,
          },
        } as Record<string, unknown>;
        try {
          const res2 = await fetch(lambdaUrl, {
            method: "POST",
            headers: {
              Accept: "application/json, text/plain, */*",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(appendBody),
          });
          if (!res2.ok) {
            const txt2 = await res2.text().catch(() => "");
            throw new Error(`HTTP ${res2.status} ${txt2}`);
          }
          message.success(`appending scenarios across ${Number(numChunks)} chunks`);
          // eslint-disable-next-line no-console
          console.debug("append_scenarios payload", appendBody);

          // Start queue polling for segmented progress
          startQueuePolling();
        } catch (e) {
          message.error("Failed to append scenarios");
        }
      }
      // eslint-disable-next-line no-console
      console.log("simulation payload", body);
    } catch (err) {
      message.error("Invalid JSON");
    } finally {
      setSubmitting(false);
    }
  }

  function handleConfirmWorkers() {
    const value = Number(numWorkers || 0);
    if (value > 10) {
      setWorkersError("Max 10 workers");
      setConfirmedWorkers(undefined);
      return;
    }
    if (value < 1) {
      setWorkersError("Min 1 worker");
      setConfirmedWorkers(undefined);
      return;
    }
    setWorkersError(undefined);
    setConfirmedWorkers(value);

    // Call scaling lambda
    const lambdaUrl = (import.meta.env.VITE_SIMULATION_LAMBDA_URL as string) || "https://6vyebgqw4plhmxrewmsgh6yere0bwpos.lambda-url.eu-west-3.on.aws/";
    const body = {
      redis_db: 1,
      task: "tasks.r_ecs_scaling.scale",
      args: {
        cluster: "checkdpe-dev-cluster",
        service: "checkdpe-cd-3cl-dev-service",
        desired: value,
      },
    };
    // eslint-disable-next-line no-console
    console.debug("[simulation] scaling workers", body);
    fetch(lambdaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json, text/plain, */*" },
      body: JSON.stringify(body),
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text().catch(() => "");
          throw new Error(`HTTP ${res.status} ${txt}`);
        }
        message.success(`updated workers to ${value}`);
      })
      .catch(() => {
        message.error("failed to update workers");
      });
  }

  return (
    <div style={{ minHeight: "100vh", background: "#ffffff", color: "#0b0c0f" }}>
      <TopMenu
        authLabel={userEmail || "login / sign-up"}
        authHref={(() => {
          const configured = import.meta.env.VITE_AUTH_URL as string | undefined;
          if (configured) {
            try {
              const configuredUrl = new URL(configured);
              const isConfiguredLocal = ["localhost", "127.0.0.1"].includes(configuredUrl.hostname);
              const isPageLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
              if (isConfiguredLocal && !isPageLocal) {
                // ignore local auth URL on non-localhost pages
              } else {
                // On non-local hosts, prefer explicit index.html so returnTo is added to the file URL
                if (!isConfiguredLocal) {
                  const pathname = configuredUrl.pathname || "/";
                  const endsWithHtml = /\.html$/i.test(pathname);
                  const hasTrailingSlash = /\/$/.test(pathname);
                  if (!endsWithHtml) {
                    const base = hasTrailingSlash ? configured.replace(/\/$/, "") : configured;
                    return base + "/index.html";
                  }
                }
                return configured;
              }
            } catch {
              return configured;
            }
          }
          if (window.location.hostname === "localhost") return "http://localhost:5173";
          return "/auth/index.html";
        })()}
        isAuthenticated={Boolean(userEmail)}
        centeredTitle={refAdeme}
        logoutHref={(() => {
          const domain = (import.meta.env.VITE_COGNITO_DOMAIN_URL as string | undefined)?.replace(/^https?:\/\//, "");
          if (!domain) return undefined;
          const clientId = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined;
          const logoutRedirect = (import.meta.env.VITE_LOGOUT_REDIRECT_URL as string | undefined) || window.location.origin;
          if (!clientId) return undefined;
          return `https://${domain}/logout?client_id=${encodeURIComponent(clientId)}&logout_uri=${encodeURIComponent(logoutRedirect)}`;
        })()}
      />
      {/* Invisible iframe to pull session from auth origin when on different ports */}
      {!bridgeReady && (
        <iframe
          src={(() => {
            const configured = import.meta.env.VITE_AUTH_URL as string | undefined;
            if (configured) {
              try {
                const configuredUrl = new URL(configured);
                const isConfiguredLocal = ["localhost", "127.0.0.1"].includes(configuredUrl.hostname);
                const isPageLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
                if (!(isConfiguredLocal && !isPageLocal)) {
                  const pathname = configuredUrl.pathname || "/";
                  const endsWithHtml = /\.html$/i.test(pathname);
                  const hasTrailingSlash = /\/$/.test(pathname);
                  const base = endsWithHtml ? configured : (hasTrailingSlash ? configured.replace(/\/$/, "") + "/index.html" : configured + "/index.html");
                  return base;
                }
              } catch {
                return configured.replace(/\/$/, "") + "/index.html";
              }
            }
            if (window.location.hostname === "localhost") return "http://localhost:5173/index.html";
            return "/auth/index.html";
          })()}
          style={{ display: "none" }}
          title="session-bridge"
        />
      )}
      <div style={{ padding: 24 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
        {isEditorOpen ? (
          <div style={{ position: "sticky", top: 24, alignSelf: "flex-start" }}>
            <DpeDrawerEditor
              inline
              open={isEditorOpen}
              onClose={() => setIsEditorOpen(false)}
              width={480}
              rootJsonText={jsonText}
              onApply={(next) => { hasUserEditedRef.current = true; flushSync(() => setJsonText(next)); }}
              apiLoadParams={refAdeme ? { baseUrl: (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr", ref_ademe: refAdeme } : undefined}
              getAccessToken={getAccessToken}
              onLoadedFromApi={(data) => {
                try {
                  const text = JSON.stringify(data, null, 2);
                  setJsonText((prev) => (prev?.trim() ? prev : text));
                } catch {}
              }}
              onHighlightJsonPath={({ collection, itemKey, indices }) => {
                try {
                  const ta = textAreaRef.current;
                  if (!ta) return;
                  const text = ta.value;
                  const variantPath = `dpe.logement.enveloppe.${collection}.${itemKey}`;
                  let searchFrom = 0;
                  let scopeArrayStart = -1;
                  let scopeArrayEnd = -1;
                  while (true) {
                    const varIdx = text.indexOf('"elements_variant"', searchFrom);
                    if (varIdx === -1) break;
                    const quoteIdx = text.indexOf('"', varIdx + 18);
                    const quoteEnd = quoteIdx !== -1 ? text.indexOf('"', quoteIdx + 1) : -1;
                    const value = quoteIdx !== -1 && quoteEnd !== -1 ? text.slice(quoteIdx + 1, quoteEnd) : '';
                    if (value === variantPath) {
                      const scopeKeyIdx = text.indexOf('"elements_scope"', varIdx);
                      if (scopeKeyIdx !== -1) {
                        const openBracket = text.indexOf('[', scopeKeyIdx);
                        if (openBracket !== -1) {
                          scopeArrayStart = openBracket;
                          const closeBracket = text.indexOf(']', openBracket);
                          if (closeBracket !== -1) scopeArrayEnd = closeBracket + 1;
                        }
                      }
                      break;
                    }
                    searchFrom = varIdx + 1;
                  }
                  if (scopeArrayStart === -1 || scopeArrayEnd === -1) return;
                  const prevSelStart = ta.selectionStart;
                  const prevSelEnd = ta.selectionEnd;
                  const prevScrollTop = ta.scrollTop;
                  const prevScrollLeft = ta.scrollLeft;
                  try { (ta as any).focus({ preventScroll: true }); } catch { try { ta.focus(); } catch {} }
                  try { ta.setSelectionRange(scopeArrayStart, scopeArrayEnd); } catch {}
                  try { ta.scrollTop = prevScrollTop; ta.scrollLeft = prevScrollLeft; } catch {}
                  window.setTimeout(() => {
                    try {
                      (ta as any).focus({ preventScroll: true });
                      ta.setSelectionRange(prevSelStart, prevSelEnd);
                      ta.scrollTop = prevScrollTop;
                      ta.scrollLeft = prevScrollLeft;
                    } catch {}
                  }, 600);
                } catch {}
              }}
            />
          </div>
        ) : null}

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Title level={2} style={{ color: "#0b0c0f", margin: 0 }}>Simulation</Title>
              <Button type="primary" size="large" icon={<LeftOutlined />} onClick={openEditor} disabled={isEditorOpen}>Edit</Button>
            </div>
            <Button onClick={() => setIsChainlitOpen(true)}>build with AI</Button>
          </div>
          <Paragraph style={{ color: "#4b5563", marginTop: 4 }}>Provide JSON and configure options, then submit.</Paragraph>
          
          <Card style={{ background: "#ffffff", borderColor: "#e5e7eb" }} styles={{ body: { padding: 16 } }}>
            <div style={{ display: "grid" }}>
              <textarea
                ref={textAreaRef}
                value={jsonText}
                onChange={(e) => { hasUserEditedRef.current = true; setJsonText(e.target.value); }}
                placeholder="Paste or write JSON here"
                style={{
                  minHeight: 420,
                  width: "100%",
                  background: isEditorOpen ? "#f3f4f6" : "#ffffff",
                  color: isEditorOpen ? "#6b7280" : "#111827",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: 12,
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace",
                  fontSize: 14,
                  lineHeight: 1.45,
                  resize: "vertical",
                  cursor: isEditorOpen ? "default" : "text",
                  overflow: "auto",
                }}
                readOnly={isEditorOpen}
              />
            </div>
            <div style={{ marginTop: 12 }}>
              <Collapse
                destroyOnHidden
                items={[
                  {
                    key: "options",
                    label: "Options",
                    children: (
                      <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        <div>
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>api_debug</div>
                          <Select
                            value={apiDebug as number | undefined}
                            onChange={(v) => setApiDebug(v)}
                            allowClear
                            placeholder="none"
                            options={apiDebugOptions}
                            style={{ width: "100%" }}
                          />
                        </div>
                        <div>
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>skip</div>
                          <InputNumber value={skip} onChange={(v) => setSkip(Number(v ?? 0))} style={{ width: "100%" }} min={0} />
                        </div>
                        <div>
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>limit</div>
                          <InputNumber value={limit} onChange={(v) => setLimit(Number(v ?? 0))} style={{ width: "100%" }} min={0} />
                        </div>
                        <div>
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>nb chunks</div>
                          <InputNumber value={numChunks} onChange={(v) => setNumChunks(Number(v ?? 1))} style={{ width: "100%" }} min={1} />
                        </div>
                        <div>
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>nb workers</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <InputNumber value={numWorkers} onChange={(v) => { setWorkersError(undefined); setNumWorkers(Number(v ?? 1)); }} style={{ width: 140 }} min={1} />
                            <Button size="small" onClick={handleConfirmWorkers}>ok</Button>
                            {typeof confirmedWorkers === "number" && (
                              <span style={{ color: "#059669", fontSize: 12 }}>saved: {confirmedWorkers}</span>
                            )}
                          </div>
                          {workersError && (
                            <div style={{ marginTop: 4, color: "#ef4444", fontSize: 12 }}>{workersError}</div>
                          )}
                        </div>
                      </Space>
                    ),
                  },
                ]}
              />
            </div>
              <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                <span style={{ display: "inline-block" }}>
                  <Button type="primary" onClick={handleSubmit} loading={submitting}>submit</Button>
                </span>
                <div style={{ position: "relative" }}>
                  <Button onClick={() => setIsSaveMenuOpen((v) => !v)}>...</Button>
                  {isSaveMenuOpen && (
                    <div style={{ position: "absolute", right: 0, top: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, width: 260, boxShadow: "0 4px 14px rgba(0,0,0,0.08)", zIndex: 10 }}>
                    <div style={{ padding: "6px 8px", cursor: "pointer", borderRadius: 6 }} onClick={() => { setIsLoadSavedOpen(true); setIsSaveMenuOpen(false); }}>load scenario</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1, borderRadius: 6 }} onClick={() => { if (!isSaving) handleSaveToBackoffice(); }}>save {simulLog || "default"}</div>
                    <div style={{ height: 1, background: "#e5e7eb", margin: "6px 0" }} />
                    <div style={{ padding: "6px 8px", cursor: isSaving ? "default" : "pointer", opacity: isSaving ? 0.6 : 1, borderRadius: 6 }} onClick={async () => {
                      if (isSaving) return;
                      const cdEnv = ((import.meta as any)?.env?.VITE_CD_ENV as string | undefined) || (import.meta.env.MODE === "development" ? "dev" : "prod");
                      const suggested = `${cdEnv}_simul_${simulLog || "test0001"}`;
                      const name = window.prompt(
                        "Save as name (format: <CD_ENV>_simul_<name>, e.g., dev_simul_test0001):",
                        suggested
                      );
                      if (!name) { setIsSaveMenuOpen(false); return; }
                      try {
                        const ref = `${refAdeme || "unknown"}-${name}`;
                        const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
                        const apiUrl = new URL("/backoffice/redis_file_manage", base);
                        setIsSaving(true);
                        // eslint-disable-next-line no-console
                        console.debug("[simulation] POST redis_file_manage (save as)", { url: apiUrl.toString(), ref });
                        const res = await authorizedFetch(apiUrl.toString(), {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Accept: "application/json, text/plain, */*",
                            "x-authorization": "dperdition",
                          },
                          body: JSON.stringify({ ref, text: jsonText }),
                        });
                        if (!res.ok) {
                          const txt = await res.text().catch(() => "");
                          throw new Error(`HTTP ${res.status} ${txt}`);
                        }
                        message.success(`saved ${name}`);
                        if (refAdeme) {
                          const { origin, pathname } = window.location;
                          const basePath = (() => {
                            try {
                              const idx = pathname.lastIndexOf("/");
                              return idx !== -1 ? pathname.slice(0, idx + 1) : "/";
                            } catch {
                              return "/";
                            }
                          })();
                          const targetUrl = `${origin}${basePath}index.html?ref_ademe=${encodeURIComponent(refAdeme)}&simul=${encodeURIComponent(name)}`;
                          window.location.href = targetUrl;
                        }
                      } catch {
                        message.error("save failed");
                      } finally {
                        setIsSaving(false);
                        setIsSaveMenuOpen(false);
                      }
                    }}>save as…</div>
                    </div>
                  )}
                </div>
              </div>
              {queueSegments > 0 && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ height: 10, background: "#e5e7eb", borderRadius: 8, overflow: "hidden", display: "flex" }}>
                    {(queueItems.length ? queueItems : Array.from({ length: queueSegments })).map((item: any, idx: number) => {
                      const ts = item?.ts_started;
                      let startedAtMs = 0;
                      try {
                        if (typeof ts === "number") startedAtMs = ts > 1e12 ? ts : ts * 1000;
                        else if (typeof ts === "string") {
                          const n = Number(ts);
                          if (Number.isFinite(n)) startedAtMs = n > 1e12 ? n : n * 1000; else {
                            const t = Date.parse(ts);
                            if (!Number.isNaN(t)) startedAtMs = t;
                          }
                        }
                      } catch {}
                      const elapsedSec = Math.max(0, (Date.now() - startedAtMs) / 1000);
                      const statusNum = Number(item?.status ?? 0);
                      const pct = statusNum === 1 ? 100 : Math.max(0, Math.min(100, (elapsedSec / 60) * 100));
                      const fillColor = statusNum === 1 ? "#93c5fd" : "transparent";
                      return (
                        <div key={idx} style={{ flex: 1, display: "flex" }}>
                          <div style={{ width: `${pct}%`, background: fillColor, transition: "width 1s linear" }} />
                          {idx < queueSegments - 1 ? (
                            <div style={{ width: 2, background: "#ffffff" }} />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-start", minHeight: 24 }}>
                {!resultsUrl && isPolling && (
                  <Spin size="small" />
                )}
                {resultsUrl && (
                  <a href={resultsUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    Open simulation results <ExportOutlined />
                  </a>
                )}
              </div>
              {refAdeme ? (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
                    <Title level={2} style={{ color: "#0b0c0f", margin: 0 }}>Results preview</Title>
                  </div>
                  <Card style={{ background: "#ffffff", borderColor: "#e5e7eb" }} styles={{ body: { padding: 16 } }}>
                    <SimulationResults
                      dpeId={refAdeme}
                      simul={simulLog}
                      getAccessToken={async () => (await getAccessToken()) || undefined}
                      apiBaseUrl={(import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr"}
                      width={720}
                      height={300}
                    />
                  </Card>
                </div>
              ) : null}
              {/* editor inline panel is rendered on the right */}
            </div>
            <SimulationScenariosModal
              open={isScenariosOpen}
              onCancel={() => setIsScenariosOpen(false)}
              onLoad={(runs) => {
                try {
                  setJsonText(JSON.stringify(runs, null, 2));
                } catch {
                  // fallback to empty array
                  setJsonText(JSON.stringify([], null, 2));
                }
                setIsScenariosOpen(false);
              }}
            />
            <LoadScenarioModal
              open={isLoadSavedOpen}
              onCancel={() => setIsLoadSavedOpen(false)}
              onSelect={(payload: unknown) => {
                try {
                  // Accept payload either as normalized object { ref_ademe, label } or string "ref:label"
                  let ref: string | undefined;
                  let simul: string | undefined;
                  if (typeof payload === "string") {
                    const colon = payload.indexOf(":");
                    ref = colon !== -1 ? payload.slice(0, colon) : undefined;
                    simul = colon !== -1 ? payload.slice(colon + 1) : undefined;
                  } else if (payload && typeof payload === "object") {
                    ref = (payload as any).ref_ademe as string | undefined;
                    simul = (payload as any).label as string | undefined;
                  }
                  const url = new URL(window.location.href);
                  if (ref) url.searchParams.set("ref_ademe", ref);
                  if (simul) url.searchParams.set("simul", simul);
                  window.location.href = url.toString();
                } catch {}
                setIsLoadSavedOpen(false);
              }}
              baseUrl={(import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr"}
              initialRefAdeme={refAdeme}
              getAccessToken={getAccessToken}
            />
          </Card>
        </div>

        {(() => {
          const chainlitUrl = (() => {
            const configured = import.meta.env.VITE_CHAINLIT_URL as string | undefined;
            if (configured && typeof configured === "string" && configured.trim()) return configured.trim();
            return "https://chainlit-stg.etiquettedpe.fr/chainlit";
          })();
          return (
            <ChainlitChatDrawer
              open={isChainlitOpen}
              onClose={() => setIsChainlitOpen(false)}
              title="Assistant"
              serverUrl={chainlitUrl}
              userEnv={{
                mail: "germain.blanchet@gmail.com",
                button_id: "contactez_nous",
                ref_ademe: refAdeme || "2508E0243162W",
              }}
            />
          );
        })()}

      </div>
      </div>
    </div>
  );
};



```

I updated `SimulationResults` to call the new endpoint and wired the `simul` parameter from the app.

- Implemented: `packages/simulation-results/src/simulation-results/SimulationResults.tsx`
  - Added `simul?: string` prop.
  - Switched request to `/backoffice/simulation_graph`.
  - Sends `ref_ademe` (from `dpeId`) and optional `simul`.
  - Kept token resolution and D3 rendering intact.

- Integrated: `apps/simul/src/App.tsx`
  - Passes `simul={simulLog}` to `SimulationResults`.

All lints are clean.

Done.

---

**User**

considering that some result would be like 

{
  "data": [
    {
      "redis_key": "2508E0243162W:dev_simul_test0002-0_o3cl_report",
      "id": "2508E0243162W-0",
      ],
      "cost": 0,
      "result": {
        "ep_conso_5_usages_m2": 155,
        "emission_ges_5_usages_m2": 5,
        "bilan_dpe_letter": "C",
        "emission_ges_letter": "A"
      }
    },
...



would you offer data to be displayed on the graph : 
cost, ep_conso_5_usages_m2, emission_ges_5_usages_m2
and also index in the array
while bilan_dpe_letter appears as the dot result?

---

**Cursor**

I'll implement support in `SimulationResults` to parse the new `simulation_graph` response, plot ep/ges on the left axis, cost on a right axis, use index for x, and render the `bilan_dpe_letter` as labels on the ep markers. Then I'll run lints.

I'll parse the simulation_graph response into structured points (index, ep, ges, cost, letter), then render a multi-series D3 chart with left axis for ep/ges, right axis for cost, index on x, and show the DPE letter as labels on ep markers. Now applying the edits.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

export type SimulationResultsProps = {
  dpeId: string;
  simul?: string;
  token?: string;
  getAccessToken?: () => Promise<string | undefined>;
  apiBaseUrl?: string;
  width?: number;
  height?: number;
  className?: string;
};

type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

type ChartPoint = {
  index: number;
  ep?: number;
  ges?: number;
  cost?: number;
  letter?: string;
};

function parseSimulationGraphData(payload: unknown): ChartPoint[] | null {
  try {
    // Expecting { data: [ { cost, result: { ep_conso_5_usages_m2, emission_ges_5_usages_m2, bilan_dpe_letter } }, ... ] }
    if (!payload || typeof payload !== "object") return null;
    const root = payload as any;
    const arr: any[] = Array.isArray(root?.data) ? root.data : (Array.isArray(root) ? root : []);
    if (!Array.isArray(arr)) return null;
    const points: ChartPoint[] = arr.map((item: any, idx: number) => {
      const res = item?.result || {};
      const ep = Number(res?.ep_conso_5_usages_m2);
      const ges = Number(res?.emission_ges_5_usages_m2);
      const cost = Number(item?.cost ?? res?.cost);
      const letter = (res?.bilan_dpe_letter as string | undefined) || undefined;
      const p: ChartPoint = { index: idx };
      if (Number.isFinite(ep)) p.ep = ep;
      if (Number.isFinite(ges)) p.ges = ges;
      if (Number.isFinite(cost)) p.cost = cost;
      if (letter && typeof letter === "string") p.letter = letter;
      return p;
    });
    return points;
  } catch {
    return null;
  }
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({
  dpeId,
  simul,
  token,
  getAccessToken,
  apiBaseUrl = "https://api-dev.etiquettedpe.fr",
  width = 640,
  height = 360,
  className,
}) => {
  const [state, setState] = useState<FetchState<unknown>>({ status: "idle" });
  const [resolvedToken, setResolvedToken] = useState<string | undefined>(token);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolveToken() {
      if (token) {
        setResolvedToken(token);
        return;
      }
      if (getAccessToken) {
        try {
          const t = await getAccessToken();
          if (!cancelled) setResolvedToken(t);
        } catch {
          if (!cancelled) setResolvedToken(undefined);
        }
      }
    }
    resolveToken();
    return () => {
      cancelled = true;
    };
  }, [token, getAccessToken]);

  useEffect(() => {
    let cancelled = false;
    if (!resolvedToken) {
      // wait until a token is available
      return () => {
        cancelled = true;
      };
    }
    setState({ status: "loading" });
    const url = new URL("/backoffice/simulation_graph", apiBaseUrl);
    url.searchParams.set("ref_ademe", dpeId);
    if (simul) url.searchParams.set("simul", simul);
    fetch(url.toString(), {
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${resolvedToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setState({ status: "success", data: json });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: "error", error: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, dpeId, simul, resolvedToken]);

  const points = useMemo(() => {
    if (state.status !== "success") return null;
    return parseSimulationGraphData(state.data);
  }, [state]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    if (!points || points.length === 0) return;
    const margin = { top: 20, right: 40, bottom: 30, left: 48 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const xDomain: [number, number] = [0, Math.max(0, (points.length - 1))];
    const epMax = d3.max(points, (p) => Number(p.ep ?? 0)) ?? 0;
    const gesMax = d3.max(points, (p) => Number(p.ges ?? 0)) ?? 0;
    const leftMax = Math.max(epMax, gesMax, 0);
    const costMax = d3.max(points, (p) => Number(p.cost ?? 0)) ?? 0;

    const x = d3.scaleLinear().domain(xDomain).nice().range([0, innerWidth]);
    const yLeft = d3.scaleLinear().domain([0, leftMax]).nice().range([innerHeight, 0]);
    const yRight = d3.scaleLinear().domain([0, costMax]).nice().range([innerHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(Math.min(points.length, 10)).tickFormat((v) => String(v)));
    g.append("g").call(d3.axisLeft(yLeft));
    g.append("g")
      .attr("transform", `translate(${innerWidth},0)`) 
      .call(d3.axisRight(yRight));

    const epSeries = points.filter((p) => Number.isFinite(p.ep)).map((p) => ({ x: p.index, y: Number(p.ep) }));
    const gesSeries = points.filter((p) => Number.isFinite(p.ges)).map((p) => ({ x: p.index, y: Number(p.ges) }));
    const costSeries = points.filter((p) => Number.isFinite(p.cost)).map((p) => ({ x: p.index, y: Number(p.cost) }));

    const lineLeft = d3
      .line<{ x: number; y: number }>()
      .x((d) => x(d.x))
      .y((d) => yLeft(d.y));

    const lineRight = d3
      .line<{ x: number; y: number }>()
      .x((d) => x(d.x))
      .y((d) => yRight(d.y));

    if (epSeries.length > 0) {
      g.append("path")
        .datum(epSeries)
        .attr("fill", "none")
        .attr("stroke", "#1677ff")
        .attr("stroke-width", 2)
        .attr("d", lineLeft);

      // EP markers with letter labels
      const epGroup = g.append("g");
      epGroup
        .selectAll("circle.ep")
        .data(points.filter((p) => Number.isFinite(p.ep)))
        .enter()
        .append("circle")
        .attr("class", "ep")
        .attr("cx", (p) => x(p.index))
        .attr("cy", (p) => yLeft(Number(p.ep)))
        .attr("r", 3.5)
        .attr("fill", "#1677ff");

      epGroup
        .selectAll("text.letter")
        .data(points.filter((p) => Number.isFinite(p.ep) && p.letter))
        .enter()
        .append("text")
        .attr("class", "letter")
        .attr("x", (p) => x(p.index) + 6)
        .attr("y", (p) => yLeft(Number(p.ep)) - 6)
        .attr("font-size", 10)
        .attr("fill", "#111827")
        .text((p) => String(p.letter));
    }

    if (gesSeries.length > 0) {
      g.append("path")
        .datum(gesSeries)
        .attr("fill", "none")
        .attr("stroke", "#10b981")
        .attr("stroke-width", 2)
        .attr("d", lineLeft);
    }

    if (costSeries.length > 0) {
      g.append("path")
        .datum(costSeries)
        .attr("fill", "none")
        .attr("stroke", "#f59e0b")
        .attr("stroke-width", 2)
        .attr("d", lineRight);
    }
  }, [series, width, height]);

  if (state.status === "loading") {
    return <div className={className}>Loading simulation results…</div>;
  }
  if (state.status === "error") {
    return <div className={className}>Error: {state.error}</div>;
  }

  if (state.status === "success" && !points) {
    return (
      <div className={className}>
        Unsupported data format
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(state.data, null, 2)}
        </pre>
      </div>
    );
  }

  return <svg ref={svgRef} className={className} width={width} height={height} />;
};



```

- Yes: I now parse `data[]` items and extract index, cost, ep_conso_5_usages_m2 (ep), emission_ges_5_usages_m2 (ges), and bilan_dpe_letter (letter).
- The chart shows:
  - x: index
  - y-left: ep (blue), ges (green)
  - y-right: cost (orange)
  - ep points display `bilan_dpe_letter` as small labels next to the dots.

If you want different series colors, labels on ges too, or tooltips, say the word.

---

**User**

SimulationResults.tsx:229 Uncaught ReferenceError: series is not defined
    at SimulationResults (SimulationResults.tsx:229:7)
    at renderWithHooks (chunk-FDCL5M4P.js?v=a5826b93:11548:26)
    at mountIndeterminateComponent (chunk-FDCL5M4P.js?v=a5826b93:14926:21)
    at beginWork (chunk-FDCL5M4P.js?v=a5826b93:15914:22)
    at HTMLUnknownElement.callCallback2 (chunk-FDCL5M4P.js?v=a5826b93:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-FDCL5M4P.js?v=a5826b93:3699:24)
    at invokeGuardedCallback (chunk-FDCL5M4P.js?v=a5826b93:3733:39)
    at beginWork$1 (chunk-FDCL5M4P.js?v=a5826b93:19765:15)
    at performUnitOfWork (chunk-FDCL5M4P.js?v=a5826b93:19198:20)
    at workLoopSync (chunk-FDCL5M4P.js?v=a5826b93:19137:13)
SimulationResults @ SimulationResults.tsx:229
renderWithHooks @ chunk-FDCL5M4P.js?v=a5826b93:11548
mountIndeterminateComponent @ chunk-FDCL5M4P.js?v=a5826b93:14926
beginWork @ chunk-FDCL5M4P.js?v=a5826b93:15914
callCallback2 @ chunk-FDCL5M4P.js?v=a5826b93:3674
invokeGuardedCallbackDev @ chunk-FDCL5M4P.js?v=a5826b93:3699
invokeGuardedCallback @ chunk-FDCL5M4P.js?v=a5826b93:3733
beginWork$1 @ chunk-FDCL5M4P.js?v=a5826b93:19765
performUnitOfWork @ chunk-FDCL5M4P.js?v=a5826b93:19198
workLoopSync @ chunk-FDCL5M4P.js?v=a5826b93:19137
renderRootSync @ chunk-FDCL5M4P.js?v=a5826b93:19116
performConcurrentWorkOnRoot @ chunk-FDCL5M4P.js?v=a5826b93:18678
workLoop @ chunk-FDCL5M4P.js?v=a5826b93:197
flushWork @ chunk-FDCL5M4P.js?v=a5826b93:176
performWorkUntilDeadline @ chunk-FDCL5M4P.js?v=a5826b93:384
SimulationResults.tsx:229 Uncaught ReferenceError: series is not defined
    at SimulationResults (SimulationResults.tsx:229:7)
    at renderWithHooks (chunk-FDCL5M4P.js?v=a5826b93:11548:26)
    at mountIndeterminateComponent (chunk-FDCL5M4P.js?v=a5826b93:14926:21)
    at beginWork (chunk-FDCL5M4P.js?v=a5826b93:15914:22)
    at HTMLUnknownElement.callCallback2 (chunk-FDCL5M4P.js?v=a5826b93:3674:22)
    at Object.invokeGuardedCallbackDev (chunk-FDCL5M4P.js?v=a5826b93:3699:24)
    at invokeGuardedCallback (chunk-FDCL5M4P.js?v=a5826b93:3733:39)
    at beginWork$1 (chunk-FDCL5M4P.js?v=a5826b93:19765:15)
    at performUnitOfWork (chunk-FDCL5M4P.js?v=a5826b93:19198:20)
    at workLoopSync (chunk-FDCL5M4P.js?v=a5826b93:19137:13)
SimulationResults @ SimulationResults.tsx:229
renderWithHooks @ chunk-FDCL5M4P.js?v=a5826b93:11548
mountIndeterminateComponent @ chunk-FDCL5M4P.js?v=a5826b93:14926
beginWork @ chunk-FDCL5M4P.js?v=a5826b93:15914
callCallback2 @ chunk-FDCL5M4P.js?v=a5826b93:3674
invokeGuardedCallbackDev @ chunk-FDCL5M4P.js?v=a5826b93:3699
invokeGuardedCallback @ chunk-FDCL5M4P.js?v=a5826b93:3733
beginWork$1 @ chunk-FDCL5M4P.js?v=a5826b93:19765
performUnitOfWork @ chunk-FDCL5M4P.js?v=a5826b93:19198
workLoopSync @ chunk-FDCL5M4P.js?v=a5826b93:19137
renderRootSync @ chunk-FDCL5M4P.js?v=a5826b93:19116
recoverFromConcurrentError @ chunk-FDCL5M4P.js?v=a5826b93:18736
performConcurrentWorkOnRoot @ chunk-FDCL5M4P.js?v=a5826b93:18684
workLoop @ chunk-FDCL5M4P.js?v=a5826b93:197
flushWork @ chunk-FDCL5M4P.js?v=a5826b93:176
performWorkUntilDeadline @ chunk-FDCL5M4P.js?v=a5826b93:384
hook.js:608 The above error occurred in the <SimulationResults> component:

    at SimulationResults (http://localhost:3000/@fs/Volumes/privateGg/ai-microfront-ant/packages/simulation-results/src/simulation-results/SimulationResults.tsx?t=1758824163512:45:3)
    at div
    at div
    at http://localhost:3000/node_modules/.vite/deps/antd.js?v=a5826b93:48084:16
    at div
    at div
    at div
    at div
    at http://localhost:3000/node_modules/.vite/deps/antd.js?v=a5826b93:48084:16
    at div
    at div
    at div
    at div
    at App (http://localhost:3000/src/App.tsx?t=1758824163512:35:35)

Consider adding an error boundary to your tree to customize error handling behavior.
Visit https://reactjs.org/link/error-boundaries to learn more about error boundaries.
overrideMethod @ hook.js:608
logCapturedError @ chunk-FDCL5M4P.js?v=a5826b93:14032
update.callback @ chunk-FDCL5M4P.js?v=a5826b93:14052
callCallback @ chunk-FDCL5M4P.js?v=a5826b93:11248
commitUpdateQueue @ chunk-FDCL5M4P.js?v=a5826b93:11265
commitLayoutEffectOnFiber @ chunk-FDCL5M4P.js?v=a5826b93:17093
commitLayoutMountEffects_complete @ chunk-FDCL5M4P.js?v=a5826b93:17980
commitLayoutEffects_begin @ chunk-FDCL5M4P.js?v=a5826b93:17969
commitLayoutEffects @ chunk-FDCL5M4P.js?v=a5826b93:17920
commitRootImpl @ chunk-FDCL5M4P.js?v=a5826b93:19353
commitRoot @ chunk-FDCL5M4P.js?v=a5826b93:19277
finishConcurrentRender @ chunk-FDCL5M4P.js?v=a5826b93:18760
performConcurrentWorkOnRoot @ chunk-FDCL5M4P.js?v=a5826b93:18718
workLoop @ chunk-FDCL5M4P.js?v=a5826b93:197
flushWork @ chunk-FDCL5M4P.js?v=a5826b93:176
performWorkUntilDeadline @ chunk-FDCL5M4P.js?v=a5826b93:384
chunk-FDCL5M4P.js?v=a5826b93:19413 Uncaught ReferenceError: series is not defined
    at SimulationResults (SimulationResults.tsx:229:7)
    at renderWithHooks (chunk-FDCL5M4P.js?v=a5826b93:11548:26)
    at mountIndeterminateComponent (chunk-FDCL5M4P.js?v=a5826b93:14926:21)
    at beginWork (chunk-FDCL5M4P.js?v=a5826b93:15914:22)
    at beginWork$1 (chunk-FDCL5M4P.js?v=a5826b93:19753:22)
    at performUnitOfWork (chunk-FDCL5M4P.js?v=a5826b93:19198:20)
    at workLoopSync (chunk-FDCL5M4P.js?v=a5826b93:19137:13)
    at renderRootSync (chunk-FDCL5M4P.js?v=a5826b93:19116:15)
    at recoverFromConcurrentError (chunk-FDCL5M4P.js?v=a5826b93:18736:28)
    at performConcurrentWorkOnRoot (chunk-FDCL5M4P.js?v=a5826b93:18684:30)
SimulationResults @ SimulationResults.tsx:229
renderWithHooks @ chunk-FDCL5M4P.js?v=a5826b93:11548
mountIndeterminateComponent @ chunk-FDCL5M4P.js?v=a5826b93:14926
beginWork @ chunk-FDCL5M4P.js?v=a5826b93:15914
beginWork$1 @ chunk-FDCL5M4P.js?v=a5826b93:19753
performUnitOfWork @ chunk-FDCL5M4P.js?v=a5826b93:19198
workLoopSync @ chunk-FDCL5M4P.js?v=a5826b93:19137
renderRootSync @ chunk-FDCL5M4P.js?v=a5826b93:19116
recoverFromConcurrentError @ chunk-FDCL5M4P.js?v=a5826b93:18736
performConcurrentWorkOnRoot @ chunk-FDCL5M4P.js?v=a5826b93:18684
workLoop @ chunk-FDCL5M4P.js?v=a5826b93:197
flushWork @ chunk-FDCL5M4P.js?v=a5826b93:176
performWorkUntilDeadline @ chunk-FDCL5M4P.js?v=a5826b93:384
favicon.ico:1  GET http://localhost:3000/favicon.ico 404 (Not Found)
App.tsx:325 [simulation] skipping get_redis_detail: no Cognito token available
overrideMethod @ hook.js:608
(anonymous) @ App.tsx:325
await in (anonymous)
(anonymous) @ App.tsx:333
commitHookEffectListMount @ chunk-FDCL5M4P.js?v=a5826b93:16915
commitPassiveMountOnFiber @ chunk-FDCL5M4P.js?v=a5826b93:18156
commitPassiveMountEffects_complete @ chunk-FDCL5M4P.js?v=a5826b93:18129
commitPassiveMountEffects_begin @ chunk-FDCL5M4P.js?v=a5826b93:18119
commitPassiveMountEffects @ chunk-FDCL5M4P.js?v=a5826b93:18109
flushPassiveEffectsImpl @ chunk-FDCL5M4P.js?v=a5826b93:19490
flushPassiveEffects @ chunk-FDCL5M4P.js?v=a5826b93:19447
performSyncWorkOnRoot @ chunk-FDCL5M4P.js?v=a5826b93:18868
flushSyncCallbacks @ chunk-FDCL5M4P.js?v=a5826b93:9119
commitRootImpl @ chunk-FDCL5M4P.js?v=a5826b93:19432
commitRoot @ chunk-FDCL5M4P.js?v=a5826b93:19277
finishConcurrentRender @ chunk-FDCL5M4P.js?v=a5826b93:18805
performConcurrentWorkOnRoot @ chunk-FDCL5M4P.js?v=a5826b93:18718
workLoop @ chunk-FDCL5M4P.js?v=a5826b93:197
flushWork @ chunk-FDCL5M4P.js?v=a5826b93:176
performWorkUntilDeadline @ chunk-FDCL5M4P.js?v=a5826b93:384


---

**Cursor**

I see the runtime error is due to a leftover dependency referencing an old variable name. I'll update the effect dependency from series to points in `SimulationResults.tsx` and run lints.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

export type SimulationResultsProps = {
  dpeId: string;
  simul?: string;
  token?: string;
  getAccessToken?: () => Promise<string | undefined>;
  apiBaseUrl?: string;
  width?: number;
  height?: number;
  className?: string;
};

type FetchState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: string }
  | { status: "success"; data: T };

type ChartPoint = {
  index: number;
  ep?: number;
  ges?: number;
  cost?: number;
  letter?: string;
};

function parseSimulationGraphData(payload: unknown): ChartPoint[] | null {
  try {
    // Expecting { data: [ { cost, result: { ep_conso_5_usages_m2, emission_ges_5_usages_m2, bilan_dpe_letter } }, ... ] }
    if (!payload || typeof payload !== "object") return null;
    const root = payload as any;
    const arr: any[] = Array.isArray(root?.data) ? root.data : (Array.isArray(root) ? root : []);
    if (!Array.isArray(arr)) return null;
    const points: ChartPoint[] = arr.map((item: any, idx: number) => {
      const res = item?.result || {};
      const ep = Number(res?.ep_conso_5_usages_m2);
      const ges = Number(res?.emission_ges_5_usages_m2);
      const cost = Number(item?.cost ?? res?.cost);
      const letter = (res?.bilan_dpe_letter as string | undefined) || undefined;
      const p: ChartPoint = { index: idx };
      if (Number.isFinite(ep)) p.ep = ep;
      if (Number.isFinite(ges)) p.ges = ges;
      if (Number.isFinite(cost)) p.cost = cost;
      if (letter && typeof letter === "string") p.letter = letter;
      return p;
    });
    return points;
  } catch {
    return null;
  }
}

export const SimulationResults: React.FC<SimulationResultsProps> = ({
  dpeId,
  simul,
  token,
  getAccessToken,
  apiBaseUrl = "https://api-dev.etiquettedpe.fr",
  width = 640,
  height = 360,
  className,
}) => {
  const [state, setState] = useState<FetchState<unknown>>({ status: "idle" });
  const [resolvedToken, setResolvedToken] = useState<string | undefined>(token);
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolveToken() {
      if (token) {
        setResolvedToken(token);
        return;
      }
      if (getAccessToken) {
        try {
          const t = await getAccessToken();
          if (!cancelled) setResolvedToken(t);
        } catch {
          if (!cancelled) setResolvedToken(undefined);
        }
      }
    }
    resolveToken();
    return () => {
      cancelled = true;
    };
  }, [token, getAccessToken]);

  useEffect(() => {
    let cancelled = false;
    if (!resolvedToken) {
      // wait until a token is available
      return () => {
        cancelled = true;
      };
    }
    setState({ status: "loading" });
    const url = new URL("/backoffice/simulation_graph", apiBaseUrl);
    url.searchParams.set("ref_ademe", dpeId);
    if (simul) url.searchParams.set("simul", simul);
    fetch(url.toString(), {
      headers: {
        Accept: "*/*",
        Authorization: `Bearer ${resolvedToken}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        if (!cancelled) setState({ status: "success", data: json });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({ status: "error", error: (err as Error).message });
      });
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, dpeId, simul, resolvedToken]);

  const points = useMemo(() => {
    if (state.status !== "success") return null;
    return parseSimulationGraphData(state.data);
  }, [state]);

  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const svg = d3.select(svgEl);
    svg.selectAll("*").remove();

    if (!points || points.length === 0) return;
    const margin = { top: 20, right: 40, bottom: 30, left: 48 };
    const innerWidth = Math.max(0, width - margin.left - margin.right);
    const innerHeight = Math.max(0, height - margin.top - margin.bottom);

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
    
    const xDomain: [number, number] = [0, Math.max(0, (points.length - 1))];
    const epMax = d3.max(points, (p) => Number(p.ep ?? 0)) ?? 0;
    const gesMax = d3.max(points, (p) => Number(p.ges ?? 0)) ?? 0;
    const leftMax = Math.max(epMax, gesMax, 0);
    const costMax = d3.max(points, (p) => Number(p.cost ?? 0)) ?? 0;

    const x = d3.scaleLinear().domain(xDomain).nice().range([0, innerWidth]);
    const yLeft = d3.scaleLinear().domain([0, leftMax]).nice().range([innerHeight, 0]);
    const yRight = d3.scaleLinear().domain([0, costMax]).nice().range([innerHeight, 0]);

    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x).ticks(Math.min(points.length, 10)).tickFormat((v) => String(v)));
    g.append("g").call(d3.axisLeft(yLeft));
    g.append("g")
      .attr("transform", `translate(${innerWidth},0)`) 
      .call(d3.axisRight(yRight));

    const epSeries = points.filter((p) => Number.isFinite(p.ep)).map((p) => ({ x: p.index, y: Number(p.ep) }));
    const gesSeries = points.filter((p) => Number.isFinite(p.ges)).map((p) => ({ x: p.index, y: Number(p.ges) }));
    const costSeries = points.filter((p) => Number.isFinite(p.cost)).map((p) => ({ x: p.index, y: Number(p.cost) }));

    const lineLeft = d3
      .line<{ x: number; y: number }>()
      .x((d) => x(d.x))
      .y((d) => yLeft(d.y));

    const lineRight = d3
      .line<{ x: number; y: number }>()
      .x((d) => x(d.x))
      .y((d) => yRight(d.y));

    if (epSeries.length > 0) {
      g.append("path")
        .datum(epSeries)
        .attr("fill", "none")
        .attr("stroke", "#1677ff")
        .attr("stroke-width", 2)
        .attr("d", lineLeft);

      // EP markers with letter labels
      const epGroup = g.append("g");
      epGroup
        .selectAll("circle.ep")
        .data(points.filter((p) => Number.isFinite(p.ep)))
        .enter()
        .append("circle")
        .attr("class", "ep")
        .attr("cx", (p) => x(p.index))
        .attr("cy", (p) => yLeft(Number(p.ep)))
        .attr("r", 3.5)
        .attr("fill", "#1677ff");

      epGroup
        .selectAll("text.letter")
        .data(points.filter((p) => Number.isFinite(p.ep) && p.letter))
        .enter()
        .append("text")
        .attr("class", "letter")
        .attr("x", (p) => x(p.index) + 6)
        .attr("y", (p) => yLeft(Number(p.ep)) - 6)
        .attr("font-size", 10)
        .attr("fill", "#111827")
        .text((p) => String(p.letter));
    }

    if (gesSeries.length > 0) {
      g.append("path")
        .datum(gesSeries)
        .attr("fill", "none")
        .attr("stroke", "#10b981")
        .attr("stroke-width", 2)
        .attr("d", lineLeft);
    }

    if (costSeries.length > 0) {
      g.append("path")
        .datum(costSeries)
        .attr("fill", "none")
        .attr("stroke", "#f59e0b")
        .attr("stroke-width", 2)
        .attr("d", lineRight);
    }
  }, [points, width, height]);

  if (state.status === "loading") {
    return <div className={className}>Loading simulation results…</div>;
  }
  if (state.status === "error") {
    return <div className={className}>Error: {state.error}</div>;
  }

  if (state.status === "success" && !points) {
    return (
      <div className={className}>
        Unsupported data format
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {JSON.stringify(state.data, null, 2)}
        </pre>
      </div>
    );
  }

  return <svg ref={svgRef} className={className} width={width} height={height} />;
};



```

Fixed. I replaced the stale effect dependency to use points instead of series in `SimulationResults.tsx`. The runtime ReferenceError should be gone.

