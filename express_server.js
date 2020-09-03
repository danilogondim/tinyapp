const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');
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

app.get('/', (req, res) => {
  if (req.session.user_id) {
    return res.redirect('urls');
  }
  res.redirect('login');
});


app.get("/urls", (req, res) => {
  const user = users[req.session.user_id];
  const urls = userURLs(user, urlDatabase);
  const templateVars = {
    user,
    urls
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/new", (req, res) => {
  // only registered users can shorten URLs. If the user is not logged in, the page redirects to the login page
  if (req.session.user_id) {
    const templateVars = {
      user: users[req.session.user_id]
    };
    return res.render("urls_new", templateVars);
  }
  res.redirect('/login');
});

app.get("/urls/:shortURL", (req, res) => {
  const user = users[req.session.user_id];
  const urls = userURLs(user, urlDatabase);
  const longURL = urlDatabase[req.params.shortURL] ? urlDatabase[req.params.shortURL].longURL : "";
  const templateVars = {
    shortURL: req.params.shortURL,
    longURL,
    user,
    urls
  };
  res.render("urls_show", templateVars);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});


// a post route to create new shortened urls
app.post("/urls", (req, res) => {
  const userID = req.session.user_id;
  if (!userID) {
    return res.status(400).send("<h1>400 Bad Request</h1><p>You need to be logged in in order to short an URL.</p>");
  }
  const shortURL = generateRandomString();
  let longURl = req.body.longURL;
  if (!(longURl.match(/^(https:\/\/|http:\/\/)/))) {
    longURl = `http://www.${longURl}`;
  }
  urlDatabase[shortURL] = { "longURL": longURl, userID };
  return res.redirect(`/urls/${shortURL}`);
});

app.get('/u/:shortURL', (req, res) => {
  const longURL = urlDatabase[req.params.shortURL] ? urlDatabase[req.params.shortURL].longURL : "";
  console.log(longURL);
  if (longURL) {
    return res.redirect(longURL);
  }
  return res.status(400).send("<h1>400 Bad Request</h1><p>The link you are trying to access is not available. It may have been removed from our database by its owner.</p>");
});

// Add a POST route that removes a URL resource: POST /urls/:shortURL/delete, and redirects the client back to the urls_index page ("/urls").
app.post('/urls/:shortURL/delete', (req, res) => {
  const userID = req.session.user_id;
  if (!userID) {
    return res.status(400).send("<h1>400 Bad Request</h1><p>You need to be logged in in order to delete your URL.</p>");
  }
  const user = users[userID];
  const urls = userURLs(user, urlDatabase);
  const shortURL = req.params.shortURL;
  if (Object.keys(urls).includes(shortURL)) {
    delete urlDatabase[shortURL];
  } else {
    return res.status(400).send("<h1>400 Bad Request</h1><p>You can only delete the URLs you own.</p>");
  }
  res.redirect("/urls");
});

// Add a POST route that updates a URL resource: POST /urls/:shortURL, and redirects the client back to the urls_show page ("/urls/:shortURL").
app.post('/urls/:shortURL', (req, res) => {

  const userID = req.session.user_id;
  if (!userID) {
    return res.status(400).send("<h1>400 Bad Request</h1><p>You need to be logged in in order to update your URL.</p>");
  }
  const user = users[userID];
  const urls = userURLs(user, urlDatabase);
  const shortURL = req.params.shortURL;
  const longURl = req.body.longURL;

  if (Object.keys(urls).includes(shortURL)) {
    if (longURl.match(/^(https:\/\/|http:\/\/)/)) {
      urlDatabase[shortURL].longURL = longURl;
    } else {
      urlDatabase[shortURL].longURL = `http://www.${longURl}`;
    }
  } else {
    return res.status(400).send("<h1>400 Bad Request</h1><p>You can only update the URLs you own.</p>");
  }
  res.redirect(`/urls/${shortURL}`);
});

// Add a GET route to render the register template
app.get('/register', (req, res) => {
  const userID = req.session.user_id;
  if (userID) {
    return res.redirect('/urls');
  }
  
  // SHOULD I PASS THE USER_ID or USER OBJECT???? IF I AM REGISTERING SOMEONE NEW, IT SHOULD MEAN THAT I DON'T HAVE THE COOKIE SET
  const templateVars = {
    user: users[req.session.user_id]
  };
  res.render('register', templateVars);
});

// Add a POST route to include the new user in our users object if the required fields are filled and the email is not already registered in our users database
app.post('/register', (req, res) => {
  const { email, password } = req.body;
  // before accepting the registration, we check if either of the fields are blank or if the email is already registered
  if (email === "" || password === "") {
    return res.status(400).send("<h1>400 Bad Request</h1><p>Please make sure you have filled both the email and password fields.</p>");
  }
  if (getUserByEmail(email, users)) {
    return res.status(400).send("<h1>400 Bad Request</h1><p>The email is already registered.</p>");
  }

  // if it passes our tests, now we will set the new user;
  const id = generateRandomString();
  users[id] = {
    id,
    email,
    password: bcrypt.hashSync(password, 10)
  };
  req.session.user_id = id;
  res.redirect('/urls');
});

// Add a GET route to render the login template
app.get('/login', (req, res) => {
  // SHOULD I PASS THE USER_ID or USER OBJECT???? IF I HAVE THE COOKIE SET, WHAT SHOULD BE THE EXPECTED BEHAVIOR?
  const userID = req.session.user_id;
  if (userID) {
    return res.redirect('/urls');
  }
  const templateVars = {
    user: users[req.session.user_id]
  };
  res.render('login', templateVars);
});

// Add a route to handle a POST to /login
app.post('/login', (req, res) => {
  const { email, password } = req.body;
  // first check if the login attempt was valid (no blank fields)
  if (email === "" || password === "") {
    return res.status(400).send("<h1>400 Bad Request</h1><p>Please make sure you have filled both the email and password fields.</p>");
  }

  // check if the credentials match with one of our registered users
  const user = getUserByEmail(email, users);
  if (user) {
    if (user.email === email && bcrypt.compareSync(password, user.password)) {
      // if the credentials given are valid and match our database, a user_id cookie will be set
      req.session.user_id = user.id;
      return res.redirect('/urls');
    }
  }
  return res.status(403).send("<h1>403 Forbidden client error </h1><p>Please make sure you are using valid credentials.</p>");
});

// Add a route to handle a POST to /logout. It clears the user_id cookie and redirects to /urls
app.post('/logout', (req, res) => {
  res.clearCookie("session");
  res.clearCookie("session.sig");
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});