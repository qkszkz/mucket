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
  const [favorites, setFavorites] = useState([]);

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

    const newPlace = {
      name: place.name,
      lat: location.lat(),
      lng: location.lng(),
    };

    map.panTo(newPlace);
    setSelectedPlace(newPlace);
    setSearchText(place.name);
  };

  // ⭐ 즐겨찾기 토글
  const toggleFavorite = () => {
    if (!selectedPlace) return;

    const exists = favorites.find(
      (p) => p.name === selectedPlace.name
    );

    if (exists) {
      setFavorites(favorites.filter((p) => p.name !== selectedPlace.name));
    } else {
      setFavorites([...favorites, selectedPlace]);
    }
  };

  const isFavorite = selectedPlace
    ? favorites.some((p) => p.name === selectedPlace.name)
    : false;

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

      {/* 🔥 하단 패널 */}
      {selectedPlace && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "200px",
            backgroundColor: "white",
            borderTopLeftRadius: "16px",
            borderTopRightRadius: "16px",
            boxShadow: "0 -2px 10px rgba(0,0,0,0.2)",
            padding: "16px",
            boxSizing: "border-box",
          }}
        >
          <h3 style={{ margin: 0 }}>{selectedPlace.name}</h3>

          <button
            onClick={toggleFavorite}
            style={{
              marginTop: "10px",
              padding: "8px 12px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: isFavorite ? "#ff4757" : "#eee",
              color: isFavorite ? "white" : "black",
              cursor: "pointer",
            }}
          >
            {isFavorite ? "★ 즐겨찾기 해제" : "☆ 즐겨찾기"}
          </button>
        </div>
      )}

      {/* 🔥 즐겨찾기 리스트 */}
      {favorites.length > 0 && (
        <div
          style={{
            position: "fixed",
            bottom: "210px",
            left: "10px",
            background: "white",
            padding: "10px",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <b>⭐ 즐겨찾기</b>
          {favorites.map((place, idx) => (
            <div
              key={idx}
              style={{ cursor: "pointer", marginTop: "5px" }}
              onClick={() => {
                setSelectedPlace(place);
                map.panTo(place);
              }}
            >
              {place.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;