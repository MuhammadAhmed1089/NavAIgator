import React, { useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import './UpcomingChangesMap.css';

// Downloaded topojson for US states
const geoUrl = "/states-10m.json"; // We will put this in public folder or import it

// Hardcoded coordinates and data based on our T1-T5 change tracking tests
const markers = [
  {
    name: "California",
    coordinates: [-119.4179, 36.7783],
    title: "CA AB 325 / SB 763",
    status: "not_yet_effective",
    year: "2026",
    description: "Applies starting Jan 2, 2026. Prohibits common pricing algorithms.",
    affected: 250
  },
  {
    name: "New Jersey",
    coordinates: [-74.4057, 40.0583],
    title: "NJ FAIR Act",
    status: "not_yet_effective",
    year: "2027",
    description: "Applies starting July 2, 2027. Statewide prohibition on algorithmic rent-setting.",
    affected: 140
  },
  {
    name: "Massachusetts",
    coordinates: [-71.3824, 42.4072],
    title: "MA S.2983 & H.5222",
    status: "pending",
    year: "Pending",
    description: "Bills strictly marked as 'pending'. Targets algorithmic rent fixing.",
    affected: 110
  }
];

export default function UpcomingChangesMap() {
  const [activeMarker, setActiveMarker] = useState(null);

  return (
    <div className="upcoming-map-container">
      <div className="map-header">
        <h2>Upcoming & Pending Legislation</h2>
        <p>Interactive dashboard showing rules that are pending or not yet effective.</p>
      </div>
      
      <div className="map-wrapper">
        <ComposableMap projection="geoAlbersUsa" className="us-map">
          <Geographies geography="/states-10m.json">
            {({ geographies }) =>
              geographies.map((geo) => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#ffffff" /* White states */
                  stroke="#0a3161" /* Navy blue borders */
                  strokeWidth={0.75}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#b31942", outline: "none" }, /* Red hover */
                    pressed: { outline: "none" },
                  }}
                />
              ))
            }
          </Geographies>
          
          {markers.map((marker, index) => (
            <Marker key={index} coordinates={marker.coordinates} onClick={() => setActiveMarker(marker)}>
              <circle r={8} fill="#b31942" className="marker-dot" />
              <circle r={14} fill="rgba(179, 25, 66, 0.3)" className="marker-glow" />
            </Marker>
          ))}
        </ComposableMap>

        {activeMarker && (
          <div className="map-popover glass-panel">
            <div className="popover-header">
              <h3>{activeMarker.title}</h3>
              <button className="close-btn" onClick={() => setActiveMarker(null)}>×</button>
            </div>
            <div className="popover-body">
              <div className="status-badge">
                {activeMarker.year} • <span className={`status-${activeMarker.status}`}>{activeMarker.status.replace(/_/g, ' ')}</span>
              </div>
              <p>{activeMarker.description}</p>
              <div className="affected-count">
                <strong>{activeMarker.affected}</strong> affected properties in our data
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
