var express = require("express");
var router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../db');

router.get('/login', function (req, res) {
    res.render('login_admin', {layout: 'adminLayout'});
});

router.get('/signup', function (req, res) {
    res.render('signup_admin', {layout: 'adminLayout'});
});

router.post('/signup', function (req, res) {
    const { email, username, password } = req.body;

    db.query(
        "SELECT * FROM admins WHERE email = ? OR username = ?",
        [email, username],
        async (error, results) => {
            if (error) throw error;

            if (results.length > 0) {
                res.send('<script>alert("Administrator s ovim korisničkim imenom ili emailom već postoji!"); window.location.href="/admin/signup";</script>');
            } else {
                try {
                    const hashedPassword = await bcrypt.hash(password, 10);

                    const admin = {
                        email: email,
                        username: username,
                        password: hashedPassword,
                        is_verify: false 
                    };

                    db.query("INSERT INTO admins SET ?", admin, (error, result) => {
                        if (error) throw error;
                        console.log(admin);
                        res.redirect("/admin/login");
                    });
                } catch (error) {
                    throw error;
                }
            }
        }
    );
});

router.post('/login', function (req, res) {
    var flag = false;
    db.query("SELECT * FROM admins", async (error, result) => {
        if (error) {
            throw error;
        }
        for (var i = 0; i < result.length; i++) {
            if (req.body.username == result[i].username && await bcrypt.compare(req.body.password, result[i].password)) {
                flag = true;
                req.admin = result[i].id;
                req.username = req.body.username;
                console.log(req.admin);
                break;
            }
        }
        if (flag) {
            req.session.isAdmin = true;
            req.session.loggedIn = true;
            req.session.admin = req.admin;
            req.session.username = req.username;
            console.log(req.admin);
            res.redirect('/admin/dashboard_admin');
        } else {
            res.send('<script>alert("Neispravno ime ili lozinka!"); window.location.href="/admin/login";</script>');
        }
    });
});


router.get("/logout", function (req, res) {
    req.session.loggedIn = false;
    req.session.destroy();
    console.log("Logout");
    res.redirect("/admin/login");
});


const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi({
  clientId: '025959746baa40cbb7a95ae639b57a47',
  clientSecret: 'bf2abfb50eb848de9c3b6014d556f4b7',
});

router.get('/dashboard_admin', async (req, res) => {
  if (!req.session.isAdmin || !req.session.loggedIn) {
    return res.redirect('/admin/login');
  }

  try {
    db.query("SELECT * FROM admins WHERE id = ? AND is_verify = 1", [req.session.admin], async (error, results) => {
      if (error) throw error;

      if (results.length === 0) {
        return res.send('<script>alert("Administrator nije verificiran!"); window.location.href="/admin/login";</script>');
      }

      db.query("SELECT * FROM admins", async (error, adminResults) => {
        if (error) throw error;

        db.query("SELECT * FROM users", async (error, userResults) => {
          if (error) throw error;

          try {
            const data = await spotifyApi.clientCredentialsGrant();
            const accessToken = data.body['access_token'];
            spotifyApi.setAccessToken(accessToken);
            const artistsResponse = await spotifyApi.searchArtists('artist', { limit: 50 });
            const artists = artistsResponse.body.artists.items;
            res.render("dashboard_admin", {
              loggedIn: req.session.loggedIn,
              username: req.session.username,
              isAdmin: req.session.isAdmin,
              admins: adminResults, 
              users: userResults, 
              artists: artists,
              layout: 'adminLayout'
            });
          } catch (error) {
            console.error('Greška prilikom dohvaćanja izvođača:', error);
            res.render('error');
          }
        });
      });
    });
  } catch (error) {
    console.error('Greška prilikom dohvaćanja podataka:', error);
    res.render('error');
  }
});


router.post('/verify_admin', function (req, res) {
    const adminId = req.body.adminId;

    db.query("SELECT * FROM admins WHERE id = ? AND is_verify = 1", [req.session.admin], (error, results) => {
        if (error) throw error;

        if (results.length === 0) {
            return res.send('<script>alert("Administrator nije verificiran!"); window.location.href="/admin/login";</script>');
        }

        db.query("UPDATE admins SET is_verify = 1 WHERE id = ?", [adminId], (error, result) => {
            if (error) throw error;
            
            res.redirect('/admin/dashboard_admin');
        });
    });
});


router.post('/delete_user', function (req, res) {
    const userId = req.body.userId;

    db.query("DELETE FROM users WHERE id = ?", [userId], (error, result) => {
        if (error) throw error;
        console.log(`User with ID ${userId} deleted successfully`);
        res.redirect('/admin/dashboard_admin');
    });
});


router.get('/dashboard_admin/user/:userId', function (req, res) {
    if (!req.session.isAdmin || !req.session.loggedIn) {
        return res.redirect('/admin/login');
    }

    db.query("SELECT * FROM admins WHERE id = ? AND is_verify = 1", [req.session.admin], (error, results) => {
        if (error) throw error;

        // Provjerite je li admin verificiran
        if (results.length === 0) {
            return res.send('<script>alert("Administrator nije verificiran!"); window.location.href="/admin/login";</script>');
        }

        const userId = req.params.userId;

        db.query("SELECT * FROM users WHERE id = ?", [userId], (error, userResults) => {
            if (error) throw error;

            db.query("SELECT * FROM playlist_tracks WHERE user_id = ?", [userId], (error, trackResults) => {
                if (error) throw error;

                db.query("SELECT * FROM playlist_albums WHERE user_id = ?", [userId], (error, albumResults) => {
                    if (error) throw error;

                    res.render("user_details", {
                        loggedIn: req.session.loggedIn,
                        username: req.session.username,
                        isAdmin: req.session.isAdmin,
                        user: userResults[0], 
                        tracks: trackResults, 
                        albums: albumResults, 
                        layout: 'adminLayout'
                    });
                });
            });
        });
    });
});


router.post('/dashboard_admin/user/:userId/delete_album/:albumId', function (req, res) {
    const albumId = req.params.albumId;
    const userId = req.params.userId;

    db.query("DELETE FROM playlist_albums WHERE id = ?", [albumId], (error, result) => {
        if (error) throw error;
        console.log(`Album with ID ${albumId} deleted successfully`);
        res.redirect('/admin/dashboard_admin/user/' + userId);
    });
});


router.post('/dashboard_admin/user/:userId/delete_track/:trackId', function (req, res) {
    const trackId = req.params.trackId;
    const userId = req.params.userId;

    db.query("DELETE FROM playlist_tracks WHERE id = ?", [trackId], (error, result) => {
        if (error) throw error;
        console.log(`Track with ID ${trackId} deleted successfully`);
        res.redirect('/admin/dashboard_admin/user/' + userId);
    });
});

module.exports = router;
