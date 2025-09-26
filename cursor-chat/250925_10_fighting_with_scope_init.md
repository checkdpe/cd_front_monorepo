# Maintain endpoint behavior after submission
_Exported on 25/09/2025 at 22:18:10 CEST from Cursor (1.5.5)_

---

**User**

keep same behavior for endpoint calls in normal situation
but after "submit"
only endpoints there need to be refreshed
-https://api-dev.etiquettedpe.fr/backoffice/get_redis_detail?ref_ademe=2508E0243162W&log=dev_simul_test0002_o3cl_done_queue
-https://api-dev.etiquettedpe.fr/backoffice/get_redis_detail?ref_ademe=2508E0243162W&log=dev_simul_test0002_o3cl_queue

---

**Cursor**

I'll scan the codebase to find where endpoint calls and submit handling are implemented, and locate any polling or refresh logic tied to those endpoints so I can limit refresh to just the two specified URLs after submit.

I'll open the simulator app file to inspect `handleSubmit`, `fetchQueueOnce`, and polling logic so I can update post-submit behavior to only refresh the two Redis endpoints.

I'll update the simulator's submit flow so that after submitting, we start polling only the two Redis endpoints (queue and done) regardless of chunk count, and remove the duplicate polling start inside the chunks branch.

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
import { SimulationDetailCard } from "@acme/simulation-detail";

const { Title, Paragraph } = Typography;

export const App: React.FC = () => {
  const [jsonText, setJsonText] = useState<string>("{\n  \"items\": []\n}");
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [apiDebug, setApiDebug] = useState<number | undefined>(undefined);
  const [skip, setSkip] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [numChunks, setNumChunks] = useState<number>(1);
  useEffect(() => { setNumChunks(2); }, []);
  const [totalCombinations, setTotalCombinations] = useState<number | undefined>(undefined);
  const [nbCombinations, setNbCombinations] = useState<number | undefined>(undefined);
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
  const [selectedPoint, setSelectedPoint] = useState<{ index: number; ep?: number; ges?: number; cost?: number; letter?: string } | null>(null);
  function openEditor() { setIsEditorOpen(true); }
  const hasLoadedTemplateRef = useRef<boolean>(false);
  const editorOriginalTextRef = useRef<string>("");
  const combinationsAbortRef = useRef<AbortController | null>(null);

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

  // Compute combinations count based on current JSON, ref_ademe and simul
  useEffect(() => {
    try { combinationsAbortRef.current?.abort(); } catch {}
    const simulName = (simulLog || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl");
    if (!refAdeme || !simulName) { setTotalCombinations(undefined); return; }
    // Validate and parse JSON before calling
    let parsedSimul: unknown = {};
    try { parsedSimul = jsonText.trim() ? JSON.parse(jsonText) : {}; } catch { setTotalCombinations(undefined); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const url = new URL("/backoffice/simulation_count", base);
        url.searchParams.set("ref_ademe", String(refAdeme));
        url.searchParams.set("simul", String(simulName));
        const controller = new AbortController();
        combinationsAbortRef.current = controller;
        const res = await authorizedFetch(url.toString(), {
          method: "POST",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "x-authorization": "dperdition",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          body: JSON.stringify({ ref_ademe: refAdeme, simul: simulName, simul_content: parsedSimul }),
          signal: controller.signal,
        });
        if (!res.ok) { setTotalCombinations(undefined); return; }
        const data: any = await res.json().catch(() => null);
        const value = Number(((data && data.data && data.data.total_combinations) ?? (data && data.total_combinations)) as any);
        if (Number.isFinite(value)) setTotalCombinations(value); else setTotalCombinations(undefined);
      } catch {
        setTotalCombinations(undefined);
      }
    }, 600);
    return () => { cancelled = true; try { window.clearTimeout(timer); } catch {}; };
  }, [refAdeme, simulLog, jsonText]);

  // Initialize nbCombinations from totalCombinations once when available (unless user already set it)
  useEffect(() => {
    if (typeof nbCombinations === "number") return;
    if (typeof totalCombinations === "number") setNbCombinations(totalCombinations);
  }, [totalCombinations, nbCombinations]);

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
      // After submit, always start polling only the queue/done endpoints
      startQueuePolling();
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
            nb_combinations: Number(nbCombinations || totalCombinations || 0),
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
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>combinations</div>
                          <InputNumber value={typeof totalCombinations === "number" ? totalCombinations : undefined} style={{ width: "100%" }} disabled min={0} />
                        </div>
                        <div>
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>nb combinations</div>
                          <InputNumber value={nbCombinations} onChange={(v) => setNbCombinations(Number(v ?? 0) || undefined)} style={{ width: "100%" }} min={1} />
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
                      onSelectPoint={(p) => setSelectedPoint(p)}
                      selectedIndex={selectedPoint?.index}
                      primaryColor="#1677ff"
                      mapColorDpe={{
                        A: "#189c44",
                        B: "#4FAA05",
                        C: "#CCD600",
                        D: "#FFEE6C",
                        E: "#FFC661",
                        F: "#FF8300",
                        G: "#FF3238",
                      }}
                    />
                    <div style={{ marginTop: 12 }}>
                      <SimulationDetailCard point={selectedPoint || undefined} mapColorDpe={{
                        A: "#189c44",
                        B: "#4FAA05",
                        C: "#CCD600",
                        D: "#FFEE6C",
                        E: "#FFC661",
                        F: "#FF8300",
                        G: "#FF3238",
                      }} />
                    </div>
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

- I’ll start polling the queue/done Redis endpoints immediately after submit, and removed the redundant polling trigger inside the multi-chunk branch.

- Impact: normal behavior unchanged; after submit, only these two endpoints are refreshed:
  - https://api-dev.etiquettedpe.fr/backoffice/get_redis_detail?ref_ademe=...&log=..._o3cl_queue
  - https://api-dev.etiquettedpe.fr/backoffice/get_redis_detail?ref_ademe=...&log=..._o3cl_done_queue

Let me know if you also want the results “processed” polling disabled or adjusted.

- I added a single call to `startQueuePolling()` right after `message.success` in `apps/simul/src/App.tsx`, and removed a duplicate call inside the multi-chunk append flow.

---

**User**

nah, for some reasons : after clicking on "submit" it keeps refrehsing @https://api-dev.etiquettedpe.fr/backoffice/simulation_dpe_full?ref_ademe=2508E0243162W 
@https://api-dev.etiquettedpe.fr/backoffice/simulation_template?ref_ademe=2508E0243162W 
indefinitely

---

**Cursor**

I'm going to locate where `simulation_dpe_full` and `simulation_template` are called and check for any polling intervals that may be running after submit, so I can stop them and ensure only the Redis queue/done endpoints refresh after submit.

I'll update `DpeDrawerEditor` to fetch `simulation_dpe_full` and `simulation_template` only once per open/ref_ademe, preventing repeated requests after submit. Then I’ll run a lint check on the changed file.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
import { TemplateEditorModal } from "@acme/template-editor";
import { fetchSimulationDpeFullJson, fetchSimulationTemplateJson } from "../api";

export type DpeDrawerEditorProps = {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  rootJsonText: string;
  onApply: (nextJsonText: string) => void;
  // When provided, component will call the API on open using a Cognito bearer token
  apiLoadParams?: { baseUrl?: string; ref_ademe: string };
  getAccessToken?: () => Promise<string | null>;
  onLoadedFromApi?: (data: unknown) => void;
  onHighlightJsonPath?: (args: { collection: string; itemKey: string; indices: number[] }) => void;
  // When true, renders as a fixed inline panel instead of overlay drawer
  inline?: boolean;
};

type VariantId = string; // e.g. "dpe.logement.enveloppe.mur_collection.mur"
type EditorVariantState = { enabled: boolean; index: number; text: string };
type VariantDef = { id: VariantId; collection: string; itemKey: string; label: string };

function parseVariantPath(path: string): { collection: string; itemKey: string } | null {
  try {
    const parts = path.split(".");
    const idx = parts.lastIndexOf("enveloppe");
    if (idx === -1) return null;
    const collection = parts[idx + 1];
    const itemKey = parts[idx + 2];
    if (!collection || !itemKey) return null;
    return { collection, itemKey };
  } catch {
    return null;
  }
}

