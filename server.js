const express = require('express')
const { MongoClient, ObjectId } = require('mongodb')
const path = require('path')

const app = express()
const PORT = 3000
const MONGO_URI = 'mongodb://localhost:27017'
const DB_NAME = 'closet'
const COLLECTIONS = ['pants', 'shirts', 'athletic', 'jackets']

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

let db

MongoClient.connect(MONGO_URI).then(client => {
  db = client.db(DB_NAME)
  console.log('Connected to MongoDB')
  app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`))
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

// Search across all collections by name
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q || ''
    const regex = new RegExp(q, 'i')
    const results = {}
    for (const col of COLLECTIONS) {
      results[col] = await db.collection(col).find({ name: regex }).toArray()
    }
    res.json(results)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Mark items as worn today
app.post('/api/wore-today', async (req, res) => {
  try {
    const { names } = req.body
    if (!Array.isArray(names)) return res.status(400).json({ error: 'names must be an array' })

    const updated = []
    const today = new Date().toISOString().slice(0, 10)

    for (const name of names) {
      const regex = new RegExp(`^${name.trim()}$`, 'i')
      let found = false
      for (const col of COLLECTIONS) {
        const item = await db.collection(col).findOne({ name: regex })
        if (item) {
          await db.collection(col).updateOne(
            { _id: item._id },
            { $inc: { timesWorn: 1 }, $set: { lastWorn: today } }
          )
          updated.push({ name: item.name, collection: col })
          found = true
          break
        }
      }
      if (!found) {
        // Try a looser match if exact fails
        const looseRegex = new RegExp(name.trim(), 'i')
        for (const col of COLLECTIONS) {
          const item = await db.collection(col).findOne({ name: looseRegex })
          if (item) {
            await db.collection(col).updateOne(
              { _id: item._id },
              { $inc: { timesWorn: 1 }, $set: { lastWorn: today } }
            )
            updated.push({ name: item.name, collection: col })
            break
          }
        }
      }
    }

    res.json({ updated })
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
