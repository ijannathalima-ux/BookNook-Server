import express from "express";
import cors from "cors";
import { MongoClient } from 'mongodb';
import 'dotenv/config'


const app = express();
const PORT = 5000;
//app.use(cors());
app.use(express.json());


const client = new MongoClient(process.env.MONGODB_URI);
export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connectClient = await connectToMongoDB();
const db = connectClient.db("book-nook");
const booksCollection = db.collection("books");

app.post("/books", async (req, res) => {
    const bookData = req.body;
    const result = await booksCollection.insertOne(bookData);
    res.send(result);
})

app.get("/books", async (req, res) => {
    const result = await booksCollection.find().toArray()
    res.send(result);
})

app.get("/", (req, res) => {
    res.send("Hello halima!!")
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`)
})