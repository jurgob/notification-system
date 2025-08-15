import express from 'express';
import {z} from 'zod';
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());


// TYPES

const UserId = z.string().regex(/^USR-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "Invalid User ID format"
}).brand<'UserId'>();
type UserId = z.infer<typeof UserId>;

const UserName = z.string().min(2).max(100)
type UserName = z.infer<typeof UserName>;

const Email = z.email({ message: "Please provide a valid email" });;
type Email = z.infer<typeof Email>;

const NotificationId = z.string().regex(/^NOT-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "Invalid Notification ID format"
}).brand<'NotificationId'>();
type NotificationId = z.infer<typeof NotificationId>;


const OrganizationId = z.string().regex(/^ORG-[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, {
    message: "Invalid Organization ID format"
}).brand<'OrganizationId'>();
type OrganizationId = z.infer<typeof OrganizationId>;

const Channel = z.enum(['EMAIL', 'APP']);
type Channel = z.infer<typeof Channel>;

const User = z.object({
    id: UserId,
    email: Email,
    name: UserName,
    organizationId: OrganizationId
});

const UserCreate = z.object({
    email: Email,
    name: UserName,
    organizationId: OrganizationId
});


// STATUS
const statusRouter = express.Router();
statusRouter.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

statusRouter.get('/status', (req, res) => {
    res.status(200).json({ status: 'OK'});
});

// USERS

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

// NOTIFICATIONS
const notificationsRouter = express.Router();
notificationsRouter.get('/notifications', (req, res) => {
    res.status(200).json({
        notifications:[]
    });
});
notificationsRouter.post('/notifications', (req, res) => {
    const { userId , body} = req.body;
    res.status(201).json({ userId, body });
});


app.use('/api', statusRouter);
app.use('/api', userRouter);
app.use('/api', notificationsRouter);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});