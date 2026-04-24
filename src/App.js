// 🔥 핵심: favorite 필드 추가됨

// 기존 import 그대로 유지
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

const libraries = ["places"];

function App() {
  const containerStyle = {
    width: "100%",
    height: "65vh",
  };

  const [map, setMap] = useState(null);
  const [center, setCenter] = useState({ lat: 37.5665, lng: 126.978 });
  const [places, setPlaces] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [memo, setMemo] = useState("");
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    const fetchPlaces = async () => {
      const querySnapshot = await getDocs(collection(db, "places"));
      const loaded = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPlaces(loaded);
    };
    fetchPlaces();
  }, []);

  const createTempPlace = (name, lat, lng) => {
    setSelectedPlace({
      name,
      lat,
      lng,
      status: "want",
      memo: "",
      favorite: false,
    });
    setMemo("");
    setIsPanelOpen(true);
  };

  const handleSave = async () => {
    if (!selectedPlace) return;

    if (selectedPlace.id) {
      await updateDoc(doc(db, "places", selectedPlace.id), {
        memo,
        favorite: selectedPlace.favorite,
      });
      alert("수정 완료");
      return;
    }

    const docRef = await addDoc(collection(db, "places"), {
      ...selectedPlace,
      memo,
    });

    setSelectedPlace({ ...selectedPlace, id: docRef.id });
    alert("저장 완료");
  };

  const toggleFavorite = async () => {
    if (!selectedPlace) return;

    const newFav = !selectedPlace.favorite;

    if (selectedPlace.id) {
      await updateDoc(doc(db, "places", selectedPlace.id), {
        favorite: newFav,
      });
    }

    setSelectedPlace((prev) => ({
      ...prev,
      favorite: newFav,
    }));
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={13}
        onLoad={(m) => setMap(m)}
        options={{ gestureHandling: "greedy" }}
      >
        {places.map((p) => (
          <Marker
            key={p.id}
            position={{ lat: p.lat, lng: p.lng }}
            onClick={() => {
              setSelectedPlace(p);
              setMemo(p.memo || "");
              setIsPanelOpen(true);
            }}
            icon={{
              url: p.favorite
                ? "http://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
                : "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
            }}
          />
        ))}
      </GoogleMap>

      {/* ⭐ 하단 패널 */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          width: "100%",
          background: "white",
          padding: "16px",
        }}
      >
        {selectedPlace && (
          <>
            <h2>
              {selectedPlace.name}{" "}
              <span onClick={toggleFavorite} style={{ cursor: "pointer" }}>
                {selectedPlace.favorite ? "⭐" : "☆"}
              </span>
            </h2>

            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="메모"
              style={{ width: "100%" }}
            />

            <button onClick={handleSave}>저장</button>
          </>
        )}
      </div>
    </LoadScript>
  );
}

export default App;