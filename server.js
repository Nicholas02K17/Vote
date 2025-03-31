const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public")); // Serve frontend files

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/votingDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Define the schema and model
const voteSchema = new mongoose.Schema({
    number: { type: Number, unique: true },
    count: { type: Number, default: 0 },
});

const Vote = mongoose.model("Vote", voteSchema);

// Ensure all numbers (1-5) exist in DB
async function initializeVotes() {
    for (let i = 1; i <= 5; i++) {
        await Vote.findOneAndUpdate(
            { number: i },
            { $setOnInsert: { count: 0 } }, // Only set if it's a new record
            { upsert: true } // Create if not exists
        );
    }
}
initializeVotes();

// Handle vote submission
app.post("/vote", async (req, res) => {
    try {
        const { number } = req.body;

        if (![1, 2, 3, 4, 5].includes(number)) {
            return res.status(400).json({ error: "Invalid number" });
        }

        const updatedVote = await Vote.findOneAndUpdate(
            { number },
            { $inc: { count: 1 } }, // ✅ Correctly increment count
            { new: true, upsert: true }
        );

        res.json({ message: "Vote recorded!", updatedVote });
    } catch (error) {
        console.error("Error recording vote:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// Fetch vote results
app.get("/results", async (req, res) => {
    try {
        const results = await Vote.find();
        let voteCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

        results.forEach((vote) => {
            voteCounts[vote.number] = vote.count;
        });

        res.json(voteCounts);
    } catch (error) {
        console.error("Error fetching results:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

// **✅ Fixed Reset Function**
app.post("/reset", async (req, res) => {
    try {
        await Vote.updateMany({}, { $set: { count: 0 } });
        res.json({ success: true, message: "All votes have been reset!" });
    } catch (error) {
        console.error("Error resetting votes:", error);
        res.status(500).json({ success: false, error: "Failed to reset votes" });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
});