const sequilize = require("sequelize");
const dotenv = require("dotenv");

dotenv.config();

const partiesModel = require("../models/parties.model");
const statesModel = require("../models/states.model");
const usersModel = require("../models/users.model");
const votersModel = require("../models/voters.model");

const sequelizeDatabase = new sequilize.Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: "mysql",
    logging: false,
  }
);

const Parties = partiesModel(sequelizeDatabase, sequilize.DataTypes);
const States = statesModel(sequelizeDatabase, sequilize.DataTypes);
const Users = usersModel(sequelizeDatabase, sequilize.DataTypes);
const Voters = votersModel(sequelizeDatabase, sequilize.DataTypes);

const Models = {
  Parties,
  States,
  Users,
  Voters,
};

// Define associations
Parties.belongsTo(States, {
    foreignKey: 'state_id',
    as: 'state'
});

States.hasMany(Parties, {
    foreignKey: 'state_id',
    as: 'parties'
});

const connection = {};

const connectToDatabase = async () => {
  try {
    if (connection.isConnected) {
      console.log("=> Using existing connection.");
      return { ...Models, sequelizeDatabase };
    }
    await sequelizeDatabase.sync();
    await sequelizeDatabase.authenticate();
    connection.isConnected = true;
    console.log("=> New connection to the database.");
    return { ...Models, sequelizeDatabase };
  } catch (error) {
    console.log("=> Error connecting to the database.", error);
    throw error;
  }
};

module.exports = connectToDatabase;
