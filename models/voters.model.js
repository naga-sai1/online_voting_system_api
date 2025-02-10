module.exports = (sequelize, Sequelize) => {
  const Voters = sequelize.define(
    "voters",
    {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      party_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      voted_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      aadhar: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      phone_no: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: "voters",
      timestamps: false,
      engine: "InnoDB",
    }
  );
  return Voters;
};
