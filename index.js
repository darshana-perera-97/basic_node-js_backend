const express = require("express");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, get, set } = require("firebase/database");
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
const LastData1 = []; // Array to store the last 10 documents
const LastData2 = []; // Array to store the last 30 documents
const LastData3 = []; // Array to store the last 60 documents
const LastData4 = []; // Array to store the last 120 documents

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
    let currentDeviceTime = data.device1.state;
    console.log(currentDeviceTime);
    if (currentDeviceTime === previousDeviceTime) {
      state = false;
      console.log("device offline");
      return;
    }
    // Send mock data to Firebase
    const mockPath = "alarm"; // Define your mock path
    var mockData = {
      alarm: false,
    }; // Define your mock data
    if (
      data.device1.temperatureCelsius > 35.0 ||
      data.device1.doorStatus === true
    ) {
      var mockData = {
        alarm: true,
      }; // Define your mock data
    } else {
      var mockData = {
        alarm: false,
      }; // Define your mock data
    }
    await set(ref(database, mockPath), mockData); // Send mock data to Firebase

    // Update the previous device time
    previousDeviceTime = currentDeviceTime;

    // Get current date and time in Colombo
    const currentDateTime = moment().tz("Asia/Colombo").format();

    // Specify the new database and collection
    const mongoDatabase = client.db("nDB"); // Use 'newDB' instead of 'sampleDB'
    const collection = mongoDatabase.collection("sampleCollection");
    state = true;

    // Construct the document to be inserted
    const document = {
      data,
      state,
      timestamp: currentDateTime,
    };
    console.log(LastData1);

    // Insert the document into the collection
    const result = await collection.insertOne(document);
    console.log(`Inserted document with _id: ${result.insertedId}`);

    // Push the document into LastData1 array
    LastData1.push(document);
    LastData2.push(document);
    LastData3.push(document);
    LastData4.push(document);

    // If LastData1 has more than 10 documents, remove the oldest one
    if (LastData1.length > 10) {
      LastData1.shift(); // Remove the oldest document
    }
    if (LastData2.length > 30) {
      LastData2.shift(); // Remove the oldest document
    }
    if (LastData3.length > 60) {
      LastData3.shift(); // Remove the oldest document
    }
    if (LastData4.length > 150) {
      LastData4.shift(); // Remove the oldest document
    }
  } catch (error) {
    console.error("Error fetching data or storing to MongoDB:", error);
  }
}

// Schedule fetchDataAndUpdateMongoDB to run every 30 seconds
setInterval(fetchDataAndUpdateMongoDB, 30000);

// Route to fetch data from Firebase and store it in MongoDB
app.get("/data", async (req, res) => {
  try {
    await fetchDataAndUpdateMongoDB();
    res.status(200).json({ message: "Data fetched and stored successfully" });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route to fetch data from Firebase without storing it in MongoDB
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

// Routes to retrieve historical data
app.get("/history1", async (req, res) => {
  res.json(LastData1);
  console.log(LastData1.length);
});
app.get("/history2", async (req, res) => {
  res.json(LastData2);
  console.log(LastData2.length);
});
app.get("/history3", async (req, res) => {
  res.json(LastData3);
  console.log(LastData3.length);
});
app.get("/history4", async (req, res) => {
  res.json(LastData4);
  console.log(LastData4.length);
});

// New route to retrieve the latest 20 documents from MongoDB
app.get("/last", async (req, res) => {
  try {
    // Specify the new database and collection
    const mongoDatabase = req.mongoClient.db("nDB");
    const collection = mongoDatabase.collection("sampleCollection");

    // Retrieve the latest 20 documents, sorted by timestamp in descending order
    const documents = await collection
      .find({})
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

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
