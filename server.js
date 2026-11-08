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

MongoClient.connect(MONGO_URI).then(async client => {
  db = client.db(DB_NAME)
  console.log('Connected to MongoDB')
  // One-time migration: skirts was folded into pants as a single category.
  // Safe to run on every boot — once the skirts collection is empty/gone, this is a no-op.
  try {
    const skirts = await db.collection('skirts').find().toArray()
    if (skirts.length) {
      await db.collection('pants').insertMany(skirts)
      await db.collection('skirts').drop()
      console.log(`Migrated ${skirts.length} skirt item(s) into pants`)
    }
  } catch (err) {
    console.error('Skirts-to-pants migration failed:', err.message)
  }
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

// Increment wear count
app.patch('/api/:collection/:id/wear', async (req, res) => {
  try {
    const result = await db.collection(req.params.collection).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $inc: { timesWorn: 1 } }
    )
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Update an item
app.put('/api/:collection/:id', async (req, res) => {
  try {
    const { _id, ...update } = req.body
    const result = await db.collection(req.params.collection).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: update }
    )
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Archive / unarchive an item
app.patch('/api/:collection/:id/archive', async (req, res) => {
  try {
    const update = { archived: true }
    if (req.body?.archiveType) update.archiveType = req.body.archiveType
    if (req.body?.discardReason) update.discardReason = req.body.discardReason
    const result = await db.collection(req.params.collection).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: update }
    )
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.patch('/api/:collection/:id/unarchive', async (req, res) => {
  try {
    const result = await db.collection(req.params.collection).updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { archived: false } }
    )
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
