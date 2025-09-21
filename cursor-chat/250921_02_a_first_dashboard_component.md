# Creating a new dashboard app
_Exported on 21/09/2025 at 20:39:22 CEST from Cursor (1.5.5)_

---

**User**

a new "apps" called "dashboard", it will take the scss as css base

---

**Cursor**

I'll scan the existing `apps/landing` setup and `dashboard.scss` to mirror config and ensure SCSS import works in a sibling Vite app. Then I'll scaffold `apps/dashboard` with Vite React TS, wire it to use `dashboard.scss`, and add necessary package/scripts.

I'll check the monorepo's root config and `dashboard.scss` to know how to wire the new app to import the stylesheet, and mirror the landing app structure.

I'll check the workspace settings to ensure the new app will be picked up by pnpm workspaces and create the dashboard app with Vite config, source files, styles, and scripts. Then I'll add minimal SCSS placeholders to satisfy imports.

I'll quickly view `startup.sh` to see if there are conventions for running apps, and then scaffold the new `apps/dashboard` with Vite React TS, wire `dashboard.scss` as a global stylesheet, and add minimal SCSS files to satisfy its imports.

I'll create a new Vite React app at `apps/dashboard`, wire it to import the root `dashboard.scss` as a global stylesheet, and add the missing SCSS dependency files it imports. Then I'll check for linter issues in the new files.

I'll scaffold the `apps/dashboard` directory with package.json, Vite config, tsconfig, index.html, and basic React entry files. Then I'll wire in the global SCSS and create placeholder SCSS files to satisfy imports.

```json
{
  "name": "@acme/dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@acme/button": "workspace:*",
    "@acme/theme-tokens": "workspace:*",
    "@ant-design/icons": "^6.0.2",
    "antd": "^5.27.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "sass": "^1.78.0"
  }
}


```

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({ plugins: [react()] });


```

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": [
      "vite/client"
    ]
  },
  "include": [
    "src"
  ]
}


```

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
  </html>


```

```typescriptreact
import React from "react";
import { createRoot } from "react-dom/client";
import "antd/dist/reset.css";
import "@acme/theme-tokens/css";
import "../../../dashboard.scss";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(<App />);


```

```typescriptreact
import React from "react";
import { Button } from "@acme/button";

export const App: React.FC = () => (
  <div className="energy-home" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
    <div style={{ textAlign: 'center' }}>
      <h1 style={{ marginBottom: 12 }}>Dashboard</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>Using global SCSS from root.</p>
      <Button label="Primary" />
    </div>
  </div>
);


```

I'll search for Sass variable and placeholder usages in `dashboard.scss` to ensure the imported `styles/definition` files provide what's needed, then create minimal `styles/definition` files at the repo root to satisfy imports.

I'll add the missing Sass dependency files under `styles/definition/` to satisfy the imports in `dashboard.scss`, then mark the todos complete and run a quick lint check on the new app.

```scss
$black: #000;


```

```scss
.text-regular {
  font-weight: 400;
}

.text-regular-bold {
  font-weight: 600;
}


