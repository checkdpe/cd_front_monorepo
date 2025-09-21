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


