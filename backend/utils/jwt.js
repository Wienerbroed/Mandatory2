import jwt from "jsonwebtoken";

function generateAccessToken(userId) {
    return jwt.sign(
        { id: userId },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: process.env.ACCESS_TOKEN_EXPIRES }
    );
}

function generateRefreshToken(userId) {
    return jwt.sign(
        { id: userId },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRES }
    );
}

export { generateAccessToken, generateRefreshToken };