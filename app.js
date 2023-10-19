const express = require('express');
const axios = require('axios');
const csvtojson = require('csvtojson');
const mongoose = require('mongoose');
const cors = require('cors');
const ejs = require('ejs');
const path = require('path');

// Créer un schéma pour les données de collision
const collisionSchema = new mongoose.Schema({
  // Définir les champs en fonction de la structure du fichier CSV
  _id: { type: Number },
JR_SEMN_ACCDN: String,
DT_ACCDN: String,
CD_MUNCP: Number,
NO_CIVIQ_ACCDN: Number,
SFX_NO_CIVIQ_ACCDN: String,
BORNE_KM_ACCDN: Number,
RUE_ACCDN: String,
TP_REPRR_ACCDN: Number,
ACCDN_PRES_DE: String,
NB_METRE_DIST_ACCD: Number,
CD_GENRE_ACCDN: Number,
CD_SIT_PRTCE_ACCDN: Number,
CD_ETAT_SURFC: Number,
CD_ECLRM: Number,
CD_ENVRN_ACCDN: Number,
NO_ROUTE: Number,
CD_CATEG_ROUTE: Number,
CD_ETAT_CHASS: Number,
CD_ASPCT_ROUTE: Number,
CD_LOCLN_ACCDN: Number,
CD_POSI_ACCDN: Number,
CD_CONFG_ROUTE: Number,
CD_ZON_TRAVX_ROUTR: Number,
CD_PNT_CDRNL_ROUTE: String,
CD_PNT_CDRNL_REPRR: String,
CD_COND_METEO: Number,
NB_VEH_IMPLIQUES_ACCDN: Number,
NB_MORTS: Number,
NB_BLESSES_GRAVES: Number,
NB_BLESSES_LEGERS: Number,
HEURE_ACCDN: String,
AN: Number,
NB_VICTIMES_TOTAL: Number,
GRAVITE: String,
REG_ADM: String,
MRC: String,
nb_automobile_camion_leger: Number,
nb_camionLourd_tractRoutier: Number,
nb_outil_equipement: Number,
nb_tous_autobus_minibus: Number,
nb_bicyclette: Number,
nb_cyclomoteur: Number,
nb_motocyclette: Number,
nb_taxi: Number,
nb_urgence: Number,
nb_motoneige: Number,
nb_VHR: Number,
nb_autres_types: Number,
nb_veh_non_precise: Number,
NB_DECES_PIETON: Number,
NB_BLESSES_PIETON: Number,
NB_VICTIMES_PIETON: Number,
NB_DECES_MOTO: Number,
NB_BLESSES_MOTO: Number,
NB_VICTIMES_MOTO: Number,
NB_DECES_VELO: Number,
NB_BLESSES_VELO: Number,
NB_VICTIMES_VELO: Number,
VITESSE_AUTOR: Number,
LOC_X: Number,
LOC_Y: Number,
LOC_COTE_QD: String,
LOC_COTE_PD: Number,
LOC_DETACHEE: String,
LOC_IMPRECISION: String,
LOC_LONG: Number,
LOC_LAT: Number,
});

// Créer un modèle basé sur le schéma
const Collision = mongoose.model('Collision', collisionSchema);

// Créer une instance de l'application Express
const app = express();
app.use(express.static(__dirname + '/'));
app.use(cors()); // Activer CORS

// Configure EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.engine('ejs', ejs.renderFile);

// Se connecter à la base de données MongoDB
mongoose.connect('mongodb://localhost:27017', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Erreur de connexion à MongoDB :'));
db.once('open', () => {
  console.log('Connecté à MongoDB');
});

// Variable pour stocker les données en cache
let cachedData = [];
let lastFetchTime = null;
let collisionData = []

// Définir l'endpoint pour récupérer et stocker les données de collision depuis l'API ou le CSV
app.get('/api/collisions', async (req, res) => {
  try {
    const currentTime = new Date();

    // Vérifier si les données en cache sont récentes (moins de 24 heures)
    if (lastFetchTime && currentTime - lastFetchTime < 24 * 60 * 60 * 1000) {
      // Renvoyer les données en cache directement
      res.json({ collisions: cachedData });
    } else {
      ;

      // Essayer de récupérer les données de l'API de Montréal
      try {
        const response = await axios.get('https://donnees.montreal.ca/api/3/action/datastore_search?resource_id=05deae93-d9fc-4acb-9779-e0942b5e962f&limit=50000');
        collisionData = response.data.result.records;
      } catch (apiError) {
        console.error(apiError);

        // Lire le fichier CSV et le convertir en JSON
        
        try {
          collisionData = await csvtojson().fromFile('collisions_routieres.csv');
        } catch (csvError) {
          console.error(csvError);
          return res.status(500).json({ error: 'Échec de récupération des données de collision depuis l\'API ou de conversion CSV vers JSON.' });
        }
      }

      // Enregistrer les données de collision dans la base de données MongoDB
      try {
        await Collision.deleteMany({}); // Supprimer toutes les données existantes
        await Collision.insertMany(collisionData); // Insérer les nouvelles données
      } catch (dbError) {
        console.error(dbError);
        return res.status(500).json({ error: 'Échec de l\'enregistrement des données de collision dans la base de données.' });
      }

      // Mettre à jour les données en cache et l'heure du dernier appel
      cachedData = collisionData;
      lastFetchTime = currentTime;

      // Renvoyer les données de collision en réponse
      res.json({ collisions: cachedData });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Une erreur inattendue s\'est produite.' });
  }
});
 
