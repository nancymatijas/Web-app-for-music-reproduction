var express = require('express');
var router = express.Router();
const db = require('../db'); 
router.use(express.static('public')); 

const SpotifyWebApi = require('spotify-web-api-node');
const spotifyApi = new SpotifyWebApi({
    clientId: '025959746baa40cbb7a95ae639b57a47',
    clientSecret: 'bf2abfb50eb848de9c3b6014d556f4b7',
});

router.get('/', function (req, res) {
  var username = req.session.username;
  var isAdmin = req.session.isAdmin; 

  if (isAdmin) {
    req.session.destroy(function(err) {
      if (err) {
        console.log('Error occurred while logging out admin:', err);
        res.render('error'); 
        return;
      }
      res.redirect('/autentification/logout'); 
    });
    return; 
  }

  spotifyApi.clientCredentialsGrant().then(
    (data) => {
      spotifyApi.setAccessToken(data.body['access_token']);

      spotifyApi.getNewReleases({ limit: 50, offset: 0, country: 'HR', include_groups: 'album,single' })
        .then((data) => {
          const albums = data.body.albums.items;
          
          const albumsWithImages = albums.map(album => {
            const imageUrl = album.images.length > 0 ? album.images[0].url : null;
            return {
              ...album,
              imageUrl: imageUrl
            };
          });
          
          res.render('index', { albums: albumsWithImages, loggedIn: req.session.loggedIn, username: username });
        })
        .catch((err) => {
          console.log('Error occurred while getting new releases:', err);
          res.render('error'); 
        });
    },
    (err) => {
      console.log('Error retrieving access token:', err);
      res.render('error'); 
    }
  );
});


router.get('/tracks/:id', function (req, res) {
  const albumId = req.params.id;

  spotifyApi.getAlbum(albumId)
  .then((data) => {
    var username = req.session.username;
    const album = data.body;
    const imageUrl = album.images.length > 0 ? album.images[0].url : null;
    const albumTitle = album.name; 
    const albumArtist = album.artists[0].name;

    spotifyApi.getAlbumTracks(albumId, { limit: 50, offset: 0 })
      .then((data) => {
        const tracks = data.body.items;
        res.render('tracks', { tracks: tracks, albumImageUrl: imageUrl, albumTitle: albumTitle, albumArtist: albumArtist, loggedIn: req.session.loggedIn, username: username }); // Pass albumTitle to the template
      })
      .catch((err) => {
        console.log('Error occurred while getting album tracks:', err);
        res.send("Error2");
      });
  })
  .catch((err) => {
    console.log('Error occurred while getting album details:', err);
    res.send("Error3");
  });

});


//search bar
router.get('/search', function (req, res) {
  var searchData = req.query.data;
  var username = req.session.username;
  spotifyApi.searchTracks(searchData)
      .then(function (data) {
          res.render('search', { results: data.body.tracks.items, loggedIn: req.session.loggedIn, username: username });
      })
      .catch(function (err) {
          console.error(err);
          res.render('search', { results: [], loggedIn: req.session.loggedIn, username: username  });
      });
});


//---------------------------------------------------------------------------PLAYLISTA ALBUMA-------------------------------------------------------------------------------

//ruta playlist
router.get("/playlist_albums", function (req, res) {
  if (req.session.loggedIn) {
    var username = req.session.username;
    const userId = req.session.user;
    db.query("SELECT * FROM playlist_albums WHERE user_id = ?", userId, (error, result) => {
      if (error) {
        //ovo je dodano da se prikazuje stranica kad i kada nema nista u playlisti
        res.render("playlist_albums", { loggedIn: req.session.loggedIn, username: username, playlists_albums: [] });
      } else {
        res.render("playlist_albums", { loggedIn: req.session.loggedIn, username: username, playlists_albums: result });
      }
    });
  } else {
    res.redirect("/autentification/login");
  }
});

