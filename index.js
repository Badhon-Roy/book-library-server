const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
require('dotenv').config();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174'
  ],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser())

const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ massage: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_API_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ massage: 'unauthorized access' })
    }
    req.user = decoded ;
    next()
  })
}





const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.wj0pjif.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    const categoryCollection = client.db("bookDB").collection("categories");
    const bookCollection = client.db("bookDB").collection("books");
    const borrowBookCollection = client.db("bookDB").collection("borrowBooks");
    await client.connect();


    // auth related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_API_SECRET, { expiresIn: '1h' })
      res
        .cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none'
        })
        .send({ success: true })
    })

    app.post('/logout', async (req, res) => {
      const user = req.body;
      res.clearCookie('token', { maxAge: 0 }).send({ success: true })
    })



    // book category related api
    app.get('/categories', async (req, res) => {
      const result = await categoryCollection.find().toArray();
      res.send(result)
    })


    // all book related api
    app.get('/allBooks', verifyToken , async (req, res) => {
      const result = await bookCollection.find().toArray();
      res.send(result)
    })

    app.post('/allBooks',verifyToken , async (req, res) => {
      const book = req.body;
      const result = await bookCollection.insertOne(book);
      res.send(result)
    })

    app.get('/books/:category', async (req, res) => {
      const { category } = req.params;
      const result = await bookCollection.find({ category: category }).toArray();
      res.send(result);
    });
    app.get('/allBooks/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookCollection.findOne(query)
      res.send(result)
    })

    // update book
    app.put('/allBooks/:id', async (req, res) => {
      const id = req.params.id;
      const book = req.body;
      const filter = { _id: new ObjectId(id) }
      const options = { upsert: true };
      const updateBook = {
        $set: { ...book },
      };
      const result = await bookCollection.updateOne(filter, updateBook, options);
      res.send(result)
    })




    // increment 
    app.put('/allBooks/:id/increment', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.updateOne(
        query,
        { $inc: { quantity: 1 } },
        { new: true }
      );
      res.json(result);
    });

    // decrement
    app.put('/allBooks/:id/decrement', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookCollection.updateOne(
        query,
        { $inc: { quantity: -1 } },
        { new: true }
      );
      res.json(result);
    });




    // borrow book related api
    app.get("/borrowBooks", async (req, res) => {
      let query = {};
      if (req?.query?.email) {
        query = { email: req?.query?.email }
      }
      const result = await borrowBookCollection.find(query).toArray();
      res.send(result)
    })


    app.get('/borrowBooks/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await borrowBookCollection.findOne(query)
      res.send(result)
    })

    app.post('/borrowBooks/:id', async (req, res) => {
      const book = req.body;
      const result = await borrowBookCollection.insertOne(book)
      res.send(result)
    })
    // delete book
    app.delete('/borrowBooks/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await borrowBookCollection.deleteOne(query);
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



// Sample route and controller
app.get('/', (req, res) => {
  res.send('book library API is running');
});

app.listen(port, () => {
  console.log(`book library API is running on port: ${port}`);
});
