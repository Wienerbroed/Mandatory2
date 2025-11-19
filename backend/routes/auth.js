// Imports
import express from 'express';
import { db } from '../db/db.js';
import bcrypt, { hash } from 'bcrypt';
import { verifyAccessToken } from "../middleware/auth.js";
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';

// Setuo router
const router = express.Router();

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
            refreshToken
        });

        // general error for no serve connection
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
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
        const mathcingUsers = await db.get('SELECT * FROM users WHERE email = ?', [email]);
        if(mathcingUsers) {
            return res.status(407).json({success: false, message: 'Email already registered.'});
        }

        //Password hasher
        const hashedPassword = await bcrypt.hash(password, 13);

        const result = await db.run(
            "INSERT INTO users (email, password) VALUES (?, ?)",
            [email, hashedPassword]
        );

        const userId = result.lastID;

        const accessToken = generateAccessToken(userId);
        const refreshToken = generateRefreshToken(userId);

        await db.run(
            "UPDATE users SET refreshToken = ? WHERE id = ?", 
            [refreshToken, userId]
        );

        res.json({
            success: true,
            accessToken,
            refreshToken
        });

    } catch (err) {
        console.error('Signup error: ', err);
        return res.status(500).json({ success: false, message: 'Server error.'})
    }
});

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

//exports
export default router;