// dodavanje albuma u playlistu
router.post("/playlist_albums/add", function (req, res) {
  if (req.session.loggedIn) {
    const albumId = req.body.albumId;
    const userId = req.session.user;

    spotifyApi.getAlbum(albumId)
      .then((data) => {
        const album = data.body;
        const artist = album.artists[0].name;
        const albumName = album.name;
        const imageUrl = album.images.length > 0 ? album.images[0].url : null;
        const albumId = album.id;

        db.query(
          "SELECT * FROM playlist_albums WHERE album_id = ? AND user_id = ?",
          [albumId, userId],
          (error, result) => {
            if (error) throw error;

            if (result.length > 0) {
              res.redirect("/playlist_albums");
            } else {
              db.query(
                "INSERT INTO playlist_albums (album_id, user_id, artist, album_name, cover_image_url) VALUES (?, ?, ?, ?, ?)",
                [albumId, userId, artist, albumName, imageUrl],
                (error, result) => {
                  if (error) throw error;
                  res.redirect("/playlist_albums"); 
                }
              );
            }
          }
        );
        
      })
      .catch((err) => {
        console.log("Error occurred while getting album details:", err);
        res.render("error"); 
      });
  } else {
    res.redirect("/autentification/login");
  }
});

// brisanje albuma s playliste
router.post("/playlist_albums/delete", function (req, res) {
  if (req.session.loggedIn) {
    const albumId = req.body.albumId;
    const userId = req.session.user;
    db.query(
      "DELETE FROM playlist_albums WHERE album_id = ? AND user_id = ?",
      [albumId, userId],
      (error, result) => {
        if (error) throw error;
        res.redirect("/playlist_albums"); 
      }
    );
  } else {
    res.redirect("/autentification/login");
  }
});


//---------------------------------------------------------------------------PLAYLISTA PJESAMA-------------------------------------------------------------------------------

router.get("/playlist_tracks", function (req, res) {
  if (req.session.loggedIn) {
    var username = req.session.username;
    const userId = req.session.user;
    db.query("SELECT * FROM playlist_tracks WHERE user_id = ?", userId, (error, result) => {
      if (error) throw error;

      const tracks = result;
      const trackIds = tracks.map((track) => track.track_id);

      spotifyApi.getTracks(trackIds)
        .then((data) => {
          const trackData = data.body.tracks;

          trackData.forEach((track) => {
            const previewUrl = track.preview_url;
            const trackId = track.id;

            const matchingTrack = tracks.find((track) => track.track_id === trackId);
            if (matchingTrack) {
              matchingTrack.preview_url = previewUrl;
            }
          });

          if (tracks.length === 0) {
            res.render("playlist_tracks", { loggedIn: req.session.loggedIn, username: username, playlist_tracks: [] });
          } else {
            res.render("playlist_tracks", { loggedIn: req.session.loggedIn, username: username, playlist_tracks: tracks });
          }
        })
        .catch((err) => {
          res.render("playlist_tracks", { loggedIn: req.session.loggedIn, username: username, playlist_tracks: [] }); // Render the playlist_tracks page with an empty array
        });
    });
  } else {
    res.redirect("/autentification/login");
  }
});


router.post("/playlist_tracks/add", function (req, res) {
  console.log(req.body.trackId); 

  if (req.session.loggedIn) {
    const trackId = req.body.trackId;
    const userId = req.session.user;

    spotifyApi.getTrack(trackId)
      .then((data) => {
        const track = data.body;
        const artist = track.artists[0].name;
        const trackName = track.name;
        const albumName = track.album.name;
        const imageUrl = track.album.images.length > 0 ? track.album.images[0].url : null;
        const previewUrl = track.preview_url;

        db.query(
          "SELECT * FROM playlist_tracks WHERE track_id = ? AND user_id = ?",
          [trackId, userId],
          (error, result) => {
            if (error) {
              throw error;
            }

            if (result.length > 0) {
              res.redirect("/playlist_tracks");
            } else {
              db.query(
                "INSERT INTO playlist_tracks (user_id, track_id, track_name, artist, album_name, cover_image_url, preview_url) VALUES (?, ?, ?, ?, ?, ?, ?)",
                [userId, trackId, trackName, artist, albumName, imageUrl, previewUrl],
                (error, result) => {
                  if (error) {
                    throw error;
                  }
                  res.redirect("/playlist_tracks"); 
                }
              );
            }
          }
        );
        
      })
      .catch((err) => {
        res.send("Error99");
      });
  } else {
    res.redirect("/autentification/login");
  }
});


// Brisanje pjesme s playliste
router.post("/playlist_tracks/delete", function (req, res) {
  if (req.session.loggedIn) {
    const trackId = req.body.trackId;
    const userId = req.session.user;

    db.query(
      "DELETE FROM playlist_tracks WHERE track_id = ? AND user_id = ?",
      [trackId, userId],
      (error, result) => {
        if (error) 
          throw error;
        res.redirect("/playlist_tracks"); 
      }
    );
  } else {
    res.redirect("/autentification/login");
  }
});


module.exports = router;