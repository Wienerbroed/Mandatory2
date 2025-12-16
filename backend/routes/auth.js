// Imports
import express from 'express';
import { db } from '../db/db.js';
import bcrypt, { hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { verifyAccessToken } from "../middleware/auth.js";
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';

// Setuo router
const router = express.Router();

// nodemailer setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Login 
router.post('/login', async (req, res, next) => {
    try {
        // calls input as attributes for email and password
        const { email, password } = req.body;

        // catch error if no match
        if (!email || !password) {
            return res.json({ error: 'Both Email and password are required' });
        }

        // Fetch user based on email
        const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);

        //catch error for no users found 
        if (!user) {
            return res.json({ error: 'User not found' });
        }

        // compare input password to hash password
        const isMatch = await bcrypt.compare(password, user.password);

        // password error catch
        if (!isMatch) {
            return res.json({ error: 'Credentials do not match' });
        }

        // Create tokens
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken(user.id);

        // Store refresh token in DB
        await db.run("UPDATE users SET refreshToken = ? WHERE id = ?", [
            refreshToken,
            user.id
        ]);

        res.json({
            success: true,
            accessToken,
            refreshToken,
            userId: user.id
        });

        // general error for no serve connection
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
});

// LOGOUT
router.post("/logout", async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken)
        return res.json({ success: true });

    // Remove refresh token from DB
    await db.run(
        "UPDATE users SET refreshToken = NULL WHERE refreshToken = ?",
        [refreshToken]
    );

    res.json({ success: true });
});

// Signup 
router.post('/signUp', async (req, res, next) => {
    try{
        //Calls input as attributes for email and password
        const {email, password} = req.body;

        // error catch for mising credentials
        if(!email || !password) {
            return res.status(400).json({ success: false, message: 'Both Email and Password a required.'});
        }

        // Checking for existing users
        const exists = await db.get('SELECT * FROM users WHERE email = ?', [email]);

        if(exists) {
            return res.status(407).json({success: false, message: 'Email already registered.'});
        }

        //Password hasher
        const hashedPassword = await bcrypt.hash(password, 13);

        const result = await db.run(
            "INSERT INTO users (email, password) VALUES (?, ?)",
            [email, hashedPassword]
        );

        // sets user ud for login session
        const userId = result.lastID;

        const accessToken = generateAccessToken(userId);
        const refreshToken = generateRefreshToken(userId);

        await db.run(
            "UPDATE users SET refreshToken = ? WHERE id = ?", 
            [refreshToken, userId]
        );

        
        // sends welcome mail 
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Welcome",
            text: "Thank you for signing up."
        });

        res.json({
            success: true,
            accessToken,
            refreshToken,
            userId: userId
        });

    } catch (err) {
        console.error('Signup error: ', err);
        return res.status(500).json({ success: false, message: 'Server error.'})
    }
});

// refresh token
router.post("/refresh", async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken)
        return res.status(401).json({ error: "Missing refresh token" });

    const user = await db.get(
        "SELECT * FROM users WHERE refreshToken = ?",
        [refreshToken]
    );

    if (!user)
        return res.status(403).json({ error: "Invalid refresh token" });

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, decoded) => {
        if (err)
            return res.status(403).json({ error: "Expired refresh token" });

        const newAccessToken = generateAccessToken(user.id);
        res.json({ accessToken: newAccessToken });
    });
});

router.get("/protected", verifyAccessToken, (req, res) => {
    res.json({ message: "You accessed a protected route!", user: req.user });
});


// Forgot password
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (!email)
        return res.status(400).json({ error: "Email required" });

    const user = await db.get(
        "SELECT * FROM users WHERE email = ?",
        [email]
    );

    // Do NOT reveal if user exists
    if (!user)
        return res.json({ success: true });

    const resetToken = jwt.sign(
        { id: user.id },
        process.env.RESET_PASSWORD_SECRET,
        { expiresIn: "10m" }
    );

    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await db.run(
        "UPDATE users SET resetToken = ?, resetTokenExpires = ? WHERE id = ?",
        [resetToken, expires, user.id]
    );

    const resetLink = `${process.env.FRONTEND_URL}/#/reset-password?token=${resetToken}`;

    await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: "Password Reset",
        html: `
            <p>You requested a password reset.</p>
            <p>
                <a href="${resetLink}">
                    Reset Password
                </a>
            </p>
            <p>This link expires in 10 minutes.</p>
        `
    });

    res.json({ success: true });
});


// update password
router.post("/reset-password", async (req, res) => {
    const { token, password, confirmPassword } = req.body;

    if (!token || !password || !confirmPassword)
        return res.status(400).json({ error: "Missing fields" });

    if (password !== confirmPassword)
        return res.status(400).json({ error: "Passwords do not match" });

    let decoded;
    try {
        decoded = jwt.verify(token, process.env.RESET_PASSWORD_SECRET);
    } catch {
        return res.status(403).json({ error: "Invalid or expired token" });
    }

    const user = await db.get(
        `SELECT * FROM users 
         WHERE id = ? 
         AND resetToken = ? 
         AND resetTokenExpires > datetime('now')`,
        [decoded.id, token]
    );

    if (!user)
        return res.status(403).json({ error: "Token expired or invalid" });

    const hashedPassword = await bcrypt.hash(password, 13);

    await db.run(
        `UPDATE users 
         SET password = ?, resetToken = NULL, resetTokenExpires = NULL 
         WHERE id = ?`,
        [hashedPassword, user.id]
    );

    res.json({ success: true });
});


// -------------------------------------------------------
// POSTS CRUD
// -------------------------------------------------------

router.post("/posts", verifyAccessToken, async (req, res) => {
    const { text, image } = req.body;
    const userId = req.user.id;

    await db.run(
        "INSERT INTO posts (userId, text, image) VALUES (?, ?, ?)",
        [userId, text, image]
    );

    res.json({ success: true });
});

// GET ALL POSTS
router.get("/posts", async (req, res) => {
    const posts = await db.all(`
        SELECT posts.*, users.email 
        FROM posts 
        JOIN users ON posts.userId = users.id
        ORDER BY createdAt DESC
    `);

    res.json(posts);
});

// UPDATE POST
router.put("/posts/:id", verifyAccessToken, async (req, res) => {
    const { id } = req.params;
    const { text, image } = req.body;

    const post = await db.get("SELECT * FROM posts WHERE id = ?", [id]);

    if (!post)
        return res.status(404).json({ error: "Post not found" });

    if (post.userId !== req.user.id)
        return res.status(403).json({ error: "Not allowed" });

    await db.run(
        "UPDATE posts SET text = ?, image = ? WHERE id = ?",
        [text, image, id]
    );

    res.json({ success: true });
});

// DELETE POST
router.delete("/posts/:id", verifyAccessToken, async (req, res) => {
    const { id } = req.params;

    const post = await db.get("SELECT * FROM posts WHERE id = ?", [id]);

    if (!post)
        return res.status(404).json({ error: "Not found" });

    if (post.userId !== req.user.id)
        return res.status(403).json({ error: "Not allowed" });

    await db.run("DELETE FROM posts WHERE id = ?", [id]);

    res.json({ success: true });
});


// Get user by ID
router.get("/user/:id", async (req, res) => {
    const { id } = req.params;

    const user = await db.get("SELECT email FROM users WHERE id = ?", [id]);

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json(user);
});


//exports
export default router;
