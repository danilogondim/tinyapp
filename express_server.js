const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const PORT = 8080;
const cookieParser = require('cookie-parser');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.set("view engine", "ejs");

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

app.get("/urls", (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    user: users[req.cookies["user_id"]]
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  const templateVars = {
    user: users[req.cookies["user_id"]]
  };
  res.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL],
    user: users[req.cookies["user_id"]]
  };
  res.render("urls_show", templateVars);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  const longURl = req.body.longURL;
  if (longURl.match(/^(https:\/\/|http:\/\/)/)) {
    urlDatabase[shortURL] = longURl;
  } else {
    urlDatabase[shortURL] = `http://www.${longURl}`;
  }
  res.redirect(`/urls/${shortURL}`);
});

app.get('/u/:shortURL', (req, res) => {
  const longURL = urlDatabase[req.params.shortURL];
  res.redirect(longURL);
});

// Add a POST route that removes a URL resource: POST /urls/:shortURL/delete, and redirects the client back to the urls_index page ("/urls").
app.post('/urls/:shortURL/delete', (req, res) => {
  delete urlDatabase[req.params.shortURL];
  res.redirect("/urls");
});

// Add a POST route that updates a URL resource: POST /urls/:shortURL, and redirects the client back to the urls_show page ("/urls/:shortURL").
app.post('/urls/:shortURL', (req, res) => {
  const shortURL = req.params.shortURL;
  const longURl = req.body.longURL;
  if (longURl.match(/^(https:\/\/|http:\/\/)/)) {
    urlDatabase[shortURL] = longURl;
  } else {
    urlDatabase[shortURL] = `http://www.${longURl}`;
  }
  res.redirect(`/urls/${shortURL}`);
});

// Add a GET route to render the register template
app.get('/register', (req, res) => {
  // SHOULD I PASS THE USER_ID or USER OBJECT???? IF I AM REGISTERING SOMEONE NEW, IT SHOULD MEAN THAT I DON'T HAVE THE COOKIE SET
  const templateVars = {
    user: users[req.cookies["user_id"]]
  };
  res.render('register', templateVars);
});

// Add a POST route to include the new user in our users object if the required fields are filled and the email is not already registered in our users database
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  if (email === "" || password === "") {
    return res.status(400).send("<h1>400 Bad Request</h1><p>Please make sure you have filled both the email and password fields.</p>");
  }
  if (existingEmail(email)) {
    return res.status(400).send("<h1>400 Bad Request</h1><p>The email is already registered.</p>");
  }
  const id = generateRandomString();
  users[id] = { id, email, password };
  res.cookie("user_id", id);
  res.redirect('/urls');
});

// Add a GET route to render the login template
app.get('/login', (req, res) => {
  // SHOULD I PASS THE USER_ID or USER OBJECT???? IF I HAVE THE COOKIE SET, WHAT SHOULD BE THE EXPECTED BEHAVIOR?
  const templateVars = {
    user: users[req.cookies["user_id"]]
  };
  res.render('login', templateVars);
});

// Add a route to handle a POST to /login. It sets a cookie named username to the value submitted via the login form. Then, it redirects the browser back to the /urls page"
app.post('/login', (req, res) => {
  // compare the given credentials to our user database
  const { email, password } = req.body;
  for (const key in users) {
    if (users[key].email === email && users[key].password === password) {
      res.cookie("user_id", key);
      return res.redirect('/urls');
    }
  }
  return res.redirect("login");
});

// Add a route to handle a POST to /logout. It clears the user_id cookie and redirects to /urls
app.post('/logout', (req, res) => {
  res.clearCookie("user_id");
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

// create a function that returns a string of 6 random alphanumeric characters
const generateRandomString = () => {
  // Math.random() generates a random number between 0 (inclusive) and 1 (exclusive)
  // toString(36) will transform this number in a string using base 36: a binary-to-text encoding scheme that represents binary data in an ASCII string format by translating it into a radix-36 representation. The choice of 36 is convenient in that the digits can be represented using the Arabic numerals 0–9 and the Latin letters A–Z(https://en.wikipedia.org/wiki/Base36)
  // The substring() method returns the part of the string between the start and end indexes, or to the end of the string.
  return Math.random().toString(36).substring(2, 8);
};

// a function to lookup for existing emails and returns whether or not the new email is exclusive
const existingEmail = email => {
  for (const key in users) {
    if (users[key].email === email) {
      return true;
    }
  }
  return false;
};