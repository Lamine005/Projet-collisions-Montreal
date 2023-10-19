// Initialiser et ajouter la carte
let map;

// Fonction asynchrone pour initialiser la carte
async function initMap() {
  // La localisation 
  const position = { lat: 45.468196, lng: -73.566054 };

  // Importe les bibliothèques nécessaires de Google Maps
  //@ts-ignore
  const { Map } = await google.maps.importLibrary("maps");
  const { AdvancedMarkerElement } = await google.maps.importLibrary("marker");

  // Crée une instance de carte Google Maps
  map = new Map(document.getElementById("map"), {
    zoom: 8, // Niveau de zoom initial
    center: position, // Centre la carte sur la position spécifiée
    mapId: "DEMO_MAP_ID", // Identifiant de la carte (remplacez par votre propre ID)
  });

  // Crée un marqueur avancé sur la carte
  const marker = new AdvancedMarkerElement({
    map: map, // Lie le marqueur à la carte que nous venons de créer
    position: position, // Positionne le marqueur à la latitude et longitude spécifiées
    title: "Rue avec plus d'accident", // Titre du marqueur
  });
}

// Appelle la fonction d'initialisation de la carte
initMap();
