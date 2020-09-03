// // a function to lookup for existing emails and returns the user if its registered
const getUserByEmail = (email, database) => {
  for (const key in database) {
    if (database[key].email === email) {
      return database[key];
    }
  }
  return undefined;
};

module.exports = { getUserByEmail };