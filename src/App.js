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
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

function App() {
  const containerStyle = {
    width: "100%",
    height: "400px",
  };

  const [map, setMap] = useState(null);
  const [center, setCenter] = useState({
    lat: 37.5665,
    lng: 126.978,
  });

  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [memo, setMemo] = useState("");

  const autocompleteRef = useRef(null);

  useEffect(() => {
    const fetchPlaces = async () => {
      const querySnapshot = await getDocs(collection(db, "places"));
      const loadedPlaces = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setPlaces(loadedPlaces);
    };

    fetchPlaces();
  }, []);

  const filteredPlaces = places.filter((place) =>
    place.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const onLoadAutocomplete = (autocomplete) => {
    autocompleteRef.current = autocomplete;
  };

  const onPlaceChanged = () => {
    const autocomplete = autocompleteRef.current;
    if (!autocomplete) return;

    const place = autocomplete.getPlace();

    if (!place || !place.geometry || !place.geometry.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const name = place.name || "이름 없는 장소";

    const newPlace = {
      name,
      lat,
      lng,
      status: "want",
      memo: "",
    };

    setCenter({ lat, lng });
    setSelectedPlace(newPlace);
    setSearchText(name);
    setMemo("");

    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(16);
    }
  };

  const handleSelectPlace = (place) => {
    setSelectedPlace(place);
    setMemo(place.memo || "");
    setCenter({ lat: place.lat, lng: place.lng });

    if (map) {
      map.panTo({ lat: place.lat, lng: place.lng });
      map.setZoom(16);
    }
  };

  const handleSavePlace = async () => {
    if (!selectedPlace) return;

    const placeToSave = {
      ...selectedPlace,
      memo: memo,
    };

    if (selectedPlace.id) {
      const placeRef = doc(db, "places", selectedPlace.id);

      await updateDoc(placeRef, {
        memo: memo,
        status: selectedPlace.status,
      });

      setPlaces((prev) =>
        prev.map((place) =>
          place.id === selectedPlace.id ? { ...place, memo: memo } : place
        )
      );

      setSelectedPlace((prev) => ({
        ...prev,
        memo: memo,
      }));

      alert("메모가 수정되었습니다!");
      return;
    }

    const docRef = await addDoc(collection(db, "places"), placeToSave);

    const savedPlace = {
      id: docRef.id,
      ...placeToSave,
    };

    setPlaces((prev) => [...prev, savedPlace]);
    setSelectedPlace(savedPlace);

    alert("맛집이 저장되었습니다!");
  };

  const handleToggleStatus = async () => {
    if (!selectedPlace || !selectedPlace.id) {
      alert("저장된 맛집만 상태를 변경할 수 있습니다.");
      return;
    }

    const newStatus = selectedPlace.status === "want" ? "visited" : "want";
    const placeRef = doc(db, "places", selectedPlace.id);

    await updateDoc(placeRef, {
      status: newStatus,
    });

    setPlaces((prev) =>
      prev.map((place) =>
        place.id === selectedPlace.id
          ? { ...place, status: newStatus }
          : place
      )
    );

    setSelectedPlace((prev) => ({
      ...prev,
      status: newStatus,
    }));

    alert("상태가 변경되었습니다!");
  };

  const handleDeletePlace = async () => {
    if (!selectedPlace || !selectedPlace.id) {
      alert("저장된 맛집만 삭제할 수 있습니다.");
      return;
    }

    const confirmDelete = window.confirm("정말 이 맛집을 삭제할까요?");
    if (!confirmDelete) return;

    await deleteDoc(doc(db, "places", selectedPlace.id));

    setPlaces((prev) =>
      prev.filter((place) => place.id !== selectedPlace.id)
    );

    setSelectedPlace(null);
    setMemo("");

    alert("삭제되었습니다.");
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
      libraries={["places"]}
    >
      <div style={{ height: "100vh", backgroundColor: "#f5f5f5" }}>
        <h1 style={{ textAlign: "center", margin: 0, padding: "16px 0" }}>
          🍽 먹킷
        </h1>

        <div
          style={{
            position: "absolute",
            top: "70px",
            left: "50%",
            transform: "translateX(-50%)",
            width: "80%",
            zIndex: 10,
          }}
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
              placeholder="맛집 검색..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "10px",
                border: "1px solid #ddd",
                boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
                fontSize: "14px",
              }}
            />
          </Autocomplete>
        </div>

        <GoogleMap
          mapContainerStyle={containerStyle}
          center={center}
          zoom={13}
          onLoad={(mapInstance) => setMap(mapInstance)}
        >
          {filteredPlaces.map((place) => (
            <Marker
              key={place.id}
              position={{ lat: place.lat, lng: place.lng }}
              onClick={() => handleSelectPlace(place)}
              icon={{
                url:
                  place.status === "want"
                    ? "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
                    : "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
              }}
            />
          ))}

          {selectedPlace &&
            !places.some((place) => place.id === selectedPlace.id) && (
              <Marker
                position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
              />
            )}
        </GoogleMap>

        <div
          style={{
            position: "fixed",
            bottom: 0,
            width: "100%",
            backgroundColor: "white",
            padding: "10px 20px 20px 20px",
            borderTop: "1px solid #ddd",
            boxShadow: "0 -2px 5px rgba(0,0,0,0.1)",
          }}
        >
          <div
            style={{
              maxHeight: "120px",
              overflowY: "auto",
              marginBottom: "10px",
            }}
          >
            {filteredPlaces.map((place) => (
              <div
                key={place.id}
                onClick={() => handleSelectPlace(place)}
                style={{
                  padding: "10px",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>{place.name}</span>
                <span
                  style={{
                    color: place.status === "want" ? "red" : "green",
                    fontWeight: "bold",
                  }}
                >
                  ●
                </span>
              </div>
            ))}
          </div>

          {selectedPlace ? (
            <>
              <h3 style={{ margin: 0 }}>{selectedPlace.name}</h3>

              <p style={{ marginTop: "8px", marginBottom: 0 }}>
                상태:{" "}
                <span
                  style={{
                    color: selectedPlace.status === "want" ? "red" : "green",
                    fontWeight: "bold",
                  }}
                >
                  {selectedPlace.status === "want" ? "가고싶음" : "가봄"}
                </span>
              </p>

              <textarea
                placeholder="메모를 입력하세요 (왜 저장했는지, 먹고 싶은 메뉴 등)"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                style={{
                  marginTop: "10px",
                  width: "100%",
                  padding: "10px",
                  borderRadius: "8px",
                  border: "1px solid #ddd",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />

              <button
                onClick={handleSavePlace}
                style={{
                  marginTop: "10px",
                  padding: "10px",
                  width: "100%",
                  backgroundColor: "#ff4d4f",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                }}
              >
                저장하기 / 수정하기
              </button>

              <button
                onClick={handleToggleStatus}
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  width: "100%",
                  backgroundColor:
                    selectedPlace.status === "want" ? "#2f9e44" : "#ff4d4f",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                }}
              >
                {selectedPlace.status === "want"
                  ? "가봄으로 변경"
                  : "가고싶음으로 변경"}
              </button>

              <button
                onClick={handleDeletePlace}
                style={{
                  marginTop: "8px",
                  padding: "10px",
                  width: "100%",
                  backgroundColor: "#666",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "15px",
                  fontWeight: "bold",
                }}
              >
                삭제하기
              </button>
            </>
          ) : (
            <p style={{ margin: 0 }}>
              핀 또는 리스트를 선택하면 가게 정보가 표시됩니다.
            </p>
          )}
        </div>
      </div>
    </LoadScript>
  );
}

export default App;