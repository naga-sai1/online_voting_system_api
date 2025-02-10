const express = require("express");
const router = express.Router();
const { getAllVoters, castVote, loginVoter, totalVotersCount } = require("../controllers/voters.controller");

router.get("/get_all_voters", getAllVoters);
router.post("/cast_vote", castVote);
router.post("/login_voter", loginVoter);
router.get("/total_voters_count", totalVotersCount);

module.exports = router;
