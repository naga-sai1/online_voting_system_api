const connectToDatabase = require("../misc/db");
const VoterBlockchain = require('../utils/blockchain');
const voterBlockchain = new VoterBlockchain();

// Get all voters
const getAllVoters = async (req, res) => {
  try {
    const { Voters } = await connectToDatabase();
    const voters = await Voters.findAll();
    res.status(200).json({ message: "Voters fetched successfully", voters });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

const castVote = async (req, res) => {
  try {
    const { party_id, name, aadhar, phone_no } = req.body;

    // Validate required fields
    if (!party_id || !name || !aadhar || !phone_no) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    const { Voters, Parties } = await connectToDatabase();

    // Check if party exists
    const party = await Parties.findByPk(party_id);
    if (!party) {
      return res.status(404).json({ message: "Party not found" });
    }

    // check voter is exists
    const voter = await Voters.findOne({
      where: {
        aadhar: aadhar,
      },
    });

    if (!voter) {
      return res.status(404).json({ message: "Voter not found" });
    }

    // check voter is already voted for any party then error throw
    if (voter.party_id) {
      return res
        .status(400)
        .json({ message: "Voter already voted for a party" });
    }

   await Voters.update(
      {
        party_id: party_id,
      },
      {
        where: {
          id: voter.id,
        },
      }
    );
    res.status(201).json({
      message: "Vote cast successfully",
      vote: {
        id: voter.id,
        name: voter.name,
        voted_at: voter.voted_at,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// login voter
const loginVoter = async (req, res) => {
  try {
    const { aadhar, phone_no } = req.body;
    const { Voters } = await connectToDatabase();
    const voter = await Voters.findOne({
      where: {
        aadhar,
        phone_no,
      },
    });

    if (!voter) {
      return res.status(404).json({ message: "Voter not found" });
    }

    // Add login attempt to blockchain
    const blockData = {
      voterId: voter.id,
      aadhar: maskAadhar(aadhar),
      timestamp: new Date().toISOString(),
      action: 'LOGIN'
    };

    voterBlockchain.addBlock(blockData);

    // Verify blockchain integrity
    if (!voterBlockchain.isChainValid()) {
      return res.status(500).json({ 
        message: "Blockchain integrity compromised",
        error: "Security violation detected"
      });
    }

    // Format voter data with masked sensitive information
    const formattedVoter = {
      id: voter.id,
      name: voter.name,
      aadhar: maskAadhar(voter.aadhar),
      phone_no: maskPhoneNumber(voter.phone_no),
      voted_at: voter.voted_at ? new Date(voter.voted_at).toISOString() : null,
      has_voted: !!voter.party_id
    };

    // Return the formatted response
    res.status(200).json({ 
      message: "Voter logged in successfully", 
      voter: formattedVoter,
      blockchainInfo: {
        blockHash: voterBlockchain.getLatestBlock().hash,
        previousHash: voterBlockchain.getLatestBlock().previousHash,
        timestamp: new Date(voterBlockchain.getLatestBlock().timestamp).toISOString(),
        verificationStatus: "VERIFIED"
      }
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Internal server error", 
      error: error.message 
    });
  }
};

// Helper functions for masking sensitive data
const maskAadhar = (aadhar) => {
  const cleanAadhar = aadhar.replace(/\s/g, '');
  return `XXXX XXXX ${cleanAadhar.slice(-4)}`;
};

const maskPhoneNumber = (phone) => {
  return `XXXXX ${phone.slice(-5)}`;
};

// total voters count
const totalVotersCount = async (req, res) => {
  try {
    const { Voters } = await connectToDatabase();
    const totalVoters = await Voters.count();
    res.status(200).json({ message: "Total voters count", totalVoters });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  }
};

module.exports = {
  getAllVoters,
  castVote,
  loginVoter,
  totalVotersCount,
};
