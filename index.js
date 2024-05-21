const express = require("express");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get } = require("firebase/database");
const moment = require("moment-timezone");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAuU5qac9KqPpLt4_d6B5OEKPZWua5YqVk",
  authDomain: "atm--project.firebaseapp.com",
  databaseURL:
    "https://atm--project-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "atm--project",
  storageBucket: "atm--project.appspot.com",
  messagingSenderId: "5612719051",
  appId: "1:5612719051:web:28b7904ad325f86b39c44e",
};
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

const app = express();

app.use(cors()); // Enable CORS

// MongoDB URI
const uri =
  "mongodb+srv://dsperera1997:MzGSnANzhRMnK3n8@cluster0.t8zqcyz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Middleware to connect to MongoDB once and use the client in all routes
async function connectMongoDB(req, res, next) {
  try {
    // Check if client is connected
    if (!client.topology || !client.topology.isConnected()) {
      await client.connect();
      console.log("Connected to MongoDB");
    }
    req.mongoClient = client;
    next();
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

app.use(connectMongoDB);

// Function to fetch data from Firebase and store it in MongoDB
let previousDeviceTime = null; // Store the previous device time
let state = false; // Store the previous device time

async function fetchDataAndUpdateMongoDB() {
  try {
    // Reference to the root of the database
    const dbRef = ref(database);
    // Fetch the data once from the reference
    const snapshot = await get(dbRef);

    if (!snapshot.exists()) {
      console.error("No data available");
      return;
    }

    // Get the value from the snapshot
    const data = snapshot.val();
    let currentDeviceTime = data.device1.time;
    console.log(currentDeviceTime);
    if (currentDeviceTime === previousDeviceTime) {
      state = false;
      console.log("device offline");
      return;
    }

    // Update the previous device time
    previousDeviceTime = currentDeviceTime;

    // Get current date and time in Colombo
    const currentDateTime = moment().tz("Asia/Colombo").format();

    // Specify the new database and collection
    const mongoDatabase = client.db("nDB"); // Use 'newDB' instead of 'sampleDB'
    const collection = mongoDatabase.collection("sampleCollection");
    state=true;

    // Construct the document to be inserted
    const document = {
      data,
      state,
      timestamp: currentDateTime,
    };

    // Insert the document into the collection
    const result = await collection.insertOne(document);
    console.log(`Inserted document with _id: ${result.insertedId}`);
  } catch (error) {
    console.error("Error fetching data or storing to MongoDB:", error);
  }
}

// Schedule fetchDataAndUpdateMongoDB to run every 30 seconds
setInterval(fetchDataAndUpdateMongoDB, 120000);

// Route to fetch data from Firebase and store it in MongoDB
app.get("/data", async (req, res) => {
  try {
    await fetchDataAndUpdateMongoDB();
    // res.status(200).json({ message: "Data fetched and stored successfully" });
    const currentDateTime = moment().tz("Asia/Colombo").format();
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});
app.get("/data2", async (req, res) => {
  try {
    // Reference to the root of the database
    const dbRef = ref(database);
    // Fetch the data once from the reference
    const snapshot = await get(dbRef);

    if (!snapshot.exists()) {
      res.status(404).json({ error: "No data available" });
      return;
    }

    // Get the value from the snapshot
    const data = snapshot.val();

    // Get current date and time in Colombo
    const currentDateTime = moment().tz("Asia/Colombo").format();

    // Construct the response object
    const responseData = {
      data,
      state,
      timestamp: currentDateTime,
    };

    // Send the response
    res.json(responseData);
    // console.log(responseData.data.device1.time);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to retrieve data from MongoDB
app.get("/fetch-data", async (req, res) => {
  try {
    // Specify the new database and collection
    const mongoDatabase = req.mongoClient.db("nDB"); // Use 'newDB' instead of 'sampleDB'
    const collection = mongoDatabase.collection("sampleCollection");

    // Retrieve all documents from the collection
    const documents = await collection.find({}).toArray();

    if (documents.length === 0) {
      res.status(404).json({ error: "No data found in the database" });
      return;
    }

    // Send the retrieved documents as the response
    res.json(documents);
  } catch (error) {
    console.error("Error fetching data from MongoDB:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
