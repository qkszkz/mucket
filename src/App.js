import { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  Autocomplete,
} from "@react-google-maps/api";
import { db, auth, provider } from "./firebase";
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

const libraries = ["places"];

function App() {
  const containerStyle = {
    width: "100%",
    height: "calc(100vh - 104px)",
  };

  const [user, setUser] = useState(null);
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser || null);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchPlaces = async () => {
      if (!user) {
        setPlaces([]);
        return;
      }

      const querySnapshot = await getDocs(
        collection(db, "users", user.uid, "places")
      );

      const loadedPlaces = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        favorite: false,
        ...docSnap.data(),
      }));

      setPlaces(loadedPlaces);
    };

    fetchPlaces();
  }, [user]);

  const handleLogin = async () => {
    await signInWithPopup(auth, provider);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setPlaces([]);
    setSelectedPlace(null);
    setMemo("");
    setSearchText("");
    setIsPanelOpen(false);
  };

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
    if (!navigator.geolocation) {
      alert("위치 기능을 지원하지 않는 브라우저입니다.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setMyLocation(location);
        setCenter(location);

        if (map) {
          map.panTo(location);
          map.setZoom(16);
        }
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

    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(16);
    }
  };

  const onPlaceChanged = () => {
    const autocomplete = autocompleteRef.current;
    if (!autocomplete) return;

    const place = autocomplete.getPlace();
    if (!place || !place.geometry || !place.geometry.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const name = place.name || "이름 없는 장소";

    createTempSelectedPlace(name, lat, lng);
  };

  const handlePoiClick = (event, mapInstance) => {
    if (!user) return;
    if (!event.placeId) return;

    event.stop();

    const service = new window.google.maps.places.PlacesService(mapInstance);

    service.getDetails(
      {
        placeId: event.placeId,
        fields: ["name", "geometry"],
      },
      (place, status) => {
        if (
          status !== window.google.maps.places.PlacesServiceStatus.OK ||
          !place ||
          !place.geometry ||
          !place.geometry.location
        ) {
          return;
        }

        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const name = place.name || "이름 없는 장소";

        createTempSelectedPlace(name, lat, lng);
      }
    );
  };

  const handleSelectPlace = (place) => {
    setSelectedPlace(place);
    setMemo(place.memo || "");
    setCenter({ lat: place.lat, lng: place.lng });
    setIsPanelOpen(true);

    if (map) {
      map.panTo({ lat: place.lat, lng: place.lng });
      map.setZoom(16);
    }
  };

  const handleSavePlace = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!selectedPlace) return;

    const placeToSave = {
      ...selectedPlace,
      memo,
      favorite: selectedPlace.favorite || false,
    };

    if (selectedPlace.id) {
      await updateDoc(doc(db, "users", user.uid, "places", selectedPlace.id), {
        memo,
        status: selectedPlace.status,
        favorite: selectedPlace.favorite || false,
      });

      setPlaces((prev) =>
        prev.map((place) =>
          place.id === selectedPlace.id
            ? {
                ...place,
                memo,
                status: selectedPlace.status,
                favorite: selectedPlace.favorite || false,
              }
            : place
        )
      );

      setSelectedPlace((prev) => ({ ...prev, memo }));
      alert("수정되었습니다!");
      return;
    }

    const isAlreadySaved = places.some(
      (place) =>
        place.name === placeToSave.name &&
        place.lat === placeToSave.lat &&
        place.lng === placeToSave.lng
    );

    if (isAlreadySaved) {
      alert("이미 저장된 맛집입니다.");
      return;
    }

    const docRef = await addDoc(
      collection(db, "users", user.uid, "places"),
      placeToSave
    );

    const savedPlace = {
      id: docRef.id,
      ...placeToSave,
    };

    setPlaces((prev) => [...prev, savedPlace]);
    setSelectedPlace(savedPlace);
    alert("맛집이 저장되었습니다!");
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!selectedPlace || !selectedPlace.id) {
      alert("저장된 맛집만 즐겨찾기할 수 있습니다.");
      return;
    }

    const newFavorite = !selectedPlace.favorite;

    await updateDoc(doc(db, "users", user.uid, "places", selectedPlace.id), {
      favorite: newFavorite,
    });

    setPlaces((prev) =>
      prev.map((place) =>
        place.id === selectedPlace.id
          ? { ...place, favorite: newFavorite }
          : place
      )
    );

    setSelectedPlace((prev) => ({
      ...prev,
      favorite: newFavorite,
    }));
  };

  const handleToggleStatus = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!selectedPlace || !selectedPlace.id) {
      alert("저장된 맛집만 상태를 변경할 수 있습니다.");
      return;
    }

    const newStatus = selectedPlace.status === "want" ? "visited" : "want";

    await updateDoc(doc(db, "users", user.uid, "places", selectedPlace.id), {
      status: newStatus,
    });

    setPlaces((prev) =>
      prev.map((place) =>
        place.id === selectedPlace.id
          ? { ...place, status: newStatus }
          : place
      )
    );

    setSelectedPlace((prev) => ({ ...prev, status: newStatus }));
    alert("상태가 변경되었습니다!");
  };

  const handleDeletePlace = async () => {
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }

    if (!selectedPlace || !selectedPlace.id) {
      alert("저장된 맛집만 삭제할 수 있습니다.");
      return;
    }

    if (!window.confirm("정말 이 맛집을 삭제할까요?")) return;

    await deleteDoc(doc(db, "users", user.uid, "places", selectedPlace.id));

    setPlaces((prev) =>
      prev.filter((place) => place.id !== selectedPlace.id)
    );

    setSelectedPlace(null);
    setMemo("");
    setIsPanelOpen(false);

    alert("삭제되었습니다.");
  };

  return (
    <LoadScript
      googleMapsApiKey={process.env.REACT_APP_GOOGLE_MAPS_API_KEY}
      libraries={libraries}
    >
      <div style={{ height: "100vh", backgroundColor: "#f5f5f5" }}>
        <div
          style={{
            height: "40px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            backgroundColor: "white",
            borderBottom: "1px solid #eee",
            boxSizing: "border-box",
            fontSize: "13px",
          }}
        >
          {user ? (
            <>
              <span
                style={{
                  maxWidth: "70%",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {user.displayName || user.email} 님
              </span>

              <button
                onClick={handleLogout}
                style={{
                  border: "none",
                  backgroundColor: "#eee",
                  borderRadius: "999px",
                  padding: "5px 10px",
                  cursor: "pointer",
                }}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <span>로그인 후 내 맛집을 저장할 수 있어요</span>
              <button
                onClick={handleLogin}
                style={{
                  border: "none",
                  backgroundColor: "#ff4d4f",
                  color: "white",
                  borderRadius: "999px",
                  padding: "6px 12px",
                  fontWeight: "bold",
                  cursor: "pointer",
                }}
              >
                Google 로그인
              </button>
            </>
          )}
        </div>

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
                placeholder={
                  user ? "먹킷에서 맛집 검색" : "로그인 후 검색할 수 있어요"
                }
                value={searchText}
                disabled={!user}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setVisiblePlaces([]);
                }}
                style={{
                  width: "100%",
                  height: "44px",
                  padding: "0 14px",
                  borderRadius: "14px",
                  border: "1px solid #ddd",
                  fontSize: "15px",
                  boxSizing: "border-box",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  backgroundColor: user ? "white" : "#f1f1f1",
                }}
              />
            </Autocomplete>
          </div>
        </div>

        <button
          onClick={getMyLocation}
          disabled={!user}
          style={{
            position: "absolute",
            top: "116px",
            right: "14px",
            zIndex: 10,
            padding: "9px 11px",
            backgroundColor: "white",
            border: "1px solid #ddd",
            borderRadius: "12px",
            boxShadow: "0 3px 8px rgba(0,0,0,0.18)",
            cursor: user ? "pointer" : "not-allowed",
            fontSize: "15px",
            fontWeight: "bold",
            opacity: user ? 1 : 0.5,
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

            mapInstance.addListener("click", (event) => {
              handlePoiClick(event, mapInstance);
            });
          }}
          onIdle={updateVisiblePlaces}
          options={{
            gestureHandling: "greedy",
            clickableIcons: true,
          }}
        >
          {filteredPlaces.map((place) => (
            <Marker
              key={place.id}
              position={{ lat: place.lat, lng: place.lng }}
              onClick={() => handleSelectPlace(place)}
              icon={{
                url: place.favorite
                  ? "https://maps.google.com/mapfiles/ms/icons/yellow-dot.png"
                  : place.status === "want"
                  ? "https://maps.google.com/mapfiles/ms/icons/red-dot.png"
                  : "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
              }}
            />
          ))}

          {selectedPlace &&
            !places.some((place) => place.id === selectedPlace.id) && (
              <Marker
                position={{ lat: selectedPlace.lat, lng: selectedPlace.lng }}
              />
            )}

          {myLocation && (
            <Marker
              position={myLocation}
              icon={{
                url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
              }}
            />
          )}
        </GoogleMap>

        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: "white",
            padding: "12px 18px 18px",
            borderTopLeftRadius: "22px",
            borderTopRightRadius: "22px",
            boxShadow: "0 -4px 12px rgba(0,0,0,0.18)",
            maxHeight: isPanelOpen ? "58vh" : "24vh",
            overflowY: "auto",
            transition: "max-height 0.25s ease",
          }}
        >
          <div
            onClick={() => setIsPanelOpen((prev) => !prev)}
            style={{
              width: "46px",
              height: "5px",
              backgroundColor: "#ddd",
              borderRadius: "999px",
              margin: "0 auto 12px",
              cursor: "pointer",
            }}
          />

          <div
            style={{
              maxHeight: isPanelOpen ? "130px" : "120px",
              overflowY: "auto",
              marginBottom: "14px",
              border: "1px solid #eee",
              borderRadius: "12px",
            }}
          >
            {!user ? (
              <p style={{ padding: "12px", margin: 0, color: "#777" }}>
                Google 로그인 후 내 맛집 목록을 사용할 수 있습니다.
              </p>
            ) : listPlaces.length > 0 ? (
              listPlaces.map((place) => (
                <div
                  key={place.id}
                  onClick={() => handleSelectPlace(place)}
                  style={{
                    padding: "12px",
                    borderBottom: "1px solid #eee",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    backgroundColor:
                      selectedPlace?.id === place.id ? "#f8f8f8" : "white",
                  }}
                >
                  <span>
                    {place.favorite ? "⭐ " : ""}
                    {place.name}
                  </span>
                  <span
                    style={{
                      color: place.status === "want" ? "#ff4d4f" : "#2f9e44",
                      fontWeight: "bold",
                    }}
                  >
                    ●
                  </span>
                </div>
              ))
            ) : (
              <p style={{ padding: "12px", margin: 0, color: "#777" }}>
                현재 지도 화면에 저장된 맛집이 없습니다.
              </p>
            )}
          </div>

          {selectedPlace && isPanelOpen ? (
            <div
              style={{
                border: "1px solid #eee",
                borderRadius: "16px",
                padding: "14px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "20px" }}>
                {selectedPlace.name}{" "}
                <span
                  onClick={handleToggleFavorite}
                  style={{
                    cursor: "pointer",
                    fontSize: "24px",
                    marginLeft: "6px",
                  }}
                >
                  {selectedPlace.favorite ? "⭐" : "☆"}
                </span>
              </h2>

              <p
                style={{
                  display: "inline-block",
                  margin: "8px 0 0",
                  padding: "5px 9px",
                  borderRadius: "999px",
                  color: "white",
                  backgroundColor:
                    selectedPlace.status === "want" ? "#ff4d4f" : "#2f9e44",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                {selectedPlace.status === "want" ? "가고싶음" : "가봄"}
              </p>

              <textarea
                placeholder="메모를 입력하세요. 예: 유튜브에서 봄, 대표 메뉴"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                style={{
                  marginTop: "12px",
                  width: "100%",
                  minHeight: "70px",
                  padding: "11px",
                  borderRadius: "12px",
                  border: "1px solid #ddd",
                  resize: "none",
                  boxSizing: "border-box",
                }}
              />

              <button onClick={handleSavePlace} style={buttonStyle("#ff4d4f")}>
                저장하기 / 수정하기
              </button>

              <button
                onClick={handleToggleStatus}
                style={buttonStyle(
                  selectedPlace.status === "want" ? "#2f9e44" : "#ff4d4f"
                )}
              >
                {selectedPlace.status === "want"
                  ? "가봄으로 변경"
                  : "가고싶음으로 변경"}
              </button>

              <button onClick={handleDeletePlace} style={buttonStyle("#666")}>
                삭제하기
              </button>
            </div>
          ) : (
            <p style={{ margin: 0, textAlign: "center", color: "#666" }}>
              핀, 리스트, 또는 지도 위 맛집을 선택하면 정보가 표시됩니다.
            </p>
          )}
        </div>
      </div>
    </LoadScript>
  );
}

const buttonStyle = (backgroundColor) => ({
  marginTop: "8px",
  padding: "12px",
  width: "100%",
  backgroundColor,
  color: "white",
  border: "none",
  borderRadius: "12px",
  cursor: "pointer",
  fontSize: "15px",
  fontWeight: "bold",
});

export default App;