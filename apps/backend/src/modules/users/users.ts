import express  from 'express';

// -----------
// USERS
// -----------
export function createUserModule(){
    const userRouter = express.Router();

    userRouter.get('/users', (req, res) => {
        res.status(200).json({
            users:[]
        });
    });
    userRouter.post('/users', (req, res) => {
        const { id, name , email} = req.body;
        res.status(201).json({ name , email });
    });

    return {
        router: userRouter
    }

}