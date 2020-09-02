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

app.get("/urls", (req, res) => {
  const templateVars = {
    urls: urlDatabase,
    username: req.cookies["username"]
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  const templateVars = { username: req.cookies["username"] };
  res.render("urls_new", templateVars);
});

app.get("/urls/:shortURL", (req, res) => {
  const templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL],
    username: req.cookies["username"]
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

// Add a route to handle a POST to /login. It sets a cookie named username to the value submitted via the login form. Then, it redirects the browser back to the /urls page"
app.post('/login', (req, res) => {
  if (req.body.username !== "") {
    res.cookie("username", req.body.username);
  }
  res.redirect('/urls');
});

// Add a rout to handle a POST to /logout. It clears the username cookie and redirects to /urls
app.post('/logout', (req, res) => {
  res.clearCookie("username");
  res.redirect('/urls');
});

app.get('/register', (req, res) => {
  const templateVars = { username: req.cookies["username"] };
  res.render('register', templateVars);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});

const generateRandomString = () => {
  // Math.random() generates a random number between 0 (inclusive) and 1 (exclusive)
  // toString(36) will transform this number in a string using base 36: a binary-to-text encoding scheme that represents binary data in an ASCII string format by translating it into a radix-36 representation. The choice of 36 is convenient in that the digits can be represented using the Arabic numerals 0–9 and the Latin letters A–Z(https://en.wikipedia.org/wiki/Base36)
  // The substring() method returns the part of the string between the start and end indexes, or to the end of the string.
  return Math.random().toString(36).substring(2, 8);
};