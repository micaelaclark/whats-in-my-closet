const express = require('express')
const { MongoClient, ObjectId } = require('mongodb')
const path = require('path')

const app = express()
const PORT = process.env.PORT || 3000
const MONGO_URI = 'mongodb+srv://micaelaclark:34QvDx6XB5mp6LOS@closet-cluster.dlxr2q0.mongodb.net/?appName=closet-cluster'
const DB_NAME = 'closet'

app.use(express.json())
app.use(express.static(path.join(__dirname, 'Public')))

let db

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

MongoClient.connect(MONGO_URI).then(client => {
  db = client.db(DB_NAME)
  console.log('Connected to MongoDB')
}).catch(err => {
  console.error('MongoDB connection failed:', err.message)
})

// Get all items from a collection
app.get('/api/:collection', async (req, res) => {
  try {
    const items = await db.collection(req.params.collection).find().toArray()
    res.json(items)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Add a new item
app.post('/api/:collection', async (req, res) => {
  try {
    const result = await db.collection(req.params.collection).insertOne(req.body)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Delete an item
app.delete('/api/:collection/:id', async (req, res) => {
  try {
    const result = await db.collection(req.params.collection).deleteOne({ _id: new ObjectId(req.params.id) })
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})