```

Created a new Vite React (TS) app at `apps/dashboard` and wired it to use the root `dashboard.scss` as its global stylesheet.

- App files added: `apps/dashboard/{package.json,vite.config.ts,tsconfig.json,index.html,src/{main.tsx,App.tsx}}`
- Global styles: `apps/dashboard/src/main.tsx` imports `../../../dashboard.scss`
- Sass deps resolved: added `styles/definition/{variables.scss,text.scss}` at repo root to satisfy `@import "styles/definition/*.scss"` in `dashboard.scss`
- Added `sass` as a devDependency in `@acme/dashboard`

Run it:
```bash
pnpm --filter @acme/dashboard dev
```

All todos completed.

- Created `@acme/dashboard` with Vite config and scripts.
- Hooked `dashboard.scss` as the CSS base; added minimal `styles/definition` Sass files for `$black`, `.text-regular`, `.text-regular-bold`.

```shellscript
pnpm --filter @acme/dashboard dev
```

---

**User**

seems to run with issues

---

**Cursor**

I'll install the missing Sass preprocessor and ensure workspace deps are linked, then build the new app to verify imports resolve.

```plaintext
pnpm --filter @acme/dashboard dev
```

I installed sass-embedded, linked workspace deps, and verified `@acme/dashboard` builds successfully. I'll start the dev server to confirm it runs.

- I installed `sass-embedded` and ran a full workspace install; the dashboard app builds cleanly and the dev server is now running.
- Warnings shown are only Sass deprecation notices due to `@import` usage in `dashboard.scss` (safe to ignore for now).

Try it:
```bash
pnpm --filter @acme/dashboard dev
```

If you still see unresolved imports, ensure you ran a workspace install after adding the app:
```bash
pnpm install
```

```shellscript
pnpm --filter @acme/dashboard dev
```

```shellscript
pnpm install
```

---

**User**

now port the "mon-dpe.tsx" into a new package ; i also added "assets/images" for svg icons, which you can move to the appropriate  folder

---

**Cursor**

I'll read `mon-dpe.tsx` and look for the new `assets/images` folder to understand required icons and adjust imports.

I'll create a new package `@acme/mon-dpe`, adapt the component to remove app-specific dependencies, copy needed SVGs into the package, and wire the dashboard app to use it. Then I'll install any missing dependencies and run a build/dev to verify.

```json
{
  "name": "@acme/mon-dpe",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": [
    "src",
    "assets"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "peerDependencies": {
    "antd": "^5.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "dependencies": {
    "classnames": "^2.5.1",
    "leaflet": "^1.9.4",
    "lodash": "^4.17.21",
    "react-leaflet": "^4.2.1",
    "react-slick": "^0.30.2"
  },
  "devDependencies": {
    "@types/classnames": "^2.3.1",
    "@types/lodash": "^4.14.202",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.4"
  }
}


```

```jsonc
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist"
  },
  "include": [
    "src"
  ]
}


```

```typescript
export { MonDpe } from "./mon-dpe";


```

```typescriptreact
import _ from "lodash";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Flex, Row, Skeleton, Tabs, TabsProps } from "antd";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import ReactDOMServer from "react-dom/server";
import classNames from "classnames";
import Slider, { Settings } from "react-slick";
import { InfoCircleOutlined, RightOutlined, LeftOutlined } from "@ant-design/icons";

