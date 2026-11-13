import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config'


const app = express();
const PORT = 5000;
app.use(cors());
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
  try {
    const { userEmail } = req.query;

    const query = userEmail ? { userEmail } : {};

    const result = await booksCollection.find(query).toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch books",
    });
  }
});

app.get("/books/:id", async (req, res) => {
  const { id } = req.params;
  const result = await booksCollection.findOne({ _id: new ObjectId(id) })
  res.send(result)
})


app.patch("/books/:id", async (req, res) => {
  const { id } = req.params;
  const { _id, ...updatedBook } = req.body;

  try {
    const result = await booksCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: updatedBook,
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({
        message: "Book not found!",
      });
    }

    res.send({
      message: "Book updated successfully!",
      result,
    });

  } catch (error) {
    res.status(500).send({
      message: "Failed to update book!",
    });
  }
});

app.delete("/books/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await booksCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).send({
        message: "Book not found!",
      })
    }

    res.send({
      message: "Book deleted successfully!",
    })
  }
  catch (error) {
    res.status(500).send({
      message: "Failed to delete book!",
    });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})