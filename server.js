// server.js
const express = require('express');
const SpotifyWebApi = require('spotify-web-api-node');
const path = require('path');

const server = express();
const PORT = process.env.PORT || 3000;

// Set up the Spotify API client
const spotifyApi = new SpotifyWebApi({
    clientId: '5e8f7d2ce8c94c808b46f4e7fe416f77',
    clientSecret: '845b128d017d4258998df24dbb3337cf',
    redirectUri: 'http://localhost:3000/callback'
});

// Serve static files from the public directory
server.use(express.static(path.join(__dirname, 'public')));

// Serve index.html for the /song/:id route
server.get('/song/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Login route
server.get('/login', (req, res) => {
    const scopes = ['user-read-private', 'user-read-email', 'user-library-read'];
    const authorizeURL = spotifyApi.createAuthorizeURL(scopes);
    res.redirect(authorizeURL);
});

// Callback route
server.get('/callback', (req, res) => {
    const {code} = req.query;
    spotifyApi.authorizationCodeGrant(code).then(data => {
        // Save the access token and refresh token
        spotifyApi.setAccessToken(data.body['access_token']);
        spotifyApi.setRefreshToken(data.body['refresh_token']);
        // Redirect the user back to the main page
        res.redirect('/');
    }).catch(error => {
        console.error('Error during authorization:', error);
        res.redirect('/');
    });
});

// Route to get user profile and liked songs
server.get('/user-data', async (req, res) => {
    try {
        const userProfile = await spotifyApi.getMe();
        let likedSongs = [];
        let offset = 0;
        let response;

        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        });

        do {
            response = await spotifyApi.getMySavedTracks({limit: 50, offset: offset});
            likedSongs = likedSongs.concat(response.body.items);
            offset += 50;

            const progress = Math.floor((offset / response.body.total) * 100);
            res.write(`event: progress\ndata: ${progress}\n\n`);
        } while (response.body.next);

        res.write(`event: complete\ndata: ${JSON.stringify({
            userProfile: userProfile.body,
            likedSongs: likedSongs
        })}\n\n`);
        res.end();
    } catch (error) {
        console.error('Error retrieving user data:', error);
        res.status(500).json({error: 'Internal Server Error'});
    }
});

// Start the server
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
