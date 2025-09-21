import React from "react";
import { MonDpe } from "@acme/mon-dpe";
import { MonDpe2 } from "@acme/mon-dpe";

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


