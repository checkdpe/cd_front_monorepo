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
  const [currentDoneCount, setCurrentDoneCount] = useState<number>(0);
  const [lastRefreshedDoneCount, setLastRefreshedDoneCount] = useState<number>(0);
  const [resultsRefreshKey, setResultsRefreshKey] = useState<number>(0);
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

  // (removed nbCombinations UI; we rely on dynamically computed totalCombinations)

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
      const urlDoing = new URL("/backoffice/get_redis_detail", base);
      urlDoing.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlDoing.searchParams.set("log", `${simulName}_o3cl_doing_queue`);
      const urlDone = new URL("/backoffice/get_redis_detail", base);
      urlDone.searchParams.set("ref_ademe", String(refAdeme || ""));
      urlDone.searchParams.set("log", `${simulName}_o3cl_done_queue`);

      const [qres, doingRes, dres] = await Promise.all([
        authorizedFetch(urlQueue.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
        authorizedFetch(urlDoing.toString(), { method: "GET", headers: { Accept: "application/json, text/plain, */*", "x-authorization": "dperdition", "Cache-Control": "no-cache", Pragma: "no-cache" } }),
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

      const [queueList, doingListRaw, doneListRaw] = await Promise.all([parseItems(qres), parseItems(doingRes), parseItems(dres)]);
      const doingList = (doingListRaw || []).map((it: any) => ({ ...it, status: 1, __kind: "doing" }));
      const doneList = (doneListRaw || []).map((it: any) => ({ ...it, status: 2, __kind: "done" }));
      const merged = [...doneList, ...doingList, ...queueList];
      setQueueItems(merged);
      setQueueSegments(merged.length || 0);
      setCurrentDoneCount(doneList.length || 0);

      // Stop polling when both running and doing queues become empty
      if ((queueList?.length || 0) === 0 && (doingList?.length || 0) === 0) {
        try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
      }
    } catch {}
  }

  function startQueuePolling(opts?: { skipImmediate?: boolean }) {
    try { if (queuePollIdRef.current != null) { window.clearInterval(queuePollIdRef.current); queuePollIdRef.current = null; } } catch {}
    const raw = (import.meta as any)?.env?.VITE_POLL_QUEUE_DELAY;
    const n = Number(raw);
    const delayMs = Number.isFinite(n) && n > 0 ? n : 5000;
    if (!opts?.skipImmediate) { void fetchQueueOnce(); }
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
          nb_combinations: Number(totalCombinations || 0),
          query,
        },
      };
      setSubmitting(true);
      // Only call direct_scenarios when nb chunks <= 1
      const shouldDirect = Number(numChunks || 1) <= 1;
      if (shouldDirect) {
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
        // eslint-disable-next-line no-console
        console.log("simulation payload", body);
      }
      try { activePollAbortRef.current?.cancel(); } catch {}
      setIsPolling(false);
      // After submit, start polling only the queue/done endpoints. Delay first hit to avoid hitting on first tick.
      startQueuePolling({ skipImmediate: true });
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
            nb_combinations: Number(totalCombinations || 0),
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
                    label: (
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span>Options</span>
                        {typeof totalCombinations === "number" ? (
                          <strong style={{ fontWeight: 600 }}>combinations: {totalCombinations}</strong>
                        ) : null}
                      </div>
                    ),
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
                      const pct = statusNum >= 2 ? 100 : Math.max(0, Math.min(100, (elapsedSec / 60) * 100));
                      const fillColor = statusNum >= 2 ? "#22c55e" : (statusNum >= 1 ? "#93c5fd" : "transparent");
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
                    <Button
                      size="small"
                      onClick={() => {
                        setLastRefreshedDoneCount(currentDoneCount);
                        setResultsRefreshKey((k) => k + 1);
                      }}
                      disabled={currentDoneCount <= lastRefreshedDoneCount}
                    >
                      refresh
                    </Button>
                  </div>
                  <Card style={{ background: "#ffffff", borderColor: "#e5e7eb" }} styles={{ body: { padding: 16 } }}>
                    <SimulationResults
                      key={resultsRefreshKey}
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


