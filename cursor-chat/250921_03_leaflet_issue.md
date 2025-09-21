# Configure endpoint for map data retrieval
_Exported on 21/09/2025 at 21:45:17 CEST from Cursor (1.5.5)_

---

**User**

in different .env (apps/dashboard) i define "VITE_ROOT_PATH"
then packages/mon-dpe, i define


=> we need to call the endpoint $VITE_ROOT_PATH + "/" + $VITE_MAP_SUB_PATH , with params in order to get the map data in mon-dpe openstreetmap/leaflet widget

---

**Cursor**

I'll scan the `mon-dpe` package to find where the map widget lives and where to integrate the fetch call that composes the URL from `VITE_ROOT_PATH` and `VITE_MAP_SUB_PATH`. Then I'll wire up the env usage and implement the fetch with params.

I'll locate the Leaflet widget in `packages/mon-dpe` and see how it's currently getting data, then add a fetch that builds the URL from `VITE_ROOT_PATH` and `VITE_MAP_SUB_PATH`.

I'll mark the initial review task as completed and start implementing reading the env vars and the fetch integration. Then I'll add a new API helper and wire it into the Leaflet widget.

I'll add an API helper in `packages/mon-dpe` to compose the URL from `VITE_ROOT_PATH` and `VITE_MAP_SUB_PATH`, then update `mon-dpe.tsx` to fetch map data using those envs and display it when `searchDpesMap` isn't provided.

