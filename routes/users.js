const express = require('express');
const router = express.Router();
const rateLimit = require("express-rate-limit");
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10 // limit each IP to 100 requests per windowMs
});

//  apply to all requests
router.use(limiter);

router.get('/:username', async function (req, res, next) {
    const user = await req.models['User'].findOne({
        where: {
            username: req.params.username
        }
    });
    if (!user) return res.status(404).json({error: 'Not found'});
    res.json({
        username: user.username,
        createdAt: user.createdAt,
        color: user.color,
        permissions: user.permissions
    });
});

router.post('/:username/session', async function (req, res, next) {
    const user = await req.models['User'].findOne({
        where: {
            username: req.params.username
        }
    });
    console.log(user.token, req.body.token)
    if (!user) return res.status(404).json({error: 'Not found'});
    if (user.token === req.body.token) return res.json({ valid: true});
    else res.status(403).json({valid: false})
});

router.post('/', async function (req, res) {
    const user = await req.models['User'].create(
        {
            username: req.body.username,
            token: random(32)
        }).catch(() => {return res.status(409).json({message: 'User already exists'})})
    res.json(user);
});

module.exports = router;

const random = (length = 8) => {
    let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let str = '';
    for (let i = 0; i < length; i++) {
        str += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return str;
};