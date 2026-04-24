const handleMapClick = (event) => {
  if (!event.placeId || !map) return;

  event.stop();

  const service = new window.google.maps.places.PlacesService(map);

  service.getDetails(
    {
      placeId: event.placeId,
      fields: ["name", "geometry", "types"],
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

      const newPlace = {
        name: place.name || "이름 없는 장소",
        lat,
        lng,
        status: "want",
        memo: "",
      };

      setCenter({ lat, lng });
      setSelectedPlace(newPlace);
      setSearchText(place.name || "");
      setMemo("");
      setIsPanelOpen(true);
    }
  );
};