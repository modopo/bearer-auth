'use strict';

require('dotenv').config();

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const userSchema = (sequelize, DataTypes) => {
  const model = sequelize.define('User', {
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false, },
    token: {
      type: DataTypes.VIRTUAL,
      get() {
        return jwt.sign(
          { username: this.username },
          process.env.SECRET,
          { expiresIn: 86400000 }
        );
      }
    }
  });

  model.beforeCreate(async (user) => {
    let hashedPass = await bcrypt.hash(user.password, 10);
    user.password = hashedPass;
  });

  // Basic AUTH: Validating strings (username, password) 
  model.authenticateBasic = async function (username, password) {
    const user = await this.findOne({ where: { username: username } });
    const valid = await bcrypt.compare(password, user.password);
    if (valid) { return user; }
    throw new Error('Invalid User');
  }

  // Bearer AUTH: Validating a token
  model.authenticateWithToken = async function (token) {
    try {
      const parsedToken = jwt.verify(token, process.env.SECRET);
      let user = null;
      console.log('parsed token', parsedToken);
      
      if (parsedToken.exp <= Date.now()) {
        console.log('hit')
        user = await this.findOne({ where: { username: parsedToken.username } })
      }

      if (user) { return user; }
      throw new Error("User Not Found");
    } catch (e) {
      throw new Error(e.message)
    }
  }

  return model;
}

module.exports = userSchema;