```typescript
type Primitive = string | number | boolean | null | undefined;

export function buildMapEndpointUrl(): string {
  const root = (import.meta as any).env?.VITE_ROOT_PATH || (globalThis as any).VITE_ROOT_PATH || (typeof process !== "undefined" ? (process as any).env?.VITE_ROOT_PATH : undefined);
  const sub = (import.meta as any).env?.VITE_MAP_SUB_PATH || (globalThis as any).VITE_MAP_SUB_PATH || (typeof process !== "undefined" ? (process as any).env?.VITE_MAP_SUB_PATH : undefined);

  if (!root) {
    throw new Error("VITE_ROOT_PATH is not defined");
  }
  if (!sub) {
    throw new Error("VITE_MAP_SUB_PATH is not defined");
  }

  const normalizedRoot = String(root).replace(/\/$/, "");
  const normalizedSub = String(sub).replace(/^\//, "");
  return `${normalizedRoot}/${normalizedSub}`;
}

export function toQueryString(params: Record<string, Primitive | Primitive[] | Record<string, Primitive> | undefined>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v === undefined || v === null) return;
        searchParams.append(key, String(v));
      });
      return;
    }

    if (typeof value === "object") {
      Object.entries(value as Record<string, Primitive>).forEach(([nestedKey, nestedValue]) => {
        if (nestedValue === undefined || nestedValue === null) return;
        searchParams.append(`${key}[${nestedKey}]`, String(nestedValue));
      });
      return;
    }

    searchParams.set(key, String(value));
  });

  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchMapData<T = any>(params: Record<string, Primitive | Primitive[] | Record<string, Primitive> | undefined>): Promise<T> {
  const baseUrl = buildMapEndpointUrl();
  const url = `${baseUrl}${toQueryString(params)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Failed to fetch map data (${response.status}): ${text}`);
  }
  return response.json();
}


```

I'm going to add a small integration in `mon-dpe.tsx` to read the env-composed URL via the new helper, fetch the map data using `lat` and `lng` derived from `dataHomeUploaded`, and use that data when `searchDpesMap` is empty. Then I'll run lint checks on the edited files.

```typescriptreact
import _ from "lodash";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Flex, Row, Skeleton, Tabs, TabsProps } from "antd";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
ReactDOMServer from "react-dom/server";
import classNames from "classnames";
import Slider, { Settings } from "react-slick";

import financeUrl from "../assets/finance.svg";
import locationUrl from "../assets/location.svg";
import { fetchMapData } from "./api";

export type MonDpeProps = {
  resultAutocomplete: any[];
  dataDynamicInfo: any;
  isPendingSearchMap: boolean;
  dataHomeUploaded: any;
  isPendingUploaded: boolean;
  svgGraphePrice?: React.ReactNode;
  searchDpesMap: any[];
  resultAutocompleteTitle?: string;
  dataFiabilite?: any;
  isFetchingFiabilite?: boolean;
  selectedLabelId?: string;
  onClickLabel: (item: any, mapRef?: React.MutableRefObject<any>, sliderRef?: React.MutableRefObject<any>) => void;
  MAP_COLOR_DPE: Record<string, string>;
  DistributionChart: React.ForwardRefExoticComponent<any>;
  onOpenDynamicInfo?: (key: string) => void;
};

export const MonDpe: FC<MonDpeProps> = ({
  resultAutocomplete,
  dataDynamicInfo,
  isPendingSearchMap,
  dataHomeUploaded,
  isPendingUploaded,
  svgGraphePrice,
  searchDpesMap,
  resultAutocompleteTitle,
  dataFiabilite,
  isFetchingFiabilite,
  selectedLabelId,
  onClickLabel,
  MAP_COLOR_DPE,
  DistributionChart,
  onOpenDynamicInfo,
}) => {
  const distributionRef = useRef<any>(null);
  const mapRef = useRef<any>();
  const sliderRef = useRef<any>(null);

  const [tabMap, setTabMap] = useState("1");
  const [fetchedMap, setFetchedMap] = useState<any[]>([]);
  const [isFetchingMap, setIsFetchingMap] = useState(false);

  useEffect(() => {
    drawD3();
    window.addEventListener("resize", drawD3);
    return () => {
      window.removeEventListener("resize", drawD3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataFiabilite, isFetchingFiabilite, isPendingUploaded]);

  const drawD3 = () => {
    if (distributionRef.current) {
      distributionRef.current.drawD3 && distributionRef.current.drawD3();
    }
  };

  useEffect(() => {
    const lat = _.get(dataHomeUploaded, "geo_data.lat");
    const lng = _.get(dataHomeUploaded, "geo_data.lng");
    const hasProvidedData = !_.isEmpty(searchDpesMap);

    if (!lat || !lng || hasProvidedData) {
      return;
    }

    let isCancelled = false;
    const load = async () => {
      try {
        setIsFetchingMap(true);
        const data = await fetchMapData<any[]>({ lat, lng });
        if (!isCancelled) {
          setFetchedMap(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!isCancelled) {
          setFetchedMap([]);
          // eslint-disable-next-line no-console
          console.error("Failed to load map data", err);
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingMap(false);
        }
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [dataHomeUploaded, searchDpesMap]);

  const renderGPSItem = () => {
    if (isPendingSearchMap) {
      return [...new Array(3)].map((item, index) => (
        <Skeleton.Node active key={index} />
      ));
    }

    if (!_.isEmpty(resultAutocomplete)) {
      return resultAutocomplete.map((item: any, index: number) => (
        <div className="autocomplete-item" key={index}>
          <div className="autocomplete-item__title">
            <p
              style={{
                background: MAP_COLOR_DPE[_.get(item, "label.1")],
              }}
              className="min-w-[32px] rounded-full text-center"
            >
              {_.get(item, "label.1")}
            </p>
            <p className="truncate">{_.get(item, "ademe_id.1")}</p>
          </div>
          <div className="autocomplete-item__content">
            <ul
              style={{ listStyleType: "disc" }}
              className="flex flex-col gap-2 pl-8"
            >
              {_.get(item, "date_dpe.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "date_dpe.0")}: {_.get(item, "date_dpe.1")}
                  </p>
                </li>
              )}

              {_.get(item, "address.1") && (
                <li>
                  <p className="truncate">{_.get(item, "address.1")}</p>
                </li>
              )}

              {_.get(item, "floor.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "floor.0")}: {_.get(item, "floor.1")}
                  </p>
                </li>
              )}

              {_.get(item, "housing_surface.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "housing_surface.0")}: {_.get(item, "housing_surface.1")}
                  </p>
                </li>
              )}

              {_.get(item, "housing_add_compl.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "housing_add_compl.1")}
                  </p>
                </li>
              )}
            </ul>
          </div>
        </div>
      ));
    }
    return null;
  };

  const settings: Settings = {
    dots: false,
    infinite: false,
    speed: 400,
    slidesToShow:
      resultAutocomplete.length <= 3 ? resultAutocomplete.length : 3.3,
    slidesToScroll:
      resultAutocomplete.length <= 3 ? resultAutocomplete.length : 3,
    arrows: resultAutocomplete.length <= 3 ? false : true,
    nextArrow: <span>{"\u2192"}</span>,
    prevArrow: <span>{"\u2190"}</span>,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow:
            resultAutocomplete.length <= 2 ? resultAutocomplete.length : 2,
          slidesToScroll:
            resultAutocomplete.length <= 2 ? resultAutocomplete.length : 2,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  const renderMap = () => {
    const resolvedSearchDpesMap = !_.isEmpty(searchDpesMap)
      ? searchDpesMap
      : fetchedMap;
    return (
      <div className="map-wrapper" data-loading={isFetchingMap || undefined}>
        <MapContainer
          center={[
            _.get(dataHomeUploaded, "geo_data.lat"),
            _.get(dataHomeUploaded, "geo_data.lng"),
          ]}
          zoom={18}
          scrollWheelZoom={false}
          ref={mapRef}
        >
          <LeafLeftMapContent
            searchDpesMap={resolvedSearchDpesMap}
            selectedLabelId={selectedLabelId}
            dataHomeUploaded={dataHomeUploaded}
            onClickLabel={(item: any) => onClickLabel(item, mapRef, sliderRef)}
          />
        </MapContainer>
      </div>
    );
  };

  const tabMapItems: TabsProps["items"] = [
    { key: "1", label: "Plan", children: renderMap() },
  ];

  return (
    <Card className="mb-3">
      <h3
        id="mon-dpe"
        className="flex items-center gap-x-2.5 font-bold text-[28px] lg:text-[40px] leading-[48px] mb-3"
      >
        <img src={financeUrl} className="w-7 h-7 flex-shrink-0" alt="Finance" />
        Mon DPE par rapport aux autres
      </h3>

      <Row gutter={[24, 24]} style={{ marginLeft: 0, marginRight: 0 }}>
        <Col span={24} lg={9} style={{ paddingLeft: 0 }}>
          <DistributionChart
            ref={distributionRef}
            dataHomeUploaded={dataHomeUploaded}
            isPendingUploaded={isPendingUploaded}
          />
        </Col>

        <Col span={24} lg={15} style={{ paddingRight: 0 }}>
          <div className="energy-home__maps">
            <div className="flex justify-between">
              <Flex align="center" className="mt-2 mb-4">
                <img src={locationUrl} alt="Location" />
                <span className="text-regular-bold sm:text-medium-bold ml-1">
                  {_.get(dataHomeUploaded, "project_details.address.1", "")}
                </span>
              </Flex>

              {!_.isEmpty(_.get(dataDynamicInfo, "osm_map")) && (
                <Button
                  type="link"
                  className="flex items-center justify-center p-0 w-9 h-9"
                  onClick={() => onOpenDynamicInfo && onOpenDynamicInfo("osm_map")}
                >
                  i
                </Button>
              )}
            </div>

            <div className="energy-home__map-info">
              <Tabs
                centered
                activeKey={tabMap}
                items={tabMapItems}
                onChange={setTabMap}
              />
            </div>

            {!_.isEmpty(resultAutocomplete) && resultAutocompleteTitle && (
              <div className="mt-4">
                <p className="font-bold text-[16px]">
                  {resultAutocompleteTitle}
                </p>
                <div className="py-4 px-5">
                  <Slider
                    {...settings}
                    ref={(slider: any) => {
                      sliderRef.current = slider;
                    }}
                  >
                    {renderGPSItem()}
                  </Slider>
                </div>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Card>
  );
};

function LeafLeftMapContent({
  searchDpesMap,
  selectedLabelId,
  dataHomeUploaded,
  onClickLabel,
}: any) {
  const leafleftMap = useMap();

  useEffect(() => {
    if (!_.isEmpty(dataHomeUploaded)) {
      leafleftMap.setView([
        _.get(dataHomeUploaded, "geo_data.lat"),
        _.get(dataHomeUploaded, "geo_data.lng"),
      ]);
    }
  }, [dataHomeUploaded, leafleftMap]);

  return (
    <>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/attributions">CartoDB</a>'
      />

      {!_.isEmpty(searchDpesMap) &&
        searchDpesMap.map((item: any, index: number) => {
          const customIcon = L.divIcon({
            className: "custom-div-icon",
            html: ReactDOMServer.renderToString(
              <div
                data-id={item.ademe_id}
                className={classNames(
                  "label-container min-w-[32px] min-h-[25px] rounded-3xl flex items-center justify-center",
                  {
                    "label-container--selected":
                      item.ademe_id === selectedLabelId,
                  }
                )}
                style={{
                  background: item.label && MAP_FALLBACK[item.label] ? MAP_FALLBACK[item.label] : undefined,
                }}
              >
                <span className="label-text font-medium">
                  {item.label}
                  {item.label_range?.length > 1 ? "+" : ""}
                </span>
              </div>
            ),
            iconSize: [30, 30],
          });

          return (
            <Marker
              position={item}
              key={index}
              icon={customIcon}
              zIndexOffset={item.label_z}
              eventHandlers={{
                click: () => onClickLabel(item),
              }}
            />
          );
        })}

      <Marker
        position={[
          _.get(dataHomeUploaded, "geo_data.lat"),
          _.get(dataHomeUploaded, "geo_data.lng"),
        ]}
        zIndexOffset={99999}
      >
        <Popup>
          A pretty CSS3 popup. <br /> Easily customizable.
        </Popup>
      </Marker>
    </>
  );
}

const MAP_FALLBACK: Record<string, string> = {
  A: "#0c7c2a",
  B: "#48a334",
  C: "#a4c53a",
  D: "#f1d231",
  E: "#f1a133",
  F: "#e56726",
  G: "#d52122",
};

export default MonDpe;



```

I'll fix the broken import for `ReactDOMServer`, then re-run lint checks to ensure there are no errors.

```typescriptreact
import _ from "lodash";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Flex, Row, Skeleton, Tabs, TabsProps } from "antd";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
ReactDOMServer from "react-dom/server";
import classNames from "classnames";
import Slider, { Settings } from "react-slick";

import financeUrl from "../assets/finance.svg";
import locationUrl from "../assets/location.svg";
import { fetchMapData } from "./api";

export type MonDpeProps = {
  resultAutocomplete: any[];
  dataDynamicInfo: any;
  isPendingSearchMap: boolean;
  dataHomeUploaded: any;
  isPendingUploaded: boolean;
  svgGraphePrice?: React.ReactNode;
  searchDpesMap: any[];
  resultAutocompleteTitle?: string;
  dataFiabilite?: any;
  isFetchingFiabilite?: boolean;
  selectedLabelId?: string;
  onClickLabel: (item: any, mapRef?: React.MutableRefObject<any>, sliderRef?: React.MutableRefObject<any>) => void;
  MAP_COLOR_DPE: Record<string, string>;
  DistributionChart: React.ForwardRefExoticComponent<any>;
  onOpenDynamicInfo?: (key: string) => void;
};

export const MonDpe: FC<MonDpeProps> = ({
  resultAutocomplete,
  dataDynamicInfo,
  isPendingSearchMap,
  dataHomeUploaded,
  isPendingUploaded,
  svgGraphePrice,
  searchDpesMap,
  resultAutocompleteTitle,
  dataFiabilite,
  isFetchingFiabilite,
  selectedLabelId,
  onClickLabel,
  MAP_COLOR_DPE,
  DistributionChart,
  onOpenDynamicInfo,
}) => {
  const distributionRef = useRef<any>(null);
  const mapRef = useRef<any>();
  const sliderRef = useRef<any>(null);

  const [tabMap, setTabMap] = useState("1");
  const [fetchedMap, setFetchedMap] = useState<any[]>([]);
  const [isFetchingMap, setIsFetchingMap] = useState(false);

  useEffect(() => {
    drawD3();
    window.addEventListener("resize", drawD3);
    return () => {
      window.removeEventListener("resize", drawD3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataFiabilite, isFetchingFiabilite, isPendingUploaded]);

  const drawD3 = () => {
    if (distributionRef.current) {
      distributionRef.current.drawD3 && distributionRef.current.drawD3();
    }
  };

  useEffect(() => {
    const lat = _.get(dataHomeUploaded, "geo_data.lat");
    const lng = _.get(dataHomeUploaded, "geo_data.lng");
    const hasProvidedData = !_.isEmpty(searchDpesMap);

    if (!lat || !lng || hasProvidedData) {
      return;
    }

    let isCancelled = false;
    const load = async () => {
      try {
        setIsFetchingMap(true);
        const data = await fetchMapData<any[]>({ lat, lng });
        if (!isCancelled) {
          setFetchedMap(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!isCancelled) {
          setFetchedMap([]);
          // eslint-disable-next-line no-console
          console.error("Failed to load map data", err);
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingMap(false);
        }
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [dataHomeUploaded, searchDpesMap]);

  const renderGPSItem = () => {
    if (isPendingSearchMap) {
      return [...new Array(3)].map((item, index) => (
        <Skeleton.Node active key={index} />
      ));
    }

    if (!_.isEmpty(resultAutocomplete)) {
      return resultAutocomplete.map((item: any, index: number) => (
        <div className="autocomplete-item" key={index}>
          <div className="autocomplete-item__title">
            <p
              style={{
                background: MAP_COLOR_DPE[_.get(item, "label.1")],
              }}
              className="min-w-[32px] rounded-full text-center"
            >
              {_.get(item, "label.1")}
            </p>
            <p className="truncate">{_.get(item, "ademe_id.1")}</p>
          </div>
          <div className="autocomplete-item__content">
            <ul
              style={{ listStyleType: "disc" }}
              className="flex flex-col gap-2 pl-8"
            >
              {_.get(item, "date_dpe.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "date_dpe.0")}: {_.get(item, "date_dpe.1")}
                  </p>
                </li>
              )}

              {_.get(item, "address.1") && (
                <li>
                  <p className="truncate">{_.get(item, "address.1")}</p>
                </li>
              )}

              {_.get(item, "floor.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "floor.0")}: {_.get(item, "floor.1")}
                  </p>
                </li>
              )}

              {_.get(item, "housing_surface.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "housing_surface.0")}: {_.get(item, "housing_surface.1")}
                  </p>
                </li>
              )}

              {_.get(item, "housing_add_compl.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "housing_add_compl.1")}
                  </p>
                </li>
              )}
            </ul>
          </div>
        </div>
      ));
    }
    return null;
  };

  const settings: Settings = {
    dots: false,
    infinite: false,
    speed: 400,
    slidesToShow:
      resultAutocomplete.length <= 3 ? resultAutocomplete.length : 3.3,
    slidesToScroll:
      resultAutocomplete.length <= 3 ? resultAutocomplete.length : 3,
    arrows: resultAutocomplete.length <= 3 ? false : true,
    nextArrow: <span>{"\u2192"}</span>,
    prevArrow: <span>{"\u2190"}</span>,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow:
            resultAutocomplete.length <= 2 ? resultAutocomplete.length : 2,
          slidesToScroll:
            resultAutocomplete.length <= 2 ? resultAutocomplete.length : 2,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  const renderMap = () => {
    const resolvedSearchDpesMap = !_.isEmpty(searchDpesMap)
      ? searchDpesMap
      : fetchedMap;
    return (
      <div className="map-wrapper" data-loading={isFetchingMap || undefined}>
        <MapContainer
          center={[
            _.get(dataHomeUploaded, "geo_data.lat"),
            _.get(dataHomeUploaded, "geo_data.lng"),
          ]}
          zoom={18}
          scrollWheelZoom={false}
          ref={mapRef}
        >
          <LeafLeftMapContent
            searchDpesMap={resolvedSearchDpesMap}
            selectedLabelId={selectedLabelId}
            dataHomeUploaded={dataHomeUploaded}
            onClickLabel={(item: any) => onClickLabel(item, mapRef, sliderRef)}
          />
        </MapContainer>
      </div>
    );
  };

  const tabMapItems: TabsProps["items"] = [
    { key: "1", label: "Plan", children: renderMap() },
  ];

  return (
    <Card className="mb-3">
      <h3
        id="mon-dpe"
        className="flex items-center gap-x-2.5 font-bold text-[28px] lg:text-[40px] leading-[48px] mb-3"
      >
        <img src={financeUrl} className="w-7 h-7 flex-shrink-0" alt="Finance" />
        Mon DPE par rapport aux autres
      </h3>

      <Row gutter={[24, 24]} style={{ marginLeft: 0, marginRight: 0 }}>
        <Col span={24} lg={9} style={{ paddingLeft: 0 }}>
          <DistributionChart
            ref={distributionRef}
            dataHomeUploaded={dataHomeUploaded}
            isPendingUploaded={isPendingUploaded}
          />
        </Col>

        <Col span={24} lg={15} style={{ paddingRight: 0 }}>
          <div className="energy-home__maps">
            <div className="flex justify-between">
              <Flex align="center" className="mt-2 mb-4">
                <img src={locationUrl} alt="Location" />
                <span className="text-regular-bold sm:text-medium-bold ml-1">
                  {_.get(dataHomeUploaded, "project_details.address.1", "")}
                </span>
              </Flex>

              {!_.isEmpty(_.get(dataDynamicInfo, "osm_map")) && (
                <Button
                  type="link"
                  className="flex items-center justify-center p-0 w-9 h-9"
                  onClick={() => onOpenDynamicInfo && onOpenDynamicInfo("osm_map")}
                >
                  i
                </Button>
              )}
            </div>

            <div className="energy-home__map-info">
              <Tabs
                centered
                activeKey={tabMap}
                items={tabMapItems}
                onChange={setTabMap}
              />
            </div>

            {!_.isEmpty(resultAutocomplete) && resultAutocompleteTitle && (
              <div className="mt-4">
                <p className="font-bold text-[16px]">
                  {resultAutocompleteTitle}
                </p>
                <div className="py-4 px-5">
                  <Slider
                    {...settings}
                    ref={(slider: any) => {
                      sliderRef.current = slider;
                    }}
                  >
                    {renderGPSItem()}
                  </Slider>
                </div>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Card>
  );
};

function LeafLeftMapContent({
  searchDpesMap,
  selectedLabelId,
  dataHomeUploaded,
  onClickLabel,
}: any) {
  const leafleftMap = useMap();

  useEffect(() => {
    if (!_.isEmpty(dataHomeUploaded)) {
      leafleftMap.setView([
        _.get(dataHomeUploaded, "geo_data.lat"),
        _.get(dataHomeUploaded, "geo_data.lng"),
      ]);
    }
  }, [dataHomeUploaded, leafleftMap]);

  return (
    <>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/attributions">CartoDB</a>'
      />

      {!_.isEmpty(searchDpesMap) &&
        searchDpesMap.map((item: any, index: number) => {
          const customIcon = L.divIcon({
            className: "custom-div-icon",
            html: ReactDOMServer.renderToString(
              <div
                data-id={item.ademe_id}
                className={classNames(
                  "label-container min-w-[32px] min-h-[25px] rounded-3xl flex items-center justify-center",
                  {
                    "label-container--selected":
                      item.ademe_id === selectedLabelId,
                  }
                )}
                style={{
                  background: item.label && MAP_FALLBACK[item.label] ? MAP_FALLBACK[item.label] : undefined,
                }}
              >
                <span className="label-text font-medium">
                  {item.label}
                  {item.label_range?.length > 1 ? "+" : ""}
                </span>
              </div>
            ),
            iconSize: [30, 30],
          });

          return (
            <Marker
              position={item}
              key={index}
              icon={customIcon}
              zIndexOffset={item.label_z}
              eventHandlers={{
                click: () => onClickLabel(item),
              }}
            />
          );
        })}

      <Marker
        position={[
          _.get(dataHomeUploaded, "geo_data.lat"),
          _.get(dataHomeUploaded, "geo_data.lng"),
        ]}
        zIndexOffset={99999}
      >
        <Popup>
          A pretty CSS3 popup. <br /> Easily customizable.
        </Popup>
      </Marker>
    </>
  );
}

const MAP_FALLBACK: Record<string, string> = {
  A: "#0c7c2a",
  B: "#48a334",
  C: "#a4c53a",
  D: "#f1d231",
  E: "#f1a133",
  F: "#e56726",
  G: "#d52122",
};

export default MonDpe;



```

I'll open the modified file to correct the `ReactDOMServer` import and ensure imports are valid.

I fixed the issue where `ReactDOMServer` was not correctly imported. Now I'll re-run lint checks to confirm everything is clean, and mark the completed tasks.

```typescriptreact
import _ from "lodash";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Flex, Row, Skeleton, Tabs, TabsProps } from "antd";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import ReactDOMServer from "react-dom/server";
import classNames from "classnames";
import Slider, { Settings } from "react-slick";

import financeUrl from "../assets/finance.svg";
import locationUrl from "../assets/location.svg";
import { fetchMapData } from "./api";

export type MonDpeProps = {
  resultAutocomplete: any[];
  dataDynamicInfo: any;
  isPendingSearchMap: boolean;
  dataHomeUploaded: any;
  isPendingUploaded: boolean;
  svgGraphePrice?: React.ReactNode;
  searchDpesMap: any[];
  resultAutocompleteTitle?: string;
  dataFiabilite?: any;
  isFetchingFiabilite?: boolean;
  selectedLabelId?: string;
  onClickLabel: (item: any, mapRef?: React.MutableRefObject<any>, sliderRef?: React.MutableRefObject<any>) => void;
  MAP_COLOR_DPE: Record<string, string>;
  DistributionChart: React.ForwardRefExoticComponent<any>;
  onOpenDynamicInfo?: (key: string) => void;
};

export const MonDpe: FC<MonDpeProps> = ({
  resultAutocomplete,
  dataDynamicInfo,
  isPendingSearchMap,
  dataHomeUploaded,
  isPendingUploaded,
  svgGraphePrice,
  searchDpesMap,
  resultAutocompleteTitle,
  dataFiabilite,
  isFetchingFiabilite,
  selectedLabelId,
  onClickLabel,
  MAP_COLOR_DPE,
  DistributionChart,
  onOpenDynamicInfo,
}) => {
  const distributionRef = useRef<any>(null);
  const mapRef = useRef<any>();
  const sliderRef = useRef<any>(null);

  const [tabMap, setTabMap] = useState("1");
  const [fetchedMap, setFetchedMap] = useState<any[]>([]);
  const [isFetchingMap, setIsFetchingMap] = useState(false);

  useEffect(() => {
    drawD3();
    window.addEventListener("resize", drawD3);
    return () => {
      window.removeEventListener("resize", drawD3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataFiabilite, isFetchingFiabilite, isPendingUploaded]);

  const drawD3 = () => {
    if (distributionRef.current) {
      distributionRef.current.drawD3 && distributionRef.current.drawD3();
    }
  };

  useEffect(() => {
    const lat = _.get(dataHomeUploaded, "geo_data.lat");
    const lng = _.get(dataHomeUploaded, "geo_data.lng");
    const hasProvidedData = !_.isEmpty(searchDpesMap);

    if (!lat || !lng || hasProvidedData) {
      return;
    }

    let isCancelled = false;
    const load = async () => {
      try {
        setIsFetchingMap(true);
        const data = await fetchMapData<any[]>({ lat, lng });
        if (!isCancelled) {
          setFetchedMap(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!isCancelled) {
          setFetchedMap([]);
          // eslint-disable-next-line no-console
          console.error("Failed to load map data", err);
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingMap(false);
        }
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [dataHomeUploaded, searchDpesMap]);

  const renderGPSItem = () => {
    if (isPendingSearchMap) {
      return [...new Array(3)].map((item, index) => (
        <Skeleton.Node active key={index} />
      ));
    }

    if (!_.isEmpty(resultAutocomplete)) {
      return resultAutocomplete.map((item: any, index: number) => (
        <div className="autocomplete-item" key={index}>
          <div className="autocomplete-item__title">
            <p
              style={{
                background: MAP_COLOR_DPE[_.get(item, "label.1")],
              }}
              className="min-w-[32px] rounded-full text-center"
            >
              {_.get(item, "label.1")}
            </p>
            <p className="truncate">{_.get(item, "ademe_id.1")}</p>
          </div>
          <div className="autocomplete-item__content">
            <ul
              style={{ listStyleType: "disc" }}
              className="flex flex-col gap-2 pl-8"
            >
              {_.get(item, "date_dpe.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "date_dpe.0")}: {_.get(item, "date_dpe.1")}
                  </p>
                </li>
              )}

              {_.get(item, "address.1") && (
                <li>
                  <p className="truncate">{_.get(item, "address.1")}</p>
                </li>
              )}

              {_.get(item, "floor.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "floor.0")}: {_.get(item, "floor.1")}
                  </p>
                </li>
              )}

              {_.get(item, "housing_surface.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "housing_surface.0")}: {_.get(item, "housing_surface.1")}
                  </p>
                </li>
              )}

              {_.get(item, "housing_add_compl.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "housing_add_compl.1")}
                  </p>
                </li>
              )}
            </ul>
          </div>
        </div>
      ));
    }
    return null;
  };

  const settings: Settings = {
    dots: false,
    infinite: false,
    speed: 400,
    slidesToShow:
      resultAutocomplete.length <= 3 ? resultAutocomplete.length : 3.3,
    slidesToScroll:
      resultAutocomplete.length <= 3 ? resultAutocomplete.length : 3,
    arrows: resultAutocomplete.length <= 3 ? false : true,
    nextArrow: <span>{"\u2192"}</span>,
    prevArrow: <span>{"\u2190"}</span>,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow:
            resultAutocomplete.length <= 2 ? resultAutocomplete.length : 2,
          slidesToScroll:
            resultAutocomplete.length <= 2 ? resultAutocomplete.length : 2,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  const renderMap = () => {
    const resolvedSearchDpesMap = !_.isEmpty(searchDpesMap)
      ? searchDpesMap
      : fetchedMap;
    return (
      <div className="map-wrapper" data-loading={isFetchingMap || undefined}>
        <MapContainer
          center={[
            _.get(dataHomeUploaded, "geo_data.lat"),
            _.get(dataHomeUploaded, "geo_data.lng"),
          ]}
          zoom={18}
          scrollWheelZoom={false}
          ref={mapRef}
        >
          <LeafLeftMapContent
            searchDpesMap={resolvedSearchDpesMap}
            selectedLabelId={selectedLabelId}
            dataHomeUploaded={dataHomeUploaded}
            onClickLabel={(item: any) => onClickLabel(item, mapRef, sliderRef)}
          />
        </MapContainer>
      </div>
    );
  };

  const tabMapItems: TabsProps["items"] = [
    { key: "1", label: "Plan", children: renderMap() },
  ];

  return (
    <Card className="mb-3">
      <h3
        id="mon-dpe"
        className="flex items-center gap-x-2.5 font-bold text-[28px] lg:text-[40px] leading-[48px] mb-3"
      >
        <img src={financeUrl} className="w-7 h-7 flex-shrink-0" alt="Finance" />
        Mon DPE par rapport aux autres
      </h3>

      <Row gutter={[24, 24]} style={{ marginLeft: 0, marginRight: 0 }}>
        <Col span={24} lg={9} style={{ paddingLeft: 0 }}>
          <DistributionChart
            ref={distributionRef}
            dataHomeUploaded={dataHomeUploaded}
            isPendingUploaded={isPendingUploaded}
          />
        </Col>

        <Col span={24} lg={15} style={{ paddingRight: 0 }}>
          <div className="energy-home__maps">
            <div className="flex justify-between">
              <Flex align="center" className="mt-2 mb-4">
                <img src={locationUrl} alt="Location" />
                <span className="text-regular-bold sm:text-medium-bold ml-1">
                  {_.get(dataHomeUploaded, "project_details.address.1", "")}
                </span>
              </Flex>

              {!_.isEmpty(_.get(dataDynamicInfo, "osm_map")) && (
                <Button
                  type="link"
                  className="flex items-center justify-center p-0 w-9 h-9"
                  onClick={() => onOpenDynamicInfo && onOpenDynamicInfo("osm_map")}
                >
                  i
                </Button>
              )}
            </div>

            <div className="energy-home__map-info">
              <Tabs
                centered
                activeKey={tabMap}
                items={tabMapItems}
                onChange={setTabMap}
              />
            </div>

            {!_.isEmpty(resultAutocomplete) && resultAutocompleteTitle && (
              <div className="mt-4">
                <p className="font-bold text-[16px]">
                  {resultAutocompleteTitle}
                </p>
                <div className="py-4 px-5">
                  <Slider
                    {...settings}
                    ref={(slider: any) => {
                      sliderRef.current = slider;
                    }}
                  >
                    {renderGPSItem()}
                  </Slider>
                </div>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Card>
  );
};

function LeafLeftMapContent({
  searchDpesMap,
  selectedLabelId,
  dataHomeUploaded,
  onClickLabel,
}: any) {
  const leafleftMap = useMap();

  useEffect(() => {
    if (!_.isEmpty(dataHomeUploaded)) {
      leafleftMap.setView([
        _.get(dataHomeUploaded, "geo_data.lat"),
        _.get(dataHomeUploaded, "geo_data.lng"),
      ]);
    }
  }, [dataHomeUploaded, leafleftMap]);

  return (
    <>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/attributions">CartoDB</a>'
      />

      {!_.isEmpty(searchDpesMap) &&
        searchDpesMap.map((item: any, index: number) => {
          const customIcon = L.divIcon({
            className: "custom-div-icon",
            html: ReactDOMServer.renderToString(
              <div
                data-id={item.ademe_id}
                className={classNames(
                  "label-container min-w-[32px] min-h-[25px] rounded-3xl flex items-center justify-center",
                  {
                    "label-container--selected":
                      item.ademe_id === selectedLabelId,
                  }
                )}
                style={{
                  background: item.label && MAP_FALLBACK[item.label] ? MAP_FALLBACK[item.label] : undefined,
                }}
              >
                <span className="label-text font-medium">
                  {item.label}
                  {item.label_range?.length > 1 ? "+" : ""}
                </span>
              </div>
            ),
            iconSize: [30, 30],
          });

          return (
            <Marker
              position={item}
              key={index}
              icon={customIcon}
              zIndexOffset={item.label_z}
              eventHandlers={{
                click: () => onClickLabel(item),
              }}
            />
          );
        })}

      <Marker
        position={[
          _.get(dataHomeUploaded, "geo_data.lat"),
          _.get(dataHomeUploaded, "geo_data.lng"),
        ]}
        zIndexOffset={99999}
      >
        <Popup>
          A pretty CSS3 popup. <br /> Easily customizable.
        </Popup>
      </Marker>
    </>
  );
}

const MAP_FALLBACK: Record<string, string> = {
  A: "#0c7c2a",
  B: "#48a334",
  C: "#a4c53a",
  D: "#f1d231",
  E: "#f1a133",
  F: "#e56726",
  G: "#d52122",
};

export default MonDpe;



```

- Wired up an API helper `packages/mon-dpe/src/api.ts` that composes the endpoint from envs and builds a query string.
- Integrated fetch into `packages/mon-dpe/src/mon-dpe.tsx`: when `searchDpesMap` is empty, it calls the endpoint using `lat` and `lng` from `dataHomeUploaded` and renders the returned markers.
- Fixed a broken `ReactDOMServer` import and cleared lints.

Next:
- Do you want additional params included in the request (e.g., radius, limit)? If yes, list them and where to source them.

---

**User**

in packages/mon-dpe2.tsx, would you start a new widget showing a map pointing at Paris?


---

**Cursor**

I'll create a new `MonDpe2` widget in `packages/mon-dpe/src/mon-dpe2.tsx` centered on Paris, export it from `packages/mon-dpe/src/index.ts`, and run lints to ensure everything is clean.

I'll create the new `MonDpe2` widget centered on Paris, export it from `src/index.ts`, then run lints on the new/edited files.

```typescriptreact
import React from "react";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

export type MonDpe2Props = {
  center?: [number, number];
  zoom?: number;
  height?: number | string;
};

export const MonDpe2: React.FC<MonDpe2Props> = ({
  center = [48.8566, 2.3522], // Paris
  zoom = 13,
  height = 360,
}) => {
  return (
    <div className="mon-dpe2-map" style={{ height }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/attributions">CartoDB</a>'
        />
        <Marker position={center}>
          <Popup>Paris</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};


```

```typescript
export { MonDpe } from "./mon-dpe";
export { MonDpe2 } from "./mon-dpe2";



```

I'll update the exports in `packages/mon-dpe/src/index.ts` to use ESM `.js` extensions for compatibility, then re-run lints on the updated files.

```typescript
export { MonDpe } from "./mon-dpe.js";
export { MonDpe2 } from "./mon-dpe2.js";



```

- Added `MonDpe2` at `packages/mon-dpe/src/mon-dpe2.tsx`, centered on Paris with a marker and popup.
- Exported it from `packages/mon-dpe/src/index.ts` (using ESM `.js` extension to satisfy module resolution).
- Lints are clean.

You can import it as:
```ts
import { MonDpe2 } from "@acme/mon-dpe";
```

```typescript
import { MonDpe2 } from "@acme/mon-dpe";
```

---

**User**

currently, the map looks broken in MonDpe2 (also MonDpe, both)

---

**Cursor**

I'll quickly search for where Leaflet CSS is imported or any map container styles. Then I'll add the missing CSS import and ensure the container gets a fixed height and invalidateSize on tab switch.

I’ll add the missing Leaflet CSS import in the app entry, give the map containers explicit sizes, trigger invalidateSize after mount/visibility changes, and add a CSS fix to prevent global img rules from breaking tiles. Then I’ll run lints on the edited files.

```typescriptreact
import React from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "leaflet/dist/leaflet.css";
import "@acme/theme-tokens/css";
import "../../../dashboard.scss";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);



```

I'll fix the map by ensuring Leaflet's CSS is loaded and by giving the map container an explicit height, plus invalidating the map size on mount and resize. Now I'll make the edits and run lints.

I’m going to add Leaflet size invalidation on mount and resize for both widgets, and add a CSS rule to prevent tiles from being scaled (which causes gaps). Then I’ll run lints on the changed files.

```typescriptreact
import _ from "lodash";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Flex, Row, Skeleton, Tabs, TabsProps } from "antd";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import ReactDOMServer from "react-dom/server";
import classNames from "classnames";
import Slider, { Settings } from "react-slick";

import financeUrl from "../assets/finance.svg";
import locationUrl from "../assets/location.svg";
import { fetchMapData } from "./api";

export type MonDpeProps = {
  resultAutocomplete: any[];
  dataDynamicInfo: any;
  isPendingSearchMap: boolean;
  dataHomeUploaded: any;
  isPendingUploaded: boolean;
  svgGraphePrice?: React.ReactNode;
  searchDpesMap: any[];
  resultAutocompleteTitle?: string;
  dataFiabilite?: any;
  isFetchingFiabilite?: boolean;
  selectedLabelId?: string;
  onClickLabel: (item: any, mapRef?: React.MutableRefObject<any>, sliderRef?: React.MutableRefObject<any>) => void;
  MAP_COLOR_DPE: Record<string, string>;
  DistributionChart: React.ForwardRefExoticComponent<any>;
  onOpenDynamicInfo?: (key: string) => void;
};

export const MonDpe: FC<MonDpeProps> = ({
  resultAutocomplete,
  dataDynamicInfo,
  isPendingSearchMap,
  dataHomeUploaded,
  isPendingUploaded,
  svgGraphePrice,
  searchDpesMap,
  resultAutocompleteTitle,
  dataFiabilite,
  isFetchingFiabilite,
  selectedLabelId,
  onClickLabel,
  MAP_COLOR_DPE,
  DistributionChart,
  onOpenDynamicInfo,
}) => {
  const distributionRef = useRef<any>(null);
  const mapRef = useRef<any>();
  const sliderRef = useRef<any>(null);

  const [tabMap, setTabMap] = useState("1");
  const [fetchedMap, setFetchedMap] = useState<any[]>([]);
  const [isFetchingMap, setIsFetchingMap] = useState(false);

  useEffect(() => {
    drawD3();
    window.addEventListener("resize", drawD3);
    return () => {
      window.removeEventListener("resize", drawD3);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataFiabilite, isFetchingFiabilite, isPendingUploaded]);

  const drawD3 = () => {
    if (distributionRef.current) {
      distributionRef.current.drawD3 && distributionRef.current.drawD3();
    }
  };

  useEffect(() => {
    const lat = _.get(dataHomeUploaded, "geo_data.lat");
    const lng = _.get(dataHomeUploaded, "geo_data.lng");
    const hasProvidedData = !_.isEmpty(searchDpesMap);

    if (!lat || !lng || hasProvidedData) {
      return;
    }

    let isCancelled = false;
    const load = async () => {
      try {
        setIsFetchingMap(true);
        const data = await fetchMapData<any[]>({ lat, lng });
        if (!isCancelled) {
          setFetchedMap(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!isCancelled) {
          setFetchedMap([]);
          // eslint-disable-next-line no-console
          console.error("Failed to load map data", err);
        }
      } finally {
        if (!isCancelled) {
          setIsFetchingMap(false);
        }
      }
    };

    load();
    return () => {
      isCancelled = true;
    };
  }, [dataHomeUploaded, searchDpesMap]);

  const renderGPSItem = () => {
    if (isPendingSearchMap) {
      return [...new Array(3)].map((item, index) => (
        <Skeleton.Node active key={index} />
      ));
    }

    if (!_.isEmpty(resultAutocomplete)) {
      return resultAutocomplete.map((item: any, index: number) => (
        <div className="autocomplete-item" key={index}>
          <div className="autocomplete-item__title">
            <p
              style={{
                background: MAP_COLOR_DPE[_.get(item, "label.1")],
              }}
              className="min-w-[32px] rounded-full text-center"
            >
              {_.get(item, "label.1")}
            </p>
            <p className="truncate">{_.get(item, "ademe_id.1")}</p>
          </div>
          <div className="autocomplete-item__content">
            <ul
              style={{ listStyleType: "disc" }}
              className="flex flex-col gap-2 pl-8"
            >
              {_.get(item, "date_dpe.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "date_dpe.0")}: {_.get(item, "date_dpe.1")}
                  </p>
                </li>
              )}

              {_.get(item, "address.1") && (
                <li>
                  <p className="truncate">{_.get(item, "address.1")}</p>
                </li>
              )}

              {_.get(item, "floor.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "floor.0")}: {_.get(item, "floor.1")}
                  </p>
                </li>
              )}

              {_.get(item, "housing_surface.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "housing_surface.0")}: {_.get(item, "housing_surface.1")}
                  </p>
                </li>
              )}

              {_.get(item, "housing_add_compl.1") && (
                <li>
                  <p className="truncate">
                    {_.get(item, "housing_add_compl.1")}
                  </p>
                </li>
              )}
            </ul>
          </div>
        </div>
      ));
    }
    return null;
  };

  const settings: Settings = {
    dots: false,
    infinite: false,
    speed: 400,
    slidesToShow:
      resultAutocomplete.length <= 3 ? resultAutocomplete.length : 3.3,
    slidesToScroll:
      resultAutocomplete.length <= 3 ? resultAutocomplete.length : 3,
    arrows: resultAutocomplete.length <= 3 ? false : true,
    nextArrow: <span>{"\u2192"}</span>,
    prevArrow: <span>{"\u2190"}</span>,
    responsive: [
      {
        breakpoint: 1280,
        settings: {
          slidesToShow:
            resultAutocomplete.length <= 2 ? resultAutocomplete.length : 2,
          slidesToScroll:
            resultAutocomplete.length <= 2 ? resultAutocomplete.length : 2,
        },
      },
      {
        breakpoint: 640,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
        },
      },
    ],
  };

  const renderMap = () => {
    const resolvedSearchDpesMap = !_.isEmpty(searchDpesMap)
      ? searchDpesMap
      : fetchedMap;
    return (
      <div className="map-wrapper" data-loading={isFetchingMap || undefined}>
        <MapContainer
          center={[
            _.get(dataHomeUploaded, "geo_data.lat"),
            _.get(dataHomeUploaded, "geo_data.lng"),
          ]}
          zoom={18}
          scrollWheelZoom={false}
          ref={mapRef}
        >
          <LeafLeftMapContent
            searchDpesMap={resolvedSearchDpesMap}
            selectedLabelId={selectedLabelId}
            dataHomeUploaded={dataHomeUploaded}
            onClickLabel={(item: any) => onClickLabel(item, mapRef, sliderRef)}
          />
        </MapContainer>
      </div>
    );
  };

  const tabMapItems: TabsProps["items"] = [
    { key: "1", label: "Plan", children: renderMap() },
  ];

  return (
    <Card className="mb-3">
      <h3
        id="mon-dpe"
        className="flex items-center gap-x-2.5 font-bold text-[28px] lg:text-[40px] leading-[48px] mb-3"
      >
        <img src={financeUrl} className="w-7 h-7 flex-shrink-0" alt="Finance" />
        Mon DPE par rapport aux autres
      </h3>

      <Row gutter={[24, 24]} style={{ marginLeft: 0, marginRight: 0 }}>
        <Col span={24} lg={9} style={{ paddingLeft: 0 }}>
          <DistributionChart
            ref={distributionRef}
            dataHomeUploaded={dataHomeUploaded}
            isPendingUploaded={isPendingUploaded}
          />
        </Col>

        <Col span={24} lg={15} style={{ paddingRight: 0 }}>
          <div className="energy-home__maps">
            <div className="flex justify-between">
              <Flex align="center" className="mt-2 mb-4">
                <img src={locationUrl} alt="Location" />
                <span className="text-regular-bold sm:text-medium-bold ml-1">
                  {_.get(dataHomeUploaded, "project_details.address.1", "")}
                </span>
              </Flex>

              {!_.isEmpty(_.get(dataDynamicInfo, "osm_map")) && (
                <Button
                  type="link"
                  className="flex items-center justify-center p-0 w-9 h-9"
                  onClick={() => onOpenDynamicInfo && onOpenDynamicInfo("osm_map")}
                >
                  i
                </Button>
              )}
            </div>

            <div className="energy-home__map-info">
              <Tabs
                centered
                activeKey={tabMap}
                items={tabMapItems}
                onChange={setTabMap}
              />
            </div>

            {!_.isEmpty(resultAutocomplete) && resultAutocompleteTitle && (
              <div className="mt-4">
                <p className="font-bold text-[16px]">
                  {resultAutocompleteTitle}
                </p>
                <div className="py-4 px-5">
                  <Slider
                    {...settings}
                    ref={(slider: any) => {
                      sliderRef.current = slider;
                    }}
                  >
                    {renderGPSItem()}
                  </Slider>
                </div>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Card>
  );
};

function LeafLeftMapContent({
  searchDpesMap,
  selectedLabelId,
  dataHomeUploaded,
  onClickLabel,
}: any) {
  const leafleftMap = useMap();

  useEffect(() => {
    if (!_.isEmpty(dataHomeUploaded)) {
      leafleftMap.setView([
        _.get(dataHomeUploaded, "geo_data.lat"),
        _.get(dataHomeUploaded, "geo_data.lng"),
      ]);
      // Ensure tiles are laid out correctly after container size changes
      setTimeout(() => {
        try {
          leafleftMap.invalidateSize();
        } catch {}
      }, 0);
    }
  }, [dataHomeUploaded, leafleftMap]);

  useEffect(() => {
    const invalidate = () => {
      try {
        leafleftMap.invalidateSize();
      } catch {}
    };
    const t = setTimeout(invalidate, 0);
    window.addEventListener("resize", invalidate);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", invalidate);
    };
  }, [leafleftMap]);

  return (
    <>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/attributions">CartoDB</a>'
      />

      {!_.isEmpty(searchDpesMap) &&
        searchDpesMap.map((item: any, index: number) => {
          const customIcon = L.divIcon({
            className: "custom-div-icon",
            html: ReactDOMServer.renderToString(
              <div
                data-id={item.ademe_id}
                className={classNames(
                  "label-container min-w-[32px] min-h-[25px] rounded-3xl flex items-center justify-center",
                  {
                    "label-container--selected":
                      item.ademe_id === selectedLabelId,
                  }
                )}
                style={{
                  background: item.label && MAP_FALLBACK[item.label] ? MAP_FALLBACK[item.label] : undefined,
                }}
              >
                <span className="label-text font-medium">
                  {item.label}
                  {item.label_range?.length > 1 ? "+" : ""}
                </span>
              </div>
            ),
            iconSize: [30, 30],
          });

          return (
            <Marker
              position={item}
              key={index}
              icon={customIcon}
              zIndexOffset={item.label_z}
              eventHandlers={{
                click: () => onClickLabel(item),
              }}
            />
          );
        })}

      <Marker
        position={[
          _.get(dataHomeUploaded, "geo_data.lat"),
          _.get(dataHomeUploaded, "geo_data.lng"),
        ]}
        zIndexOffset={99999}
      >
        <Popup>
          A pretty CSS3 popup. <br /> Easily customizable.
        </Popup>
      </Marker>
    </>
  );
}

const MAP_FALLBACK: Record<string, string> = {
  A: "#0c7c2a",
  B: "#48a334",
  C: "#a4c53a",
  D: "#f1d231",
  E: "#f1a133",
  F: "#e56726",
  G: "#d52122",
};

export default MonDpe;



```

```typescriptreact
import React from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { useEffect } from "react";

export type MonDpe2Props = {
  center?: [number, number];
  zoom?: number;
  height?: number | string;
};

export const MonDpe2: React.FC<MonDpe2Props> = ({
  center = [48.8566, 2.3522], // Paris
  zoom = 13,
  height = 360,
}) => {
  return (
    <div className="mon-dpe2-map" style={{ height }}>
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={false} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/attributions">CartoDB</a>'
        />
        <InvalidateOnMount />
        <Marker position={center}>
          <Popup>Paris</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
};

function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    const invalidate = () => {
      try {
        map.invalidateSize();
      } catch {}
    };
    const t = setTimeout(invalidate, 0);
    window.addEventListener("resize", invalidate);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", invalidate);
    };
  }, [map]);
  return null;
}



```

```scss
@use "styles/definition/text";
@use "styles/definition/variables" as variables;

.energy-home {
  .energy-home__result {
    width: 85%;
    margin: auto;
    max-width: 1600px;

    @media screen and (max-width: 1024px) {
      width: 100%;
    }
    .ant-card-body {
      padding: 28px;
      @media screen and (max-width: 768px) {
        padding: 16px;
      }
    }

    .overlay-2 {
      position: absolute;
      z-index: 1000;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.8); /* Semi-transparent background */
    }

    .energy-home__result-auth {
      position: relative;
      .overlay {
        position: absolute;
        z-index: 1000;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(255, 255, 255, 0.5); /* Semi-transparent background */
        backdrop-filter: blur(3px); /* Blur effect */
        .overlay__content {
          display: flex;
          justify-content: space-evenly;
          align-items: center;
          margin: auto;
          margin-top: 80px;
          flex-wrap: wrap;
          row-gap: 40px;
          max-width: max-content;
          column-gap: 70px;
          .offre-item {
            background-color: white;
            border: 2px solid #1e6862;
            max-width: 360px;
            padding: 20px 16px 28px;
            border-radius: 16px;
            min-height: 791px;
            display: flex;
            flex-direction: column;
            position: relative;
            &.offre-item--dark {
              border: 2px solid #002060ff;
            }

            @media screen and (max-width: 600px) {
              max-width: 320px;
            }

            .title {
              font-weight: 600;
              font-size: 32px;
              margin-bottom: 12px;
            }
            .description {
              font-size: 16px;
              margin-bottom: 32px;
            }

            .btn-rapport {
              width: 100%;
              height: 40px;
              background-color: #1e6862;
              border-color: #1e6862;
              color: #fff;
              font-weight: 600;
              font-size: 18px;
              &:hover {
                background-color: #237a73;
              }

              &.btn-rapport--dark {
                background-color: #002060ff;
                border-color: #002060ff;
                &:hover {
                  background-color: rgb(0, 41, 122);
                }
              }
            }
          }
        }
        .offre-login {
          background-color: white;
          border: 2px solid #1e6862;
          border-radius: 8px;
          padding: 12px 24px;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          @media screen and (max-width: 840px) {
            justify-content: center;
            gap: 20px;
            max-width: 360px;
            margin: auto;
          }

          @media screen and (max-width: 600px) {
            max-width: 320px;
            padding: 12px 16px;
          }

          .btn-rapport {
            width: 240px;
            height: 48px;
            background-color: #1e6862;
            border-color: #1e6862;
            color: #fff;
            font-weight: 600;
            font-size: 18px;
            &:hover {
              background-color: #237a73;
            }

            &.btn-rapport--dark {
              background-color: #002060ff;
              border-color: #002060ff;
              &:hover {
                background-color: rgb(0, 41, 122);
              }
            }
          }
        }
      }
    }

    .energy-home__project-card {
      padding: 24px 0 24px;

      @media screen and (max-width: 992px) {
        padding: 24px 12px;
      }
      @media screen and (max-width: 576px) {
        padding: 24px 0px;
      }

      .ant-card-head {
        border-bottom: 0;
        padding: 0 20px;
      }

      .energy-home__project {
        .energy-home__project-info {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-top: 12px;
          gap: 16px;
          @media screen and (max-width: 1400px) {
            flex-wrap: wrap;
          }
          .ant-tabs-tab {
            height: 30px;
            line-height: 50px;
            padding: 0 16px;
          }
          .ant-tabs {
            width: 800px;
            flex-shrink: 0;
            @media screen and (max-width: 1400px) {
              width: 100%;
            }

            .ant-tabs-nav-wrap {
              background-color: #f4f4f4;
              border-radius: 100px;
              padding: 4px;
              .ant-tabs-nav-list {
                width: 100%;
                .ant-tabs-tab {
                  margin: 0;
                  flex: 1;
                  justify-content: center;
                  border-radius: 100px;
                  @extend .text-regular;

                  .ant-tabs-tab-btn {
                    color: variables.$black;
                  }

                  &.ant-tabs-tab-active {
                    background-color: #dcdcdc;
                    @extend .text-regular-bold;
                  }
                }
              }
            }
            .ant-tabs-ink-bar {
              display: none;
            }
            .ant-tabs-nav {
              &::before {
                display: none;
              }
            }
          }

          .info-du-bien {
            border-radius: 40px;
            padding: 16px 40px;
            padding-right: 24px;
            background-color: #f4f4f4;

            .info-du-bien__inner {
              display: flex;
              column-gap: 12px;
              row-gap: 8px;
              @media screen and (max-width: 1200px) {
                flex-wrap: wrap;
              }
            }

            ul {
              display: flex;
              flex-direction: column;
              row-gap: 8px;
              flex-shrink: 0;
              max-width: 400px;
              .text-truncate {
                overflow: hidden;
                display: -webkit-box;
                -webkit-line-clamp: 2; /* number of lines to show */
                line-clamp: 2;
                -webkit-box-orient: vertical;
              }

              &:first-child {
                flex-basis: 46%;
              }
              &:last-child {
                flex-basis: 54%;
              }
              @media screen and (max-width: 768px) {
                flex-basis: 100% !important;
              }
            }
            @media screen and (max-width: 600px) {
              padding: 16px 24px;
            }
          }
        }
      }

      .manage-infos {
        border-radius: 40px;
        padding: 16px 40px;
        background-color: #f4f4f4;
        display: flex;
        flex-direction: column;
        row-gap: 4px;
        max-width: 680px;
      }
    }

    .energy-home__votre {
      .votre-item {
        border: 1px solid #000000;
        padding: 5px 8px;
        border-radius: 10px;
        opacity: 0.3;
        pointer-events: none;
        &.active {
          opacity: 1;
          pointer-events: auto;
        }
      }
    }

    .energy-home__resultats {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;

      @media screen and (max-width: 1200px) {
        align-items: center;
      }

      .ant-tabs {
        width: 80% !important;

        @media screen and (max-width: 600px) {
          width: 100% !important;
        }
      }

      .ant-badge {
        .ant-badge-count {
          width: 100px;
          height: 48px;
          border-radius: 28px;
          font-size: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      }

      .svg-image {
        text-align: left;
        width: 275px;

        .ant-skeleton {
          width: 100%;
        }
        .ant-skeleton-button {
          width: 100%;
          height: 332px;
        }
      }

      img {
        width: 275px;
        max-height: 332px;
      }

      .info-resultat-item {
        svg {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }
      }
    }

    .energy-home__notifications {
      .notification-item {
        position: relative;
        &::marker {
          color: transparent;
        }
        &::before {
          content: "";
          display: block;
          width: 12px;
          height: 12px;
          position: absolute;
          left: -20px;
          top: 6px;
          border-radius: 50%;
        }
        &.info {
          &::before {
            background-color: #89ea29;
          }
        }
        &.warning {
          &::before {
            background-color: #f2da04;
          }
        }
        &.error {
          &::before {
            background-color: #ff4d4f;
          }
        }
      }
    }

    .energy-home__project-info__indice {
      background-color: #ededed;
      border-radius: 30px;
      min-width: 283px;
      position: relative;
      z-index: 100;
      display: grid;
      grid-template-columns: 0.6fr 1fr 0.4fr;
      gap: 20px;

      @media screen and (max-width: 1000px) {
        grid-template-columns: 1fr auto;
        gap: 10px;
        padding-inline: 30px;
      }

      @media screen and (max-width: 680px) {
        grid-template-columns: 1fr;
        gap: 20px;
        padding-block: 10px;
      }
      .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 4px;
      }
      .dot-large {
        width: 22px;
        height: 22px;
        border-radius: 50%;
        border: 1px solid;
        display: flex;
        align-items: center;
        justify-content: center;
        &.dot-qualite {
          background-color: #94c795;
          border-color: #7abd7a;
        }
        &.dot-coherence {
          background-color: #f9c895;
          border-color: #fcbf7f;
        }
        &.dot-issue {
          background-color: #fef3f2;
          color: #bb3e34;
          border-color: #bb3e34;
          font-weight: 600;
        }
      }

      .fiabilite-number {
        font-size: 24px;
        font-weight: 600;
      }

      .anticon-info-circle {
        font-size: 16px;
        cursor: pointer;
      }

      .fiabilite-container {
        margin: 50px auto 20px;
        .gauge {
          width: 100%;
          height: 30px;
          border-radius: 15px;
          background: linear-gradient(to right, red, yellow, green);
          position: relative;
        }
        .pointer {
          position: absolute;
          top: -32px;
          width: 2px;
          height: 28px;
        }
        .labels {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          font-size: 14px;
        }
      }
      @media screen and (max-width: 1152px) {
        width: 100%;
      }
    }

    .energy-home__distribution {
      .bar-chart {
        margin: auto;
        height: 240px;
        margin-top: 30px;
        display: flex;
        align-items: flex-end;
        justify-content: center;
        padding-bottom: 50px;

        .bar {
          display: inline-block;
          width: 60px;
          margin: 0 5px;
          border-radius: 10px;
          position: relative;
          // fill: lightgray;
        }

        // .label {
        //   font-size: 14px;
        //   text-anchor: middle;
        //   font-weight: bold;
        // }

        .bar-label {
          position: absolute;
          width: 100%;
          top: -22px;
          font-weight: bold;
          text-align: center;
          @media screen and (max-width: 768px) {
            font-size: 10px;
          }
        }

        .percentage {
          font-size: 14px;
          text-anchor: middle;
          font-weight: 600;
        }

        .box {
          stroke: gray;
          stroke-width: 1px;
        }

        .arrow {
          fill: green;
          position: relative;
          top: 2px;
        }

        .indicator {
          position: absolute;
          bottom: -25px;
          width: 100%;
          text-align: center;
          font-size: 14px;
          font-weight: 700;
        }

        .indicator-triangle {
          position: absolute;
          bottom: -45px;
          width: 100%;
          .triangle {
            margin: 0 auto;
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 16px solid black;
            position: relative;
            &::after {
              content: "";
              width: 0;
              height: 0;
              border-left: 7px solid transparent;
              border-right: 7px solid transparent;
              border-bottom: 10px solid white;
              position: absolute;
              top: 4px;
              left: -7px;
            }
          }
        }
      }
    }

    .energy-home__performance {
      .bar-chart {
        margin: auto;
        height: 240px;
        margin-top: 30px;
        display: flex;
        align-items: flex-end;
        padding-bottom: 50px;

        .bar {
          display: inline-block;
          width: 80px;
          border: 1px solid black;
          position: relative;
          // fill: lightgray;
        }

        // .label {
        //   font-size: 14px;
        //   text-anchor: middle;
        //   font-weight: bold;
        // }

        .bar-label {
          position: absolute;
          width: 100%;
          top: -22px;
          font-weight: bold;
          text-align: center;
          @media screen and (max-width: 768px) {
            font-size: 10px;
          }
        }

        .percentage {
          font-size: 14px;
          text-anchor: middle;
          font-weight: 600;
        }

        .box {
          stroke: gray;
          stroke-width: 1px;
        }

        .arrow {
          fill: green;
          position: relative;
          top: 2px;
        }

        .indicator {
          position: absolute;
          bottom: -25px;
          width: 100%;
          text-align: center;
          font-size: 14px;
          font-weight: 700;
        }

        .indicator-triangle {
          position: absolute;
          bottom: -45px;
          width: 100%;
          .triangle {
            margin: 0 auto;
            width: 0;
            height: 0;
            border-left: 10px solid transparent;
            border-right: 10px solid transparent;
            border-bottom: 16px solid black;
            position: relative;
            &::after {
              content: "";
              width: 0;
              height: 0;
              border-left: 7px solid transparent;
              border-right: 7px solid transparent;
              border-bottom: 10px solid white;
              position: absolute;
              top: 4px;
              left: -7px;
            }
          }
        }
      }
    }

    .energy-home__maps {
      .ant-tabs {
        width: 100%;
        .ant-tabs-nav-wrap {
          background-color: #f4f4f4;
          border-radius: 100px;
          padding: 4px;
          .ant-tabs-nav-list {
            width: 100%;
            .ant-tabs-tab {
              padding: 3px;
              margin: 0;
              flex: 1;
              justify-content: center;
              border-radius: 100px;
              @extend .text-regular;

              .ant-tabs-tab-btn {
                color: variables.$black;
              }

              &.ant-tabs-tab-active {
                background-color: #dcdcdc;
                @extend .text-regular-bold;
              }
            }
          }
        }
        .ant-tabs-ink-bar {
          display: none;
        }
        .ant-tabs-nav {
          margin-bottom: 0;
          &::before {
            display: none;
          }
        }
      }

      .map-wrapper {
        margin-top: 16px;
        width: 100%;
        height: 480px;
        .leaflet-container {
          height: 100%;
        }
        .leaflet-tile-container img {
          image-rendering: auto;
          transform: none !important;
        }
        .label-container--selected {
          outline: 2px solid #000;
        }
      }

      .autocomplete-item {
        border: 1px solid #dedede;
        background: #ffffffe5;
        padding: 28px 20px;
        border-radius: 30px;
        max-width: 317px;

        .autocomplete-item__title {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          font-weight: 600;
          font-size: 16px;
        }
      }
      .ant-skeleton {
        width: 100% !important;
        height: 176px;
        .ant-skeleton-image {
          height: 100%;
        }
      }
      .slick-slider .slick-slide {
        padding: 0 12px;
      }
      .slick-arrow {
        svg {
          width: 100%;
          height: 100%;
          path {
            fill: #000;
          }
        }
      }
    }
  }

  .energy-home__suggestion-renovation {
    .ant-tabs {
      .ant-tabs-nav-wrap {
        background-color: #f4f4f4;
        border-radius: 100px;
        padding: 4px;
        .ant-tabs-nav-list {
          width: 100%;
          .ant-tabs-tab {
            padding: 3px;
            margin: 0;
            flex: 1;
            justify-content: center;
            border-radius: 100px;
            @extend .text-regular;

            .ant-tabs-tab-btn {
              color: variables.$black;
            }

            &.ant-tabs-tab-active {
              background-color: #dcdcdc;
              @extend .text-regular-bold;
            }
          }
        }
      }
      .ant-tabs-ink-bar {
        display: none;
      }
      .ant-tabs-nav {
        &::before {
          display: none;
        }
      }
    }

    .suggestion-item {
      padding: 8px 12px;
      border-radius: 20px;
      border: 1px solid #000000;
      &.active {
        border: 1px solid #3b8686;
        background: #3b86864d;
      }

      .icon-stat {
        path {
          fill: #0000004d;
        }
        &.icon-stat--active {
          path {
            fill: #000;
          }
        }
      }
    }

    .energy-home__montant {
      padding: 12px 20px;
      background: #eeeeee;
      border-radius: 30px;
      max-width: max-content;

      p {
        color: #414141;
      }

      .montant-label {
        width: 60px;
        height: 60px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 40px;
      }
    }

    .btn-demarrer {
      background-color: #0d4869;
      border-radius: 12px;
      color: white;
      padding: 20px;
      font-size: 16px;
      font-weight: 500;
      margin-top: 16px;
      &:hover {
        background-color: #0f537b !important;
        color: white !important;
      }
    }

    .bloc-container {
      display: grid;
      grid-template-columns: 1fr;
      justify-items: center;
      align-items: center;

      @media screen and (min-width: 768px) {
        grid-template-columns: 3fr 1fr;
        align-items: flex-start;
      }
    }

    .text-container {
      .title {
        display: flex;
        align-items: center;
        gap: 2.5%;

        font-size: 32px;
        font-weight: 600;
        margin-bottom: 20px;

        @media screen and (max-width: 768px) {
          font-size: 20px;
          gap: 2%;
        }
      }
    }

    .house-icon {
      @media screen and (min-width: 768px) {
        margin-left: 40%;
      }
    }

    .pending-container {
      @media screen and (min-width: 768px) {
        margin-top: 1%;
        margin-inline: 15%;
      }
    }

    .construction-container {
      .title,
      .subTitle {
        font-size: 20px;

        @media screen and (min-width: 768px) {
          font-size: 26px;
        }
      }

      .list {
        margin-top: 20px;

        .extra-list {
          margin-top: 20px;
        }

        @media screen and (min-width: 768px) {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5%;
        }
      }

      .description {
        margin-top: 20px;
        font-weight: 400;
        line-height: 1.5;
      }

      @media screen and (min-width: 768px) {
        margin-inline: 15%;
      }
    }
  }

  .energy-home__suggestion-renovation__tabs {
    .ant-tabs-tab {
      height: 50px;
      line-height: 50px;
      padding: 0 16px;
    }

    .ant-tabs-tab-btn {
      font-size: 16px;
    }
  }

  .energy-home__graphe-price {
    margin-top: 30px;
    height: 340px;

    #graphe-price-chart {
      height: 100%;
    }
    .axis line,
    .axis path {
      stroke: #ddd;
    }
    .current-value-line {
      stroke: #79bd9a;
      stroke-width: 4;
      stroke-dasharray: 10, 5;
    }
    .gaussian {
      fill: #3b86861a;
      stroke: #3b8686;
      stroke-width: 3;
    }
    .annotation {
      fill: #000;
    }
  }

  .energy-home__loader {
    width: 50%;
    margin: auto;
    max-width: 1600px;
    @media screen and (max-width: 1024px) {
      width: 100%;
    }
    .ant-card-body {
      padding: 28px;
      @media screen and (max-width: 768px) {
        padding: 16px;
      }
    }

    .title {
      font-weight: 700;
      font-size: 20px;
      line-height: 150%;
      margin-bottom: 16px;
    }

    .energy-home__loader__steps {
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      li {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 500;
        font-size: 16px;
        line-height: 150%;
        color: #808080;
        padding-left: 20px;
        position: relative;
        &.active {
          color: #000;
          padding-left: 0;
          .anticon-check {
            color: #3b8686;
          }
        }

        .ant-spin {
          position: absolute;
          top: 50%;
          transform: translate(0, -50%);
          left: 0;
          .anticon-loading {
            font-size: 16px;
          }
        }
      }
    }
  }
}

.btn-flex {
  span {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  svg {
    fill: #fff;
  }
}

```

- I imported Leaflet’s CSS in `apps/dashboard/src/main.tsx` and added `invalidateSize` hooks to both `MonDpe` and `MonDpe2` so tiles lay out correctly after mount/resizes.
- I ensured map containers have explicit height and prevented tile transforms that can cause gaps in `dashboard.scss`.

Try reloading; the white gaps should be gone and the map should render solidly.

- Key edits: `apps/dashboard/src/main.tsx`, `packages/mon-dpe/src/mon-dpe.tsx`, `packages/mon-dpe/src/mon-dpe2.tsx`, `dashboard.scss`.

Let me open the `startup.sh` to fix the Ladle command so it actually starts the stories, since it failed by running `ladle` without a subcommand. I'll then update the script to use `ladle dev` and print a helpful message.

```shellscript
#!/usr/bin/env bash
set -euo pipefail

if ! command -v corepack >/dev/null 2>&1; then
  npm i -g corepack
fi

corepack enable
corepack prepare pnpm@9.12.0 --activate

echo "Node: $(node -v)"
echo "pnpm: $(pnpm -v)"

pnpm install

echo "Running stories (ladle dev)..."
pnpm ladle dev --port 6006 || true

echo "Running tests..."
pnpm test || true

echo "Done. Start the app with:"
echo "pnpm --filter @acme/landing dev  # landing app"
echo "pnpm --filter @acme/dashboard dev  # dashboard app"

```

- Fixed the map rendering: imported Leaflet CSS, ensured container height, and added invalidateSize hooks. This should remove the white gaps.
- Also updated `startup.sh` to run Ladle correctly (`ladle dev --port 6006`) and printed start hints for both apps.

If you still see gaps, try a hard reload.

---

**User**

but then when i run


---

**Cursor**

```typescript
*** Begin Patch
*** Update File: packages/mon-dpe/src/index.ts
@@
+import "leaflet/dist/leaflet.css";
 
 export { MonDpe } from "./mon-dpe.js";
 export { MonDpe2 } from "./mon-dpe2.js";
*** End Patch
```

```typescript
import "leaflet/dist/leaflet.css";
export { MonDpe } from "./mon-dpe.js";
export { MonDpe2 } from "./mon-dpe2.js";



```

- The dashboard failed because `leaflet/dist/leaflet.css` wasn’t resolvable from the app. I moved the CSS import into the `@acme/mon-dpe` package entry so any consumer gets the styles automatically.
- You can now run the dashboard without adding the CSS import in the app.

Try again:
- pnpm --filter @acme/dashboard dev

If it still errors, hard reload or clear Vite cache.

I’m going to remove the direct Leaflet CSS import from the dashboard app’s `src/main.tsx` to resolve the Vite error, since the CSS is now imported via `@acme/mon-dpe`. Then I’ll run lints on the modified file.

```typescriptreact
import React from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "@acme/theme-tokens/css";
import "../../../dashboard.scss";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);



```

Removed the direct `leaflet/dist/leaflet.css` import from `apps/dashboard/src/main.tsx`. The CSS is now provided by `@acme/mon-dpe`’s entry, so Vite should no longer error. Relaunch the dashboard: pnpm --filter @acme/dashboard dev

