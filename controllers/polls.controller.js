const connectToDatabase = require("../misc/db");
const sequelize = require("sequelize");

// conduct poll
const conductPoll = async (req, res) => {
  try {
    const { Polls, PollParties, States, Parties, sequelizeDatabase } =
      await connectToDatabase();

    const transaction = await sequelizeDatabase.transaction();

    const { name, description, start_date, end_date, state_id, party_list } =
      req.body;

    if (!name || !start_date || !end_date || !state_id || !party_list) {
      return res.status(400).json({
        message: "Name, dates, state_id and party_list are required",
      });
    }

    // Create the poll
    const newPoll = await Polls.create(
      {
        name,
        description,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
      },
      { transaction }
    );

    // Validate state exists
    const state = await States.findByPk(state_id, { transaction });
    if (!state) {
      await transaction.rollback();
      return res.status(404).json({
        message: `State not found: ${state_id}`,
      });
    }

    // Process each party in party_list
    for (const partyId of party_list) {
      const party = await Parties.findByPk(partyId, { transaction });
      if (!party) {
        await transaction.rollback();
        return res.status(404).json({
          message: `Party not found: ${partyId}`,
        });
      }

      await PollParties.create(
        {
          poll_id: newPoll.id,
          party_id: partyId,
          state_id: state_id,
        },
        { transaction }
      );
    }

    await transaction.commit();

    res.status(201).json({
      message: "Poll created successfully",
      poll: {
        id: newPoll.id,
        name: newPoll.name,
        start_date: newPoll.start_date,
        end_date: newPoll.end_date,
        state_id,
        party_list,
      },
    });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({
      message: "Error creating poll",
      error: error.message,
    });
  }
};

const getStateWisePollParties = async (req, res) => {
  try {
    const { Polls, PollParties, States, Parties } = await connectToDatabase();

    // Get active poll (where current time is between start and end dates)
    const currentDate = new Date();
    const activePoll = await Polls.findAll({
      where: {
        start_date: { [sequelize.Op.lte]: currentDate },
        end_date: { [sequelize.Op.gte]: currentDate },
      },
    });

    if (!activePoll) {
      return res.status(404).json({ message: "No active poll found" });
    }

    // Get all poll parties for the active poll with state and party details
    const pollParties = await PollParties.findAll({
    //   where: { poll_id: activePoll.id },
      include: [
        {
          model: States,
          as: "state",
          attributes: ["id", "name", "abbreviation"],
        },
        {
          model: Parties,
          as: "party",
          attributes: ["id", "name", "abbreviation", "logo"],
        },
      ],
    });

    // Group by state
    const stateWiseParties = pollParties.reduce((acc, pp) => {
      const stateId = pp.state_id;
      if (!acc[stateId]) {
        acc[stateId] = {
          state_id: stateId,
          state_name: pp.state.name,
          state_abbreviation: pp.state.abbreviation,
          parties: [],
        };
      }

      acc[stateId].parties.push({
        party_id: pp.party.id,
        name: pp.party.name,
        abbreviation: pp.party.abbreviation,
        logo: pp.party.logo,
      });

      return acc;
    }, {});

    res.status(200).json({
      message: "State-wise poll parties fetched successfully",
      poll: {
        id: activePoll.id,
        name: activePoll.name,
        start_date: activePoll.start_date,
        end_date: activePoll.end_date,
      },
      state_parties: Object.values(stateWiseParties),
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching state-wise poll parties",
      error: error.message,
    });
  }
};

const getAllpollsByStateId = async (req, res) => {
  try {
    const { Polls, PollParties, States, Parties } = await connectToDatabase();

    const pollsData = await Polls.findAll({
      include: [{
        model: PollParties,
        as: 'poll_parties',
        where: { state_id: req.params.id },
        include: [
          {
            model: States,
            as: "state",
            attributes: ["name", "abbreviation"],
            required: true
          },
          {
            model: Parties,
            as: "party",
            attributes: ["id", "name", "abbreviation", "logo"],
          }
        ]
      }]
    });

    const formattedPolls = pollsData.map(poll => ({
      poll_id: poll.id,
      name: poll.name,
      start_date: poll.start_date,
      end_date: poll.end_date,
      state: {
        id: req.params.id,
        name: poll.poll_parties[0]?.state?.name || '',
        abbreviation: poll.poll_parties[0]?.state?.abbreviation || ''
      },
      parties: poll.poll_parties.map(pp => ({
        party_id: pp.party_id,
        name: pp.party.name,
        abbreviation: pp.party.abbreviation,
        logo: pp.party.logo
      }))
    }));

    res.status(200).json({
      message: "All polls fetched successfully",
      polls: formattedPolls
    });
    
  } catch (err) {
    return res.status(500).json({
      message: "Error fetching polls",
      error: err.message,
    });
  }
};

module.exports = {
  conductPoll,
  getStateWisePollParties,
  getAllpollsByStateId
};
