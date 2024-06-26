var express = require("express");
var hbs = require('hbs');
var session = require("express-session");
const dotenv = require('dotenv');
dotenv.config({ path: './.env' })
const db = require('./db');

db.connect( (error) => {
    if(error) {
        console.log(error)
    } else{
        console.log("MYSQL Connected...")
    }
})

var port = process.env.PORT || 4567;

var app = express();
app.use(
    session({
        resave: false, 
        saveUninitialized: true, 
        secret: "Express session secret",
    })
);

app.use(express.static("public"));
app.use(express.urlencoded({
    extended: false
}));

//koju vrstu enginea koristimo - handlere
app.set('view engine', 'hbs'); 

app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

//handlers
hbs.registerPartials(__dirname + '/views/partials/');
hbs.registerHelper('is', function (parameter, string, options) {
    if (parameter == string) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

var autentificationRouter = require('./routes/autentification');
app.use('/autentification', autentificationRouter);

var adminRouter = require('./routes/admin');
app.use('/admin', adminRouter); 

var homeRouter = require('./routes/home');
app.use('/', homeRouter);

const bcrypt = require('bcrypt');

app.post("/autentification/signup", function (req, res) {
  const { email, username, password } = req.body;

  db.query(
    "SELECT * FROM users WHERE email = ? OR username = ?",
    [email, username],
    async (error, results) => {
      if (error) throw error;

      if (results.length > 0) {
        res.send('<script>alert("Korisnik s ovim korisničkim imenom ili emailom već postoji!"); window.location.href="/autentification/login";</script>');
      } else {
        try {
          const hashedPassword = await bcrypt.hash(password, 10); // Hashiranje lozinke

          const user = {
            email: email,
            username: username,
            password: hashedPassword // Pohranjivanje hashirane lozinke u bazu podataka
          };

          db.query("INSERT INTO users SET ?", user, (error, result) => {
            if (error) throw error;
            console.log(user);
            res.redirect("/autentification/login");
          });
        } catch (error) {
          throw error;
        }
      }
    }
  );
});
app.post('/autentification/login', function (req, res) {
    var flag = false;
    db.query("SELECT * FROM users", async (error, result) => {
      if (error) {
        throw error;
      }
      for (var i = 0; i < result.length; i++) {
        if (req.body.username == result[i].username && await bcrypt.compare(req.body.password, result[i].password)) {
          flag = true;
          req.user = result[i].id;
          req.username = req.body.username;
          console.log(req.user);
          break;
        }
      }
      if (flag) {
        req.session.isUser = true;
        req.session.loggedIn = true;
        req.session.user = req.user;
        req.session.username = req.username;
        console.log(req.user);
        res.redirect('/');
      } else {
        res.send('<script>alert("Neispravno korisničko ime ili lozinka!"); window.location.href="/autentification/login";</script>');
      }
    });
  });
  

var albumRouter = require('./routes/album');
app.use('/album', albumRouter);

app.get('*', function (req, res) {
    res.status(404).send('<h1>what??? page not found! 404</h1>');
});

app.listen(port, function (req, res) {
    console.log("listening at 4567");
});

module.exports = app;
