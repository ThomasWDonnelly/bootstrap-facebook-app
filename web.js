var async   = require('async');
var express = require('express');
var util    = require('util');
// create an express webserver
var app = express();

app.configure(function() {

  app.use(express.logger());
  app.use(express.static(__dirname + '/public'));
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  
  // set this to a secret value to encrypt session cookies
  app.use(express.session({ secret: process.env.SESSION_SECRET || 'secret123' }));

  app.use(require('faceplate').middleware({
    app_id: process.env.FACEBOOK_APP_ID,
    secret: process.env.FACEBOOK_SECRET,
    scope:  'user_likes,user_about_me,email,publish_actions'
  }));

  app.use(function(req, res, next) {
    res.locals.host   = req.headers['host'];
    res.locals.scheme = req.headers['x-forwarded-proto'] || 'http';
    
    res.locals.url_no_scheme = function(path) {
      return '://' + req.headers['host'] + (path || '');
    }

    res.locals.url = function(path) {
      return (req.headers['x-forwarded-proto'] || 'http') + res.locals.url_no_scheme(path);
    }

    res.locals.inspect = function(mixed) {
      return util.inspect(mixed);
    }

    res.locals.json = function(mixed) {
      return JSON.stringify(mixed);
    }

    res.locals.signed_request = req.facebook.signed_request;

    next();
  });

});

// listen to the PORT given to us in the environment
var port = process.env.PORT || 3000;

app.listen(port, function() {
  console.log("Listening on " + port);
});

function render_page(req, res) {
  req.facebook.app(function(app) {
    req.facebook.me(function(user) {
      res.render('index_like_only.ejs', {
        layout:    false,
        req:       req,
        app:       app,
        user:      user
      });
    });
  });
}

function handle_facebook_request(req, res) {

  // if the user is logged in
  if (req.facebook.token) {

    async.series([
      function(cb) {
        req.facebook.get('/me', function(data) {
          req.me = data;
          cb();
        });
      },

      function(cb) {
        req.facebook.get('/me/likes', function(data) {
          req.likes = data;
          cb();
        });
      }
    ], function() {
      render_page(req,res);
    });

      

  } else {
    render_page(req, res);
  }
}

app.get('/', handle_facebook_request);
app.post('/', handle_facebook_request);