import { ReactComponent as IconFinance } from "../assets/finance.svg";
import { ReactComponent as IconLocation } from "../assets/location.svg";

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
    nextArrow: <RightOutlined />,
    prevArrow: <LeftOutlined />,
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
    return (
      <div className="map-wrapper">
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
            searchDpesMap={searchDpesMap}
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
        <IconFinance className="w-7 h-7 flex-shrink-0" />
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
                <IconLocation />
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
                  <InfoCircleOutlined style={{ color: "#000", fontSize: 22 }} />
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
                    ref={(slider) => {
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

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>


```

```xml
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0Z"/><circle cx="12" cy="10" r="3"/></svg>


```

```typescriptreact
import React from "react";
import { MonDpe } from "@acme/mon-dpe";

export const App: React.FC = () => (
  <div className="energy-home" style={{ minHeight: '100vh', padding: 24 }}>
    <MonDpe
      resultAutocomplete={[]}
      dataDynamicInfo={{}}
      isPendingSearchMap={false}
      dataHomeUploaded={{ geo_data: { lat: 48.8566, lng: 2.3522 }, project_details: { address: { 1: "Paris, France" } } }}
      isPendingUploaded={false}
      searchDpesMap={[]}
      MAP_COLOR_DPE={{}}
      DistributionChart={React.forwardRef<any>((props, ref) => <div ref={ref} style={{ height: 240, background: '#f5f5f5', borderRadius: 12 }} />)}
      onClickLabel={() => {}}
    />
  </div>
);



```

I'll update the dashboard app to depend on the new package and enable SVG React component imports, add SVG type declarations in the new package, then install and build to verify.

```json
{
  "name": "@acme/dashboard",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@acme/mon-dpe": "workspace:*",
    "@acme/button": "workspace:*",
    "@acme/theme-tokens": "workspace:*",
    "@ant-design/icons": "^6.0.2",
    "antd": "^5.27.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "sass": "^1.78.0"
  }
}



```

```typescript
/// <reference types="vite/client" />
declare module "*.svg" {
  import * as React from "react";
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}


```

I'll remove the dependency on `@ant-design/icons` from the new `@acme/mon-dpe` component to avoid the unresolved import, then rebuild the packages and the dashboard app.

```typescriptreact
import _ from "lodash";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Flex, Row, Skeleton, Tabs, TabsProps } from "antd";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import ReactDOMServer from "react-dom/server";
import classNames from "classnames";
import Slider, { Settings } from "react-slick";
import { RightOutlined, LeftOutlined } from "@ant-design/icons";

import { ReactComponent as IconFinance } from "../assets/finance.svg";
import { ReactComponent as IconLocation } from "../assets/location.svg";

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
    nextArrow: <RightOutlined />,
    prevArrow: <LeftOutlined />,
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
    return (
      <div className="map-wrapper">
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
            searchDpesMap={searchDpesMap}
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
        <IconFinance className="w-7 h-7 flex-shrink-0" />
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
                <IconLocation />
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
                  <InfoCircleOutlined style={{ color: "#000", fontSize: 22 }} />
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
                    ref={(slider) => {
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

```typescriptreact
import _ from "lodash";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Flex, Row, Skeleton, Tabs, TabsProps } from "antd";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import ReactDOMServer from "react-dom/server";
import classNames from "classnames";
import Slider, { Settings } from "react-slick";
import { RightOutlined, LeftOutlined } from "@ant-design/icons";

import { ReactComponent as IconFinance } from "../assets/finance.svg";
import { ReactComponent as IconLocation } from "../assets/location.svg";

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
    nextArrow: <RightOutlined />,
    prevArrow: <LeftOutlined />,
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
    return (
      <div className="map-wrapper">
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
            searchDpesMap={searchDpesMap}
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
        <IconFinance className="w-7 h-7 flex-shrink-0" />
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
                <IconLocation />
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
                    ref={(slider) => {
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

I'll remove all uses of `@ant-design/icons` from `@acme/mon-dpe` and replace with simple arrows, then rebuild packages and the dashboard.

```typescriptreact
import _ from "lodash";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Flex, Row, Skeleton, Tabs, TabsProps } from "antd";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import ReactDOMServer from "react-dom/server";
import classNames from "classnames";
import Slider, { Settings } from "react-slick";

import { ReactComponent as IconFinance } from "../assets/finance.svg";
import { ReactComponent as IconLocation } from "../assets/location.svg";

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
    nextArrow: <RightOutlined />,
    prevArrow: <LeftOutlined />,
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
    return (
      <div className="map-wrapper">
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
            searchDpesMap={searchDpesMap}
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
        <IconFinance className="w-7 h-7 flex-shrink-0" />
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
                <IconLocation />
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
                    ref={(slider) => {
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

```typescriptreact
import _ from "lodash";
import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Card, Col, Flex, Row, Skeleton, Tabs, TabsProps } from "antd";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import ReactDOMServer from "react-dom/server";
import classNames from "classnames";
import Slider, { Settings } from "react-slick";

import { ReactComponent as IconFinance } from "../assets/finance.svg";
import { ReactComponent as IconLocation } from "../assets/location.svg";

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
    return (
      <div className="map-wrapper">
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
            searchDpesMap={searchDpesMap}
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
        <IconFinance className="w-7 h-7 flex-shrink-0" />
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
                <IconLocation />
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
                    ref={(slider) => {
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

I’m going to update the `@acme/mon-dpe` package to import SVGs as URLs and render them with img tags, and replace placeholder SVGs with the actual assets from `assets/images`. Then I’ll rebuild the dashboard to verify the imports resolve.

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
    return (
      <div className="map-wrapper">
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
            searchDpesMap={searchDpesMap}
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
                    ref={(slider) => {
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

```xml
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M9 6H11V20H9V6ZM13 8H15V20H13V8ZM17 4H19V20H17V4ZM5 12H7V20H5V12Z" fill="black"/>
</svg>



```

```xml
<svg width="32" height="33" viewBox="0 0 32 33" fill="none" xmlns="http://www.w3.org/2000/svg">
<path opacity="0.2" d="M16 3.5C13.3478 3.5 10.8043 4.55357 8.92893 6.42893C7.05357 8.3043 6 10.8478 6 13.5C6 22.5 16 29.5 16 29.5C16 29.5 26 22.5 26 13.5C26 10.8478 24.9464 8.3043 23.0711 6.42893C21.1957 4.55357 18.6522 3.5 16 3.5ZM16 17.5C15.2089 17.5 14.4355 17.2654 13.7777 16.8259C13.1199 16.3864 12.6072 15.7616 12.3045 15.0307C12.0017 14.2998 11.9225 13.4956 12.0769 12.7196C12.2312 11.9437 12.6122 11.231 13.1716 10.6716C13.731 10.1122 14.4437 9.7312 15.2196 9.57686C15.9956 9.42252 16.7998 9.50173 17.5307 9.80448C18.2616 10.1072 18.8864 10.6199 19.3259 11.2777C19.7654 11.9355 20 12.7089 20 13.5C20 14.5609 19.5786 15.5783 18.8284 16.3284C18.0783 17.0786 17.0609 17.5 16 17.5Z" fill="black"/>
<path d="M16 8.5C15.0111 8.5 14.0444 8.79325 13.2221 9.34265C12.3999 9.89206 11.759 10.673 11.3806 11.5866C11.0022 12.5002 10.9031 13.5055 11.0961 14.4755C11.289 15.4454 11.7652 16.3363 12.4645 17.0355C13.1637 17.7348 14.0546 18.211 15.0245 18.4039C15.9945 18.5969 16.9998 18.4978 17.9134 18.1194C18.827 17.741 19.6079 17.1001 20.1573 16.2779C20.7068 15.4556 21 14.4889 21 13.5C21 12.1739 20.4732 10.9021 19.5355 9.96447C18.5979 9.02678 17.3261 8.5 16 8.5ZM16 16.5C15.4067 16.5 14.8266 16.3241 14.3333 15.9944C13.8399 15.6648 13.4554 15.1962 13.2284 14.6481C13.0013 14.0999 12.9419 13.4967 13.0576 12.9147C13.1734 12.3328 13.4591 11.7982 13.8787 11.3787C14.2982 10.9591 14.8328 10.6734 15.4147 10.5576C15.9967 10.4419 16.5999 10.5013 17.1481 10.7284C17.6962 10.9554 18.1648 11.3399 18.4944 11.8333C18.8241 12.3266 19 12.9067 19 13.5C19 14.2956 18.6839 15.0587 18.1213 15.6213C17.5587 16.1839 16.7956 16.5 16 16.5ZM16 2.5C13.0836 2.50331 10.2877 3.6633 8.22548 5.72548C6.1633 7.78766 5.00331 10.5836 5 13.5C5 17.425 6.81375 21.585 10.25 25.5312C11.794 27.3144 13.5318 28.9202 15.4312 30.3188C15.5994 30.4365 15.7997 30.4997 16.005 30.4997C16.2103 30.4997 16.4106 30.4365 16.5788 30.3188C18.4747 28.9196 20.2091 27.3139 21.75 25.5312C25.1812 21.585 27 17.425 27 13.5C26.9967 10.5836 25.8367 7.78766 23.7745 5.72548C21.7123 3.6633 18.9164 2.50331 16 2.5ZM16 28.25C13.9338 26.625 7 20.6562 7 13.5C7 11.1131 7.94821 8.82387 9.63604 7.13604C11.3239 5.44821 13.6131 4.5 16 4.5C18.3869 4.5 20.6761 5.44821 22.364 7.13604C24.0518 8.82387 25 11.1131 25 13.5C25 20.6537 18.0662 26.625 16 28.25Z" fill="black"/>
</svg>



```

- I created `packages/mon-dpe` with a reusable `MonDpe` component, moved `finance.svg` and `location.svg` into `packages/mon-dpe/assets`, and adapted the component to accept external data/handlers rather than relying on app stores or query hooks.
- I wired `@acme/dashboard` to render `MonDpe` with minimal placeholder props. The app builds successfully.

Run:
```bash
pnpm --filter @acme/dashboard dev
```

Notes:
- The component now imports SVGs as URLs and renders them via img tags to avoid bundler plugin assumptions.
- I removed `@ant-design/icons` usage to prevent unresolved imports.
- You can now delete the root `mon-dpe.tsx` if no longer needed.

```shellscript
pnpm --filter @acme/dashboard dev
```

---

**User**

i meet issues : 


---

**Cursor**

I'll update `dashboard.scss` to replace Sass `@import` with `@use` and switch `$black` to `variables.$black` to remove deprecation warnings, then rebuild the dashboard to verify.

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

- Fixed your build issues:
  - Switched `dashboard.scss` to Sass `@use` and updated `$black` references to `variables.$black`. Deprecation warnings about `@import` are gone.
  - `@acme/mon-dpe` now uses inline img for SVGs and no `@ant-design/icons`, so Vite resolves correctly.

Run:
```bash
pnpm --filter @acme/dashboard dev
```

If anything else pops up (types, props), tell me the exact error.

```shellscript
pnpm --filter @acme/dashboard dev
```

---

**User**

you can check syntax in "packages/mon-dpe/src/mon-dpe.tsx" ; there are many red lines

---

**Cursor**

I'll check the linter/TS diagnostics for `packages/mon-dpe/src/mon-dpe.tsx` to pinpoint the red-line issues and then fix them.

I'll add missing type packages for Leaflet and react-slick, annotate the slider ref callback to avoid implicit any, then re-run the linter to confirm errors are resolved.

```json
{
  "name": "@acme/mon-dpe",
  "version": "0.1.0",
  "private": false,
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  },
  "files": [
    "src",
    "assets"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json"
  },
  "peerDependencies": {
    "antd": "^5.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "dependencies": {
    "classnames": "^2.5.1",
    "leaflet": "^1.9.4",
    "lodash": "^4.17.21",
    "react-leaflet": "^4.2.1",
    "react-slick": "^0.30.2"
  },
  "devDependencies": {
    "@types/classnames": "^2.3.1",
    "@types/lodash": "^4.14.202",
    "@types/leaflet": "^1.9.12",
    "@types/react-slick": "^0.23.13",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "typescript": "^5.5.4"
  }
}



```

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
    return (
      <div className="map-wrapper">
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
            searchDpesMap={searchDpesMap}
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

```typescript
declare module "react-leaflet" {
  import * as React from "react";
  import {
    Map as LeafletMap,
    Marker as LeafletMarker,
    TileLayer as LeafletTileLayer,
  } from "leaflet";

  export interface MapContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    center?: [number, number] | { lat: number; lng: number };
    zoom?: number;
    scrollWheelZoom?: boolean;
  }
  export const MapContainer: React.ForwardRefExoticComponent<MapContainerProps & React.RefAttributes<LeafletMap>>;

  export interface TileLayerProps extends React.HTMLAttributes<HTMLDivElement> {
    url: string;
    attribution?: string;
  }
  export const TileLayer: React.ForwardRefExoticComponent<TileLayerProps & React.RefAttributes<LeafletTileLayer>>;

  export interface MarkerProps {
    position: [number, number] | { lat: number; lng: number };
    icon?: any;
    zIndexOffset?: number;
    eventHandlers?: Record<string, (...args: any[]) => void>;
  }
  export const Marker: React.ForwardRefExoticComponent<MarkerProps & React.RefAttributes<LeafletMarker<any>>>;

  export const Popup: React.FC<{}>;
  export function useMap(): LeafletMap;
}


```

I'll remove the custom React-Leaflet type augment (it conflicts with official types), install missing type packages, then recheck lints for `mon-dpe.tsx`.

```typescript
// intentionally empty; removing incorrect overrides so official types apply


```

- I fixed the red-line issues in `packages/mon-dpe/src/mon-dpe.tsx`:
  - Installed `@types/leaflet` and `@types/react-slick`.
  - Removed the custom React-Leaflet type overrides so official types apply.
  - Annotated the `Slider` ref to avoid implicit any.
  - The file now has no linter/TS errors.

You should see the red lines gone. If any persist, reload TS in your editor.

