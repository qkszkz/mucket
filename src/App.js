import { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";
import { db } from "./firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
} from "firebase/firestore";

const libraries = ["places"];

function App() {
  const containerStyle = {
    width: "100%",
    height: "calc(100vh - 60px)", // 🔥 검색바 제외한 높이
  };

  const [map, setMap] = useState(null);
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.978 });
  const [places, setPlaces] = useState([]);
  const [visiblePlaces, setVisiblePlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [memo, setMemo] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [myLocation, setMyLocation] = useState(null);

  const autocompleteRef = useRef(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      const querySnapshot = await getDocs(collection(db, "places"));
      const loadedPlaces = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        favorite: false,
        ...docSnap.data(),
      }));
      setPlaces(loadedPlaces);
    };

    fetchPlaces();
  }, []);

  const filteredPlaces = places.filter((place) =>
    place.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const listPlaces =
    visiblePlaces.length > 0 ? visiblePlaces : filteredPlaces;

  const updateVisiblePlaces = () => {
    if (!map) return;

    const bounds = map.getBounds();
    if (!bounds) return;

    const filteredByBounds = filteredPlaces.filter((place) => {
      const latLng = new window.google.maps.LatLng(place.lat, place.lng);
      return bounds.contains(latLng);
    });

    setVisiblePlaces(filteredByBounds);
  };

  const getMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setMyLocation(location);
        setCenter(location);

        map.panTo(location);
        map.setZoom(16);
      },
      () => {
        alert("위치 정보를 가져올 수 없습니다.");
      }
    );
  };

  const onLoadAutocomplete = (autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const createTempSelectedPlace = (name, lat, lng) => {
    const newPlace = {
      name,
      lat,
      lng,
      status: "want",
      memo: "",
      favorite: false,
    };

    setCenter({ lat, lng });
    setSelectedPlace(newPlace);
    setSearchText(name);
    setMemo("");
    setIsPanelOpen(true);

    map.panTo({ lat, lng });
    map.setZoom(16);
  };

  const onPlaceChanged = () => {
    const place = autocompleteRef.current.getPlace();

    if (!place.geometry) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();

    createTempSelectedPlace(place.name, lat, lng);
  };

  const handlePoiClick = (event, mapInstance) => {
    if (!event.placeId) return;

    event.stop();

    const service = new window.google.maps.places.PlacesService(mapInstance);

    service.getDetails(
      {
        placeId: event.placeId,
        fields: ["name", "geometry"],
      },
      (place, status) => {
        if (status !== "OK" || !place.geometry) return;

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();

        createTempSelectedPlace(place.name, lat, lng);
      }
    );
  };

  const handleSelectPlace = (place) => {
    setSelectedPlace(place);
    setMemo(place.memo || "");
    setCenter({ lat: place.lat, lng: place.lng });
    setIsPanelOpen(true);

    map.panTo({ lat: place.lat, lng: place.lng });
    map.setZoom(16);
  };

  const handleToggleFavorite = async () => {
    if (!selectedPlace.id) return;

    const newFavorite = !selectedPlace.favorite;

    await updateDoc(doc(db, "places", selectedPlace.id), {
      favorite: newFavorite,
    });

    setSelectedPlace((prev) => ({
      ...prev,
      favorite: newFavorite,
    }));

    setPlaces((prev) =>
      prev.map((p) =>
        p.id === selectedPlace.id ? { ...p, favorite: newFavorite } : p
      )
    );
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
    >
      <div style={{ height: "100vh", background: "#f5f5f5" }}>
        
        {/* 🔥 상단 검색바 */}
        <div
          style={{
            height: "60px",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            background: "white",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            zIndex: 10,
          }}
        >
          <Autocomplete
            onLoad={onLoadAutocomplete}
            onPlaceChanged={onPlaceChanged}
          >
            <input
              placeholder="먹킷에서 맛집 검색"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: "100%",
                padding: "10px",
                borderRadius: "10px",
                border: "1px solid #ddd",
              }}
            />
          </Autocomplete>
        </div>

        {/* 📍 위치 버튼 */}
        <button
          onClick={getMyLocation}
          style={{
            position: "absolute",
            top: "70px",
            right: "14px",
            zIndex: 10,
            background: "white",
            padding: "8px",
            borderRadius: "10px",
            border: "1px solid #ddd",
          }}
        >
          📍
        </button>

        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          onLoad={(mapInstance) => {
            setMap(mapInstance);
            mapInstance.addListener("click", (e) =>
              handlePoiClick(e, mapInstance)
            );
          }}
          onIdle={updateVisiblePlaces}
          options={{
            gestureHandling: "greedy",
            clickableIcons: true,
          }}
        >
          {places.map((place) => (
            <Marker
              key={place.id}
              position={{ lat: place.lat, lng: place.lng }}
              onClick={() => handleSelectPlace(place)}
              icon={{
                url: place.favorite
                  ? "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
                  : "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
              }}
            />
          ))}

          {myLocation && (
            <Marker
              position={myLocation}
              icon={{
                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
              }}
            />
          )}
        </GoogleMap>

        {/* 🔥 하단 패널 */}
        <div
          style={{
            position: "fixed",
            bottom: 0,
            width: "100%",
            background: "white",
            padding: "14px",
          }}
        >
          {selectedPlace && (
            <>
              <h2>
                {selectedPlace.name}{" "}
                <span onClick={handleToggleFavorite}>
                  {selectedPlace.favorite ? "⭐" : "☆"}
                </span>
              </h2>

              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                style={{ width: "100%" }}
              />
            </>
          )}
        </div>
      </div>
    </LoadScript>
  );
}

export default App;