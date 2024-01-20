var express = require("express");
var router = express.Router();
var userModel = require("./users");
var postModel = require("./post");
var passport = require("passport");
var localStrategy = require("passport-local");
var upload = require("./multer");
passport.use(new localStrategy(userModel.authenticate()));
router.get("/", function (req, res) {
  res.render("index", { footer: false });
});

router.get("/login", function (req, res) {
  res.render("login", { footer: false });
});

router.get("/feed", isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user });
  const posts = await postModel.find().populate("user");

  res.render("feed", { footer: true, posts, user });
});

router.get("/profile", isLoggedIn, async function (req, res) {
  var user = await userModel
    .findOne({ username: req.session.passport.user })
    .populate("posts");
  console.log(user);
  res.render("profile", { footer: true, user });
});

router.get("/search", isLoggedIn, function (req, res) {
  res.render("search", { footer: true });
});
router.get("/username/:username", isLoggedIn, async function (req, res) {
  const regex = new RegExp(`${req.params.username}`, "i");
  const user = await userModel.find({ username: regex });
  res.json(user);
});
router.get("/like/post/:id", isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user });
  var post = await postModel.findOne({ _id: req.params.id });

  // if already liked then don't liked
  // if not then lik it
  if (post.likes.indexOf(user._id) === -1) {
    post.likes.push(user._id);
  } else {
    post.likes.splice(post.likes.indexOf(user._id), 1);
  }
  await post.save();
  res.redirect("/feed");
});

router.get("/delete/post/:id", isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user });
  var post = await postModel.findOne({ _id: req.params.id });
  post = await postModel.findByIdAndDelete({ _id: req.params.id });
  await user.save();
  res.redirect("/profile");
  console.log(post);
});

router.get("/edit", isLoggedIn, async function (req, res) {
  var user = await userModel.findOne({ username: req.session.passport.user });
  res.render("edit", { footer: true, user: user });
});

router.get("/upload", isLoggedIn, function (req, res) {
  res.render("upload", { footer: true });
});

router.post("/register", function (req, res) {
  const { username, email, name } = req.body;

  var userdata = new userModel({
    username: username,
    name: name,
    email: email,
    password: String,
  });

  userModel.register(userdata, req.body.password).then(function () {
    passport.authenticate("local")(req, res, function () {
      res.redirect("/feed");
    });
  });
});

router.post(
  "/login",
  passport.authenticate("local", {
    successRedirect: "/feed",
    failureRedirect: "/login",
  }),
  function (req, res) {}
);

router.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.redirect("/login");
  });
});
function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

router.post("/update", upload.single("image"), async function (req, res) {
  const user = await userModel.findOneAndUpdate(
    { username: req.session.passport.user },
    {
      username: req.body.username,
      name: req.body.name,
      bio: req.body.bio,
    },
    { new: true }
  );

  if (req.file) {
    user.profileImage = req.file.filename;
  }
  let userdata = await user.save();
  console.log(userdata);
  res.redirect("/profile");
});

router.post(
  "/upload",
  isLoggedIn,
  upload.single("image"),
  async function (req, res) {
    const user = await userModel.findOne({
      username: req.session.passport.user,
    });
    const post = await postModel.create({
      picture: req.file.filename,
      user: user._id,
      caption: req.body.caption,
    });

    user.posts.push(post._id);
    await user.save();
    res.redirect("/feed");
  }
);
module.exports = router;
