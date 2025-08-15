import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());



const statusRouter = express.Router();

statusRouter.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

statusRouter.get('/status', (req, res) => {
    res.status(200).json({ status: 'OK'});
});


const userRouter = express.Router();

userRouter.get('/users', (req, res) => {
    res.status(200).json({
        users:[]
    });
});

userRouter.post('/users', (req, res) => {
    const { name , email} = req.body;
    res.status(201).json({ name , email });
});

app.use('/api', statusRouter);
app.use('/api', userRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});