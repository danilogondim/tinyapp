// // a function to lookup for existing emails and returns the user if its registered
const getUserByEmail = (email, database) => {
  for (const key in database) {
    if (database[key].email === email) {
      return database[key];
    }
  }
  return undefined;
};


// a function that returns a string of 6 random alphanumeric characters
const generateRandomString = () => {
  // Math.random() generates a random number between 0 (inclusive) and 1 (exclusive)
  // toString(36) will transform this number in a string using base 36: https://en.wikipedia.org/wiki/Base36
  // substring() returns the part of the string between the start and end indexes, or to the end of the string.
  return Math.random().toString(36).substring(2, 8);
};

module.exports = { getUserByEmail, generateRandomString };