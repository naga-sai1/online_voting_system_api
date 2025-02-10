const express = require("express");
const router = express.Router();
const { getAllParties, createParty } = require("../controllers/parties.controller");
const upload = require("../middleware/upload.middleware");

router.get("/get_all_parties", getAllParties);
router.post("/create_party", upload.single('logo'), createParty);

module.exports = router;
