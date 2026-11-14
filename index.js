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
const borrowsCollection = db.collection("borrows");

app.post("/books", async (req, res) => {
  const bookData = {
    ...req.body,
    copies: Number(req.body.copies),
  };
  const result = await booksCollection.insertOne(bookData);
  res.send(result);
})


app.get("/books", async (req, res) => {
  try {
    const { userEmail } = req.query;
    const limit = Number(req.query.limit);

    const query = userEmail ? { userEmail } : {};

    let cursor = booksCollection
      .find(query)
      .sort({ createdAt: -1 });

    if (Number.isInteger(limit) && limit > 0) {
      cursor = cursor.limit(limit);
    }

    const result = await cursor.toArray();

    res.send(result);
  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch books"
    });
  }
});


app.get("/books/:id", async (req, res) => {
  const { id } = req.params;
  const result = await booksCollection.findOne({ _id: new ObjectId(id) })
  res.send(result)
})

app.get("/borrows", async (req, res) => {
  try {
    const { userEmail } = req.query;

    const query = userEmail ? { userEmail } : {};

    const result = await borrowsCollection.find(query).toArray();

    res.send(result);

  } catch (error) {
    res.status(500).send({
      message: "Failed to fetch borrowed books!",
    });
  }
})

app.post("/borrows", async (req, res) => {
  try {
    const { bookId, userName, userEmail, borrowDate, returnDate } = req.body;
    const book = await booksCollection.findOne({
      _id: new ObjectId(bookId),
    });

    if (!book) {
      return res.status(404).send({
        message: "Book not found!",
      });
    }

    if (book.copies <= 0) {
      return res.status(400).send({
        message: "No copies available!",
      });
    }

    const alreadyBorrowed = await borrowsCollection.findOne({
      bookId,
      userEmail,
    });

    if (alreadyBorrowed) {
      return res.status(400).send({
        message: "You have already borrowed this book!",
      });
    }

    const updateResult = await booksCollection.updateOne(
      {
        _id: new ObjectId(bookId),
        $expr: {
          $gt: [{ $toInt: "$copies" }, 0],
        },
      },
      [
        {
          $set: {
            copies: {
              $subtract: [{ $toInt: "$copies" }, 1],
            },
          },
        },
      ]
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(400).send({
        message: "No copies available!",
      });
    }

    const borrowData = {
      bookId,
      bookTitle: book.title,
      bookImage: book.image,
      userName,
      userEmail,
      borrowDate,
      returnDate,
    };

    let result;

    try {
      result = await borrowsCollection.insertOne(borrowData);
    } catch (error) {
      await booksCollection.updateOne(
        { _id: new ObjectId(bookId) },
        { $inc: { copies: 1 } }
      );

      throw error;
    }

    res.status(201).send({
      message: "Book borrowed successfully!",
      result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to borrow book!",
    });
  }
});

app.delete("/borrows/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const borrow = await borrowsCollection.findOne({
      _id: new ObjectId(id),
    });

    if (!borrow) {
      return res.status(404).send({
        message: "Borrow record not found!",
      });
    }

    const deleteResult = await borrowsCollection.deleteOne({
      _id: new ObjectId(id),
    });

    if (deleteResult.deletedCount === 0) {
      return res.status(404).send({
        message: "Borrow record not found!",
      });
    }

    const updateResult = await booksCollection.updateOne(
      { _id: new ObjectId(borrow.bookId) },
      { $inc: { copies: 1 } }
    );

    if (updateResult.matchedCount === 0) {
      await borrowsCollection.insertOne(borrow);

      return res.status(404).send({
        message: "Book not found!",
      });
    }

    res.send({
      message: "Book returned successfully!",
    });

  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Failed to return book!",
    });
  }
});


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