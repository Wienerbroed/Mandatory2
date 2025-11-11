// Imports
import express from 'express';
import { db } from '../db/db.js';
import bcrypt, { hash } from 'bcrypt';
import { blur } from 'svelte/transition';
import { construct_svelte_component, subscribe } from 'svelte/internal';

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

        return res.json({ success: true, message: 'Login successful' });

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

        //Insert user into database
        await db.run('INSERT INTO users (email, password) VALUES (?, ?)', [email, hashedPassword]);

        // succes message
        return res.status(201).json({success: true, message: 'User registered'});
    } catch (err) {
        console.error('Signup error: ', err);
        return res.status(500).json({ success: false, message: 'Server error.'})
    }
});


//exports
export default router;
