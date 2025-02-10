const connectToDatabase = require("../misc/db");
const { Op } = require("sequelize");
const fs = require("fs").promises;


// Get all parties
const getAllParties = async (req, res) => {
    try {
        const { Parties, States } = await connectToDatabase();
        const parties = await Parties.findAll({
            include: [{
                model: States,
                attributes: ['name'],
                as: 'state'
            }],
            raw: true,
            nest: true
        });

        // Transform the response
        const formattedParties = parties.map(party => ({
            id: party.id,
            name: party.name,
            abbreviation: party.abbreviation,
            logo: party.logo,
            state_id: party.state_id,
            state_name: party.state?.name,
            created_at: new Date(party.created_at).toISOString().split('T')[0],
            updated_at: party.updated_at ? new Date(party.updated_at).toISOString().split('T')[0] : null
        }));

        res.status(200).json({ 
            message: "Parties fetched successfully", 
            parties: formattedParties 
        });
    } catch (error) {
        res.status(500).json({ message: "Internal server error", error: error.message });
    }
}

// Create new party
const createParty = async (req, res) => {
    try {
        const { name, abbreviation, state_id } = req.body;

        // Validate required fields
        if (!name || !abbreviation || !state_id) {
            // If file was uploaded, delete it
            if (req.file) {
                await fs.unlink(req.file.path).catch(console.error);
            }
            return res.status(400).json({ 
                message: "Name, abbreviation, and state_id are required fields" 
            });
        }

        const { Parties, States } = await connectToDatabase();

        // Check if state exists
        const state = await States.findByPk(state_id);
        if (!state) {
            if (req.file) {
                await fs.unlink(req.file.path).catch(console.error);
            }
            return res.status(404).json({ message: "State not found" });
        }

        // Check if party name or abbreviation already exists
        const existingParty = await Parties.findOne({
            where: {
                [Op.or]: [
                    { name: name },
                    { abbreviation: abbreviation }
                ]
            }
        });

        if (existingParty) {
            if (req.file) {
                await fs.unlink(req.file.path).catch(console.error);
            }
            return res.status(400).json({ 
                message: "Party with this name or abbreviation already exists" 
            });
        }

        let logoBase64 = null;
        if (req.file) {
            // Read the file and convert to base64
            const fileData = await fs.readFile(req.file.path);
            logoBase64 = `data:${req.file.mimetype};base64,${fileData.toString("base64")}`;

            // Delete the uploaded file after conversion
            await fs.unlink(req.file.path).catch(console.error);
        }

        // Create new party
        const newParty = await Parties.create({
            name,
            abbreviation,
            logo: logoBase64,
            state_id,
            created_at: new Date(),
            updated_at: new Date()
        });

        // Format the response
        const formattedParty = {
            id: newParty.id,
            name: newParty.name,
            abbreviation: newParty.abbreviation,
            logo: newParty.logo,
            state_id: newParty.state_id,
            created_at: new Date(newParty.created_at).toISOString().split('T')[0],
            updated_at: new Date(newParty.updated_at).toISOString().split('T')[0]
        };

        res.status(201).json({
            message: "Party created successfully",
            party: formattedParty
        });
    } catch (error) {
        // Clean up uploaded file if there's an error
        if (req.file) {
            await fs.unlink(req.file.path).catch(console.error);
        }
        res.status(500).json({ 
            message: "Internal server error", 
            error: error.message 
        });
    }
};

module.exports = {
    getAllParties,
    createParty
};