app.get('/api/collisions/metric/:id', async (req, res) => {
    try {
      const { id } = req.params;
  
      // Fetch les collisions à partir de la base de données
      const collisionData = await Collision.findById(id);
  
      // Extraire les données nécessaires pour l'affichage des données descriptive
      if (collisionData) {
        const { NO_CIVIQ_ACCDN, RUE_ACCDN, GRAVITE, NB_VICTIMES_TOTAL, AN } = collisionData;
        const descriptiveData = {
          NO_CIVIQ_ACCDN,
          RUE_ACCDN,
          GRAVITE,
          NB_VICTIMES_TOTAL,
          DT_ACCDN: AN,
        };
  
        // Calculer les paramètres d'agrégation
        const maxAccidentsStreet = await Collision.aggregate([
          { $match: { AN: { $gte: 2012, $lte: 2022 } } },
          { $group: { _id: "$RUE_ACCDN", totalAccidents: { $sum: 1 } } },
          { $sort: { totalAccidents: -1 } },
          { $limit: 1 }
        ]);
        
        const maxCollisionsYear = await Collision.aggregate([
          { $group: { _id: "$AN", totalCollisions: { $sum: 1 } } },
          { $sort: { totalCollisions: -1 } },
          { $limit: 1 }
        ]);
        
        const maxDeathsYear = await Collision.aggregate([
          { $group: { _id: "$AN", totalDeaths: { $sum: "$NB_MORTS" } } },
          { $sort: { totalDeaths: -1 } },
          { $limit: 1 }
        ]);
        
        const averageDeathsPerAccident = await Collision.aggregate([
          { $group: { _id: null, totalDeaths: { $sum: "$NB_MORTS" }, totalAccidents: { $sum: 1 } } },
          { $project: { _id: 0, averageDeathsPerAccident: { $divide: ["$totalDeaths", "$totalAccidents"] } } }
        ]);
        
        const minDeathsYear = await Collision.aggregate([
          { $group: { _id: "$AN", totalDeaths: { $sum: "$NB_MORTS" } } },
          { $sort: { totalDeaths: -1 } },
          { $limit: 1 }
        ]);

        
        
        // Préparer les données d'agrégation
        const aggregationData = [
          { metric: 'Rue avec le plus d\'accidents', value: maxAccidentsStreet[0]._id },
          { metric: 'Année avec le plus de morts', value: maxDeathsYear[0]._id },
          { metric: 'Moyenne de morts par accident', value: averageDeathsPerAccident[0].averageDeathsPerAccident },
          { metric: 'Année avec le plus de collisions', value: maxCollisionsYear[0]._id },
          { metric: 'Année avec le moins de morts', value: minDeathsYear[0]._id }
        ];
        
        const data = {
          descriptiveData,
          aggregationData
        };
        
        // Rendre le modèle et envoyer la réponse HTML
        res.render('metric', { data });
      } else {
        // Gérer le cas où aucune collision n'est trouvée
        res.status(404).send('Aucune donnée de collision trouvée.');
      }
    } catch (error) {
      console.error(error);
      res.status(500).send('Une erreur inattendue s\'est produite.');
    }
  });
  
  // Route pour renvoyer à la page Google HTML
  app.get('/google', (req, res) => {
    res.sendFile(path.join(__dirname, 'google.html'));
  });
  
  
  
  app.get('/api/collisions1', async (req, res) => {
    try {
      collisionData = await csvtojson().fromFile('collisions_routieres.csv');
      res.send(collisionData)
    } catch (csvError) {
      console.error(csvError);
    res.status(500).json({ error: 'Échec de récupération des données de collision depuis l\'API ou de conversion CSV vers JSON.' });
    
    }})

    
    
  app.listen(3000, () => {
    console.log('Serveur démarré sur le port 3000')});
  