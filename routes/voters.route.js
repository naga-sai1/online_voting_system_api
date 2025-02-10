const express = require("express");
const router = express.Router();
const { getAllVoters } = require("../controllers/voters.controller");

router.get("/get_all_voters", getAllVoters);

module.exports = router;
