const connectToDatabase = require("../misc/db");

// Get all voters
const getAllVoters = async (req, res) => {
    try {
        const { Voters } = await connectToDatabase();
        const voters = await Voters.findAll();
        res.status(200).json({ message: "Voters fetched successfully", voters });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

module.exports = {
    getAllVoters,
}


