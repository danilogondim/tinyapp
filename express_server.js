const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
const request = require('request');
const { urlDatabase, users } = require('./databases/db');
const { getUserByEmail, userURLs, generateRandomString } = require('./helpers');


const app = express();
const PORT = 8080;


app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieSession({
  name: 'session',
  keys: ['aRandomWritTen_key with non-sense charactersajsalkasaolska', '1abo9031,daxj']
}));


app.set("view engine", "ejs");

// redirects to the urls list if the user is already logged in. If not, it will redirect to the login page
app.get('/', (req, res) => {
  if (req.session.user_id) {
    return res.redirect('urls');
  }
  res.redirect('login');
});

// renders the urls page
app.get("/urls", (req, res) => {
  const user = users[req.session.user_id];
  const urls = userURLs(user, urlDatabase);
  const templateVars = {
    user,
    urls
  };
  res.render("urls_index", templateVars);
});

// if an user is logged in, it renders the form to create a new short URL. Otherwise, it redirects to the login page
app.get("/urls/new", (req, res) => {
  if (req.session.user_id) {
    const templateVars = {
      user: users[req.session.user_id]
    };
    return res.render("urls_new", templateVars);
  }
  res.redirect('/login');
});

// creates new shortened urls if the user is logged in
app.post("/urls", (req, res) => {
  const userID = req.session.user_id;
  if (!userID) {
    return res.status(400).send("<h1>400 Bad Request</h1><p>You need to be logged in in order to short an URL.</p>");
  }
  const shortURL = generateRandomString();
  const longURl = req.body.longURL;
  urlDatabase[shortURL] = {
    "longURL": longURl,
    userID
  };
  return res.redirect(`/urls/${shortURL}`);
});

// gather the necessary data and renders the urls_show template accordingly to the user and database information
app.get("/urls/:shortURL", (req, res) => {
  const user = users[req.session.user_id];
  const urls = userURLs(user, urlDatabase);
  const longURL = urlDatabase[req.params.shortURL] ? urlDatabase[req.params.shortURL].longURL : "";
  let error;
  request(longURL, (e, response, body) => {
    if (e) {
      error = e;
    }
    const templateVars = {
      shortURL: req.params.shortURL,
      longURL,
      user,
      urls,
      error
    };
    res.render("urls_show", templateVars);
  })
});

// check if a corresponding longURL exists and redirect the user accordingly
app.get('/u/:shortURL', (req, res) => {
  const longURL = urlDatabase[req.params.shortURL] ? urlDatabase[req.params.shortURL].longURL : "";
  if (longURL) {
    return res.redirect(longURL);
  }
  return res.status(400).send("<h1>400 Bad Request</h1><p>The link you are trying to access is not available. It may have been removed from our database by its owner.</p>");
});

// removes an specific url from the urlDatabase
app.post('/urls/:shortURL/delete', (req, res) => {
  const userID = req.session.user_id;
  // if no user is logged in, send an error
  if (!userID) {
    return res.status(400).send("<h1>400 Bad Request</h1><p>You need to be logged in in order to delete your URL.</p>");
  }
  const user = users[userID];
  const urls = userURLs(user, urlDatabase);
  const shortURL = req.params.shortURL;
  // if the user owns the url, delete it as request. Otherwise, inform that the action is not allowed
  if (Object.keys(urls).includes(shortURL)) {
    delete urlDatabase[shortURL];
  } else {
    return res.status(400).send("<h1>400 Bad Request</h1><p>You can only delete the URLs you own.</p>");
  }
  res.redirect("/urls");
});

// updates an URL and redirects the client back to the urls_show page.
app.post('/urls/:shortURL', (req, res) => {
  const userID = req.session.user_id;
  // if no user is logged in, send an error
  if (!userID) {
    return res.status(400).send("<h1>400 Bad Request</h1><p>You need to be logged in in order to update your URL.</p>");
  }
  const user = users[userID];
  const urls = userURLs(user, urlDatabase);
  const shortURL = req.params.shortURL;
  const longURl = req.body.longURL;

  // if the user owns the url, edit as requested. Otherwise, inform that the action is not allowed
  if (Object.keys(urls).includes(shortURL)) {
    urlDatabase[shortURL].longURL = longURl;
  } else {
    return res.status(400).send("<h1>400 Bad Request</h1><p>You can only update the URLs you own.</p>");
  }
  res.redirect(`/urls/${shortURL}`);
});

// renders the register template if no user is logged in. Otherwise, redirect to the urls list
app.get('/register', (req, res) => {
  const userID = req.session.user_id;
  if (userID) {
    return res.redirect('/urls');
  }
  const templateVars = {
    user: users[req.session.user_id]
  };
  res.render('register', templateVars);
});

// adds a new user to our database if the required fields are filled and the email is not already registered in our users database
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  // before accepting the registration, we check if either of the fields are blank or if the email is already registered
  if (email === "" || password === "") {
    return res.status(400).send("<h1>400 Bad Request</h1><p>Please make sure you have filled both the email and password fields.</p>");
  }
  if (getUserByEmail(email, users)) {
    return res.status(400).send("<h1>400 Bad Request</h1><p>The email is already registered.</p>");
  }
  // if it passes our tests, we will set the new user
  const id = generateRandomString();
  users[id] = {
    id,
    email,
    password: bcrypt.hashSync(password, 10)
  };
  req.session.user_id = id;
  res.redirect('/urls');
});

// renders the login template
app.get('/login', (req, res) => {
  const userID = req.session.user_id;
  if (userID) {
    return res.redirect('/urls');
  }
  const templateVars = {
    user: users[req.session.user_id]
  };
  res.render('login', templateVars);
});

// logs a user in if the credentials are valid
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  // checks if the attempt was valid (no blank fields)
  if (email === "" || password === "") {
    return res.status(400).send("<h1>400 Bad Request</h1><p>Please make sure you have filled both the email and password fields.</p>");
  }
  // checks if the credentials match one of our registered users
  const user = getUserByEmail(email, users);
  if (user && user.email === email && bcrypt.compareSync(password, user.password)) {
    // if all conditions are met, a user_id cookie will be set
    req.session.user_id = user.id;
    return res.redirect('/urls');
  }
  return res.status(403).send("<h1>403 Forbidden client error </h1><p>Please make sure you are using valid credentials.</p>");
});

// clears the session cookies and redirects to /urls
app.post('/logout', (req, res) => {
  res.clearCookie("session");
  res.clearCookie("session.sig");
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});