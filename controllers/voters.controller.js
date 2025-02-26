const connectToDatabase = require("../misc/db");
const VoterBlockchain = require("../utils/blockchain");
const voterBlockchain = new VoterBlockchain();
const { sendSMS } = require("../services/sms");

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

    const { Voters, Parties, Polls } = await connectToDatabase();

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
        voted_at: new Date(),
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

    const otp = getOTP(6);
    await Voters.update({ otp }, { where: { phone_no } });
    await sendSMS(phone_no, "Voter", otp);

    // Add login attempt to blockchain
    const blockData = {
      voterId: voter.id,
      aadhar: maskAadhar(aadhar),
      timestamp: new Date().toISOString(),
      action: "LOGIN",
    };

    voterBlockchain.addBlock(blockData);

    // Verify blockchain integrity
    if (!voterBlockchain.isChainValid()) {
      return res.status(500).json({
        message: "Blockchain integrity compromised",
        error: "Security violation detected",
      });
    }

    // Format voter data with masked sensitive information
    const formattedVoter = {
      id: voter.id,
      name: voter.name,
      aadhar: maskAadhar(voter.aadhar),
      phone_no: maskPhoneNumber(voter.phone_no),
      voted_at: voter.voted_at ? new Date(voter.voted_at).toISOString() : null,
      has_voted: !!voter.party_id,
    };

    // Return the formatted response
    res.status(200).json({
      message: "OTP sent to registered mobile number",
      verificationRequired: true,
    });
  } catch (error) {
    res.status(500).json({
      message: "Internal server error",
      error: error.message,
    });
  }
};

// Helper functions for masking sensitive data
const maskAadhar = (aadhar) => {
  const cleanAadhar = aadhar.replace(/\s/g, "");
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

// Generate OTP
function getOTP(length) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  return otp.slice(0, length);
}

// Send OTP
const sendOTP = async (req, res) => {
  const { Voters } = await connectToDatabase();
  const { phone_no } = req.body;

  // check voter is exist or not!
  const check_voter = await Voters.findOne({ phone_no });

  if (!check_voter) {
    return res.status(404).Json({ message: "voter not found!" });
  }
  // const uid = uuidv4();
  const otp = getOTP(6);
  try {
    if (await Voters.findOne({ where: { phone_no } })) {
      await Voters.update({ otp }, { where: { phone_no } });
    }
    const name = "voter";
    // ignore the sendSMS function on this phone number = 9876543210
    //   if (phone === "9876543210") {
    //     await UserData.update({ otp : 123456 }, { where: { phone } });
    //     return res.status(200).json({ message: "OTP sent successfully" });
    //   }
    await sendSMS(phone_no, name, otp);
    res.status(200).json({ message: "OTP sent successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  const { Voters } = await connectToDatabase();
  const { phone_no, otp } = req.body;
  try {
    const voter = await Voters.findOne({ where: { phone_no, otp } });
    if (voter) {
      // Clear OTP after successful verification
      await Voters.update({ otp: null }, { where: { phone_no } });

      // Add successful login to blockchain
      const blockData = {
        voterId: voter.id,
        aadhar: maskAadhar(voter.aadhar),
        timestamp: new Date().toISOString(),
        action: "LOGIN_SUCCESS",
      };
      voterBlockchain.addBlock(blockData);

      // Format voter data
      const formattedVoter = {
        id: voter.id,
        name: voter.name,
        aadhar: voter.aadhar,
        phone_no: voter.phone_no,
        state_id: voter.state_id,
        voted_at: voter.voted_at?.toISOString(),
        has_voted: !!voter.party_id,
      };

      res.status(200).json({
        message: "OTP verified successfully",
        voter: formattedVoter,
        blockchainInfo: {
          blockHash: voterBlockchain.getLatestBlock().hash,
          verificationStatus: "VERIFIED",
        },
      });
    } else {
      res.status(400).json({ message: "Invalid OTP" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllVoters,
  castVote,
  loginVoter,
  totalVotersCount,
  sendOTP,
  verifyOTP,
};
