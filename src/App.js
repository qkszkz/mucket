import React, { useState, useRef } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";

const libraries = ["places"];

const containerStyle = {
  width: "100%",
  height: "calc(100vh - 64px)",
};

const center = {
  lat: 37.5665,
  lng: 126.978,
};

function App() {
  const [map, setMap] = useState(null);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchText, setSearchText] = useState("");

  const autocompleteRef = useRef(null);

  const onLoadMap = (mapInstance) => {
    setMap(mapInstance);
  };

  const onLoadAutocomplete = (auto) => {
    autocompleteRef.current = auto;
  };

  const onPlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();

    if (!place.geometry) return;

    const location = place.geometry.location;

    map.panTo({
      lat: location.lat(),
      lng: location.lng(),
    });

    setSelectedPlace({
      name: place.name,
      lat: location.lat(),
      lng: location.lng(),
    });

    setSearchText(place.name);
  };

  return (
    <div>
      {/* 🔥 상단 검색바 */}
      <div
        style={{
          height: "64px",
          display: "flex",
          alignItems: "center",
          padding: "10px 14px",
          backgroundColor: "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          boxSizing: "border-box",
          zIndex: 10,
        }}
      >
        <div style={{ width: "100%" }}>
          <LoadScript
            googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
            libraries={libraries}
          >
            <Autocomplete
              onLoad={onLoadAutocomplete}
              onPlaceChanged={onPlaceChanged}
              options={{
                types: ["establishment"],
                componentRestrictions: { country: "kr" },
              }}
            >
              <input
                type="text"
                placeholder="먹킷에서 맛집 검색"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "14px",
                  border: "1px solid #ddd",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                }}
              />
            </Autocomplete>
          </LoadScript>
        </div>
      </div>

      {/* 🔥 지도 */}
      <LoadScript
        googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
        libraries={libraries}
      >
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          onLoad={onLoadMap}
          options={{
            gestureHandling: "greedy",
          }}
        >
          {selectedPlace && (
            <Marker
              position={{
                lat: selectedPlace.lat,
                lng: selectedPlace.lng,
              }}
              onClick={() => setSelectedPlace(selectedPlace)}
            />
          )}
        </GoogleMap>
      </LoadScript>

      {/* 🔥 하단 슬라이드 패널 */}
      {selectedPlace && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "160px",
            backgroundColor: "white",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
            boxShadow: "0 -2px 10px rgba(0,0,0,0.2)",
            padding: "16px",
            boxSizing: "border-box",
          }}
        >
          <h3 style={{ margin: 0 }}>{selectedPlace.name}</h3>
          <p style={{ color: "#666", marginTop: "8px" }}>
            선택한 맛집 정보 표시 영역
          </p>
        </div>
      )}
    </div>
  );
}

export default App;