function toLabel(input: string): string {
  const spaced = input.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function deepGet(root: any, path: (string | number)[]): any {
  return path.reduce((acc: any, key: any) => (acc != null ? acc[key] : undefined), root);
}

function ensurePath(root: any, path: string[]): any {
  let cursor = root;
  for (const key of path) {
    if (cursor[key] == null || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  return cursor;
}

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath, inline = false }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]>>({});
  const [highlighted, setHighlighted] = useState<Record<VariantId, Record<string, boolean>>>({});
  const [pricing, setPricing] = useState<Record<VariantId, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({});

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantId | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantId, { inputKey?: string; costKey?: string }>>({});
  const [forcedInputs, setForcedInputs] = useState<Record<VariantId, string>>({});
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantId, boolean[]>>({});
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantId, "all" | "explode">>({});
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantId, { increments: number[]; priceVar: number[] }>>({});
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantId, number[]>>({});
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; data: any }>({ open: false, title: "", data: null });
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  // Avoid re-fetching while open due to parent re-renders: remember last load key
  const lastLoadedKeyRef = useRef<string | null>(null);

  const variantDefs: VariantDef[] = useMemo(() => {
    const map = new Map<VariantId, VariantDef>();
    try {
      // From template runs
      const runsTpl: any[] = Array.isArray(templateRuns) ? templateRuns : [];
      for (const r of runsTpl) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const parsed = parseVariantPath(ev);
          if (parsed) {
            const { collection, itemKey } = parsed;
            const label = toLabel(itemKey);
            map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    try {
      // From current JSON text (runs array)
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const r of runs) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const p = parseVariantPath(ev);
          if (p) {
            const { collection, itemKey } = p;
            const label = toLabel(itemKey);
            if (!map.has(ev)) map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    return Array.from(map.values());
  }, [templateRuns, rootJsonText]);

  const variantIds: VariantId[] = useMemo(() => variantDefs.map((v) => v.id), [variantDefs]);

  // Ensure state maps have defaults for discovered variants
  useEffect(() => {
    if (!variantIds.length) return;
    setPricing((prev) => {
      const next = { ...prev };
      for (const id of variantIds) {
        if (!next[id]) next[id] = { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" };
      }
      return next;
    });
    setMappingKeys((prev) => ({ ...prev }));
    setForcedInputs((prev) => {
      const next = { ...prev };
      for (const id of variantIds) if (next[id] == null) next[id] = "{\n}\n";
      return next;
    });
    setScenarioEnabled((prev) => ({ ...prev }));
    setScopeStrategy((prev) => {
      const next = { ...prev } as Record<VariantId, "all" | "explode">;
      for (const id of variantIds) if (!next[id]) next[id] = "all";
      return next;
    });
    setTemplateDerived((prev) => ({ ...prev }));
    setTemplateScenarioIds((prev) => ({ ...prev }));
    setAvailableOptions((prev) => ({ ...prev }));
    setHighlighted((prev) => ({ ...prev }));
  }, [variantIds]);
  // Fetch from API when the drawer opens if configured (once per open/ref)
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    const key = `${apiLoadParams.baseUrl || ""}|${apiLoadParams.ref_ademe}`;
    if (lastLoadedKeyRef.current === key) return;
    let isCancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token) return;
        const [data, template]: any[] = await Promise.all([
          fetchSimulationDpeFullJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
          fetchSimulationTemplateJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
        ]);
        if (!isCancelled) {
          lastLoadedKeyRef.current = key;
          onLoadedFromApi?.(data);
          try {
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
            const envelope = (data as any)?.dpe?.logement?.enveloppe || {};
            for (const v of variantDefs) {
              const entry = runs.find((r) => r && r.elements_variant === v.id);
              const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
              const collectionObj = envelope?.[v.collection];
              let items: any[] = [];
              if (Array.isArray(collectionObj?.[v.itemKey])) {
                items = collectionObj[v.itemKey] as any[];
              } else if (Array.isArray(collectionObj)) {
                // Shape B: array of slots { <itemKey>: {...} }
                items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
              }
              optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
                key: String(item?.donnee_entree?.reference || idx),
                description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
                selected: scopes.includes(idx),
                payload: item,
              }));
            }
            setAvailableOptions(optionsMap);

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              for (const v of variantDefs) {
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === v.id) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
                  } catch {}
                }
              }
            } catch {}
          } catch {
            setAvailableOptions({});
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    })();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken]);

  // Reset load guard when closing so reopening can re-fetch
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      setAvailableOptions((prev) => {
        const next: typeof prev = { ...prev };
        for (const v of variantDefs) {
          const entry = runs.find((r) => r && r.elements_variant === v.id);
          const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
          next[v.id] = (prev[v.id] || []).map((o, idx) => ({ ...o, selected: scopes.includes(idx) }));
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [rootJsonText, variantDefs]);

  // Capture original JSON when opening, used to rollback on close (X)
  useEffect(() => {
    if (open) {
      originalJsonRef.current = rootJsonText;
    }
  }, [open]);

  // (no-op)

  // Sync scope strategy from JSON (default to "all")
  useEffect(() => {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const next: Record<VariantId, "all" | "explode"> = {};
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        next[v.id] = entry?.scope_strategy === "explode" ? "explode" : "all";
      }
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText, variantDefs]);

  function deriveVariantPricingFromRuns(runsArr: any[], variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getFirstScenarioInputKeyFromRuns(runsArr, variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getFirstScenarioCostKeyFromRuns(runsArr, variantId) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      for (const v of variantDefs) {
        const derived = deriveVariantPricingFromRuns(templateRuns, v.id);
        setTemplateDerived((prev) => ({ ...prev, [v.id]: derived }));
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === v.id) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [v.id]: ids }));
      }
    } catch {}
  }, [templateRuns, mappingKeys, variantDefs]);

  function getPresentScenarioIds(variantId: VariantId): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

  const initialState = useMemo((): Record<VariantId, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runsArr: any[] = Array.isArray(rootRaw) ? rootRaw : [];
      const next: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) {
        const hasEntry = runsArr.some((r) => r && r.elements_variant === v.id);
        next[v.id] = { enabled: Boolean(hasEntry), index: 0, text: "{\n}\n" };
      }
      return next;
    } catch {
      const fallback: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) fallback[v.id] = { enabled: false, index: 0, text: "{\n}\n" };
      return fallback;
    }
  }, [rootJsonText, variantDefs]);

  const [editorState, setEditorState] = useState<Record<VariantId, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

  // (no-op)

  function applyEditorChanges() {
    try {
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        for (const v of variantDefs) {
          const variantPath = v.id;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[v.id] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[v.id] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) continue;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[v.id] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[v.id]?.increments.length || 0,
            pricing[v.id]?.priceVar.length || 0,
            pricing[v.id]?.priceFix.length || 0,
            (scenarioEnabled[v.id] || []).length,
            (templateScenarioIds[v.id] || []).length
          );
          const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[v.id]?.[idx]);
            if (enabled) {
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[v.id]?.increments?.[idx] ?? NaN);
              const pLocal = pricing[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              const incFromState = Number(pLocal.increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[v.id] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[v.id]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pLocal.priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        }
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
      // Nested-object editing path is deprecated in favor of runs[] flow. Kept for backwards compatibility.
      for (const v of variantDefs) {
        const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
        const idx = Math.max(0, Math.floor(st.index || 0));
        const baseObj = ensurePath(root, ["dpe", "logement", "enveloppe"]);
        if (!Array.isArray((baseObj as any)[v.collection])) {
          (baseObj as any)[v.collection] = [] as any[];
        }
        const arr: any[] = (baseObj as any)[v.collection];
        if (st.enabled) {
          let parsed: any = {};
          try { parsed = st.text.trim() ? JSON.parse(st.text) : {}; } catch {
            throw new Error(`${v.label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      }
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    // Close silently if nothing would change; otherwise, confirm discard.
    try {
      const originalText = (originalJsonRef.current || "").trim();
      const currentText = (rootJsonText || "").trim();
      let isSame = false;
      try {
        const originalParsed = originalText ? JSON.parse(originalText) : null;
        const currentParsed = currentText ? JSON.parse(currentText) : null;
        isSame = JSON.stringify(originalParsed) === JSON.stringify(currentParsed);
      } catch {
        isSame = originalText === currentText;
      }
      if (isSame) {
        onClose();
        return;
      }
    } catch {}
    Modal.confirm({
      title: "Discard changes?",
      content: "Closing will revert any changes made in this panel.",
      okText: "Discard",
      cancelText: "Cancel",
      onOk: () => {
        try {
          onApply(originalJsonRef.current);
        } finally {
          onClose();
        }
      },
    });
  }

  function getFirstScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const inputObj = firstScenario?.input || firstScenario?.inputs || undefined;
      if (inputObj && typeof inputObj === "object") {
        const keys = Object.keys(inputObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getTemplateScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const costObj = firstScenario?.cost || undefined;
      if (costObj && typeof costObj === "object") {
        const keys = Object.keys(costObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getTemplateScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  // Helpers to derive keys directly from a provided runs[] array (e.g., template)
  function getFirstScenarioInputKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function deriveVariantPricing(variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Sync pricing grid from JSON scenarios when opening or when JSON/mapping keys change
  useEffect(() => {
    if (!open) return;
    try {
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        for (const v of variantDefs) {
          const entry = runsAll.find((r) => r && r.elements_variant === v.id) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
            } catch {}
          }
        }
      } catch {}

      for (const v of variantDefs) {
        const derived = deriveVariantPricing(v.id);
        setPricing((prev) => {
          const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextLen = derived.increments.length || current.increments.length || 0;
          const ensureLen = (arr: number[], len: number) => {
            const out = arr.slice(0, len);
            while (out.length < len) out.push(0);
            return out;
          };
          const nextIncrements = derived.increments.length ? derived.increments : current.increments;
          const nextPriceVar = derived.priceVar.length ? derived.priceVar : current.priceVar;
          const nextPriceFix = ensureLen(current.priceFix, Math.max(nextLen, nextPriceVar.length));
          return {
            ...prev,
            [v.id]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      }
    } catch {}
  }, [open, rootJsonText, mappingKeys, variantDefs]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
      }
    } catch {}
  }, [open, rootJsonText, variantDefs]);

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      for (const v of variantDefs) {
        const presentIds = new Set<number>(getPresentScenarioIds(v.id));
        const ids = templateScenarioIds[v.id] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
        }
      }
    } catch {}
  }, [open, rootJsonText, templateScenarioIds, variantDefs]);

  function toggleScenarioPresence(variantId: VariantId, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: (scopeStrategy[variantId] || "all"), scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
          ? Number(templateScenarioIds[variantId][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantId]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantId]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantId] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantId]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantId]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantId] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantId]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
            ? Number(templateScenarioIds[variantId][idx])
            : (idx + 1);
          let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
          if (targetIndex === -1 && idx < entry.scenarios.length) targetIndex = idx;
          if (targetIndex !== -1) {
            entry.scenarios.splice(targetIndex, 1);
            onApply(JSON.stringify(runs, null, 2));
          }
        }
      }
    } catch {}
    setScenarioEnabled((prev) => {
      const current = prev[variantId] ? prev[variantId].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantId]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

  const PanelContent = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => setIsTemplateOpen(true)}>Open template editor</Button>
        </div>
        {variantDefs.map((v) => {
          const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
          return (
            <Card key={v.id} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => {
                      setEditorState((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { enabled: false, index: 0, text: "{\n}\n" }), enabled: checked } }));
                      try {
                        let parsed: any = [];
                        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                        if (Array.isArray(parsed)) {
                          const runs: any[] = parsed;
                          const variantPath = v.id;
                          const idxInRuns = runs.findIndex((r) => r && r.elements_variant === variantPath);
                          if (!checked) {
                            if (idxInRuns !== -1) {
                              runs.splice(idxInRuns, 1);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                            setScenarioEnabled((prev) => ({ ...prev, [v.id]: [] }));
                            setScopeStrategy((prev) => ({ ...prev, [v.id]: "all" }));
                          } else {
                            if (idxInRuns === -1) {
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                          }
                        }
                      } catch {}
                    }}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              {/* index selector removed */}
              {st.enabled ? (
                <>
                  {(availableOptions[v.id] && Array.isArray(availableOptions[v.id]) && (availableOptions[v.id] as any[]).length > 0) ? (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(availableOptions[v.id] || []).map((opt, idx) => {
                          const detailsData = { variant: v.id, collection: v.collection, itemKey: v.itemKey, index: idx, key: opt.key, selected: opt.selected, payload: opt.payload };
                          const adjIdRaw = (opt as any)?.payload?.enum_type_adjacence_id ?? (opt as any)?.payload?.donnee_entree?.enum_type_adjacence_id;
                          const adjId = Number(adjIdRaw);
                          const greyText = Number.isFinite(adjId) && adjId !== 1;
                          return (
                            <label
                              key={opt.key}
                              onContextMenu={(e) => {
                                e.preventDefault();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: highlighted[v.id]?.[opt.key] ? "#fff7ed" : "transparent",
                                transition: "background-color 600ms ease",
                              }}
                            >
                              <Checkbox
                                checked={opt.selected}
                                onChange={(e) => {
                            const checked = e.target.checked;
                            // Update JSON immediately (runs array with elements_scope) and highlight
                            try {
                              let parsed: any = [];
                              try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                              const runs: any[] = Array.isArray(parsed) ? parsed : [];
                              const collectionName = v.collection;
                              const itemKey = v.itemKey;
                              const variantPath = v.id;
                              let entry = runs.find((r) => r && r.elements_variant === variantPath);
                              if (!entry) {
                                entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                runs.push(entry);
                              }
                              const optionIdx = idx; // 0-based index in available options order
                              const scopes: number[] = Array.isArray(entry.elements_scope) ? [...entry.elements_scope] : [];
                              const has = scopes.includes(optionIdx);
                              if (checked && !has) scopes.push(optionIdx);
                              if (!checked && has) {
                                const pos = scopes.indexOf(optionIdx);
                                if (pos !== -1) scopes.splice(pos, 1);
                              }
                              entry.elements_scope = scopes;

                              onApply(JSON.stringify(runs, null, 2));
                              message.success(checked ? "Added option to JSON" : "Removed option from JSON");

                              // Ask parent to highlight the corresponding indices in scope
                              try {
                                const indices = scopes.slice().sort((a, b) => a - b);
                                if (indices.length > 0) onHighlightJsonPath?.({ collection: collectionName, itemKey, indices });
                              } catch {}

                              const refKey = String(opt.key);
                              setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: false } }));
                              }, 1000);
                              // noop
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                            }}
                              />
                              <span style={{ fontSize: 12, color: greyText ? "#9ca3af" : "#374151" }}>{opt.description}</span>
                              <Button
                                size="small"
                                type="text"
                                aria-label="Show details"
                                icon={<span aria-hidden="true">ℹ️</span>}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal({ open: true, title: `${v.label} · ${opt.description}`, data: detailsData });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 8 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ fontWeight: 500 }}>explode</div>
                    <Switch
                      checked={scopeStrategy[v.id] === "explode"}
                      onChange={(checked) => {
                        try {
                          let parsed: any = [];
                          try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                          const runs: any[] = Array.isArray(parsed) ? parsed : [];
                          const collectionName = v.collection;
                          const itemKey = v.itemKey;
                          const variantPath = v.id;
                          let entry = runs.find((r) => r && r.elements_variant === variantPath);
                          if (!entry) {
                            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                            runs.push(entry);
                          }
                          entry.scope_strategy = checked ? "explode" : "all";
                          onApply(JSON.stringify(runs, null, 2));
                          setScopeStrategy((prev) => ({ ...prev, [v.id]: entry.scope_strategy }));
                        } catch {
                          message.error("Failed to update scope strategy");
                        }
                      }}
                    />
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(2, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Increment</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.incrementUnit || "cm"}</div>
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Price var</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.priceUnit || "EUR/m2"}</div>
                  </div>

                  {(() => {
                    const presentIds = getPresentScenarioIds(v.id);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[v.id] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[v.id]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[v.id]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[v.id]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[v.id]?.increments?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceVar?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceFix?.[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[v.id]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(v.id, idx, e.target.checked)}
                            />
                            <span>#{scenarioId}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, increments: nextIncs } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {/* Price fix column removed */}
                        </React.Fragment>
                      );
                    });
                  })()}
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            if (field === "increments") {
              const text = (colSettings.tempForcedInputs || "").trim();
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  const pretty = JSON.stringify(parsed, null, 2) + "\n";
                  setForcedInputs((prev) => ({ ...prev, [variant]: pretty }));
                } catch {
                  message.error("Invalid JSON in Forced inputs");
                  return;
                }
              } else {
                setForcedInputs((prev) => ({ ...prev, [variant]: "" }));
              }
            }
            setPricing((prev) => {
              const current = prev[variant] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              if (field === "increments") {
                return { ...prev, [variant]: { ...current, incrementUnit: colSettings.tempUnit || current.incrementUnit } };
              }
              return { ...prev, [variant]: { ...current, priceUnit: colSettings.tempUnit || current.priceUnit } };
            });
            setMappingKeys((prev) => {
              const current = prev[variant] || {};
              if (field === "increments") return { ...prev, [variant]: { ...current, inputKey: colSettings.tempKey || current.inputKey } };
              return { ...prev, [variant]: { ...current, costKey: colSettings.tempKey || current.costKey } };
            });

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = variantDefs.find((d) => d.id === variant);
                if (!v) return;
                const variantPath = v.id;
                let entry = runs.find((r) => r && r.elements_variant === variantPath);
                if (!entry) {
                  entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                  runs.push(entry);
                }
                if (!entry.parameters || typeof entry.parameters !== "object") entry.parameters = {};
                if (colSettings.tempUnit) entry.parameters.unit = colSettings.tempUnit;
                const text = (colSettings.tempForcedInputs || "").trim();
                if (text) {
                  try {
                    const forcedObj = JSON.parse(text);
                    if (forcedObj && typeof forcedObj === "object") {
                      entry.parameters.input_forced = forcedObj;
                    }
                  } catch {}
                }
                onApply(JSON.stringify(runs, null, 2));
              } catch {}
            }
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" });
          }
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>
              {colSettings.field === "increments" ? "Scenario input key (index mapping)" : "Scenario cost key (index mapping)"}
            </div>
            <Input
              value={colSettings.tempKey}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempKey: e.target.value }))}
              placeholder={colSettings.variant ? (
                colSettings.field === "increments"
                  ? (getTemplateScenarioInputKey(colSettings.variant) || getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getTemplateScenarioCostKey(colSettings.variant) || getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
              ) : ""}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>Unit</div>
            <Input
              value={colSettings.tempUnit}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempUnit: e.target.value }))}
              placeholder="e.g. cm or EUR/m2"
            />
          </div>
          {colSettings.field === "increments" ? (
            <div>
              <div style={{ marginBottom: 6, color: "#4b5563" }}>Forced inputs (JSON)</div>
              <Input.TextArea
                value={colSettings.tempForcedInputs}
                onChange={(e) => setColSettings((prev) => ({ ...prev, tempForcedInputs: e.target.value }))}
                rows={3}
                placeholder="{\n}\n"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </div>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={detailsModal.title || "Details"}
        open={detailsModal.open}
        onCancel={() => setDetailsModal({ open: false, title: "", data: null })}
        footer={[
          <Button key="close" onClick={() => setDetailsModal({ open: false, title: "", data: null })}>Close</Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{detailsModal.data ? JSON.stringify(detailsModal.data, null, 2) : ""}
          </pre>
        </div>
      </Modal>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div style={{ width, height: "calc(100vh - 64px)", borderRight: "1px solid #e5e7eb", background: "#fff", padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Edit DPE JSON</div>
          <Space>
            <Button onClick={handleDrawerClose}>Close</Button>
            <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
        />
      </div>
    );
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="left"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
        </Space>
      }
    >
      {PanelContent}
      <TemplateEditorModal
        open={isTemplateOpen}
        onCancel={() => setIsTemplateOpen(false)}
        baseUrl={apiLoadParams?.baseUrl}
        refAdeme={apiLoadParams?.ref_ademe}
        getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
      />
    </Drawer>
  );
};



```

I found the repeated calls were coming from the drawer editor’s “load on open” effect re-running on every render (because the inline onLoadedFromApi prop changed identity). I’ve locked it down to run once per open/ref_ademe and removed the unstable dependency.

- Change: in `packages/dpe-editor/src/ui/DpeDrawerEditor.tsx`
  - Added a guard `lastLoadedKeyRef` so the initial load runs only once per `open` + `ref_ademe`.
  - Removed `onLoadedFromApi` from the effect’s dependency list to prevent re-fetch loops from parent re-renders.
  - Reset the guard when the drawer closes so reopening fetches again.
- Lint: no errors.

This should stop the endless refresh of:
- https://api-dev.etiquettedpe.fr/backoffice/simulation_dpe_full?ref_ademe=...
- https://api-dev.etiquettedpe.fr/backoffice/simulation_template?ref_ademe=...

Also, I ensured after “submit” we only refresh the Redis queue/done endpoints by starting the queue polling once right after submit and not elsewhere.

- If the issue persists, I can add an AbortController to cancel any in-flight drawer loads on submit.

- Edits
  - `apps/simul/src/App.tsx`: start queue polling once after submit; removed duplicate start in chunks branch.
  - `packages/dpe-editor/src/ui/DpeDrawerEditor.tsx`: guarded initial API load and removed unstable dependencies.

---

**User**

when opening the page 

cognito-idp.eu-west-3.amazonaws.com	POST + Preflight	200	fetch	VM521 chunk-RHMRERES.js:4884	0.4 kB	170 ms
simulation_graph?ref_ademe=2508E0243162W&simul=dev_simul_test0002	GET + Preflight	200	fetch	SimulationResults.tsx:125	33.8 kB	162 ms
get_redis_detail?ref_ademe=2508E0243162W&log=dev_simul_test0002	GET + Preflight	200	fetch	auth.ts:47	1.8 kB	162 ms
simulation_count?ref_ademe=2508E0243162W&simul=dev_simul_test0002	POST + Preflight	200	fetch	auth.ts:47	0.3 kB	10 ms
simulation_count?ref_ademe=2508E0243162W&simul=dev_simul_test0002	POST + Preflight	200	fetch	auth.ts:47	0.3 kB	16 ms


you do not call the expected endpoints (dpe_full, or template) anymore so the app is broken

---

**Cursor**

I saw the initial load of dpe_full/template could be skipped if the token isn't ready on the first effect run, causing it to never retry. I’ll update the drawer to retry fetching until a token is available (with a short, bounded backoff) so those endpoints are called reliably on page open. Then I’ll lint the file.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
import { TemplateEditorModal } from "@acme/template-editor";
import { fetchSimulationDpeFullJson, fetchSimulationTemplateJson } from "../api";

export type DpeDrawerEditorProps = {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  rootJsonText: string;
  onApply: (nextJsonText: string) => void;
  // When provided, component will call the API on open using a Cognito bearer token
  apiLoadParams?: { baseUrl?: string; ref_ademe: string };
  getAccessToken?: () => Promise<string | null>;
  onLoadedFromApi?: (data: unknown) => void;
  onHighlightJsonPath?: (args: { collection: string; itemKey: string; indices: number[] }) => void;
  // When true, renders as a fixed inline panel instead of overlay drawer
  inline?: boolean;
};

type VariantId = string; // e.g. "dpe.logement.enveloppe.mur_collection.mur"
type EditorVariantState = { enabled: boolean; index: number; text: string };
type VariantDef = { id: VariantId; collection: string; itemKey: string; label: string };

function parseVariantPath(path: string): { collection: string; itemKey: string } | null {
  try {
    const parts = path.split(".");
    const idx = parts.lastIndexOf("enveloppe");
    if (idx === -1) return null;
    const collection = parts[idx + 1];
    const itemKey = parts[idx + 2];
    if (!collection || !itemKey) return null;
    return { collection, itemKey };
  } catch {
    return null;
  }
}

function toLabel(input: string): string {
  const spaced = input.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function deepGet(root: any, path: (string | number)[]): any {
  return path.reduce((acc: any, key: any) => (acc != null ? acc[key] : undefined), root);
}

function ensurePath(root: any, path: string[]): any {
  let cursor = root;
  for (const key of path) {
    if (cursor[key] == null || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  return cursor;
}

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath, inline = false }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]>>({});
  const [highlighted, setHighlighted] = useState<Record<VariantId, Record<string, boolean>>>({});
  const [pricing, setPricing] = useState<Record<VariantId, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({});

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantId | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantId, { inputKey?: string; costKey?: string }>>({});
  const [forcedInputs, setForcedInputs] = useState<Record<VariantId, string>>({});
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantId, boolean[]>>({});
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantId, "all" | "explode">>({});
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantId, { increments: number[]; priceVar: number[] }>>({});
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantId, number[]>>({});
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; data: any }>({ open: false, title: "", data: null });
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  // Avoid re-fetching while open due to parent re-renders: remember last load key
  const lastLoadedKeyRef = useRef<string | null>(null);

  const variantDefs: VariantDef[] = useMemo(() => {
    const map = new Map<VariantId, VariantDef>();
    try {
      // From template runs
      const runsTpl: any[] = Array.isArray(templateRuns) ? templateRuns : [];
      for (const r of runsTpl) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const parsed = parseVariantPath(ev);
          if (parsed) {
            const { collection, itemKey } = parsed;
            const label = toLabel(itemKey);
            map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    try {
      // From current JSON text (runs array)
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const r of runs) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const p = parseVariantPath(ev);
          if (p) {
            const { collection, itemKey } = p;
            const label = toLabel(itemKey);
            if (!map.has(ev)) map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    return Array.from(map.values());
  }, [templateRuns, rootJsonText]);

  const variantIds: VariantId[] = useMemo(() => variantDefs.map((v) => v.id), [variantDefs]);

  // Ensure state maps have defaults for discovered variants
  useEffect(() => {
    if (!variantIds.length) return;
    setPricing((prev) => {
      const next = { ...prev };
      for (const id of variantIds) {
        if (!next[id]) next[id] = { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" };
      }
      return next;
    });
    setMappingKeys((prev) => ({ ...prev }));
    setForcedInputs((prev) => {
      const next = { ...prev };
      for (const id of variantIds) if (next[id] == null) next[id] = "{\n}\n";
      return next;
    });
    setScenarioEnabled((prev) => ({ ...prev }));
    setScopeStrategy((prev) => {
      const next = { ...prev } as Record<VariantId, "all" | "explode">;
      for (const id of variantIds) if (!next[id]) next[id] = "all";
      return next;
    });
    setTemplateDerived((prev) => ({ ...prev }));
    setTemplateScenarioIds((prev) => ({ ...prev }));
    setAvailableOptions((prev) => ({ ...prev }));
    setHighlighted((prev) => ({ ...prev }));
  }, [variantIds]);
  // Fetch from API when the drawer opens if configured (once per open/ref)
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    const key = `${apiLoadParams.baseUrl || ""}|${apiLoadParams.ref_ademe}`;
    if (lastLoadedKeyRef.current === key) return;
    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~20s at 500ms
    const tryLoad = async (): Promise<void> => {
      if (isCancelled || lastLoadedKeyRef.current === key) return;
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isCancelled) return;
          if (attempts++ < maxAttempts) {
            window.setTimeout(tryLoad, 500);
          }
          return;
        }
        const [data, template]: any[] = await Promise.all([
          fetchSimulationDpeFullJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
          fetchSimulationTemplateJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
        ]);
        if (!isCancelled) {
          lastLoadedKeyRef.current = key;
          onLoadedFromApi?.(data);
          try {
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
            const envelope = (data as any)?.dpe?.logement?.enveloppe || {};
            for (const v of variantDefs) {
              const entry = runs.find((r) => r && r.elements_variant === v.id);
              const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
              const collectionObj = envelope?.[v.collection];
              let items: any[] = [];
              if (Array.isArray(collectionObj?.[v.itemKey])) {
                items = collectionObj[v.itemKey] as any[];
              } else if (Array.isArray(collectionObj)) {
                // Shape B: array of slots { <itemKey>: {...} }
                items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
              }
              optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
                key: String(item?.donnee_entree?.reference || idx),
                description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
                selected: scopes.includes(idx),
                payload: item,
              }));
            }
            setAvailableOptions(optionsMap);

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              for (const v of variantDefs) {
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === v.id) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
                  } catch {}
                }
              }
            } catch {}
          } catch {
            setAvailableOptions({});
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    };
    tryLoad();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken]);

  // Reset load guard when closing so reopening can re-fetch
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      setAvailableOptions((prev) => {
        const next: typeof prev = { ...prev };
        for (const v of variantDefs) {
          const entry = runs.find((r) => r && r.elements_variant === v.id);
          const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
          next[v.id] = (prev[v.id] || []).map((o, idx) => ({ ...o, selected: scopes.includes(idx) }));
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [rootJsonText, variantDefs]);

  // Capture original JSON when opening, used to rollback on close (X)
  useEffect(() => {
    if (open) {
      originalJsonRef.current = rootJsonText;
    }
  }, [open]);

  // (no-op)

  // Sync scope strategy from JSON (default to "all")
  useEffect(() => {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const next: Record<VariantId, "all" | "explode"> = {};
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        next[v.id] = entry?.scope_strategy === "explode" ? "explode" : "all";
      }
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText, variantDefs]);

  function deriveVariantPricingFromRuns(runsArr: any[], variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getFirstScenarioInputKeyFromRuns(runsArr, variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getFirstScenarioCostKeyFromRuns(runsArr, variantId) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      for (const v of variantDefs) {
        const derived = deriveVariantPricingFromRuns(templateRuns, v.id);
        setTemplateDerived((prev) => ({ ...prev, [v.id]: derived }));
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === v.id) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [v.id]: ids }));
      }
    } catch {}
  }, [templateRuns, mappingKeys, variantDefs]);

  function getPresentScenarioIds(variantId: VariantId): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

  const initialState = useMemo((): Record<VariantId, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runsArr: any[] = Array.isArray(rootRaw) ? rootRaw : [];
      const next: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) {
        const hasEntry = runsArr.some((r) => r && r.elements_variant === v.id);
        next[v.id] = { enabled: Boolean(hasEntry), index: 0, text: "{\n}\n" };
      }
      return next;
    } catch {
      const fallback: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) fallback[v.id] = { enabled: false, index: 0, text: "{\n}\n" };
      return fallback;
    }
  }, [rootJsonText, variantDefs]);

  const [editorState, setEditorState] = useState<Record<VariantId, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

  // (no-op)

  function applyEditorChanges() {
    try {
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        for (const v of variantDefs) {
          const variantPath = v.id;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[v.id] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[v.id] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) continue;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[v.id] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[v.id]?.increments.length || 0,
            pricing[v.id]?.priceVar.length || 0,
            pricing[v.id]?.priceFix.length || 0,
            (scenarioEnabled[v.id] || []).length,
            (templateScenarioIds[v.id] || []).length
          );
          const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[v.id]?.[idx]);
            if (enabled) {
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[v.id]?.increments?.[idx] ?? NaN);
              const pLocal = pricing[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              const incFromState = Number(pLocal.increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[v.id] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[v.id]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pLocal.priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        }
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
      // Nested-object editing path is deprecated in favor of runs[] flow. Kept for backwards compatibility.
      for (const v of variantDefs) {
        const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
        const idx = Math.max(0, Math.floor(st.index || 0));
        const baseObj = ensurePath(root, ["dpe", "logement", "enveloppe"]);
        if (!Array.isArray((baseObj as any)[v.collection])) {
          (baseObj as any)[v.collection] = [] as any[];
        }
        const arr: any[] = (baseObj as any)[v.collection];
        if (st.enabled) {
          let parsed: any = {};
          try { parsed = st.text.trim() ? JSON.parse(st.text) : {}; } catch {
            throw new Error(`${v.label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      }
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    // Close silently if nothing would change; otherwise, confirm discard.
    try {
      const originalText = (originalJsonRef.current || "").trim();
      const currentText = (rootJsonText || "").trim();
      let isSame = false;
      try {
        const originalParsed = originalText ? JSON.parse(originalText) : null;
        const currentParsed = currentText ? JSON.parse(currentText) : null;
        isSame = JSON.stringify(originalParsed) === JSON.stringify(currentParsed);
      } catch {
        isSame = originalText === currentText;
      }
      if (isSame) {
        onClose();
        return;
      }
    } catch {}
    Modal.confirm({
      title: "Discard changes?",
      content: "Closing will revert any changes made in this panel.",
      okText: "Discard",
      cancelText: "Cancel",
      onOk: () => {
        try {
          onApply(originalJsonRef.current);
        } finally {
          onClose();
        }
      },
    });
  }

  function getFirstScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const inputObj = firstScenario?.input || firstScenario?.inputs || undefined;
      if (inputObj && typeof inputObj === "object") {
        const keys = Object.keys(inputObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getTemplateScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const costObj = firstScenario?.cost || undefined;
      if (costObj && typeof costObj === "object") {
        const keys = Object.keys(costObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getTemplateScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  // Helpers to derive keys directly from a provided runs[] array (e.g., template)
  function getFirstScenarioInputKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function deriveVariantPricing(variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Sync pricing grid from JSON scenarios when opening or when JSON/mapping keys change
  useEffect(() => {
    if (!open) return;
    try {
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        for (const v of variantDefs) {
          const entry = runsAll.find((r) => r && r.elements_variant === v.id) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
            } catch {}
          }
        }
      } catch {}

      for (const v of variantDefs) {
        const derived = deriveVariantPricing(v.id);
        setPricing((prev) => {
          const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextLen = derived.increments.length || current.increments.length || 0;
          const ensureLen = (arr: number[], len: number) => {
            const out = arr.slice(0, len);
            while (out.length < len) out.push(0);
            return out;
          };
          const nextIncrements = derived.increments.length ? derived.increments : current.increments;
          const nextPriceVar = derived.priceVar.length ? derived.priceVar : current.priceVar;
          const nextPriceFix = ensureLen(current.priceFix, Math.max(nextLen, nextPriceVar.length));
          return {
            ...prev,
            [v.id]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      }
    } catch {}
  }, [open, rootJsonText, mappingKeys, variantDefs]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
      }
    } catch {}
  }, [open, rootJsonText, variantDefs]);

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      for (const v of variantDefs) {
        const presentIds = new Set<number>(getPresentScenarioIds(v.id));
        const ids = templateScenarioIds[v.id] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
        }
      }
    } catch {}
  }, [open, rootJsonText, templateScenarioIds, variantDefs]);

  function toggleScenarioPresence(variantId: VariantId, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: (scopeStrategy[variantId] || "all"), scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
          ? Number(templateScenarioIds[variantId][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantId]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantId]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantId] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantId]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantId]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantId] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantId]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
            ? Number(templateScenarioIds[variantId][idx])
            : (idx + 1);
          let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
          if (targetIndex === -1 && idx < entry.scenarios.length) targetIndex = idx;
          if (targetIndex !== -1) {
            entry.scenarios.splice(targetIndex, 1);
            onApply(JSON.stringify(runs, null, 2));
          }
        }
      }
    } catch {}
    setScenarioEnabled((prev) => {
      const current = prev[variantId] ? prev[variantId].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantId]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

  const PanelContent = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => setIsTemplateOpen(true)}>Open template editor</Button>
        </div>
        {variantDefs.map((v) => {
          const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
          return (
            <Card key={v.id} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => {
                      setEditorState((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { enabled: false, index: 0, text: "{\n}\n" }), enabled: checked } }));
                      try {
                        let parsed: any = [];
                        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                        if (Array.isArray(parsed)) {
                          const runs: any[] = parsed;
                          const variantPath = v.id;
                          const idxInRuns = runs.findIndex((r) => r && r.elements_variant === variantPath);
                          if (!checked) {
                            if (idxInRuns !== -1) {
                              runs.splice(idxInRuns, 1);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                            setScenarioEnabled((prev) => ({ ...prev, [v.id]: [] }));
                            setScopeStrategy((prev) => ({ ...prev, [v.id]: "all" }));
                          } else {
                            if (idxInRuns === -1) {
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                          }
                        }
                      } catch {}
                    }}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              {/* index selector removed */}
              {st.enabled ? (
                <>
                  {(availableOptions[v.id] && Array.isArray(availableOptions[v.id]) && (availableOptions[v.id] as any[]).length > 0) ? (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(availableOptions[v.id] || []).map((opt, idx) => {
                          const detailsData = { variant: v.id, collection: v.collection, itemKey: v.itemKey, index: idx, key: opt.key, selected: opt.selected, payload: opt.payload };
                          const adjIdRaw = (opt as any)?.payload?.enum_type_adjacence_id ?? (opt as any)?.payload?.donnee_entree?.enum_type_adjacence_id;
                          const adjId = Number(adjIdRaw);
                          const greyText = Number.isFinite(adjId) && adjId !== 1;
                          return (
                            <label
                              key={opt.key}
                              onContextMenu={(e) => {
                                e.preventDefault();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: highlighted[v.id]?.[opt.key] ? "#fff7ed" : "transparent",
                                transition: "background-color 600ms ease",
                              }}
                            >
                              <Checkbox
                                checked={opt.selected}
                                onChange={(e) => {
                            const checked = e.target.checked;
                            // Update JSON immediately (runs array with elements_scope) and highlight
                            try {
                              let parsed: any = [];
                              try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                              const runs: any[] = Array.isArray(parsed) ? parsed : [];
                              const collectionName = v.collection;
                              const itemKey = v.itemKey;
                              const variantPath = v.id;
                              let entry = runs.find((r) => r && r.elements_variant === variantPath);
                              if (!entry) {
                                entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                runs.push(entry);
                              }
                              const optionIdx = idx; // 0-based index in available options order
                              const scopes: number[] = Array.isArray(entry.elements_scope) ? [...entry.elements_scope] : [];
                              const has = scopes.includes(optionIdx);
                              if (checked && !has) scopes.push(optionIdx);
                              if (!checked && has) {
                                const pos = scopes.indexOf(optionIdx);
                                if (pos !== -1) scopes.splice(pos, 1);
                              }
                              entry.elements_scope = scopes;

                              onApply(JSON.stringify(runs, null, 2));
                              message.success(checked ? "Added option to JSON" : "Removed option from JSON");

                              // Ask parent to highlight the corresponding indices in scope
                              try {
                                const indices = scopes.slice().sort((a, b) => a - b);
                                if (indices.length > 0) onHighlightJsonPath?.({ collection: collectionName, itemKey, indices });
                              } catch {}

                              const refKey = String(opt.key);
                              setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: false } }));
                              }, 1000);
                              // noop
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                            }}
                              />
                              <span style={{ fontSize: 12, color: greyText ? "#9ca3af" : "#374151" }}>{opt.description}</span>
                              <Button
                                size="small"
                                type="text"
                                aria-label="Show details"
                                icon={<span aria-hidden="true">ℹ️</span>}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal({ open: true, title: `${v.label} · ${opt.description}`, data: detailsData });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 8 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ fontWeight: 500 }}>explode</div>
                    <Switch
                      checked={scopeStrategy[v.id] === "explode"}
                      onChange={(checked) => {
                        try {
                          let parsed: any = [];
                          try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                          const runs: any[] = Array.isArray(parsed) ? parsed : [];
                          const collectionName = v.collection;
                          const itemKey = v.itemKey;
                          const variantPath = v.id;
                          let entry = runs.find((r) => r && r.elements_variant === variantPath);
                          if (!entry) {
                            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                            runs.push(entry);
                          }
                          entry.scope_strategy = checked ? "explode" : "all";
                          onApply(JSON.stringify(runs, null, 2));
                          setScopeStrategy((prev) => ({ ...prev, [v.id]: entry.scope_strategy }));
                        } catch {
                          message.error("Failed to update scope strategy");
                        }
                      }}
                    />
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(2, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Increment</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.incrementUnit || "cm"}</div>
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Price var</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.priceUnit || "EUR/m2"}</div>
                  </div>

                  {(() => {
                    const presentIds = getPresentScenarioIds(v.id);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[v.id] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[v.id]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[v.id]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[v.id]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[v.id]?.increments?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceVar?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceFix?.[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[v.id]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(v.id, idx, e.target.checked)}
                            />
                            <span>#{scenarioId}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, increments: nextIncs } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {/* Price fix column removed */}
                        </React.Fragment>
                      );
                    });
                  })()}
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            if (field === "increments") {
              const text = (colSettings.tempForcedInputs || "").trim();
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  const pretty = JSON.stringify(parsed, null, 2) + "\n";
                  setForcedInputs((prev) => ({ ...prev, [variant]: pretty }));
                } catch {
                  message.error("Invalid JSON in Forced inputs");
                  return;
                }
              } else {
                setForcedInputs((prev) => ({ ...prev, [variant]: "" }));
              }
            }
            setPricing((prev) => {
              const current = prev[variant] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              if (field === "increments") {
                return { ...prev, [variant]: { ...current, incrementUnit: colSettings.tempUnit || current.incrementUnit } };
              }
              return { ...prev, [variant]: { ...current, priceUnit: colSettings.tempUnit || current.priceUnit } };
            });
            setMappingKeys((prev) => {
              const current = prev[variant] || {};
              if (field === "increments") return { ...prev, [variant]: { ...current, inputKey: colSettings.tempKey || current.inputKey } };
              return { ...prev, [variant]: { ...current, costKey: colSettings.tempKey || current.costKey } };
            });

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = variantDefs.find((d) => d.id === variant);
                if (!v) return;
                const variantPath = v.id;
                let entry = runs.find((r) => r && r.elements_variant === variantPath);
                if (!entry) {
                  entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                  runs.push(entry);
                }
                if (!entry.parameters || typeof entry.parameters !== "object") entry.parameters = {};
                if (colSettings.tempUnit) entry.parameters.unit = colSettings.tempUnit;
                const text = (colSettings.tempForcedInputs || "").trim();
                if (text) {
                  try {
                    const forcedObj = JSON.parse(text);
                    if (forcedObj && typeof forcedObj === "object") {
                      entry.parameters.input_forced = forcedObj;
                    }
                  } catch {}
                }
                onApply(JSON.stringify(runs, null, 2));
              } catch {}
            }
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" });
          }
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>
              {colSettings.field === "increments" ? "Scenario input key (index mapping)" : "Scenario cost key (index mapping)"}
            </div>
            <Input
              value={colSettings.tempKey}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempKey: e.target.value }))}
              placeholder={colSettings.variant ? (
                colSettings.field === "increments"
                  ? (getTemplateScenarioInputKey(colSettings.variant) || getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getTemplateScenarioCostKey(colSettings.variant) || getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
              ) : ""}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>Unit</div>
            <Input
              value={colSettings.tempUnit}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempUnit: e.target.value }))}
              placeholder="e.g. cm or EUR/m2"
            />
          </div>
          {colSettings.field === "increments" ? (
            <div>
              <div style={{ marginBottom: 6, color: "#4b5563" }}>Forced inputs (JSON)</div>
              <Input.TextArea
                value={colSettings.tempForcedInputs}
                onChange={(e) => setColSettings((prev) => ({ ...prev, tempForcedInputs: e.target.value }))}
                rows={3}
                placeholder="{\n}\n"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </div>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={detailsModal.title || "Details"}
        open={detailsModal.open}
        onCancel={() => setDetailsModal({ open: false, title: "", data: null })}
        footer={[
          <Button key="close" onClick={() => setDetailsModal({ open: false, title: "", data: null })}>Close</Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{detailsModal.data ? JSON.stringify(detailsModal.data, null, 2) : ""}
          </pre>
        </div>
      </Modal>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div style={{ width, height: "calc(100vh - 64px)", borderRight: "1px solid #e5e7eb", background: "#fff", padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Edit DPE JSON</div>
          <Space>
            <Button onClick={handleDrawerClose}>Close</Button>
            <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
        />
      </div>
    );
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="left"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
        </Space>
      }
    >
      {PanelContent}
      <TemplateEditorModal
        open={isTemplateOpen}
        onCancel={() => setIsTemplateOpen(false)}
        baseUrl={apiLoadParams?.baseUrl}
        refAdeme={apiLoadParams?.ref_ademe}
        getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
      />
    </Drawer>
  );
};



```

- I added a bounded retry loop in `DpeDrawerEditor` so it waits for a Cognito token (up to ~20s) and then calls both `simulation_dpe_full` and `simulation_template` once per open/ref_ademe. This restores those initial calls on page open and prevents the previous “never fires if token not ready” issue.

- I also kept the earlier guard that prevents repeated loads while the drawer remains open, and it resets when the drawer closes.

- No linter errors.

If you still don’t see the two calls on first load, tell me exactly which `ref_ademe` and whether the left editor panel is open at load; I can trigger the fetch earlier or on page mount if needed.

---

**User**

if a cognito token is missing => then redirect to signin if needed, right?

---

**Cursor**

I'll check the simulator's auth utilities to see how token absence is handled and where a redirect to sign-in should be triggered.

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
import { SimulationDetailCard } from "@acme/simulation-detail";

const { Title, Paragraph } = Typography;

export const App: React.FC = () => {
  const [jsonText, setJsonText] = useState<string>("{\n  \"items\": []\n}");
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [apiDebug, setApiDebug] = useState<number | undefined>(undefined);
  const [skip, setSkip] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);
  const [numChunks, setNumChunks] = useState<number>(1);
  useEffect(() => { setNumChunks(2); }, []);
  const [totalCombinations, setTotalCombinations] = useState<number | undefined>(undefined);
  const [nbCombinations, setNbCombinations] = useState<number | undefined>(undefined);
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
  const [selectedPoint, setSelectedPoint] = useState<{ index: number; ep?: number; ges?: number; cost?: number; letter?: string } | null>(null);
  function openEditor() { setIsEditorOpen(true); }
  const hasLoadedTemplateRef = useRef<boolean>(false);
  const editorOriginalTextRef = useRef<string>("");
  const combinationsAbortRef = useRef<AbortController | null>(null);

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

  // If no Cognito token becomes available shortly after load, redirect to sign-in
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await waitForAccessToken(5000, 250);
        if (cancelled) return;
        if (token) return; // already authenticated
        // Compute auth URL similarly to TopMenu.authHref
        const configured = import.meta.env.VITE_AUTH_URL as string | undefined;
        const buildAuthBase = () => {
          if (configured) {
            try {
              const configuredUrl = new URL(configured);
              const isConfiguredLocal = ["localhost", "127.0.0.1"].includes(configuredUrl.hostname);
              const isPageLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
              if (isConfiguredLocal && !isPageLocal) {
                // ignore local auth URL on non-localhost pages
              } else {
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
        };
        const authBase = buildAuthBase();
        const sep = authBase.includes("?") ? "&" : "?";
        const target = `${authBase}${sep}returnTo=${encodeURIComponent(window.location.href)}`;
        window.location.href = target;
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Capture the JSON snapshot when opening the editor to detect unconfirmed changes
  useEffect(() => {
    try {
      if (isEditorOpen) {
        editorOriginalTextRef.current = jsonText || "";
      }
    } catch {}
  }, [isEditorOpen]);

  // Compute combinations count based on current JSON, ref_ademe and simul
  useEffect(() => {
    try { combinationsAbortRef.current?.abort(); } catch {}
    const simulName = (simulLog || (import.meta.env.VITE_BACKOFFICE_LOG as string) || "dev_report_o3cl");
    if (!refAdeme || !simulName) { setTotalCombinations(undefined); return; }
    // Validate and parse JSON before calling
    let parsedSimul: unknown = {};
    try { parsedSimul = jsonText.trim() ? JSON.parse(jsonText) : {}; } catch { setTotalCombinations(undefined); return; }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const base = (import.meta.env.VITE_BACKOFFICE_API_URL as string) || "https://api-dev.etiquettedpe.fr";
        const url = new URL("/backoffice/simulation_count", base);
        url.searchParams.set("ref_ademe", String(refAdeme));
        url.searchParams.set("simul", String(simulName));
        const controller = new AbortController();
        combinationsAbortRef.current = controller;
        const res = await authorizedFetch(url.toString(), {
          method: "POST",
          headers: {
            Accept: "application/json, text/plain, */*",
            "Content-Type": "application/json",
            "x-authorization": "dperdition",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
          body: JSON.stringify({ ref_ademe: refAdeme, simul: simulName, simul_content: parsedSimul }),
          signal: controller.signal,
        });
        if (!res.ok) { setTotalCombinations(undefined); return; }
        const data: any = await res.json().catch(() => null);
        const value = Number(((data && data.data && data.data.total_combinations) ?? (data && data.total_combinations)) as any);
        if (Number.isFinite(value)) setTotalCombinations(value); else setTotalCombinations(undefined);
      } catch {
        setTotalCombinations(undefined);
      }
    }, 600);
    return () => { cancelled = true; try { window.clearTimeout(timer); } catch {}; };
  }, [refAdeme, simulLog, jsonText]);

  // Initialize nbCombinations from totalCombinations once when available (unless user already set it)
  useEffect(() => {
    if (typeof nbCombinations === "number") return;
    if (typeof totalCombinations === "number") setNbCombinations(totalCombinations);
  }, [totalCombinations, nbCombinations]);

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
      // After submit, always start polling only the queue/done endpoints
      startQueuePolling();
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
            nb_combinations: Number(nbCombinations || totalCombinations || 0),
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
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>combinations</div>
                          <InputNumber value={typeof totalCombinations === "number" ? totalCombinations : undefined} style={{ width: "100%" }} disabled min={0} />
                        </div>
                        <div>
                          <div style={{ marginBottom: 6, color: "#4b5563" }}>nb combinations</div>
                          <InputNumber value={nbCombinations} onChange={(v) => setNbCombinations(Number(v ?? 0) || undefined)} style={{ width: "100%" }} min={1} />
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
                      onSelectPoint={(p) => setSelectedPoint(p)}
                      selectedIndex={selectedPoint?.index}
                      primaryColor="#1677ff"
                      mapColorDpe={{
                        A: "#189c44",
                        B: "#4FAA05",
                        C: "#CCD600",
                        D: "#FFEE6C",
                        E: "#FFC661",
                        F: "#FF8300",
                        G: "#FF3238",
                      }}
                    />
                    <div style={{ marginTop: 12 }}>
                      <SimulationDetailCard point={selectedPoint || undefined} mapColorDpe={{
                        A: "#189c44",
                        B: "#4FAA05",
                        C: "#CCD600",
                        D: "#FFEE6C",
                        E: "#FFC661",
                        F: "#FF8300",
                        G: "#FF3238",
                      }} />
                    </div>
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

Yes. I added an automatic redirect to sign-in when no Cognito token is available shortly after load.

- Behavior: on page open, it waits up to ~5s for a token. If still missing, it redirects to the configured auth page with a returnTo back to the current URL.
- Config: uses `VITE_AUTH_URL` when set; otherwise falls back to `/auth/index.html` (or `http://localhost:5173` in local).
- File changed: `apps/simul/src/App.tsx`. No linter errors.

If you want a different timeout or to force redirect immediately, tell me and I’ll adjust.

---

**User**

ok now : i see you have correct call of 
https://api-dev.etiquettedpe.fr/backoffice/simulation_dpe_full?ref_ademe=2508E0243162W
but strangely => the scope is not updated in the left panel (even element is "enabled")

---

**Cursor**

I'll update the left panel logic so that when a variant is enabled, it defaults the scope to include all available options for that variant, ensuring the scope checkboxes reflect this immediately. Then I'll run a lint check.

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
import { TemplateEditorModal } from "@acme/template-editor";
import { fetchSimulationDpeFullJson, fetchSimulationTemplateJson } from "../api";

export type DpeDrawerEditorProps = {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  rootJsonText: string;
  onApply: (nextJsonText: string) => void;
  // When provided, component will call the API on open using a Cognito bearer token
  apiLoadParams?: { baseUrl?: string; ref_ademe: string };
  getAccessToken?: () => Promise<string | null>;
  onLoadedFromApi?: (data: unknown) => void;
  onHighlightJsonPath?: (args: { collection: string; itemKey: string; indices: number[] }) => void;
  // When true, renders as a fixed inline panel instead of overlay drawer
  inline?: boolean;
};

type VariantId = string; // e.g. "dpe.logement.enveloppe.mur_collection.mur"
type EditorVariantState = { enabled: boolean; index: number; text: string };
type VariantDef = { id: VariantId; collection: string; itemKey: string; label: string };

function parseVariantPath(path: string): { collection: string; itemKey: string } | null {
  try {
    const parts = path.split(".");
    const idx = parts.lastIndexOf("enveloppe");
    if (idx === -1) return null;
    const collection = parts[idx + 1];
    const itemKey = parts[idx + 2];
    if (!collection || !itemKey) return null;
    return { collection, itemKey };
  } catch {
    return null;
  }
}

function toLabel(input: string): string {
  const spaced = input.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function deepGet(root: any, path: (string | number)[]): any {
  return path.reduce((acc: any, key: any) => (acc != null ? acc[key] : undefined), root);
}

function ensurePath(root: any, path: string[]): any {
  let cursor = root;
  for (const key of path) {
    if (cursor[key] == null || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  return cursor;
}

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath, inline = false }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]>>({});
  const [highlighted, setHighlighted] = useState<Record<VariantId, Record<string, boolean>>>({});
  const [pricing, setPricing] = useState<Record<VariantId, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({});

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantId | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantId, { inputKey?: string; costKey?: string }>>({});
  const [forcedInputs, setForcedInputs] = useState<Record<VariantId, string>>({});
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantId, boolean[]>>({});
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantId, "all" | "explode">>({});
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantId, { increments: number[]; priceVar: number[] }>>({});
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantId, number[]>>({});
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; data: any }>({ open: false, title: "", data: null });
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  // Avoid re-fetching while open due to parent re-renders: remember last load key
  const lastLoadedKeyRef = useRef<string | null>(null);

  const variantDefs: VariantDef[] = useMemo(() => {
    const map = new Map<VariantId, VariantDef>();
    try {
      // From template runs
      const runsTpl: any[] = Array.isArray(templateRuns) ? templateRuns : [];
      for (const r of runsTpl) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const parsed = parseVariantPath(ev);
          if (parsed) {
            const { collection, itemKey } = parsed;
            const label = toLabel(itemKey);
            map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    try {
      // From current JSON text (runs array)
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const r of runs) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const p = parseVariantPath(ev);
          if (p) {
            const { collection, itemKey } = p;
            const label = toLabel(itemKey);
            if (!map.has(ev)) map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    return Array.from(map.values());
  }, [templateRuns, rootJsonText]);

  const variantIds: VariantId[] = useMemo(() => variantDefs.map((v) => v.id), [variantDefs]);

  // Ensure state maps have defaults for discovered variants
  useEffect(() => {
    if (!variantIds.length) return;
    setPricing((prev) => {
      const next = { ...prev };
      for (const id of variantIds) {
        if (!next[id]) next[id] = { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" };
      }
      return next;
    });
    setMappingKeys((prev) => ({ ...prev }));
    setForcedInputs((prev) => {
      const next = { ...prev };
      for (const id of variantIds) if (next[id] == null) next[id] = "{\n}\n";
      return next;
    });
    setScenarioEnabled((prev) => ({ ...prev }));
    setScopeStrategy((prev) => {
      const next = { ...prev } as Record<VariantId, "all" | "explode">;
      for (const id of variantIds) if (!next[id]) next[id] = "all";
      return next;
    });
    setTemplateDerived((prev) => ({ ...prev }));
    setTemplateScenarioIds((prev) => ({ ...prev }));
    setAvailableOptions((prev) => ({ ...prev }));
    setHighlighted((prev) => ({ ...prev }));
  }, [variantIds]);
  // Fetch from API when the drawer opens if configured (once per open/ref)
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    const key = `${apiLoadParams.baseUrl || ""}|${apiLoadParams.ref_ademe}`;
    if (lastLoadedKeyRef.current === key) return;
    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~20s at 500ms
    const tryLoad = async (): Promise<void> => {
      if (isCancelled || lastLoadedKeyRef.current === key) return;
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isCancelled) return;
          if (attempts++ < maxAttempts) {
            window.setTimeout(tryLoad, 500);
          }
          return;
        }
        const [data, template]: any[] = await Promise.all([
          fetchSimulationDpeFullJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
          fetchSimulationTemplateJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
        ]);
        if (!isCancelled) {
          lastLoadedKeyRef.current = key;
          onLoadedFromApi?.(data);
          try {
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
            const envelope = (data as any)?.dpe?.logement?.enveloppe || {};
            for (const v of variantDefs) {
              const entry = runs.find((r) => r && r.elements_variant === v.id);
              const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
              const collectionObj = envelope?.[v.collection];
              let items: any[] = [];
              if (Array.isArray(collectionObj?.[v.itemKey])) {
                items = collectionObj[v.itemKey] as any[];
              } else if (Array.isArray(collectionObj)) {
                // Shape B: array of slots { <itemKey>: {...} }
                items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
              }
              optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
                key: String(item?.donnee_entree?.reference || idx),
                description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
                selected: scopes.includes(idx),
                payload: item,
              }));
            }
            setAvailableOptions(optionsMap);

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              for (const v of variantDefs) {
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === v.id) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
                  } catch {}
                }
              }
            } catch {}
          } catch {
            setAvailableOptions({});
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    };
    tryLoad();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken]);

  // Reset load guard when closing so reopening can re-fetch
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      setAvailableOptions((prev) => {
        const next: typeof prev = { ...prev };
        for (const v of variantDefs) {
          const entry = runs.find((r) => r && r.elements_variant === v.id);
          const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
          next[v.id] = (prev[v.id] || []).map((o, idx) => ({ ...o, selected: scopes.includes(idx) }));
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [rootJsonText, variantDefs]);

  // Capture original JSON when opening, used to rollback on close (X)
  useEffect(() => {
    if (open) {
      originalJsonRef.current = rootJsonText;
    }
  }, [open]);

  // (no-op)

  // Sync scope strategy from JSON (default to "all")
  useEffect(() => {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const next: Record<VariantId, "all" | "explode"> = {};
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        next[v.id] = entry?.scope_strategy === "explode" ? "explode" : "all";
      }
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText, variantDefs]);

  function deriveVariantPricingFromRuns(runsArr: any[], variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getFirstScenarioInputKeyFromRuns(runsArr, variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getFirstScenarioCostKeyFromRuns(runsArr, variantId) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      for (const v of variantDefs) {
        const derived = deriveVariantPricingFromRuns(templateRuns, v.id);
        setTemplateDerived((prev) => ({ ...prev, [v.id]: derived }));
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === v.id) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [v.id]: ids }));
      }
    } catch {}
  }, [templateRuns, mappingKeys, variantDefs]);

  function getPresentScenarioIds(variantId: VariantId): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

  const initialState = useMemo((): Record<VariantId, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runsArr: any[] = Array.isArray(rootRaw) ? rootRaw : [];
      const next: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) {
        const hasEntry = runsArr.some((r) => r && r.elements_variant === v.id);
        next[v.id] = { enabled: Boolean(hasEntry), index: 0, text: "{\n}\n" };
      }
      return next;
    } catch {
      const fallback: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) fallback[v.id] = { enabled: false, index: 0, text: "{\n}\n" };
      return fallback;
    }
  }, [rootJsonText, variantDefs]);

  const [editorState, setEditorState] = useState<Record<VariantId, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

  // (no-op)

  function applyEditorChanges() {
    try {
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        for (const v of variantDefs) {
          const variantPath = v.id;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[v.id] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[v.id] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) continue;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[v.id] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[v.id]?.increments.length || 0,
            pricing[v.id]?.priceVar.length || 0,
            pricing[v.id]?.priceFix.length || 0,
            (scenarioEnabled[v.id] || []).length,
            (templateScenarioIds[v.id] || []).length
          );
          const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[v.id]?.[idx]);
            if (enabled) {
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[v.id]?.increments?.[idx] ?? NaN);
              const pLocal = pricing[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              const incFromState = Number(pLocal.increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[v.id] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[v.id]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pLocal.priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        }
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
      // Nested-object editing path is deprecated in favor of runs[] flow. Kept for backwards compatibility.
      for (const v of variantDefs) {
        const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
        const idx = Math.max(0, Math.floor(st.index || 0));
        const baseObj = ensurePath(root, ["dpe", "logement", "enveloppe"]);
        if (!Array.isArray((baseObj as any)[v.collection])) {
          (baseObj as any)[v.collection] = [] as any[];
        }
        const arr: any[] = (baseObj as any)[v.collection];
        if (st.enabled) {
          let parsed: any = {};
          try { parsed = st.text.trim() ? JSON.parse(st.text) : {}; } catch {
            throw new Error(`${v.label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      }
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    // Close silently if nothing would change; otherwise, confirm discard.
    try {
      const originalText = (originalJsonRef.current || "").trim();
      const currentText = (rootJsonText || "").trim();
      let isSame = false;
      try {
        const originalParsed = originalText ? JSON.parse(originalText) : null;
        const currentParsed = currentText ? JSON.parse(currentText) : null;
        isSame = JSON.stringify(originalParsed) === JSON.stringify(currentParsed);
      } catch {
        isSame = originalText === currentText;
      }
      if (isSame) {
        onClose();
        return;
      }
    } catch {}
    Modal.confirm({
      title: "Discard changes?",
      content: "Closing will revert any changes made in this panel.",
      okText: "Discard",
      cancelText: "Cancel",
      onOk: () => {
        try {
          onApply(originalJsonRef.current);
        } finally {
          onClose();
        }
      },
    });
  }

  function getFirstScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const inputObj = firstScenario?.input || firstScenario?.inputs || undefined;
      if (inputObj && typeof inputObj === "object") {
        const keys = Object.keys(inputObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getTemplateScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const costObj = firstScenario?.cost || undefined;
      if (costObj && typeof costObj === "object") {
        const keys = Object.keys(costObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getTemplateScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  // Helpers to derive keys directly from a provided runs[] array (e.g., template)
  function getFirstScenarioInputKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function deriveVariantPricing(variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Sync pricing grid from JSON scenarios when opening or when JSON/mapping keys change
  useEffect(() => {
    if (!open) return;
    try {
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        for (const v of variantDefs) {
          const entry = runsAll.find((r) => r && r.elements_variant === v.id) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
            } catch {}
          }
        }
      } catch {}

      for (const v of variantDefs) {
        const derived = deriveVariantPricing(v.id);
        setPricing((prev) => {
          const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextLen = derived.increments.length || current.increments.length || 0;
          const ensureLen = (arr: number[], len: number) => {
            const out = arr.slice(0, len);
            while (out.length < len) out.push(0);
            return out;
          };
          const nextIncrements = derived.increments.length ? derived.increments : current.increments;
          const nextPriceVar = derived.priceVar.length ? derived.priceVar : current.priceVar;
          const nextPriceFix = ensureLen(current.priceFix, Math.max(nextLen, nextPriceVar.length));
          return {
            ...prev,
            [v.id]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      }
    } catch {}
  }, [open, rootJsonText, mappingKeys, variantDefs]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
      }
    } catch {}
  }, [open, rootJsonText, variantDefs]);

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      for (const v of variantDefs) {
        const presentIds = new Set<number>(getPresentScenarioIds(v.id));
        const ids = templateScenarioIds[v.id] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
        }
      }
    } catch {}
  }, [open, rootJsonText, templateScenarioIds, variantDefs]);

  function toggleScenarioPresence(variantId: VariantId, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: (scopeStrategy[variantId] || "all"), scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
          ? Number(templateScenarioIds[variantId][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantId]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantId]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantId] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantId]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantId]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantId] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantId]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
            ? Number(templateScenarioIds[variantId][idx])
            : (idx + 1);
          let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
          if (targetIndex === -1 && idx < entry.scenarios.length) targetIndex = idx;
          if (targetIndex !== -1) {
            entry.scenarios.splice(targetIndex, 1);
            onApply(JSON.stringify(runs, null, 2));
          }
        }
      }
    } catch {}
    setScenarioEnabled((prev) => {
      const current = prev[variantId] ? prev[variantId].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantId]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

  const PanelContent = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => setIsTemplateOpen(true)}>Open template editor</Button>
        </div>
        {variantDefs.map((v) => {
          const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
          return (
            <Card key={v.id} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => {
                      setEditorState((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { enabled: false, index: 0, text: "{\n}\n" }), enabled: checked } }));
                      try {
                        let parsed: any = [];
                        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                        if (Array.isArray(parsed)) {
                          const runs: any[] = parsed;
                          const variantPath = v.id;
                          const idxInRuns = runs.findIndex((r) => r && r.elements_variant === variantPath);
                          if (!checked) {
                            if (idxInRuns !== -1) {
                              runs.splice(idxInRuns, 1);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                            setScenarioEnabled((prev) => ({ ...prev, [v.id]: [] }));
                            setScopeStrategy((prev) => ({ ...prev, [v.id]: "all" }));
                          } else {
                            if (idxInRuns === -1) {
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                // Default scope to all available options for this variant when enabling
                                try {
                                  const opts = availableOptions[v.id] || [];
                                  entry.elements_scope = opts.map((_, i) => i);
                                } catch {}
                              runs.push(entry);
                                onApply(JSON.stringify(runs, null, 2));
                            }
                          }
                        }
                      } catch {}
                    }}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              {/* index selector removed */}
              {st.enabled ? (
                <>
                  {(availableOptions[v.id] && Array.isArray(availableOptions[v.id]) && (availableOptions[v.id] as any[]).length > 0) ? (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(availableOptions[v.id] || []).map((opt, idx) => {
                          const detailsData = { variant: v.id, collection: v.collection, itemKey: v.itemKey, index: idx, key: opt.key, selected: opt.selected, payload: opt.payload };
                          const adjIdRaw = (opt as any)?.payload?.enum_type_adjacence_id ?? (opt as any)?.payload?.donnee_entree?.enum_type_adjacence_id;
                          const adjId = Number(adjIdRaw);
                          const greyText = Number.isFinite(adjId) && adjId !== 1;
                          return (
                            <label
                              key={opt.key}
                              onContextMenu={(e) => {
                                e.preventDefault();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: highlighted[v.id]?.[opt.key] ? "#fff7ed" : "transparent",
                                transition: "background-color 600ms ease",
                              }}
                            >
                              <Checkbox
                                checked={opt.selected}
                                onChange={(e) => {
                            const checked = e.target.checked;
                            // Update JSON immediately (runs array with elements_scope) and highlight
                            try {
                              let parsed: any = [];
                              try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                              const runs: any[] = Array.isArray(parsed) ? parsed : [];
                              const collectionName = v.collection;
                              const itemKey = v.itemKey;
                              const variantPath = v.id;
                              let entry = runs.find((r) => r && r.elements_variant === variantPath);
                              if (!entry) {
                                entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                runs.push(entry);
                              }
                              const optionIdx = idx; // 0-based index in available options order
                              const scopes: number[] = Array.isArray(entry.elements_scope) ? [...entry.elements_scope] : [];
                              const has = scopes.includes(optionIdx);
                              if (checked && !has) scopes.push(optionIdx);
                              if (!checked && has) {
                                const pos = scopes.indexOf(optionIdx);
                                if (pos !== -1) scopes.splice(pos, 1);
                              }
                              entry.elements_scope = scopes;

                              onApply(JSON.stringify(runs, null, 2));
                              message.success(checked ? "Added option to JSON" : "Removed option from JSON");

                              // Ask parent to highlight the corresponding indices in scope
                              try {
                                const indices = scopes.slice().sort((a, b) => a - b);
                                if (indices.length > 0) onHighlightJsonPath?.({ collection: collectionName, itemKey, indices });
                              } catch {}

                              const refKey = String(opt.key);
                              setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: false } }));
                              }, 1000);
                              // noop
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                            }}
                              />
                              <span style={{ fontSize: 12, color: greyText ? "#9ca3af" : "#374151" }}>{opt.description}</span>
                              <Button
                                size="small"
                                type="text"
                                aria-label="Show details"
                                icon={<span aria-hidden="true">ℹ️</span>}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal({ open: true, title: `${v.label} · ${opt.description}`, data: detailsData });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 8 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ fontWeight: 500 }}>explode</div>
                    <Switch
                      checked={scopeStrategy[v.id] === "explode"}
                      onChange={(checked) => {
                        try {
                          let parsed: any = [];
                          try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                          const runs: any[] = Array.isArray(parsed) ? parsed : [];
                          const collectionName = v.collection;
                          const itemKey = v.itemKey;
                          const variantPath = v.id;
                          let entry = runs.find((r) => r && r.elements_variant === variantPath);
                          if (!entry) {
                            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                            runs.push(entry);
                          }
                          entry.scope_strategy = checked ? "explode" : "all";
                          onApply(JSON.stringify(runs, null, 2));
                          setScopeStrategy((prev) => ({ ...prev, [v.id]: entry.scope_strategy }));
                        } catch {
                          message.error("Failed to update scope strategy");
                        }
                      }}
                    />
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(2, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Increment</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.incrementUnit || "cm"}</div>
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Price var</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.priceUnit || "EUR/m2"}</div>
                  </div>

                  {(() => {
                    const presentIds = getPresentScenarioIds(v.id);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[v.id] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[v.id]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[v.id]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[v.id]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[v.id]?.increments?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceVar?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceFix?.[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[v.id]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(v.id, idx, e.target.checked)}
                            />
                            <span>#{scenarioId}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, increments: nextIncs } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {/* Price fix column removed */}
                        </React.Fragment>
                      );
                    });
                  })()}
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            if (field === "increments") {
              const text = (colSettings.tempForcedInputs || "").trim();
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  const pretty = JSON.stringify(parsed, null, 2) + "\n";
                  setForcedInputs((prev) => ({ ...prev, [variant]: pretty }));
                } catch {
                  message.error("Invalid JSON in Forced inputs");
                  return;
                }
              } else {
                setForcedInputs((prev) => ({ ...prev, [variant]: "" }));
              }
            }
            setPricing((prev) => {
              const current = prev[variant] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              if (field === "increments") {
                return { ...prev, [variant]: { ...current, incrementUnit: colSettings.tempUnit || current.incrementUnit } };
              }
              return { ...prev, [variant]: { ...current, priceUnit: colSettings.tempUnit || current.priceUnit } };
            });
            setMappingKeys((prev) => {
              const current = prev[variant] || {};
              if (field === "increments") return { ...prev, [variant]: { ...current, inputKey: colSettings.tempKey || current.inputKey } };
              return { ...prev, [variant]: { ...current, costKey: colSettings.tempKey || current.costKey } };
            });

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = variantDefs.find((d) => d.id === variant);
                if (!v) return;
                const variantPath = v.id;
                let entry = runs.find((r) => r && r.elements_variant === variantPath);
                if (!entry) {
                  entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                  runs.push(entry);
                }
                if (!entry.parameters || typeof entry.parameters !== "object") entry.parameters = {};
                if (colSettings.tempUnit) entry.parameters.unit = colSettings.tempUnit;
                const text = (colSettings.tempForcedInputs || "").trim();
                if (text) {
                  try {
                    const forcedObj = JSON.parse(text);
                    if (forcedObj && typeof forcedObj === "object") {
                      entry.parameters.input_forced = forcedObj;
                    }
                  } catch {}
                }
                onApply(JSON.stringify(runs, null, 2));
              } catch {}
            }
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" });
          }
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>
              {colSettings.field === "increments" ? "Scenario input key (index mapping)" : "Scenario cost key (index mapping)"}
            </div>
            <Input
              value={colSettings.tempKey}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempKey: e.target.value }))}
              placeholder={colSettings.variant ? (
                colSettings.field === "increments"
                  ? (getTemplateScenarioInputKey(colSettings.variant) || getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getTemplateScenarioCostKey(colSettings.variant) || getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
              ) : ""}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>Unit</div>
            <Input
              value={colSettings.tempUnit}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempUnit: e.target.value }))}
              placeholder="e.g. cm or EUR/m2"
            />
          </div>
          {colSettings.field === "increments" ? (
            <div>
              <div style={{ marginBottom: 6, color: "#4b5563" }}>Forced inputs (JSON)</div>
              <Input.TextArea
                value={colSettings.tempForcedInputs}
                onChange={(e) => setColSettings((prev) => ({ ...prev, tempForcedInputs: e.target.value }))}
                rows={3}
                placeholder="{\n}\n"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </div>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={detailsModal.title || "Details"}
        open={detailsModal.open}
        onCancel={() => setDetailsModal({ open: false, title: "", data: null })}
        footer={[
          <Button key="close" onClick={() => setDetailsModal({ open: false, title: "", data: null })}>Close</Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{detailsModal.data ? JSON.stringify(detailsModal.data, null, 2) : ""}
          </pre>
        </div>
      </Modal>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div style={{ width, height: "calc(100vh - 64px)", borderRight: "1px solid #e5e7eb", background: "#fff", padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Edit DPE JSON</div>
          <Space>
            <Button onClick={handleDrawerClose}>Close</Button>
            <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
        />
      </div>
    );
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="left"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
        </Space>
      }
    >
      {PanelContent}
      <TemplateEditorModal
        open={isTemplateOpen}
        onCancel={() => setIsTemplateOpen(false)}
        baseUrl={apiLoadParams?.baseUrl}
        refAdeme={apiLoadParams?.ref_ademe}
        getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
      />
    </Drawer>
  );
};



```

- I set a default scope when enabling a variant: the left panel now auto-selects all available options for that variant on enable so the checkboxes reflect the scope immediately.

- Change made in `packages/dpe-editor/src/ui/DpeDrawerEditor.tsx`: when toggling “enabled” on, it fills `elements_scope` with all indices from `availableOptions[variantId]`. No linter errors.

If you prefer a different default (e.g., empty scope or only the first option), I can switch it.

---

**User**

no for some reasons scopes are empty in the left panel

---

**Cursor**

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
import { TemplateEditorModal } from "@acme/template-editor";
import { fetchSimulationDpeFullJson, fetchSimulationTemplateJson } from "../api";

export type DpeDrawerEditorProps = {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  rootJsonText: string;
  onApply: (nextJsonText: string) => void;
  // When provided, component will call the API on open using a Cognito bearer token
  apiLoadParams?: { baseUrl?: string; ref_ademe: string };
  getAccessToken?: () => Promise<string | null>;
  onLoadedFromApi?: (data: unknown) => void;
  onHighlightJsonPath?: (args: { collection: string; itemKey: string; indices: number[] }) => void;
  // When true, renders as a fixed inline panel instead of overlay drawer
  inline?: boolean;
};

type VariantId = string; // e.g. "dpe.logement.enveloppe.mur_collection.mur"
type EditorVariantState = { enabled: boolean; index: number; text: string };
type VariantDef = { id: VariantId; collection: string; itemKey: string; label: string };

function parseVariantPath(path: string): { collection: string; itemKey: string } | null {
  try {
    const parts = path.split(".");
    const idx = parts.lastIndexOf("enveloppe");
    if (idx === -1) return null;
    const collection = parts[idx + 1];
    const itemKey = parts[idx + 2];
    if (!collection || !itemKey) return null;
    return { collection, itemKey };
  } catch {
    return null;
  }
}

function toLabel(input: string): string {
  const spaced = input.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function deepGet(root: any, path: (string | number)[]): any {
  return path.reduce((acc: any, key: any) => (acc != null ? acc[key] : undefined), root);
}

function ensurePath(root: any, path: string[]): any {
  let cursor = root;
  for (const key of path) {
    if (cursor[key] == null || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  return cursor;
}

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath, inline = false }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]>>({});
  const [highlighted, setHighlighted] = useState<Record<VariantId, Record<string, boolean>>>({});
  const [pricing, setPricing] = useState<Record<VariantId, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({});

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantId | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantId, { inputKey?: string; costKey?: string }>>({});
  const [forcedInputs, setForcedInputs] = useState<Record<VariantId, string>>({});
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantId, boolean[]>>({});
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantId, "all" | "explode">>({});
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantId, { increments: number[]; priceVar: number[] }>>({});
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantId, number[]>>({});
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; data: any }>({ open: false, title: "", data: null });
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  // Avoid re-fetching while open due to parent re-renders: remember last load key
  const lastLoadedKeyRef = useRef<string | null>(null);
  // Keep a copy of the fetched envelope to derive options when variants appear
  const [envelopeData, setEnvelopeData] = useState<any | null>(null);

  const variantDefs: VariantDef[] = useMemo(() => {
    const map = new Map<VariantId, VariantDef>();
    try {
      // From template runs
      const runsTpl: any[] = Array.isArray(templateRuns) ? templateRuns : [];
      for (const r of runsTpl) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const parsed = parseVariantPath(ev);
          if (parsed) {
            const { collection, itemKey } = parsed;
            const label = toLabel(itemKey);
            map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    try {
      // From current JSON text (runs array)
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const r of runs) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const p = parseVariantPath(ev);
          if (p) {
            const { collection, itemKey } = p;
            const label = toLabel(itemKey);
            if (!map.has(ev)) map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    return Array.from(map.values());
  }, [templateRuns, rootJsonText]);

  const variantIds: VariantId[] = useMemo(() => variantDefs.map((v) => v.id), [variantDefs]);

  // Ensure state maps have defaults for discovered variants
  useEffect(() => {
    if (!variantIds.length) return;
    setPricing((prev) => {
      const next = { ...prev };
      for (const id of variantIds) {
        if (!next[id]) next[id] = { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" };
      }
      return next;
    });
    setMappingKeys((prev) => ({ ...prev }));
    setForcedInputs((prev) => {
      const next = { ...prev };
      for (const id of variantIds) if (next[id] == null) next[id] = "{\n}\n";
      return next;
    });
    setScenarioEnabled((prev) => ({ ...prev }));
    setScopeStrategy((prev) => {
      const next = { ...prev } as Record<VariantId, "all" | "explode">;
      for (const id of variantIds) if (!next[id]) next[id] = "all";
      return next;
    });
    setTemplateDerived((prev) => ({ ...prev }));
    setTemplateScenarioIds((prev) => ({ ...prev }));
    setAvailableOptions((prev) => ({ ...prev }));
    setHighlighted((prev) => ({ ...prev }));
  }, [variantIds]);
  // Fetch from API when the drawer opens if configured (once per open/ref)
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    const key = `${apiLoadParams.baseUrl || ""}|${apiLoadParams.ref_ademe}`;
    if (lastLoadedKeyRef.current === key) return;
    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~20s at 500ms
    const tryLoad = async (): Promise<void> => {
      if (isCancelled || lastLoadedKeyRef.current === key) return;
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isCancelled) return;
          if (attempts++ < maxAttempts) {
            window.setTimeout(tryLoad, 500);
          }
          return;
        }
        const [data, template]: any[] = await Promise.all([
          fetchSimulationDpeFullJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
          fetchSimulationTemplateJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
        ]);
        if (!isCancelled) {
          lastLoadedKeyRef.current = key;
          onLoadedFromApi?.(data);
          try {
            // Store envelope for later option derivation (after variant defs resolve)
            try {
              const env = (data as any)?.dpe?.logement?.enveloppe || null;
              setEnvelopeData(env);
            } catch {}
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
            const envelope = (data as any)?.dpe?.logement?.enveloppe || {};
            for (const v of variantDefs) {
              const entry = runs.find((r) => r && r.elements_variant === v.id);
              const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
              const collectionObj = envelope?.[v.collection];
              let items: any[] = [];
              if (Array.isArray(collectionObj?.[v.itemKey])) {
                items = collectionObj[v.itemKey] as any[];
              } else if (Array.isArray(collectionObj)) {
                // Shape B: array of slots { <itemKey>: {...} }
                items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
              }
              optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
                key: String(item?.donnee_entree?.reference || idx),
                description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
                selected: scopes.includes(idx),
                payload: item,
              }));
            }
            setAvailableOptions(optionsMap);

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              for (const v of variantDefs) {
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === v.id) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
                  } catch {}
                }
              }
            } catch {}
          } catch {
            setAvailableOptions({});
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    };
    tryLoad();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken]);

  // Reset load guard when closing so reopening can re-fetch
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Rebuild available options whenever variants resolve and we have envelope data
  useEffect(() => {
    try {
      if (!envelopeData) return;
      const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
      for (const v of variantDefs) {
        const collectionObj = envelopeData?.[v.collection];
        let items: any[] = [];
        if (Array.isArray(collectionObj?.[v.itemKey])) {
          items = collectionObj[v.itemKey] as any[];
        } else if (Array.isArray(collectionObj)) {
          items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
        }
        optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
          key: String(item?.donnee_entree?.reference || idx),
          description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
          selected: false,
          payload: item,
        }));
      }
      setAvailableOptions(optionsMap);
    } catch {}
  }, [envelopeData, variantDefs]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      setAvailableOptions((prev) => {
        const next: typeof prev = { ...prev };
        for (const v of variantDefs) {
          const entry = runs.find((r) => r && r.elements_variant === v.id);
          const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
          next[v.id] = (prev[v.id] || []).map((o, idx) => ({ ...o, selected: scopes.includes(idx) }));
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [rootJsonText, variantDefs]);

  // Capture original JSON when opening, used to rollback on close (X)
  useEffect(() => {
    if (open) {
      originalJsonRef.current = rootJsonText;
    }
  }, [open]);

  // (no-op)

  // Sync scope strategy from JSON (default to "all")
  useEffect(() => {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const next: Record<VariantId, "all" | "explode"> = {};
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        next[v.id] = entry?.scope_strategy === "explode" ? "explode" : "all";
      }
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText, variantDefs]);

  function deriveVariantPricingFromRuns(runsArr: any[], variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getFirstScenarioInputKeyFromRuns(runsArr, variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getFirstScenarioCostKeyFromRuns(runsArr, variantId) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      for (const v of variantDefs) {
        const derived = deriveVariantPricingFromRuns(templateRuns, v.id);
        setTemplateDerived((prev) => ({ ...prev, [v.id]: derived }));
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === v.id) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [v.id]: ids }));
      }
    } catch {}
  }, [templateRuns, mappingKeys, variantDefs]);

  function getPresentScenarioIds(variantId: VariantId): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

  const initialState = useMemo((): Record<VariantId, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runsArr: any[] = Array.isArray(rootRaw) ? rootRaw : [];
      const next: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) {
        const hasEntry = runsArr.some((r) => r && r.elements_variant === v.id);
        next[v.id] = { enabled: Boolean(hasEntry), index: 0, text: "{\n}\n" };
      }
      return next;
    } catch {
      const fallback: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) fallback[v.id] = { enabled: false, index: 0, text: "{\n}\n" };
      return fallback;
    }
  }, [rootJsonText, variantDefs]);

  const [editorState, setEditorState] = useState<Record<VariantId, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

  // (no-op)

  function applyEditorChanges() {
    try {
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        for (const v of variantDefs) {
          const variantPath = v.id;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[v.id] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[v.id] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) continue;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[v.id] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[v.id]?.increments.length || 0,
            pricing[v.id]?.priceVar.length || 0,
            pricing[v.id]?.priceFix.length || 0,
            (scenarioEnabled[v.id] || []).length,
            (templateScenarioIds[v.id] || []).length
          );
          const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[v.id]?.[idx]);
            if (enabled) {
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[v.id]?.increments?.[idx] ?? NaN);
              const pLocal = pricing[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              const incFromState = Number(pLocal.increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[v.id] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[v.id]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pLocal.priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        }
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
      // Nested-object editing path is deprecated in favor of runs[] flow. Kept for backwards compatibility.
      for (const v of variantDefs) {
        const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
        const idx = Math.max(0, Math.floor(st.index || 0));
        const baseObj = ensurePath(root, ["dpe", "logement", "enveloppe"]);
        if (!Array.isArray((baseObj as any)[v.collection])) {
          (baseObj as any)[v.collection] = [] as any[];
        }
        const arr: any[] = (baseObj as any)[v.collection];
        if (st.enabled) {
          let parsed: any = {};
          try { parsed = st.text.trim() ? JSON.parse(st.text) : {}; } catch {
            throw new Error(`${v.label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      }
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    // Close silently if nothing would change; otherwise, confirm discard.
    try {
      const originalText = (originalJsonRef.current || "").trim();
      const currentText = (rootJsonText || "").trim();
      let isSame = false;
      try {
        const originalParsed = originalText ? JSON.parse(originalText) : null;
        const currentParsed = currentText ? JSON.parse(currentText) : null;
        isSame = JSON.stringify(originalParsed) === JSON.stringify(currentParsed);
      } catch {
        isSame = originalText === currentText;
      }
      if (isSame) {
        onClose();
        return;
      }
    } catch {}
    Modal.confirm({
      title: "Discard changes?",
      content: "Closing will revert any changes made in this panel.",
      okText: "Discard",
      cancelText: "Cancel",
      onOk: () => {
        try {
          onApply(originalJsonRef.current);
        } finally {
          onClose();
        }
      },
    });
  }

  function getFirstScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const inputObj = firstScenario?.input || firstScenario?.inputs || undefined;
      if (inputObj && typeof inputObj === "object") {
        const keys = Object.keys(inputObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getTemplateScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const costObj = firstScenario?.cost || undefined;
      if (costObj && typeof costObj === "object") {
        const keys = Object.keys(costObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getTemplateScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  // Helpers to derive keys directly from a provided runs[] array (e.g., template)
  function getFirstScenarioInputKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function deriveVariantPricing(variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Sync pricing grid from JSON scenarios when opening or when JSON/mapping keys change
  useEffect(() => {
    if (!open) return;
    try {
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        for (const v of variantDefs) {
          const entry = runsAll.find((r) => r && r.elements_variant === v.id) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
            } catch {}
          }
        }
      } catch {}

      for (const v of variantDefs) {
        const derived = deriveVariantPricing(v.id);
        setPricing((prev) => {
          const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextLen = derived.increments.length || current.increments.length || 0;
          const ensureLen = (arr: number[], len: number) => {
            const out = arr.slice(0, len);
            while (out.length < len) out.push(0);
            return out;
          };
          const nextIncrements = derived.increments.length ? derived.increments : current.increments;
          const nextPriceVar = derived.priceVar.length ? derived.priceVar : current.priceVar;
          const nextPriceFix = ensureLen(current.priceFix, Math.max(nextLen, nextPriceVar.length));
          return {
            ...prev,
            [v.id]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      }
    } catch {}
  }, [open, rootJsonText, mappingKeys, variantDefs]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
      }
    } catch {}
  }, [open, rootJsonText, variantDefs]);

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      for (const v of variantDefs) {
        const presentIds = new Set<number>(getPresentScenarioIds(v.id));
        const ids = templateScenarioIds[v.id] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
        }
      }
    } catch {}
  }, [open, rootJsonText, templateScenarioIds, variantDefs]);

  function toggleScenarioPresence(variantId: VariantId, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: (scopeStrategy[variantId] || "all"), scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
          ? Number(templateScenarioIds[variantId][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantId]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantId]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantId] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantId]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantId]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantId] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantId]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
            ? Number(templateScenarioIds[variantId][idx])
            : (idx + 1);
          let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
          if (targetIndex === -1 && idx < entry.scenarios.length) targetIndex = idx;
          if (targetIndex !== -1) {
            entry.scenarios.splice(targetIndex, 1);
            onApply(JSON.stringify(runs, null, 2));
          }
        }
      }
    } catch {}
    setScenarioEnabled((prev) => {
      const current = prev[variantId] ? prev[variantId].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantId]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

  const PanelContent = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => setIsTemplateOpen(true)}>Open template editor</Button>
        </div>
        {variantDefs.map((v) => {
          const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
          return (
            <Card key={v.id} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => {
                      setEditorState((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { enabled: false, index: 0, text: "{\n}\n" }), enabled: checked } }));
                      try {
                        let parsed: any = [];
                        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                        if (Array.isArray(parsed)) {
                          const runs: any[] = parsed;
                          const variantPath = v.id;
                          const idxInRuns = runs.findIndex((r) => r && r.elements_variant === variantPath);
                          if (!checked) {
                            if (idxInRuns !== -1) {
                              runs.splice(idxInRuns, 1);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                            setScenarioEnabled((prev) => ({ ...prev, [v.id]: [] }));
                            setScopeStrategy((prev) => ({ ...prev, [v.id]: "all" }));
                          } else {
                            if (idxInRuns === -1) {
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                // Default scope to all available options for this variant when enabling
                                try {
                                  const opts = availableOptions[v.id] || [];
                                  entry.elements_scope = opts.map((_, i) => i);
                                } catch {}
                              runs.push(entry);
                                onApply(JSON.stringify(runs, null, 2));
                            }
                          }
                        }
                      } catch {}
                    }}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              {/* index selector removed */}
              {st.enabled ? (
                <>
                  {(availableOptions[v.id] && Array.isArray(availableOptions[v.id]) && (availableOptions[v.id] as any[]).length > 0) ? (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(availableOptions[v.id] || []).map((opt, idx) => {
                          const detailsData = { variant: v.id, collection: v.collection, itemKey: v.itemKey, index: idx, key: opt.key, selected: opt.selected, payload: opt.payload };
                          const adjIdRaw = (opt as any)?.payload?.enum_type_adjacence_id ?? (opt as any)?.payload?.donnee_entree?.enum_type_adjacence_id;
                          const adjId = Number(adjIdRaw);
                          const greyText = Number.isFinite(adjId) && adjId !== 1;
                          return (
                            <label
                              key={opt.key}
                              onContextMenu={(e) => {
                                e.preventDefault();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: highlighted[v.id]?.[opt.key] ? "#fff7ed" : "transparent",
                                transition: "background-color 600ms ease",
                              }}
                            >
                              <Checkbox
                                checked={opt.selected}
                                onChange={(e) => {
                            const checked = e.target.checked;
                            // Update JSON immediately (runs array with elements_scope) and highlight
                            try {
                              let parsed: any = [];
                              try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                              const runs: any[] = Array.isArray(parsed) ? parsed : [];
                              const collectionName = v.collection;
                              const itemKey = v.itemKey;
                              const variantPath = v.id;
                              let entry = runs.find((r) => r && r.elements_variant === variantPath);
                              if (!entry) {
                                entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                runs.push(entry);
                              }
                              const optionIdx = idx; // 0-based index in available options order
                              const scopes: number[] = Array.isArray(entry.elements_scope) ? [...entry.elements_scope] : [];
                              const has = scopes.includes(optionIdx);
                              if (checked && !has) scopes.push(optionIdx);
                              if (!checked && has) {
                                const pos = scopes.indexOf(optionIdx);
                                if (pos !== -1) scopes.splice(pos, 1);
                              }
                              entry.elements_scope = scopes;

                              onApply(JSON.stringify(runs, null, 2));
                              message.success(checked ? "Added option to JSON" : "Removed option from JSON");

                              // Ask parent to highlight the corresponding indices in scope
                              try {
                                const indices = scopes.slice().sort((a, b) => a - b);
                                if (indices.length > 0) onHighlightJsonPath?.({ collection: collectionName, itemKey, indices });
                              } catch {}

                              const refKey = String(opt.key);
                              setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: false } }));
                              }, 1000);
                              // noop
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                            }}
                              />
                              <span style={{ fontSize: 12, color: greyText ? "#9ca3af" : "#374151" }}>{opt.description}</span>
                              <Button
                                size="small"
                                type="text"
                                aria-label="Show details"
                                icon={<span aria-hidden="true">ℹ️</span>}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal({ open: true, title: `${v.label} · ${opt.description}`, data: detailsData });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 8 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ fontWeight: 500 }}>explode</div>
                    <Switch
                      checked={scopeStrategy[v.id] === "explode"}
                      onChange={(checked) => {
                        try {
                          let parsed: any = [];
                          try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                          const runs: any[] = Array.isArray(parsed) ? parsed : [];
                          const collectionName = v.collection;
                          const itemKey = v.itemKey;
                          const variantPath = v.id;
                          let entry = runs.find((r) => r && r.elements_variant === variantPath);
                          if (!entry) {
                            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                            runs.push(entry);
                          }
                          entry.scope_strategy = checked ? "explode" : "all";
                          onApply(JSON.stringify(runs, null, 2));
                          setScopeStrategy((prev) => ({ ...prev, [v.id]: entry.scope_strategy }));
                        } catch {
                          message.error("Failed to update scope strategy");
                        }
                      }}
                    />
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(2, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Increment</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.incrementUnit || "cm"}</div>
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Price var</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.priceUnit || "EUR/m2"}</div>
                  </div>

                  {(() => {
                    const presentIds = getPresentScenarioIds(v.id);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[v.id] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[v.id]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[v.id]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[v.id]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[v.id]?.increments?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceVar?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceFix?.[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[v.id]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(v.id, idx, e.target.checked)}
                            />
                            <span>#{scenarioId}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, increments: nextIncs } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {/* Price fix column removed */}
                        </React.Fragment>
                      );
                    });
                  })()}
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            if (field === "increments") {
              const text = (colSettings.tempForcedInputs || "").trim();
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  const pretty = JSON.stringify(parsed, null, 2) + "\n";
                  setForcedInputs((prev) => ({ ...prev, [variant]: pretty }));
                } catch {
                  message.error("Invalid JSON in Forced inputs");
                  return;
                }
              } else {
                setForcedInputs((prev) => ({ ...prev, [variant]: "" }));
              }
            }
            setPricing((prev) => {
              const current = prev[variant] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              if (field === "increments") {
                return { ...prev, [variant]: { ...current, incrementUnit: colSettings.tempUnit || current.incrementUnit } };
              }
              return { ...prev, [variant]: { ...current, priceUnit: colSettings.tempUnit || current.priceUnit } };
            });
            setMappingKeys((prev) => {
              const current = prev[variant] || {};
              if (field === "increments") return { ...prev, [variant]: { ...current, inputKey: colSettings.tempKey || current.inputKey } };
              return { ...prev, [variant]: { ...current, costKey: colSettings.tempKey || current.costKey } };
            });

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = variantDefs.find((d) => d.id === variant);
                if (!v) return;
                const variantPath = v.id;
                let entry = runs.find((r) => r && r.elements_variant === variantPath);
                if (!entry) {
                  entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                  runs.push(entry);
                }
                if (!entry.parameters || typeof entry.parameters !== "object") entry.parameters = {};
                if (colSettings.tempUnit) entry.parameters.unit = colSettings.tempUnit;
                const text = (colSettings.tempForcedInputs || "").trim();
                if (text) {
                  try {
                    const forcedObj = JSON.parse(text);
                    if (forcedObj && typeof forcedObj === "object") {
                      entry.parameters.input_forced = forcedObj;
                    }
                  } catch {}
                }
                onApply(JSON.stringify(runs, null, 2));
              } catch {}
            }
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" });
          }
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>
              {colSettings.field === "increments" ? "Scenario input key (index mapping)" : "Scenario cost key (index mapping)"}
            </div>
            <Input
              value={colSettings.tempKey}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempKey: e.target.value }))}
              placeholder={colSettings.variant ? (
                colSettings.field === "increments"
                  ? (getTemplateScenarioInputKey(colSettings.variant) || getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getTemplateScenarioCostKey(colSettings.variant) || getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
              ) : ""}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>Unit</div>
            <Input
              value={colSettings.tempUnit}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempUnit: e.target.value }))}
              placeholder="e.g. cm or EUR/m2"
            />
          </div>
          {colSettings.field === "increments" ? (
            <div>
              <div style={{ marginBottom: 6, color: "#4b5563" }}>Forced inputs (JSON)</div>
              <Input.TextArea
                value={colSettings.tempForcedInputs}
                onChange={(e) => setColSettings((prev) => ({ ...prev, tempForcedInputs: e.target.value }))}
                rows={3}
                placeholder="{\n}\n"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </div>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={detailsModal.title || "Details"}
        open={detailsModal.open}
        onCancel={() => setDetailsModal({ open: false, title: "", data: null })}
        footer={[
          <Button key="close" onClick={() => setDetailsModal({ open: false, title: "", data: null })}>Close</Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{detailsModal.data ? JSON.stringify(detailsModal.data, null, 2) : ""}
          </pre>
        </div>
      </Modal>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div style={{ width, height: "calc(100vh - 64px)", borderRight: "1px solid #e5e7eb", background: "#fff", padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Edit DPE JSON</div>
          <Space>
            <Button onClick={handleDrawerClose}>Close</Button>
            <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
        />
      </div>
    );
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="left"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
        </Space>
      }
    >
      {PanelContent}
      <TemplateEditorModal
        open={isTemplateOpen}
        onCancel={() => setIsTemplateOpen(false)}
        baseUrl={apiLoadParams?.baseUrl}
        refAdeme={apiLoadParams?.ref_ademe}
        getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
      />
    </Drawer>
  );
};



```

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
import { TemplateEditorModal } from "@acme/template-editor";
import { fetchSimulationDpeFullJson, fetchSimulationTemplateJson } from "../api";

export type DpeDrawerEditorProps = {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  rootJsonText: string;
  onApply: (nextJsonText: string) => void;
  // When provided, component will call the API on open using a Cognito bearer token
  apiLoadParams?: { baseUrl?: string; ref_ademe: string };
  getAccessToken?: () => Promise<string | null>;
  onLoadedFromApi?: (data: unknown) => void;
  onHighlightJsonPath?: (args: { collection: string; itemKey: string; indices: number[] }) => void;
  // When true, renders as a fixed inline panel instead of overlay drawer
  inline?: boolean;
};

type VariantId = string; // e.g. "dpe.logement.enveloppe.mur_collection.mur"
type EditorVariantState = { enabled: boolean; index: number; text: string };
type VariantDef = { id: VariantId; collection: string; itemKey: string; label: string };

function parseVariantPath(path: string): { collection: string; itemKey: string } | null {
  try {
    const parts = path.split(".");
    const idx = parts.lastIndexOf("enveloppe");
    if (idx === -1) return null;
    const collection = parts[idx + 1];
    const itemKey = parts[idx + 2];
    if (!collection || !itemKey) return null;
    return { collection, itemKey };
  } catch {
    return null;
  }
}

function toLabel(input: string): string {
  const spaced = input.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function deepGet(root: any, path: (string | number)[]): any {
  return path.reduce((acc: any, key: any) => (acc != null ? acc[key] : undefined), root);
}

function ensurePath(root: any, path: string[]): any {
  let cursor = root;
  for (const key of path) {
    if (cursor[key] == null || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  return cursor;
}

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath, inline = false }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]>>({});
  const [highlighted, setHighlighted] = useState<Record<VariantId, Record<string, boolean>>>({});
  const [pricing, setPricing] = useState<Record<VariantId, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({});

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantId | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantId, { inputKey?: string; costKey?: string }>>({});
  const [forcedInputs, setForcedInputs] = useState<Record<VariantId, string>>({});
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantId, boolean[]>>({});
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantId, "all" | "explode">>({});
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantId, { increments: number[]; priceVar: number[] }>>({});
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantId, number[]>>({});
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; data: any }>({ open: false, title: "", data: null });
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  // Avoid re-fetching while open due to parent re-renders: remember last load key
  const lastLoadedKeyRef = useRef<string | null>(null);
  // Keep a copy of the fetched envelope to derive options when variants appear
  const [envelopeData, setEnvelopeData] = useState<any | null>(null);

  const variantDefs: VariantDef[] = useMemo(() => {
    const map = new Map<VariantId, VariantDef>();
    try {
      // From template runs
      const runsTpl: any[] = Array.isArray(templateRuns) ? templateRuns : [];
      for (const r of runsTpl) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const parsed = parseVariantPath(ev);
          if (parsed) {
            const { collection, itemKey } = parsed;
            const label = toLabel(itemKey);
            map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    try {
      // From current JSON text (runs array)
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const r of runs) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const p = parseVariantPath(ev);
          if (p) {
            const { collection, itemKey } = p;
            const label = toLabel(itemKey);
            if (!map.has(ev)) map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    return Array.from(map.values());
  }, [templateRuns, rootJsonText]);

  const variantIds: VariantId[] = useMemo(() => variantDefs.map((v) => v.id), [variantDefs]);

  // Ensure state maps have defaults for discovered variants
  useEffect(() => {
    if (!variantIds.length) return;
    setPricing((prev) => {
      const next = { ...prev };
      for (const id of variantIds) {
        if (!next[id]) next[id] = { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" };
      }
      return next;
    });
    setMappingKeys((prev) => ({ ...prev }));
    setForcedInputs((prev) => {
      const next = { ...prev };
      for (const id of variantIds) if (next[id] == null) next[id] = "{\n}\n";
      return next;
    });
    setScenarioEnabled((prev) => ({ ...prev }));
    setScopeStrategy((prev) => {
      const next = { ...prev } as Record<VariantId, "all" | "explode">;
      for (const id of variantIds) if (!next[id]) next[id] = "all";
      return next;
    });
    setTemplateDerived((prev) => ({ ...prev }));
    setTemplateScenarioIds((prev) => ({ ...prev }));
    setAvailableOptions((prev) => ({ ...prev }));
    setHighlighted((prev) => ({ ...prev }));
  }, [variantIds]);
  // Fetch from API when the drawer opens if configured (once per open/ref)
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    const key = `${apiLoadParams.baseUrl || ""}|${apiLoadParams.ref_ademe}`;
    if (lastLoadedKeyRef.current === key) return;
    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~20s at 500ms
    const tryLoad = async (): Promise<void> => {
      if (isCancelled || lastLoadedKeyRef.current === key) return;
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isCancelled) return;
          if (attempts++ < maxAttempts) {
            window.setTimeout(tryLoad, 500);
          }
          return;
        }
        const [data, template]: any[] = await Promise.all([
          fetchSimulationDpeFullJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
          fetchSimulationTemplateJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
        ]);
        if (!isCancelled) {
          lastLoadedKeyRef.current = key;
          onLoadedFromApi?.(data);
          try {
            // Store envelope for later option derivation (after variant defs resolve)
            try {
              const env = (data as any)?.dpe?.logement?.enveloppe || null;
              setEnvelopeData(env);
            } catch {}
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
            const envelope = (data as any)?.dpe?.logement?.enveloppe || {};
            for (const v of variantDefs) {
              const entry = runs.find((r) => r && r.elements_variant === v.id);
              const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
              const collectionObj = envelope?.[v.collection];
              let items: any[] = [];
              if (Array.isArray(collectionObj?.[v.itemKey])) {
                items = collectionObj[v.itemKey] as any[];
              } else if (Array.isArray(collectionObj)) {
                // Shape B: array of slots { <itemKey>: {...} }
                items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
              }
              optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
                key: String(item?.donnee_entree?.reference || idx),
                description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
                selected: scopes.includes(idx),
                payload: item,
              }));
            }
            setAvailableOptions(optionsMap);

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              for (const v of variantDefs) {
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === v.id) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
                  } catch {}
                }
              }
            } catch {}
          } catch {
            setAvailableOptions({});
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    };
    tryLoad();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken]);

  // Reset load guard when closing so reopening can re-fetch
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Rebuild available options whenever variants resolve and we have envelope data, also sync selected from JSON
  useEffect(() => {
    try {
      if (!envelopeData) return;
      const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
        const collectionObj = envelopeData?.[v.collection];
        let items: any[] = [];
        if (Array.isArray(collectionObj?.[v.itemKey])) {
          items = collectionObj[v.itemKey] as any[];
        } else if (Array.isArray(collectionObj)) {
          items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
        }
        optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
          key: String(item?.donnee_entree?.reference || idx),
          description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
          selected: scopes.includes(idx),
          payload: item,
        }));
      }
      setAvailableOptions(optionsMap);
    } catch {}
  }, [envelopeData, variantDefs]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      setAvailableOptions((prev) => {
        const next: typeof prev = { ...prev };
        for (const v of variantDefs) {
          const entry = runs.find((r) => r && r.elements_variant === v.id);
          const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
          next[v.id] = (prev[v.id] || []).map((o, idx) => ({ ...o, selected: scopes.includes(idx) }));
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [rootJsonText, variantDefs]);

  // Capture original JSON when opening, used to rollback on close (X)
  useEffect(() => {
    if (open) {
      originalJsonRef.current = rootJsonText;
    }
  }, [open]);

  // (no-op)

  // Sync scope strategy from JSON (default to "all")
  useEffect(() => {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const next: Record<VariantId, "all" | "explode"> = {};
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        next[v.id] = entry?.scope_strategy === "explode" ? "explode" : "all";
      }
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText, variantDefs]);

  function deriveVariantPricingFromRuns(runsArr: any[], variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getFirstScenarioInputKeyFromRuns(runsArr, variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getFirstScenarioCostKeyFromRuns(runsArr, variantId) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      for (const v of variantDefs) {
        const derived = deriveVariantPricingFromRuns(templateRuns, v.id);
        setTemplateDerived((prev) => ({ ...prev, [v.id]: derived }));
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === v.id) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [v.id]: ids }));
      }
    } catch {}
  }, [templateRuns, mappingKeys, variantDefs]);

  function getPresentScenarioIds(variantId: VariantId): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

  const initialState = useMemo((): Record<VariantId, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runsArr: any[] = Array.isArray(rootRaw) ? rootRaw : [];
      const next: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) {
        const hasEntry = runsArr.some((r) => r && r.elements_variant === v.id);
        next[v.id] = { enabled: Boolean(hasEntry), index: 0, text: "{\n}\n" };
      }
      return next;
    } catch {
      const fallback: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) fallback[v.id] = { enabled: false, index: 0, text: "{\n}\n" };
      return fallback;
    }
  }, [rootJsonText, variantDefs]);

  const [editorState, setEditorState] = useState<Record<VariantId, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

  // (no-op)

  function applyEditorChanges() {
    try {
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        for (const v of variantDefs) {
          const variantPath = v.id;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[v.id] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[v.id] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) continue;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[v.id] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[v.id]?.increments.length || 0,
            pricing[v.id]?.priceVar.length || 0,
            pricing[v.id]?.priceFix.length || 0,
            (scenarioEnabled[v.id] || []).length,
            (templateScenarioIds[v.id] || []).length
          );
          const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[v.id]?.[idx]);
            if (enabled) {
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[v.id]?.increments?.[idx] ?? NaN);
              const pLocal = pricing[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              const incFromState = Number(pLocal.increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[v.id] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[v.id]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pLocal.priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        }
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
      // Nested-object editing path is deprecated in favor of runs[] flow. Kept for backwards compatibility.
      for (const v of variantDefs) {
        const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
        const idx = Math.max(0, Math.floor(st.index || 0));
        const baseObj = ensurePath(root, ["dpe", "logement", "enveloppe"]);
        if (!Array.isArray((baseObj as any)[v.collection])) {
          (baseObj as any)[v.collection] = [] as any[];
        }
        const arr: any[] = (baseObj as any)[v.collection];
        if (st.enabled) {
          let parsed: any = {};
          try { parsed = st.text.trim() ? JSON.parse(st.text) : {}; } catch {
            throw new Error(`${v.label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      }
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    // Close silently if nothing would change; otherwise, confirm discard.
    try {
      const originalText = (originalJsonRef.current || "").trim();
      const currentText = (rootJsonText || "").trim();
      let isSame = false;
      try {
        const originalParsed = originalText ? JSON.parse(originalText) : null;
        const currentParsed = currentText ? JSON.parse(currentText) : null;
        isSame = JSON.stringify(originalParsed) === JSON.stringify(currentParsed);
      } catch {
        isSame = originalText === currentText;
      }
      if (isSame) {
        onClose();
        return;
      }
    } catch {}
    Modal.confirm({
      title: "Discard changes?",
      content: "Closing will revert any changes made in this panel.",
      okText: "Discard",
      cancelText: "Cancel",
      onOk: () => {
        try {
          onApply(originalJsonRef.current);
        } finally {
          onClose();
        }
      },
    });
  }

  function getFirstScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const inputObj = firstScenario?.input || firstScenario?.inputs || undefined;
      if (inputObj && typeof inputObj === "object") {
        const keys = Object.keys(inputObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getTemplateScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const costObj = firstScenario?.cost || undefined;
      if (costObj && typeof costObj === "object") {
        const keys = Object.keys(costObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getTemplateScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  // Helpers to derive keys directly from a provided runs[] array (e.g., template)
  function getFirstScenarioInputKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function deriveVariantPricing(variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Sync pricing grid from JSON scenarios when opening or when JSON/mapping keys change
  useEffect(() => {
    if (!open) return;
    try {
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        for (const v of variantDefs) {
          const entry = runsAll.find((r) => r && r.elements_variant === v.id) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
            } catch {}
          }
        }
      } catch {}

      for (const v of variantDefs) {
        const derived = deriveVariantPricing(v.id);
        setPricing((prev) => {
          const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextLen = derived.increments.length || current.increments.length || 0;
          const ensureLen = (arr: number[], len: number) => {
            const out = arr.slice(0, len);
            while (out.length < len) out.push(0);
            return out;
          };
          const nextIncrements = derived.increments.length ? derived.increments : current.increments;
          const nextPriceVar = derived.priceVar.length ? derived.priceVar : current.priceVar;
          const nextPriceFix = ensureLen(current.priceFix, Math.max(nextLen, nextPriceVar.length));
          return {
            ...prev,
            [v.id]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      }
    } catch {}
  }, [open, rootJsonText, mappingKeys, variantDefs]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
      }
    } catch {}
  }, [open, rootJsonText, variantDefs]);

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      for (const v of variantDefs) {
        const presentIds = new Set<number>(getPresentScenarioIds(v.id));
        const ids = templateScenarioIds[v.id] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
        }
      }
    } catch {}
  }, [open, rootJsonText, templateScenarioIds, variantDefs]);

  function toggleScenarioPresence(variantId: VariantId, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: (scopeStrategy[variantId] || "all"), scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
          ? Number(templateScenarioIds[variantId][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantId]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantId]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantId] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantId]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantId]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantId] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantId]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
            ? Number(templateScenarioIds[variantId][idx])
            : (idx + 1);
          let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
          if (targetIndex === -1 && idx < entry.scenarios.length) targetIndex = idx;
          if (targetIndex !== -1) {
            entry.scenarios.splice(targetIndex, 1);
            onApply(JSON.stringify(runs, null, 2));
          }
        }
      }
    } catch {}
    setScenarioEnabled((prev) => {
      const current = prev[variantId] ? prev[variantId].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantId]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

  const PanelContent = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => setIsTemplateOpen(true)}>Open template editor</Button>
        </div>
        {variantDefs.map((v) => {
          const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
          return (
            <Card key={v.id} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => {
                      setEditorState((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { enabled: false, index: 0, text: "{\n}\n" }), enabled: checked } }));
                      try {
                        let parsed: any = [];
                        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                        if (Array.isArray(parsed)) {
                          const runs: any[] = parsed;
                          const variantPath = v.id;
                          const idxInRuns = runs.findIndex((r) => r && r.elements_variant === variantPath);
                          if (!checked) {
                            if (idxInRuns !== -1) {
                              runs.splice(idxInRuns, 1);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                            setScenarioEnabled((prev) => ({ ...prev, [v.id]: [] }));
                            setScopeStrategy((prev) => ({ ...prev, [v.id]: "all" }));
                          } else {
                            if (idxInRuns === -1) {
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                // Default scope to all available options for this variant when enabling
                                try {
                                  const opts = availableOptions[v.id] || [];
                                  entry.elements_scope = opts.map((_, i) => i);
                                } catch {}
                              runs.push(entry);
                                onApply(JSON.stringify(runs, null, 2));
                            }
                          }
                        }
                      } catch {}
                    }}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              {/* index selector removed */}
              {st.enabled ? (
                <>
                  {(availableOptions[v.id] && Array.isArray(availableOptions[v.id]) && (availableOptions[v.id] as any[]).length > 0) ? (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(availableOptions[v.id] || []).map((opt, idx) => {
                          const detailsData = { variant: v.id, collection: v.collection, itemKey: v.itemKey, index: idx, key: opt.key, selected: opt.selected, payload: opt.payload };
                          const adjIdRaw = (opt as any)?.payload?.enum_type_adjacence_id ?? (opt as any)?.payload?.donnee_entree?.enum_type_adjacence_id;
                          const adjId = Number(adjIdRaw);
                          const greyText = Number.isFinite(adjId) && adjId !== 1;
                          return (
                            <label
                              key={opt.key}
                              onContextMenu={(e) => {
                                e.preventDefault();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: highlighted[v.id]?.[opt.key] ? "#fff7ed" : "transparent",
                                transition: "background-color 600ms ease",
                              }}
                            >
                              <Checkbox
                                checked={opt.selected}
                                onChange={(e) => {
                            const checked = e.target.checked;
                            // Update JSON immediately (runs array with elements_scope) and highlight
                            try {
                              let parsed: any = [];
                              try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                              const runs: any[] = Array.isArray(parsed) ? parsed : [];
                              const collectionName = v.collection;
                              const itemKey = v.itemKey;
                              const variantPath = v.id;
                              let entry = runs.find((r) => r && r.elements_variant === variantPath);
                              if (!entry) {
                                entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                runs.push(entry);
                              }
                              const optionIdx = idx; // 0-based index in available options order
                              const scopes: number[] = Array.isArray(entry.elements_scope) ? [...entry.elements_scope] : [];
                              const has = scopes.includes(optionIdx);
                              if (checked && !has) scopes.push(optionIdx);
                              if (!checked && has) {
                                const pos = scopes.indexOf(optionIdx);
                                if (pos !== -1) scopes.splice(pos, 1);
                              }
                              entry.elements_scope = scopes;

                              onApply(JSON.stringify(runs, null, 2));
                              message.success(checked ? "Added option to JSON" : "Removed option from JSON");

                              // Ask parent to highlight the corresponding indices in scope
                              try {
                                const indices = scopes.slice().sort((a, b) => a - b);
                                if (indices.length > 0) onHighlightJsonPath?.({ collection: collectionName, itemKey, indices });
                              } catch {}

                              const refKey = String(opt.key);
                              setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: false } }));
                              }, 1000);
                              // noop
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                            }}
                              />
                              <span style={{ fontSize: 12, color: greyText ? "#9ca3af" : "#374151" }}>{opt.description}</span>
                              <Button
                                size="small"
                                type="text"
                                aria-label="Show details"
                                icon={<span aria-hidden="true">ℹ️</span>}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal({ open: true, title: `${v.label} · ${opt.description}`, data: detailsData });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 8 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ fontWeight: 500 }}>explode</div>
                    <Switch
                      checked={scopeStrategy[v.id] === "explode"}
                      onChange={(checked) => {
                        try {
                          let parsed: any = [];
                          try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                          const runs: any[] = Array.isArray(parsed) ? parsed : [];
                          const collectionName = v.collection;
                          const itemKey = v.itemKey;
                          const variantPath = v.id;
                          let entry = runs.find((r) => r && r.elements_variant === variantPath);
                          if (!entry) {
                            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                            runs.push(entry);
                          }
                          entry.scope_strategy = checked ? "explode" : "all";
                          onApply(JSON.stringify(runs, null, 2));
                          setScopeStrategy((prev) => ({ ...prev, [v.id]: entry.scope_strategy }));
                        } catch {
                          message.error("Failed to update scope strategy");
                        }
                      }}
                    />
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(2, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Increment</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.incrementUnit || "cm"}</div>
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Price var</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.priceUnit || "EUR/m2"}</div>
                  </div>

                  {(() => {
                    const presentIds = getPresentScenarioIds(v.id);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[v.id] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[v.id]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[v.id]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[v.id]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[v.id]?.increments?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceVar?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceFix?.[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[v.id]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(v.id, idx, e.target.checked)}
                            />
                            <span>#{scenarioId}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, increments: nextIncs } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {/* Price fix column removed */}
                        </React.Fragment>
                      );
                    });
                  })()}
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            if (field === "increments") {
              const text = (colSettings.tempForcedInputs || "").trim();
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  const pretty = JSON.stringify(parsed, null, 2) + "\n";
                  setForcedInputs((prev) => ({ ...prev, [variant]: pretty }));
                } catch {
                  message.error("Invalid JSON in Forced inputs");
                  return;
                }
              } else {
                setForcedInputs((prev) => ({ ...prev, [variant]: "" }));
              }
            }
            setPricing((prev) => {
              const current = prev[variant] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              if (field === "increments") {
                return { ...prev, [variant]: { ...current, incrementUnit: colSettings.tempUnit || current.incrementUnit } };
              }
              return { ...prev, [variant]: { ...current, priceUnit: colSettings.tempUnit || current.priceUnit } };
            });
            setMappingKeys((prev) => {
              const current = prev[variant] || {};
              if (field === "increments") return { ...prev, [variant]: { ...current, inputKey: colSettings.tempKey || current.inputKey } };
              return { ...prev, [variant]: { ...current, costKey: colSettings.tempKey || current.costKey } };
            });

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = variantDefs.find((d) => d.id === variant);
                if (!v) return;
                const variantPath = v.id;
                let entry = runs.find((r) => r && r.elements_variant === variantPath);
                if (!entry) {
                  entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                  runs.push(entry);
                }
                if (!entry.parameters || typeof entry.parameters !== "object") entry.parameters = {};
                if (colSettings.tempUnit) entry.parameters.unit = colSettings.tempUnit;
                const text = (colSettings.tempForcedInputs || "").trim();
                if (text) {
                  try {
                    const forcedObj = JSON.parse(text);
                    if (forcedObj && typeof forcedObj === "object") {
                      entry.parameters.input_forced = forcedObj;
                    }
                  } catch {}
                }
                onApply(JSON.stringify(runs, null, 2));
              } catch {}
            }
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" });
          }
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>
              {colSettings.field === "increments" ? "Scenario input key (index mapping)" : "Scenario cost key (index mapping)"}
            </div>
            <Input
              value={colSettings.tempKey}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempKey: e.target.value }))}
              placeholder={colSettings.variant ? (
                colSettings.field === "increments"
                  ? (getTemplateScenarioInputKey(colSettings.variant) || getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getTemplateScenarioCostKey(colSettings.variant) || getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
              ) : ""}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>Unit</div>
            <Input
              value={colSettings.tempUnit}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempUnit: e.target.value }))}
              placeholder="e.g. cm or EUR/m2"
            />
          </div>
          {colSettings.field === "increments" ? (
            <div>
              <div style={{ marginBottom: 6, color: "#4b5563" }}>Forced inputs (JSON)</div>
              <Input.TextArea
                value={colSettings.tempForcedInputs}
                onChange={(e) => setColSettings((prev) => ({ ...prev, tempForcedInputs: e.target.value }))}
                rows={3}
                placeholder="{\n}\n"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </div>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={detailsModal.title || "Details"}
        open={detailsModal.open}
        onCancel={() => setDetailsModal({ open: false, title: "", data: null })}
        footer={[
          <Button key="close" onClick={() => setDetailsModal({ open: false, title: "", data: null })}>Close</Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{detailsModal.data ? JSON.stringify(detailsModal.data, null, 2) : ""}
          </pre>
        </div>
      </Modal>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div style={{ width, height: "calc(100vh - 64px)", borderRight: "1px solid #e5e7eb", background: "#fff", padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Edit DPE JSON</div>
          <Space>
            <Button onClick={handleDrawerClose}>Close</Button>
            <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
        />
      </div>
    );
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="left"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
        </Space>
      }
    >
      {PanelContent}
      <TemplateEditorModal
        open={isTemplateOpen}
        onCancel={() => setIsTemplateOpen(false)}
        baseUrl={apiLoadParams?.baseUrl}
        refAdeme={apiLoadParams?.ref_ademe}
        getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
      />
    </Drawer>
  );
};



```

```typescriptreact
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Checkbox, Drawer, Space, Switch, message, InputNumber, Modal, Input } from "antd";
import { TemplateEditorModal } from "@acme/template-editor";
import { fetchSimulationDpeFullJson, fetchSimulationTemplateJson } from "../api";

export type DpeDrawerEditorProps = {
  open: boolean;
  onClose: () => void;
  width?: number | string;
  rootJsonText: string;
  onApply: (nextJsonText: string) => void;
  // When provided, component will call the API on open using a Cognito bearer token
  apiLoadParams?: { baseUrl?: string; ref_ademe: string };
  getAccessToken?: () => Promise<string | null>;
  onLoadedFromApi?: (data: unknown) => void;
  onHighlightJsonPath?: (args: { collection: string; itemKey: string; indices: number[] }) => void;
  // When true, renders as a fixed inline panel instead of overlay drawer
  inline?: boolean;
};

type VariantId = string; // e.g. "dpe.logement.enveloppe.mur_collection.mur"
type EditorVariantState = { enabled: boolean; index: number; text: string };
type VariantDef = { id: VariantId; collection: string; itemKey: string; label: string };

function parseVariantPath(path: string): { collection: string; itemKey: string } | null {
  try {
    const parts = path.split(".");
    const idx = parts.lastIndexOf("enveloppe");
    if (idx === -1) return null;
    const collection = parts[idx + 1];
    const itemKey = parts[idx + 2];
    if (!collection || !itemKey) return null;
    return { collection, itemKey };
  } catch {
    return null;
  }
}

function toLabel(input: string): string {
  const spaced = input.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function deepGet(root: any, path: (string | number)[]): any {
  return path.reduce((acc: any, key: any) => (acc != null ? acc[key] : undefined), root);
}

function ensurePath(root: any, path: string[]): any {
  let cursor = root;
  for (const key of path) {
    if (cursor[key] == null || typeof cursor[key] !== "object") {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  return cursor;
}

export const DpeDrawerEditor: React.FC<DpeDrawerEditorProps> = ({ open, onClose, width = "50%", rootJsonText, onApply, apiLoadParams, getAccessToken, onLoadedFromApi, onHighlightJsonPath, inline = false }) => {
  const [availableOptions, setAvailableOptions] = useState<Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]>>({});
  const [highlighted, setHighlighted] = useState<Record<VariantId, Record<string, boolean>>>({});
  const [pricing, setPricing] = useState<Record<VariantId, { increments: number[]; priceVar: number[]; priceFix: number[]; incrementUnit: string; priceUnit: string }>>({});

  const [colSettings, setColSettings] = useState<{ open: boolean; variant: VariantId | null; field: "increments" | "priceVar" | "priceFix" | null; tempUnit: string; tempKey: string; tempForcedInputs: string }>({
    open: false,
    variant: null,
    field: null,
    tempUnit: "",
    tempKey: "",
    tempForcedInputs: "",
  });

  const [mappingKeys, setMappingKeys] = useState<Record<VariantId, { inputKey?: string; costKey?: string }>>({});
  const [forcedInputs, setForcedInputs] = useState<Record<VariantId, string>>({});
  const originalJsonRef = useRef<string>("");
  const [scenarioEnabled, setScenarioEnabled] = useState<Record<VariantId, boolean[]>>({});
  const [scopeStrategy, setScopeStrategy] = useState<Record<VariantId, "all" | "explode">>({});
  const [templateRuns, setTemplateRuns] = useState<any[]>([]);
  const [templateDerived, setTemplateDerived] = useState<Record<VariantId, { increments: number[]; priceVar: number[] }>>({});
  const [templateScenarioIds, setTemplateScenarioIds] = useState<Record<VariantId, number[]>>({});
  const [detailsModal, setDetailsModal] = useState<{ open: boolean; title: string; data: any }>({ open: false, title: "", data: null });
  const [isTemplateOpen, setIsTemplateOpen] = useState<boolean>(false);
  // Avoid re-fetching while open due to parent re-renders: remember last load key
  const lastLoadedKeyRef = useRef<string | null>(null);
  // Keep a copy of the fetched envelope to derive options when variants appear
  const [envelopeData, setEnvelopeData] = useState<any | null>(null);

  const variantDefs: VariantDef[] = useMemo(() => {
    const map = new Map<VariantId, VariantDef>();
    try {
      // From template runs
      const runsTpl: any[] = Array.isArray(templateRuns) ? templateRuns : [];
      for (const r of runsTpl) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const parsed = parseVariantPath(ev);
          if (parsed) {
            const { collection, itemKey } = parsed;
            const label = toLabel(itemKey);
            map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    try {
      // From current JSON text (runs array)
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const r of runs) {
        const ev = r?.elements_variant;
        if (typeof ev === "string") {
          const p = parseVariantPath(ev);
          if (p) {
            const { collection, itemKey } = p;
            const label = toLabel(itemKey);
            if (!map.has(ev)) map.set(ev, { id: ev, collection, itemKey, label });
          }
        }
      }
    } catch {}
    return Array.from(map.values());
  }, [templateRuns, rootJsonText]);

  const variantIds: VariantId[] = useMemo(() => variantDefs.map((v) => v.id), [variantDefs]);

  // Ensure state maps have defaults for discovered variants
  useEffect(() => {
    if (!variantIds.length) return;
    setPricing((prev) => {
      const next = { ...prev };
      for (const id of variantIds) {
        if (!next[id]) next[id] = { increments: [0, 10, 30], priceVar: [0, 100, 150], priceFix: [0, 0, 0], incrementUnit: "cm", priceUnit: "EUR/m2" };
      }
      return next;
    });
    setMappingKeys((prev) => ({ ...prev }));
    setForcedInputs((prev) => {
      const next = { ...prev };
      for (const id of variantIds) if (next[id] == null) next[id] = "{\n}\n";
      return next;
    });
    setScenarioEnabled((prev) => ({ ...prev }));
    setScopeStrategy((prev) => {
      const next = { ...prev } as Record<VariantId, "all" | "explode">;
      for (const id of variantIds) if (!next[id]) next[id] = "all";
      return next;
    });
    setTemplateDerived((prev) => ({ ...prev }));
    setTemplateScenarioIds((prev) => ({ ...prev }));
    setAvailableOptions((prev) => ({ ...prev }));
    setHighlighted((prev) => ({ ...prev }));
  }, [variantIds]);
  // Fetch from API when the drawer opens if configured (once per open/ref)
  useEffect(() => {
    if (!open || !apiLoadParams || !getAccessToken) return;
    const key = `${apiLoadParams.baseUrl || ""}|${apiLoadParams.ref_ademe}`;
    if (lastLoadedKeyRef.current === key) return;
    let isCancelled = false;
    let attempts = 0;
    const maxAttempts = 40; // ~20s at 500ms
    const tryLoad = async (): Promise<void> => {
      if (isCancelled || lastLoadedKeyRef.current === key) return;
      try {
        const token = await getAccessToken();
        if (!token) {
          if (isCancelled) return;
          if (attempts++ < maxAttempts) {
            window.setTimeout(tryLoad, 500);
          }
          return;
        }
        const [data, template]: any[] = await Promise.all([
          fetchSimulationDpeFullJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
          fetchSimulationTemplateJson({
            baseUrl: apiLoadParams.baseUrl,
            ref_ademe: apiLoadParams.ref_ademe,
            accessToken: token,
          }),
        ]);
        if (!isCancelled) {
          lastLoadedKeyRef.current = key;
          onLoadedFromApi?.(data);
          try {
            // Store envelope for later option derivation (after variant defs resolve)
            try {
              const env = (data as any)?.dpe?.logement?.enveloppe || null;
              setEnvelopeData(env);
            } catch {}
            // Derive current scopes from JSON if present to preselect options
            let parsed: any = [];
            try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
            const runs: any[] = Array.isArray(parsed) ? parsed : [];
            const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
            const envelope = (data as any)?.dpe?.logement?.enveloppe || {};
            for (const v of variantDefs) {
              const entry = runs.find((r) => r && r.elements_variant === v.id);
              const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
              const collectionObj = envelope?.[v.collection];
              let items: any[] = [];
              if (Array.isArray(collectionObj?.[v.itemKey])) {
                items = collectionObj[v.itemKey] as any[];
              } else if (Array.isArray(collectionObj)) {
                // Shape B: array of slots { <itemKey>: {...} }
                items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
              }
              optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
                key: String(item?.donnee_entree?.reference || idx),
                description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
                selected: scopes.includes(idx),
                payload: item,
              }));
            }
            setAvailableOptions(optionsMap);

            // Seed defaults from template: parameters.unit and parameters.input_forced per elements_variant
            try {
              const runsTpl: any[] = Array.isArray(template?.runs) ? template.runs : [];
              setTemplateRuns(runsTpl);
              for (const v of variantDefs) {
                const tplEntry = runsTpl.find((r) => r && r.elements_variant === v.id) || {};
                const params = tplEntry.parameters || {};
                const unit = typeof params.unit === "string" ? params.unit : undefined;
                if (unit) {
                  setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
                }
                const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
                if (forced) {
                  try {
                    const pretty = JSON.stringify(forced, null, 2) + "\n";
                    setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
                  } catch {}
                }
              }
            } catch {}
          } catch {
            setAvailableOptions({});
          }
        }
      } catch (err) {
        if (!isCancelled) {
          // eslint-disable-next-line no-console
          console.error("DpeDrawerEditor: failed to load from API", err);
          message.error("Failed to load initial data");
        }
      }
    };
    tryLoad();
    return () => { isCancelled = true; };
  }, [open, apiLoadParams?.baseUrl, apiLoadParams?.ref_ademe, getAccessToken]);

  // Reset load guard when closing so reopening can re-fetch
  useEffect(() => {
    if (!open) {
      lastLoadedKeyRef.current = null;
    }
  }, [open]);

  // Rebuild available options whenever variants resolve and we have envelope data, also sync selected from JSON
  useEffect(() => {
    try {
      if (!envelopeData) return;
      const optionsMap: Record<VariantId, { key: string; description: string; selected: boolean; payload: any }[]> = {};
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
        const collectionObj = envelopeData?.[v.collection];
        let items: any[] = [];
        if (Array.isArray(collectionObj?.[v.itemKey])) {
          items = collectionObj[v.itemKey] as any[];
        } else if (Array.isArray(collectionObj)) {
          items = (collectionObj as any[]).map((slot) => (slot && typeof slot === "object" ? slot[v.itemKey] : undefined)).filter(Boolean);
        }
        optionsMap[v.id] = (items || []).map((item: any, idx: number) => ({
          key: String(item?.donnee_entree?.reference || idx),
          description: String(item?.donnee_entree?.description || `${toLabel(v.itemKey)} ${idx + 1}`),
          selected: scopes.includes(idx),
          payload: item,
        }));
      }
      setAvailableOptions(optionsMap);
    } catch {}
  }, [envelopeData, variantDefs]);

  // Keep checkbox selections in sync with current JSON (runs array) in the editor
  useEffect(() => {
    try {
      const parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      setAvailableOptions((prev) => {
        const next: typeof prev = { ...prev };
        for (const v of variantDefs) {
          const entry = runs.find((r) => r && r.elements_variant === v.id);
          const scopes: number[] = Array.isArray(entry?.elements_scope) ? (entry.elements_scope as number[]) : [];
          next[v.id] = (prev[v.id] || []).map((o, idx) => ({ ...o, selected: scopes.includes(idx) }));
        }
        return next;
      });
    } catch {
      // ignore
    }
  }, [rootJsonText, variantDefs]);

  // Capture original JSON when opening, used to rollback on close (X)
  useEffect(() => {
    if (open) {
      originalJsonRef.current = rootJsonText;
    }
  }, [open]);

  // (no-op)

  // Sync scope strategy from JSON (default to "all")
  useEffect(() => {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const next: Record<VariantId, "all" | "explode"> = {};
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        next[v.id] = entry?.scope_strategy === "explode" ? "explode" : "all";
      }
      setScopeStrategy(next);
    } catch {
      // ignore
    }
  }, [open, rootJsonText, variantDefs]);

  function deriveVariantPricingFromRuns(runsArr: any[], variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getFirstScenarioInputKeyFromRuns(runsArr, variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getFirstScenarioCostKeyFromRuns(runsArr, variantId) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Derive template-based values for disabled scenarios
  useEffect(() => {
    try {
      for (const v of variantDefs) {
        const derived = deriveVariantPricingFromRuns(templateRuns, v.id);
        setTemplateDerived((prev) => ({ ...prev, [v.id]: derived }));
        const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === v.id) || {};
        const ids = Array.isArray(entry?.scenarios) ? entry.scenarios.map((sc: any) => Number(sc?.id)).filter((n: any) => Number.isFinite(n)) : [];
        setTemplateScenarioIds((prev) => ({ ...prev, [v.id]: ids }));
      }
    } catch {}
  }, [templateRuns, mappingKeys, variantDefs]);

  function getPresentScenarioIds(variantId: VariantId): number[] {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      return scenarios.map((sc) => Number(sc?.id)).filter((n) => Number.isFinite(n));
    } catch {
      return [];
    }
  }

  const initialState = useMemo((): Record<VariantId, EditorVariantState> => {
    try {
      const rootRaw = rootJsonText.trim() ? JSON.parse(rootJsonText) : [];
      const runsArr: any[] = Array.isArray(rootRaw) ? rootRaw : [];
      const next: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) {
        const hasEntry = runsArr.some((r) => r && r.elements_variant === v.id);
        next[v.id] = { enabled: Boolean(hasEntry), index: 0, text: "{\n}\n" };
      }
      return next;
    } catch {
      const fallback: Record<VariantId, EditorVariantState> = {};
      for (const v of variantDefs) fallback[v.id] = { enabled: false, index: 0, text: "{\n}\n" };
      return fallback;
    }
  }, [rootJsonText, variantDefs]);

  const [editorState, setEditorState] = useState<Record<VariantId, EditorVariantState>>(initialState);
  useEffect(() => {
    if (open) {
      setEditorState(initialState);
    }
  }, [open, initialState]);

  // (no-op)

  function applyEditorChanges() {
    try {
      let parsedAny: any = rootJsonText.trim() ? JSON.parse(rootJsonText) : {};
      // If the root is a runs[] array, apply scenario changes there; otherwise apply editor JSON to nested object
      if (Array.isArray(parsedAny)) {
        const runs: any[] = parsedAny as any[];
        for (const v of variantDefs) {
          const variantPath = v.id;
          let entry = runs.find((r) => r && r.elements_variant === variantPath);
          const hasAnyScenario = (scenarioEnabled[v.id] || []).some(Boolean);
          if (!entry && hasAnyScenario) {
            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: scopeStrategy[v.id] || "all", scenarios: [] };
            runs.push(entry);
          }
          if (!entry) continue;
          // Keep scope strategy as staged
          entry.scope_strategy = scopeStrategy[v.id] || entry.scope_strategy || "all";
          // Remove any UI-only pricing blocks
          if (entry.pricing) { try { delete entry.pricing; } catch {} }
          if (!Array.isArray(entry.scenarios)) entry.scenarios = [];

          const rowCount = Math.max(
            pricing[v.id]?.increments.length || 0,
            pricing[v.id]?.priceVar.length || 0,
            pricing[v.id]?.priceFix.length || 0,
            (scenarioEnabled[v.id] || []).length,
            (templateScenarioIds[v.id] || []).length
          );
          const configuredInputKey = mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "donnee_entree.epaisseur_isolation";
          const configuredCostKey = mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "donnee_entree.surface_paroi_opaque";

          for (let idx = 0; idx < rowCount; idx += 1) {
            const enabled = Boolean(scenarioEnabled[v.id]?.[idx]);
            if (enabled) {
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex === -1) targetIndex = idx;
              while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
              const current = entry.scenarios[targetIndex];
              const nextSc = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
              if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
              if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
              const templateInc = Number(templateDerived[v.id]?.increments?.[idx] ?? NaN);
              const pLocal = pricing[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              const incFromState = Number(pLocal.increments[targetIndex] ?? NaN);
              const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(templateInc) ? templateInc : 0);
              nextSc.input[configuredInputKey] = { set: incVal };
              const forcedText = forcedInputs[v.id] || "";
              try {
                const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
                if (forcedObj && typeof forcedObj === "object") {
                  Object.entries(forcedObj).forEach(([fk, fv]) => {
                    if (fk === configuredInputKey) return;
                    if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
                  });
                }
              } catch {}
              const templatePriceVar = Number(templateDerived[v.id]?.priceVar?.[idx] ?? NaN);
              const priceVarFromState = Number(pLocal.priceVar[targetIndex] ?? NaN);
              const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(templatePriceVar) ? templatePriceVar : 0);
              nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
              entry.scenarios[targetIndex] = nextSc;
            } else {
              // Disabled: remove the scenario object entirely
              const tplIds = templateScenarioIds[v.id] || [];
              const idFromTemplate = (tplIds[idx] != null) ? Number(tplIds[idx]) : (idx + 1);
              const targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
              if (targetIndex !== -1) {
                entry.scenarios.splice(targetIndex, 1);
              }
            }
          }
        }
        onApply(JSON.stringify(runs, null, 2));
        message.success("Editor changes applied");
        return;
      }

      // Fallback: nested object editing mode stays unchanged
      const root = parsedAny && typeof parsedAny === "object" ? parsedAny : {};
      // Nested-object editing path is deprecated in favor of runs[] flow. Kept for backwards compatibility.
      for (const v of variantDefs) {
        const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
        const idx = Math.max(0, Math.floor(st.index || 0));
        const baseObj = ensurePath(root, ["dpe", "logement", "enveloppe"]);
        if (!Array.isArray((baseObj as any)[v.collection])) {
          (baseObj as any)[v.collection] = [] as any[];
        }
        const arr: any[] = (baseObj as any)[v.collection];
        if (st.enabled) {
          let parsed: any = {};
          try { parsed = st.text.trim() ? JSON.parse(st.text) : {}; } catch {
            throw new Error(`${v.label}: invalid JSON`);
          }
          while (arr.length <= idx) arr.push(null);
          const nextItem = { [v.itemKey]: parsed } as Record<string, any>;
          arr[idx] = nextItem;
        } else {
          if (Array.isArray(arr) && arr.length > idx) {
            arr.splice(idx, 1);
          }
        }
      }
      onApply(JSON.stringify(root, null, 2));
      message.success("Editor changes applied");
    } catch (err: any) {
      message.error(String(err?.message || err || "Failed to apply changes"));
    }
  }

  function handleDrawerClose() {
    // Close silently if nothing would change; otherwise, confirm discard.
    try {
      const originalText = (originalJsonRef.current || "").trim();
      const currentText = (rootJsonText || "").trim();
      let isSame = false;
      try {
        const originalParsed = originalText ? JSON.parse(originalText) : null;
        const currentParsed = currentText ? JSON.parse(currentText) : null;
        isSame = JSON.stringify(originalParsed) === JSON.stringify(currentParsed);
      } catch {
        isSame = originalText === currentText;
      }
      if (isSame) {
        onClose();
        return;
      }
    } catch {}
    Modal.confirm({
      title: "Discard changes?",
      content: "Closing will revert any changes made in this panel.",
      okText: "Discard",
      cancelText: "Cancel",
      onOk: () => {
        try {
          onApply(originalJsonRef.current);
        } finally {
          onClose();
        }
      },
    });
  }

  function getFirstScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const inputObj = firstScenario?.input || firstScenario?.inputs || undefined;
      if (inputObj && typeof inputObj === "object") {
        const keys = Object.keys(inputObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getTemplateScenarioInputKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const firstScenario = Array.isArray(entry?.scenarios) && entry.scenarios.length > 0 ? entry.scenarios[0] : undefined;
      const costObj = firstScenario?.cost || undefined;
      if (costObj && typeof costObj === "object") {
        const keys = Object.keys(costObj);
        return keys.length > 0 ? keys[0] : undefined;
      }
    } catch {
      // ignore
    }
    return undefined;
  }

  function getTemplateScenarioCostKey(variantId: VariantId): string | undefined {
    try {
      const entry = (Array.isArray(templateRuns) ? templateRuns : []).find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  // Helpers to derive keys directly from a provided runs[] array (e.g., template)
  function getFirstScenarioInputKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const inputObj = sc?.input || sc?.inputs || undefined;
        if (inputObj && typeof inputObj === "object") {
          const keys = Object.keys(inputObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function getFirstScenarioCostKeyFromRuns(runsArr: any[], variantId: VariantId): string | undefined {
    try {
      const entry = runsArr.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      for (const sc of scenarios) {
        const costObj = sc?.cost || undefined;
        if (costObj && typeof costObj === "object") {
          const keys = Object.keys(costObj);
          if (keys.length > 0) return keys[0];
        }
      }
    } catch {}
    return undefined;
  }

  function deriveVariantPricing(variantId: VariantId): { increments: number[]; priceVar: number[] } {
    const empty = { increments: [] as number[], priceVar: [] as number[] };
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      const entry = runs.find((r) => r && r.elements_variant === variantId);
      const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
      if (!scenarios.length) return empty;
      const inputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
      const costKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
      const increments: number[] = scenarios.map((sc) => {
        const val = sc?.input?.[inputKey]?.set;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      const priceVar: number[] = scenarios.map((sc) => {
        const val = sc?.cost?.[costKey]?.multiply;
        const num = typeof val === "number" ? val : Number(val);
        return Number.isFinite(num) ? num : 0;
      });
      return { increments, priceVar };
    } catch {
      return empty;
    }
  }

  // Sync pricing grid from JSON scenarios when opening or when JSON/mapping keys change
  useEffect(() => {
    if (!open) return;
    try {
      // Also sync parameters.unit and parameters.input_forced
      try {
        let parsedAll: any = [];
        try { parsedAll = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsedAll = []; }
        const runsAll: any[] = Array.isArray(parsedAll) ? parsedAll : [];
        for (const v of variantDefs) {
          const entry = runsAll.find((r) => r && r.elements_variant === v.id) || {};
          const params = entry.parameters || {};
          const unit = typeof params.unit === "string" ? params.unit : undefined;
          if (unit) {
            setPricing((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" }), incrementUnit: unit, priceUnit: prev[v.id]?.priceUnit || "EUR/m2", increments: prev[v.id]?.increments || [], priceVar: prev[v.id]?.priceVar || [], priceFix: prev[v.id]?.priceFix || [] } }));
          }
          const forced = params.input_forced && typeof params.input_forced === "object" ? params.input_forced : undefined;
          if (forced) {
            try {
              const pretty = JSON.stringify(forced, null, 2) + "\n";
              setForcedInputs((prev) => ({ ...prev, [v.id]: pretty }));
            } catch {}
          }
        }
      } catch {}

      for (const v of variantDefs) {
        const derived = deriveVariantPricing(v.id);
        setPricing((prev) => {
          const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextLen = derived.increments.length || current.increments.length || 0;
          const ensureLen = (arr: number[], len: number) => {
            const out = arr.slice(0, len);
            while (out.length < len) out.push(0);
            return out;
          };
          const nextIncrements = derived.increments.length ? derived.increments : current.increments;
          const nextPriceVar = derived.priceVar.length ? derived.priceVar : current.priceVar;
          const nextPriceFix = ensureLen(current.priceFix, Math.max(nextLen, nextPriceVar.length));
          return {
            ...prev,
            [v.id]: { ...current, increments: nextIncrements, priceVar: nextPriceVar, priceFix: nextPriceFix },
          };
        });
      }
    } catch {}
  }, [open, rootJsonText, mappingKeys, variantDefs]);

  // Sync scenario enabled flags from JSON
  useEffect(() => {
    if (!open) return;
    try {
      let parsed: any = [];
      try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
      const runs: any[] = Array.isArray(parsed) ? parsed : [];
      for (const v of variantDefs) {
        const entry = runs.find((r) => r && r.elements_variant === v.id);
        const scenarios: any[] = Array.isArray(entry?.scenarios) ? entry.scenarios : [];
        const flags = scenarios.map((sc) => Boolean(sc && typeof sc === "object"));
        setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
      }
    } catch {}
  }, [open, rootJsonText, variantDefs]);

  // Initialize scenarioEnabled by comparing template scenario ids with JSON presence (by id)
  useEffect(() => {
    if (!open) return;
    try {
      for (const v of variantDefs) {
        const presentIds = new Set<number>(getPresentScenarioIds(v.id));
        const ids = templateScenarioIds[v.id] || [];
        const flags = ids.map((id) => presentIds.has(Number(id)));
        if (ids.length) {
          setScenarioEnabled((prev) => ({ ...prev, [v.id]: flags }));
        }
      }
    } catch {}
  }, [open, rootJsonText, templateScenarioIds, variantDefs]);

  function toggleScenarioPresence(variantId: VariantId, idx: number, enabled: boolean) {
    try {
      if (enabled) {
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        let entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (!entry) {
          entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: (scopeStrategy[variantId] || "all"), scenarios: [] };
          runs.push(entry);
        }
        if (!Array.isArray(entry.scenarios)) entry.scenarios = [];
        const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
          ? Number(templateScenarioIds[variantId][idx])
          : (idx + 1);
        let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
        if (targetIndex === -1) targetIndex = entry.scenarios.findIndex((sc: any) => sc == null);
        if (targetIndex === -1) targetIndex = entry.scenarios.length;
        while (entry.scenarios.length <= targetIndex) entry.scenarios.push(null);
        const current = entry.scenarios[targetIndex];
        const configuredInputKey = mappingKeys[variantId]?.inputKey || getTemplateScenarioInputKey(variantId) || getFirstScenarioInputKey(variantId) || "donnee_entree.epaisseur_isolation";
        const configuredCostKey = mappingKeys[variantId]?.costKey || getTemplateScenarioCostKey(variantId) || getFirstScenarioCostKey(variantId) || "donnee_entree.surface_paroi_opaque";
        const nextSc: any = current && typeof current === "object" ? current : { id: idFromTemplate, input: {}, cost: {} };
        if (!nextSc.input || typeof nextSc.input !== "object") nextSc.input = {};
        if (!nextSc.cost || typeof nextSc.cost !== "object") nextSc.cost = {};
        const tmplInc = Number(templateDerived[variantId]?.increments?.[idx] ?? NaN);
        const incFromState = Number(pricing[variantId]?.increments?.[targetIndex] ?? NaN);
        const incVal = Number.isFinite(incFromState) ? incFromState : (Number.isFinite(tmplInc) ? tmplInc : 0);
        nextSc.input[configuredInputKey] = { set: incVal };
        try {
          const forcedText = forcedInputs[variantId] || "";
          const forcedObj = forcedText.trim() ? JSON.parse(forcedText) : {};
          if (forcedObj && typeof forcedObj === "object") {
            Object.entries(forcedObj).forEach(([fk, fv]) => {
              if (fk === configuredInputKey) return;
              if (nextSc.input[fk] == null) nextSc.input[fk] = fv;
            });
          }
        } catch {}
        const tmplPriceVar = Number(templateDerived[variantId]?.priceVar?.[idx] ?? NaN);
        const priceVarFromState = Number(pricing[variantId]?.priceVar?.[targetIndex] ?? NaN);
        const priceVarVal = Number.isFinite(priceVarFromState) ? priceVarFromState : (Number.isFinite(tmplPriceVar) ? tmplPriceVar : 0);
        nextSc.cost[configuredCostKey] = { multiply: priceVarVal };
        nextSc.id = idFromTemplate;
        entry.scenarios[targetIndex] = nextSc;
        onApply(JSON.stringify(runs, null, 2));
        // Update local pricing state so UI reflects chosen values immediately
        setPricing((prev) => {
          const current = prev[variantId] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
          const nextIncs = current.increments.slice();
          const nextPriceVar = current.priceVar.slice();
          while (nextIncs.length <= targetIndex) nextIncs.push(0);
          while (nextPriceVar.length <= targetIndex) nextPriceVar.push(0);
          nextIncs[targetIndex] = incVal;
          nextPriceVar[targetIndex] = priceVarVal;
          return { ...prev, [variantId]: { ...current, increments: nextIncs, priceVar: nextPriceVar } };
        });
      } else {
        // Immediately remove scenario from JSON by id
        let parsed: any = [];
        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
        const runs: any[] = Array.isArray(parsed) ? parsed : [];
        const v = variantDefs.find((d) => d.id === variantId);
        if (!v) return;
        const variantPath = v.id;
        const entry = runs.find((r) => r && r.elements_variant === variantPath);
        if (entry && Array.isArray(entry.scenarios)) {
          const idFromTemplate = (templateScenarioIds[variantId] && templateScenarioIds[variantId][idx] != null)
            ? Number(templateScenarioIds[variantId][idx])
            : (idx + 1);
          let targetIndex = entry.scenarios.findIndex((sc: any) => sc && typeof sc === "object" && Number(sc.id) === Number(idFromTemplate));
          if (targetIndex === -1 && idx < entry.scenarios.length) targetIndex = idx;
          if (targetIndex !== -1) {
            entry.scenarios.splice(targetIndex, 1);
            onApply(JSON.stringify(runs, null, 2));
          }
        }
      }
    } catch {}
    setScenarioEnabled((prev) => {
      const current = prev[variantId] ? prev[variantId].slice() : [];
      while (current.length <= idx) current.push(false);
      current[idx] = enabled;
      return { ...prev, [variantId]: current };
    });
  }

  // (removed immediate JSON writes; apply on OK)

  const PanelContent = (
    <>
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button onClick={() => setIsTemplateOpen(true)}>Open template editor</Button>
        </div>
        {variantDefs.map((v) => {
          const st = editorState[v.id] || { enabled: false, index: 0, text: "{\n}\n" };
          return (
            <Card key={v.id} size="small" styles={{ body: { padding: 12 } }} style={{ background: st.enabled ? "#ffffff" : "#f5f5f5" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontWeight: 600 }}>{v.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div>enabled</div>
                  <Switch
                    checked={st.enabled}
                    onChange={(checked) => {
                      setEditorState((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || { enabled: false, index: 0, text: "{\n}\n" }), enabled: checked } }));
                      try {
                        let parsed: any = [];
                        try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                        if (Array.isArray(parsed)) {
                          const runs: any[] = parsed;
                          const variantPath = v.id;
                          const idxInRuns = runs.findIndex((r) => r && r.elements_variant === variantPath);
                          if (!checked) {
                            if (idxInRuns !== -1) {
                              runs.splice(idxInRuns, 1);
                              onApply(JSON.stringify(runs, null, 2));
                            }
                            setScenarioEnabled((prev) => ({ ...prev, [v.id]: [] }));
                            setScopeStrategy((prev) => ({ ...prev, [v.id]: "all" }));
                          } else {
                            if (idxInRuns === -1) {
                              const entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] } as any;
                              // Default scope to all available options for this variant when enabling
                              try {
                                const opts = availableOptions[v.id] || [];
                                entry.elements_scope = opts.map((_, i) => i);
                              } catch {}
                              runs.push(entry);
                              onApply(JSON.stringify(runs, null, 2));
                            } else {
                              const entry = runs[idxInRuns];
                              if (!Array.isArray(entry.elements_scope) || entry.elements_scope.length === 0) {
                                try {
                                  const opts = availableOptions[v.id] || [];
                                  entry.elements_scope = opts.map((_: any, i: number) => i);
                                  onApply(JSON.stringify(runs, null, 2));
                                } catch {}
                              }
                            }
                          }
                        }
                      } catch {}
                    }}
                  />
                </div>
              </div>
              <div style={{ height: 8 }} />
              <div style={{ color: "#6b7280", fontSize: 12 }}>
                dpe.logement.enveloppe.{v.collection}.{v.itemKey}
              </div>
              <div style={{ height: 8 }} />
              {/* index selector removed */}
              {st.enabled ? (
                <>
                  {(availableOptions[v.id] && Array.isArray(availableOptions[v.id]) && (availableOptions[v.id] as any[]).length > 0) ? (
                    <div>
                      <div style={{ fontWeight: 500, marginBottom: 6 }}>Scope</div>
                      <div style={{ display: "grid", gap: 6 }}>
                        {(availableOptions[v.id] || []).map((opt, idx) => {
                          const detailsData = { variant: v.id, collection: v.collection, itemKey: v.itemKey, index: idx, key: opt.key, selected: opt.selected, payload: opt.payload };
                          const adjIdRaw = (opt as any)?.payload?.enum_type_adjacence_id ?? (opt as any)?.payload?.donnee_entree?.enum_type_adjacence_id;
                          const adjId = Number(adjIdRaw);
                          const greyText = Number.isFinite(adjId) && adjId !== 1;
                          return (
                            <label
                              key={opt.key}
                              onContextMenu={(e) => {
                                e.preventDefault();
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                padding: "4px 6px",
                                borderRadius: 6,
                                background: highlighted[v.id]?.[opt.key] ? "#fff7ed" : "transparent",
                                transition: "background-color 600ms ease",
                              }}
                            >
                              <Checkbox
                                checked={opt.selected}
                                onChange={(e) => {
                            const checked = e.target.checked;
                            // Update JSON immediately (runs array with elements_scope) and highlight
                            try {
                              let parsed: any = [];
                              try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                              const runs: any[] = Array.isArray(parsed) ? parsed : [];
                              const collectionName = v.collection;
                              const itemKey = v.itemKey;
                              const variantPath = v.id;
                              let entry = runs.find((r) => r && r.elements_variant === variantPath);
                              if (!entry) {
                                entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                                runs.push(entry);
                              }
                              const optionIdx = idx; // 0-based index in available options order
                              const scopes: number[] = Array.isArray(entry.elements_scope) ? [...entry.elements_scope] : [];
                              const has = scopes.includes(optionIdx);
                              if (checked && !has) scopes.push(optionIdx);
                              if (!checked && has) {
                                const pos = scopes.indexOf(optionIdx);
                                if (pos !== -1) scopes.splice(pos, 1);
                              }
                              entry.elements_scope = scopes;

                              onApply(JSON.stringify(runs, null, 2));
                              message.success(checked ? "Added option to JSON" : "Removed option from JSON");

                              // Ask parent to highlight the corresponding indices in scope
                              try {
                                const indices = scopes.slice().sort((a, b) => a - b);
                                if (indices.length > 0) onHighlightJsonPath?.({ collection: collectionName, itemKey, indices });
                              } catch {}

                              const refKey = String(opt.key);
                              setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: true } }));
                              window.setTimeout(() => {
                                setHighlighted((prev) => ({ ...prev, [v.id]: { ...(prev[v.id] || {}), [refKey]: false } }));
                              }, 1000);
                              // noop
                            } catch (err) {
                              // eslint-disable-next-line no-console
                              console.error("Failed to update JSON from option toggle", err);
                              message.error("Failed to update JSON");
                            }
                            }}
                              />
                              <span style={{ fontSize: 12, color: greyText ? "#9ca3af" : "#374151" }}>{opt.description}</span>
                              <Button
                                size="small"
                                type="text"
                                aria-label="Show details"
                                icon={<span aria-hidden="true">ℹ️</span>}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDetailsModal({ open: true, title: `${v.label} · ${opt.description}`, data: detailsData });
                                }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  <div style={{ height: 8 }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                    <div style={{ fontWeight: 500 }}>explode</div>
                    <Switch
                      checked={scopeStrategy[v.id] === "explode"}
                      onChange={(checked) => {
                        try {
                          let parsed: any = [];
                          try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                          const runs: any[] = Array.isArray(parsed) ? parsed : [];
                          const collectionName = v.collection;
                          const itemKey = v.itemKey;
                          const variantPath = v.id;
                          let entry = runs.find((r) => r && r.elements_variant === variantPath);
                          if (!entry) {
                            entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                            runs.push(entry);
                          }
                          entry.scope_strategy = checked ? "explode" : "all";
                          onApply(JSON.stringify(runs, null, 2));
                          setScopeStrategy((prev) => ({ ...prev, [v.id]: entry.scope_strategy }));
                        } catch {
                          message.error("Failed to update scope strategy");
                        }
                      }}
                    />
                  </div>
                  <div style={{ height: 8 }} />
                  <div>
                    <div style={{ fontWeight: 500, marginBottom: 6 }}>Scenarios</div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `80px repeat(2, minmax(72px, 1fr))`,
                        gap: 4,
                        alignItems: "center",
                      }}
                    >
                  {/* Header row: columns as Increment | Price var | Price fix */}
                  <div />
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Increment</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "increments", tempUnit: pricing[v.id]?.incrementUnit || "cm", tempKey: mappingKeys[v.id]?.inputKey || getTemplateScenarioInputKey(v.id) || getFirstScenarioInputKey(v.id) || "", tempForcedInputs: forcedInputs[v.id] || "{\n}\n" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.incrementUnit || "cm"}</div>
                  </div>
                  <div style={{ color: "#4b5563", fontSize: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>Price var</span>
                      <Button size="small" type="text" icon={<span aria-hidden="true">⚙️</span>} onClick={() => setColSettings({ open: true, variant: v.id, field: "priceVar", tempUnit: pricing[v.id]?.priceUnit || "EUR/m2", tempKey: mappingKeys[v.id]?.costKey || getTemplateScenarioCostKey(v.id) || getFirstScenarioCostKey(v.id) || "", tempForcedInputs: "" })} />
                    </div>
                    <div style={{ color: "#9ca3af" }}>{pricing[v.id]?.priceUnit || "EUR/m2"}</div>
                  </div>

                  {(() => {
                    const presentIds = getPresentScenarioIds(v.id);
                    const presentIdsSet = new Set<number>(presentIds);
                    const rowIds: number[] = (templateScenarioIds[v.id] || []).slice();
                    return rowIds.map((scenarioId, idx) => {
                      const isPresentInJson = presentIdsSet.has(Number(scenarioId));
                      const isEnabled = Boolean(scenarioEnabled[v.id]?.[idx]);
                      const presentIndex = presentIds.indexOf(Number(scenarioId));
                      const tmplIdx = idx; // template index aligns with templateDerived
                      const tmplInc = templateDerived[v.id]?.increments?.[tmplIdx];
                      const tmplPriceVar = templateDerived[v.id]?.priceVar?.[tmplIdx];
                      const incVal = presentIndex !== -1
                        ? (pricing[v.id]?.increments?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplInc) ? Number(tmplInc) : 0);
                      const priceVarVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceVar?.[presentIndex] ?? 0)
                        : (Number.isFinite(tmplPriceVar) ? Number(tmplPriceVar) : 0);
                      const priceFixVal = presentIndex !== -1
                        ? (pricing[v.id]?.priceFix?.[presentIndex] ?? 0)
                        : 0;
                      return (
                        <React.Fragment key={`row-${idx}`}>
                          <label style={{ display: "flex", alignItems: "center", gap: 6, color: isPresentInJson ? "#6b7280" : "#9ca3af", fontSize: 12 }}>
                            <Checkbox
                              checked={Boolean(scenarioEnabled[v.id]?.[idx])}
                              onChange={(e) => toggleScenarioPresence(v.id, idx, e.target.checked)}
                            />
                            <span>#{scenarioId}</span>
                          </label>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={incVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextIncs = current.increments.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextIncs.length <= idxToSet) nextIncs.push(0);
                                  nextIncs[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, increments: nextIncs } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: isPresentInJson ? 1 : 0.6 }}>
                            <InputNumber
                              size="small"
                              controls={false}
                              min={0}
                              value={priceVarVal}
                              disabled={!isEnabled}
                              onChange={(next) => {
                                const nextVal = Number(next ?? 0);
                                setPricing((prev) => {
                                  const current = prev[v.id] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
                                  const nextPrices = current.priceVar.slice();
                                  const idxToSet = presentIndex !== -1 ? presentIndex : idx;
                                  while (nextPrices.length <= idxToSet) nextPrices.push(0);
                                  nextPrices[idxToSet] = nextVal;
                                  return { ...prev, [v.id]: { ...current, priceVar: nextPrices } };
                                });
                              }}
                              style={{ width: "100%" }}
                            />
                          </div>
                          {/* Price fix column removed */}
                        </React.Fragment>
                      );
                    });
                  })()}
                    </div>
                  </div>
                </>
              ) : null}
            </Card>
          );
        })}
      </Space>
      <Modal
        title="Column settings"
        open={colSettings.open}
        onCancel={() => setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" })}
        onOk={() => {
          try {
            if (!colSettings.variant || !colSettings.field) return;
            const variant = colSettings.variant;
            const field = colSettings.field;
            if (field === "increments") {
              const text = (colSettings.tempForcedInputs || "").trim();
              if (text) {
                try {
                  const parsed = JSON.parse(text);
                  const pretty = JSON.stringify(parsed, null, 2) + "\n";
                  setForcedInputs((prev) => ({ ...prev, [variant]: pretty }));
                } catch {
                  message.error("Invalid JSON in Forced inputs");
                  return;
                }
              } else {
                setForcedInputs((prev) => ({ ...prev, [variant]: "" }));
              }
            }
            setPricing((prev) => {
              const current = prev[variant] || { increments: [], priceVar: [], priceFix: [], incrementUnit: "cm", priceUnit: "EUR/m2" };
              if (field === "increments") {
                return { ...prev, [variant]: { ...current, incrementUnit: colSettings.tempUnit || current.incrementUnit } };
              }
              return { ...prev, [variant]: { ...current, priceUnit: colSettings.tempUnit || current.priceUnit } };
            });
            setMappingKeys((prev) => {
              const current = prev[variant] || {};
              if (field === "increments") return { ...prev, [variant]: { ...current, inputKey: colSettings.tempKey || current.inputKey } };
              return { ...prev, [variant]: { ...current, costKey: colSettings.tempKey || current.costKey } };
            });

            // Persist parameters into JSON for the variant when editing increments
            if (field === "increments") {
              try {
                let parsed: any = [];
                try { parsed = rootJsonText.trim() ? JSON.parse(rootJsonText) : []; } catch { parsed = []; }
                const runs: any[] = Array.isArray(parsed) ? parsed : [];
                const v = variantDefs.find((d) => d.id === variant);
                if (!v) return;
                const variantPath = v.id;
                let entry = runs.find((r) => r && r.elements_variant === variantPath);
                if (!entry) {
                  entry = { elements_variant: variantPath, elements_scope: [], scope_strategy: "all", scenarios: [] };
                  runs.push(entry);
                }
                if (!entry.parameters || typeof entry.parameters !== "object") entry.parameters = {};
                if (colSettings.tempUnit) entry.parameters.unit = colSettings.tempUnit;
                const text = (colSettings.tempForcedInputs || "").trim();
                if (text) {
                  try {
                    const forcedObj = JSON.parse(text);
                    if (forcedObj && typeof forcedObj === "object") {
                      entry.parameters.input_forced = forcedObj;
                    }
                  } catch {}
                }
                onApply(JSON.stringify(runs, null, 2));
              } catch {}
            }
          } finally {
            setColSettings({ open: false, variant: null, field: null, tempUnit: "", tempKey: "", tempForcedInputs: "" });
          }
        }}
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>
              {colSettings.field === "increments" ? "Scenario input key (index mapping)" : "Scenario cost key (index mapping)"}
            </div>
            <Input
              value={colSettings.tempKey}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempKey: e.target.value }))}
              placeholder={colSettings.variant ? (
                colSettings.field === "increments"
                  ? (getTemplateScenarioInputKey(colSettings.variant) || getFirstScenarioInputKey(colSettings.variant) || "donnee_entree.epaisseur_isolation")
                  : (getTemplateScenarioCostKey(colSettings.variant) || getFirstScenarioCostKey(colSettings.variant) || "donnee_entree.surface_paroi_opaque")
              ) : ""}
            />
          </div>
          <div>
            <div style={{ marginBottom: 6, color: "#4b5563" }}>Unit</div>
            <Input
              value={colSettings.tempUnit}
              onChange={(e) => setColSettings((prev) => ({ ...prev, tempUnit: e.target.value }))}
              placeholder="e.g. cm or EUR/m2"
            />
          </div>
          {colSettings.field === "increments" ? (
            <div>
              <div style={{ marginBottom: 6, color: "#4b5563" }}>Forced inputs (JSON)</div>
              <Input.TextArea
                value={colSettings.tempForcedInputs}
                onChange={(e) => setColSettings((prev) => ({ ...prev, tempForcedInputs: e.target.value }))}
                rows={3}
                placeholder="{\n}\n"
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace" }}
              />
            </div>
          ) : null}
        </Space>
      </Modal>
      <Modal
        title={detailsModal.title || "Details"}
        open={detailsModal.open}
        onCancel={() => setDetailsModal({ open: false, title: "", data: null })}
        footer={[
          <Button key="close" onClick={() => setDetailsModal({ open: false, title: "", data: null })}>Close</Button>,
        ]}
        width={720}
      >
        <div style={{ maxHeight: 480, overflow: "auto" }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12 }}>
{detailsModal.data ? JSON.stringify(detailsModal.data, null, 2) : ""}
          </pre>
        </div>
      </Modal>
    </>
  );

  if (inline) {
    if (!open) return null;
    return (
      <div style={{ width, height: "calc(100vh - 64px)", borderRight: "1px solid #e5e7eb", background: "#fff", padding: 16, overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontWeight: 600 }}>Edit DPE JSON</div>
          <Space>
            <Button onClick={handleDrawerClose}>Close</Button>
            <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
          </Space>
        </div>
        {PanelContent}
        <TemplateEditorModal
          open={isTemplateOpen}
          onCancel={() => setIsTemplateOpen(false)}
          baseUrl={apiLoadParams?.baseUrl}
          refAdeme={apiLoadParams?.ref_ademe}
          getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
        />
      </div>
    );
  }

  return (
    <Drawer
      title="Edit DPE JSON"
      placement="left"
      open={open}
      onClose={handleDrawerClose}
      width={width}
      mask={false}
      extra={
        <Space>
          <Button type="primary" onClick={applyEditorChanges}>Apply</Button>
        </Space>
      }
    >
      {PanelContent}
      <TemplateEditorModal
        open={isTemplateOpen}
        onCancel={() => setIsTemplateOpen(false)}
        baseUrl={apiLoadParams?.baseUrl}
        refAdeme={apiLoadParams?.ref_ademe}
        getAccessToken={async () => (getAccessToken ? await getAccessToken() : null)}
      />
    </Drawer>
  );
};



```

- I fixed the scope not showing by ensuring `availableOptions` are rebuilt from the fetched envelope and synced with the JSON’s `elements_scope`. If a variant is enabled but its `elements_scope` is empty or missing, it now defaults to all available indices.

- Changes in `packages/dpe-editor/src/ui/DpeDrawerEditor.tsx`:
  - Stored the `envelope` from `simulation_dpe_full` and rebuild options whenever variants resolve.
  - Synced each option’s `selected` from the current JSON `elements_scope`.
  - When enabling a variant, if no entry exists, created one with `elements_scope` set to all indices; if an entry exists with empty scope, filled it from options. No linter errors.

Please open the page and toggle an element to “enabled” — the Scope list should populate and be selected.

